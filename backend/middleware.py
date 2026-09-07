"""
Dune Admin Manager - Middleware

Obsługa autentykacji, autoryzacji, rate limiting, audit log.
"""

import time
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Callable
from datetime import datetime, timedelta

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import get_config

logger = logging.getLogger("dune-admin.middleware")


# ── Rate Limiter ───────────────────────────────────────────────────────────────

class RateLimiter:
    """Prosty in-memory rate limiter per IP."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._store: Dict[str, list] = {}

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        if key not in self._store:
            self._store[key] = []

        # Usuń stare wpisy
        self._store[key] = [t for t in self._store[key] if now - t < self.window_seconds]

        if len(self._store[key]) >= self.max_requests:
            return False

        self._store[key].append(now)
        return True

    def remaining(self, key: str) -> int:
        now = time.time()
        if key not in self._store:
            return self.max_requests
        self._store[key] = [t for t in self._store[key] if now - t < self.window_seconds]
        return max(0, self.max_requests - len(self._store[key]))


rate_limiter = RateLimiter()


# ── Session Store ──────────────────────────────────────────────────────────────

class SessionStore:
    """Prosty in-memory store sesji."""

    def __init__(self):
        self._sessions: Dict[str, dict] = {}

    def create(self, session_id: str, data: dict, ttl_hours: int = 24):
        self._sessions[session_id] = {
            **data,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=ttl_hours),
        }

    def get(self, session_id: str) -> Optional[dict]:
        session = self._sessions.get(session_id)
        if session and datetime.now() < session["expires_at"]:
            return session
        if session_id in self._sessions:
            del self._sessions[session_id]
        return None

    def delete(self, session_id: str):
        self._sessions.pop(session_id, None)


session_store = SessionStore()


# ── Audit Logger ───────────────────────────────────────────────────────────────

def audit_log(action: str, user: str = "anonymous", details: dict = None):
    """Zapisuje wpis do audit loga."""
    cfg = get_config()
    log_path = Path(cfg.logging.audit_log)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    entry = {
        "timestamp": datetime.now().isoformat(),
        "user": user,
        "action": action,
        "details": details or {},
    }

    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")


# ── Capability Checker ─────────────────────────────────────────────────────────

# 28 granulowanych uprawnień
ALL_CAPABILITIES = {
    "dashboard:read",       # Podgląd dashboardu
    "battlegroup:manage",    # Start/stop/restart battlegroup
    "battlegroup:update",    # Update battlegroup
    "players:read",          # Podgląd graczy
    "players:write",         # Edycja graczy (inventory, stats, currency)
    "players:cheat",         # Cheat scripts
    "players:delete",        # Usuwanie kont
    "server:read",           # Odczyt konfiguracji serwera
    "server:manage",         # Zapis konfiguracji serwera
    "database:read",         # Odczyt bazy (raw SQL)
    "database:manage",       # Backup/restore bazy
    "logs:read",             # Podgląd logów
    "logs:export",           # Eksport logów
    "market:read",           # Podgląd market
    "market:manage",         # Kontrola market bota
    "welcome:read",          # Podgląd welcome kits
    "welcome:manage",        # Zarządzanie welcome kits
    "monitoring:read",       # Podgląd monitoringu
    "scheduler:read",        # Podgląd harmonogramu
    "scheduler:manage",      # Zarządzanie harmonogramem
    "auth:manage",           # Zarządzanie uprawnieniami
    "events:read",           # Podgląd eventów
    "events:manage",         # Zarządzanie eventami
    "blueprints:read",       # Podgląd blueprintów
    "bases:read",            # Podgląd baz
    "bases:export",          # Eksport baz
    "storage:read",          # Podgląd storage
    "battlepass:manage",     # Zarządzanie battlepassem
}

# Mapping API paths do wymaganych uprawnień
PATH_CAPABILITIES = {
    "GET /api/v1/dashboard": "dashboard:read",
    "POST /api/v1/battlegroup/start": "battlegroup:manage",
    "POST /api/v1/battlegroup/stop": "battlegroup:manage",
    "POST /api/v1/battlegroup/restart": "battlegroup:manage",
    "POST /api/v1/battlegroup/update": "battlegroup:update",
    "GET /api/v1/players": "players:read",
    "POST /api/v1/players/give-item": "players:write",
    "POST /api/v1/players/give-currency": "players:write",
    "POST /api/v1/players/cheat-script": "players:cheat",
    "POST /api/v1/players/delete-account": "players:delete",
    "GET /api/v1/server-settings": "server:read",
    "POST /api/v1/server-settings": "server:manage",
    "POST /api/v1/database/query": "database:read",
    "POST /api/v1/database/backup": "database:manage",
    "POST /api/v1/database/restore": "database:manage",
    "GET /api/v1/logs": "logs:read",
    "GET /api/v1/logs/export": "logs:export",
    "GET /api/v1/market": "market:read",
    "POST /api/v1/market/bot/start": "market:manage",
    "GET /api/v1/welcome": "welcome:read",
    "POST /api/v1/welcome": "welcome:manage",
    "GET /api/v1/monitoring": "monitoring:read",
    "GET /api/v1/scheduler": "scheduler:read",
    "POST /api/v1/scheduler": "scheduler:manage",
    "GET /api/v1/events": "events:read",
    "GET /api/v1/blueprints": "blueprints:read",
    "GET /api/v1/bases": "bases:read",
    "GET /api/v1/bases/export": "bases:export",
    "GET /api/v1/storage": "storage:read",
}


def check_capability(path: str, method: str, user_session: dict) -> bool:
    """Sprawdza czy użytkownik ma wymagane uprawnienie."""
    cfg = get_config()

    # Jeśli auth wyłączony, pozwól na wszystko
    if not cfg.auth.enabled:
        return True

    key = f"{method} {path}"
    required = PATH_CAPABILITIES.get(key)

    # Jeśli ścieżka nie wymaga specjalnych uprawnień, pozwól
    if required is None:
        return True

    # Sprawdź czy użytkownik ma uprawnienie
    caps = user_session.get("capabilities", set())
    return "*" in caps or required in caps


# ── Middleware ─────────────────────────────────────────────────────────────────

class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware autentykacji i autoryzacji."""

    async def dispatch(self, request: Request, call_next):
        cfg = get_config()
        path = request.url.path
        method = request.method

        # Pomijaj static files i health check
        if path.startswith("/api/docs") or path == "/api/health":
            return await call_next(request)

        # Rate limiting dla login endpoint
        if path == "/api/v1/auth/login" and method == "POST":
            client_ip = request.client.host if request.client else "unknown"
            if not rate_limiter.is_allowed(f"login:{client_ip}"):
                return JSONResponse(
                    status_code=429,
                    content={"error": "Too many login attempts. Try again later."},
                )

        # Autentykacja
        if cfg.auth.enabled and path.startswith("/api/"):
            # Wyjątki dla auth endpointów
            public_paths = ["/api/v1/auth/login", "/api/v1/auth/discord/callback"]
            if path in public_paths:
                return await call_next(request)

            session_id = request.cookies.get("dune_session")
            user_session = session_store.get(session_id) if session_id else None

            # Guest access
            if not user_session and cfg.auth.guest_enabled:
                user_session = {"username": "guest", "capabilities": {"dashboard:read", "players:read", "market:read"}}

            if not user_session:
                return JSONResponse(status_code=401, content={"error": "Authentication required"})

            # Sprawdź uprawnienia
            if not check_capability(path, method, user_session):
                return JSONResponse(status_code=403, content={"error": "Insufficient permissions"})

            # Dodaj user info do request state
            request.state.user = user_session

        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if request.headers.get("X-Forwarded-Proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000"

        return response


def setup_middleware(app: FastAPI):
    """Konfiguruje middleware aplikacji."""
    app.add_middleware(AuthMiddleware)
