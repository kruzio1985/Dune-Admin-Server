"""
Dune Admin Manager - Authentication API

Obsługa logowania (local + Discord OAuth), sesji, zarządzania hasłami.
"""

import secrets
import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Request, HTTPException, Response
from pydantic import BaseModel

from backend.config import get_config
from backend.middleware import session_store, audit_log

router = APIRouter(tags=["Authentication"])


# ── Models ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class SetPasswordRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    token: str
    username: str
    capabilities: list[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    """Hashuje hasło - placeholder, w produkcji bcrypt."""
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hash_str: str) -> bool:
    """Weryfikuje hasło."""
    import bcrypt
    try:
        return bcrypt.checkpw(password.encode(), hash_str.encode())
    except Exception:
        return False


def _generate_session() -> str:
    """Generuje token sesji."""
    return secrets.token_urlsafe(32)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: Request, response: Response, body: LoginRequest):
    """
    Logowanie lokalne (username + password).
    
    Porównuje z config.yaml (auth_local_username / auth_local_password_hash).
    """
    cfg = get_config()

    if not cfg.auth.enabled:
        return {"ok": "Authentication is disabled", "token": "", "capabilities": ["*"]}

    if not cfg.auth.local_enabled:
        raise HTTPException(status_code=400, detail="Local authentication is disabled")

    # Weryfikacja
    if body.username != cfg.auth.local_username:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if cfg.auth.local_password_hash:
        if not _verify_password(body.password, cfg.auth.local_password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

    # Utwórz sesję
    session_id = _generate_session()
    session_store.create(
        session_id,
        {
            "username": body.username,
            "capabilities": {"*"},  # Local admin = full access
            "auth_method": "local",
        },
        ttl_hours=cfg.auth.session_ttl_hours,
    )

    # Ustaw cookie
    response.set_cookie(
        key="dune_session",
        value=session_id,
        httponly=True,
        secure=request.headers.get("X-Forwarded-Proto") == "https",
        samesite="lax",
        max_age=cfg.auth.session_ttl_hours * 3600,
    )

    audit_log("login", user=body.username, details={"method": "local"})

    return {
        "ok": "Logged in",
        "username": body.username,
        "capabilities": list({"*"}),
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Wylogowanie - usuwa sesję."""
    session_id = request.cookies.get("dune_session")
    if session_id:
        session_store.delete(session_id)

    response.delete_cookie("dune_session")
    return {"ok": "Logged out"}


@router.get("/session")
async def get_session(request: Request):
    """Sprawdza aktualną sesję."""
    session_id = request.cookies.get("dune_session")
    if not session_id:
        return {"authenticated": False}

    session = session_store.get(session_id)
    if not session:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "username": session.get("username"),
        "capabilities": list(session.get("capabilities", set())),
    }


@router.post("/set-password")
async def set_password(body: SetPasswordRequest):
    """
    Ustawia hasło administratora (offline, nie wymaga auth).
    Zapisuje hash bcrypt do config.yaml.
    """
    import yaml
    from pathlib import Path

    cfg = get_config()
    hash_str = _hash_password(body.password)

    # Zapisz do config.yaml
    config_path = Path("./config/config.yaml")
    if config_path.exists():
        with open(config_path, "r") as f:
            config_data = yaml.safe_load(f) or {}

        if "auth" not in config_data:
            config_data["auth"] = {}
        config_data["auth"]["local_password_hash"] = hash_str

        with open(config_path, "w") as f:
            yaml.dump(config_data, f, default_flow_style=False)

    cfg.auth.local_password_hash = hash_str
    audit_log("set-password", user="system")

    return {"ok": "Password set successfully"}


@router.get("/discord/login")
async def discord_login():
    """Przekierowanie do Discord OAuth."""
    cfg = get_config()
    if not cfg.auth.discord_enabled:
        raise HTTPException(status_code=400, detail="Discord auth is not enabled")

    # URL autoryzacji Discord
    redirect_uri = f"http://localhost:{cfg.listen_port}/api/v1/auth/discord/callback"
    auth_url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={cfg.auth.discord_client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=identify%20guilds"
    )
    return {"url": auth_url}


@router.get("/discord/callback")
async def discord_callback(code: str, response: Response):
    """Callback Discord OAuth."""
    cfg = get_config()
    if not cfg.auth.discord_enabled:
        raise HTTPException(status_code=400, detail="Discord auth is not enabled")

    import httpx

    # Wymiana code na token
    redirect_uri = f"http://localhost:{cfg.listen_port}/api/v1/auth/discord/callback"
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": cfg.auth.discord_client_id,
                "client_secret": cfg.auth.discord_client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        token_data = token_resp.json()

        if "access_token" not in token_data:
            raise HTTPException(status_code=401, detail="Discord auth failed")

        # Pobierz info o użytkowniku
        user_resp = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        user_data = user_resp.json()

    username = user_data.get("username", "unknown")
    user_id = user_data.get("id", "")

    # Utwórz sesję
    session_id = _generate_session()
    session_store.create(
        session_id,
        {
            "username": username,
            "discord_id": user_id,
            "capabilities": {"dashboard:read", "players:read"},
            "auth_method": "discord",
        },
        ttl_hours=cfg.auth.session_ttl_hours,
    )

    response.set_cookie(
        key="dune_session",
        value=session_id,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=cfg.auth.session_ttl_hours * 3600,
    )

    audit_log("login", user=username, details={"method": "discord", "discord_id": user_id})

    return {"ok": "Logged in via Discord", "username": username}
