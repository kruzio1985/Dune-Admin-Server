"""
Dune Admin Manager - Main Application Entry Point

Uruchamia serwer FastAPI z obsługą WebSocket dla live console.
"""

import sys
import logging
from pathlib import Path

# Dodaj katalog projektu do ścieżki, żeby `from backend.xxx` działało
# __file__ = backend/main.py, parent = backend/, parent.parent = dune-admin-manager/
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

# Also add parent of project root (workspace) in case we're imported as dune-admin-manager.backend
_workspace = _project_root.parent
if str(_workspace) not in sys.path:
    sys.path.insert(0, str(_workspace))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.config import get_config
from backend.middleware import setup_middleware

# ── Logging ────────────────────────────────────────────────────────────────────

cfg = get_config()

# Ensure log directory exists
_log_file = cfg.logging.file
if _log_file:
    _log_path = Path(_log_file)
    _log_path.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, cfg.logging.level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(_log_file) if _log_file else logging.NullHandler(),
    ],
)
logger = logging.getLogger("dune-admin")

# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Dune Admin Manager",
    description="Web-based management panel for Dune: Awakening self-hosted servers",
    version="0.1.0",
    docs_url="/api/docs" if not cfg.auth.enabled else None,
    redoc_url=None,
)

# CORS - pozwala na dostęp z dowolnego hosta (dla hosted SPA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware
setup_middleware(app)

# ── Root redirect ──────────────────────────────────────────────────────────────

from fastapi.responses import RedirectResponse

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

# ── Frontend path ──────────────────────────────────────────────────────────────

frontend_path = Path(__file__).parent.parent / "frontend"


# ── Frontend Serving ──────────────────────────────────────────────────────────

def _setup_frontend_routes():
    """Serve frontend via StaticFiles mounted at /static."""
    if not frontend_path.exists():
        return

    from fastapi.staticfiles import StaticFiles

    # Mount all static files under /static
    app.mount("/static", StaticFiles(directory=str(frontend_path), html=True), name="static")

    logger.info(f"Frontend: /static -> {frontend_path}")


# ── Import & Register API Routers ──────────────────────────────────────────────

def register_routers():
    """Rejestruje wszystkie routery API."""
    from backend.api import (
        auth, dashboard, battlegroup, players, characters,
        inventory, server_settings, database, logs, market, welcome, database_editor, server_control,
        gameplay, item_catalog, market_bot,
    )
    from backend.api.remaining import (
        blueprints_router, bases_router, storage_router, events_router,
        contracts_router, progression_router, vehicles_router,
        cosmetics_router, battlepass_router, monitoring_router,
        setup_router, scheduler_router,
    )

    routers = [
        (auth.router, "/api/v1/auth"),
        (dashboard.router, "/api/v1/dashboard"),
        (battlegroup.router, "/api/v1/battlegroup"),
        (players.router, "/api/v1/players"),
        (characters.router, "/api/v1/characters"),
        (inventory.router, "/api/v1/inventory"),
        (server_settings.router, "/api/v1/server-settings"),
        (database.router, "/api/v1/database"),
        (database_editor.router, "/api/v1/database-editor"),
        (server_control.router, "/api/v1/server-control"),
        (logs.router, "/api/v1/logs"),
        (market.router, "/api/v1/market"),
        (welcome.router, "/api/v1/welcome"),
        (blueprints_router, "/api/v1/blueprints"),
        (bases_router, "/api/v1/bases"),
        (storage_router, "/api/v1/storage"),
        (events_router, "/api/v1/events"),
        (contracts_router, "/api/v1/contracts"),
        (progression_router, "/api/v1/progression"),
        (vehicles_router, "/api/v1/vehicles"),
        (cosmetics_router, "/api/v1/cosmetics"),
        (battlepass_router, "/api/v1/battlepass"),
        (monitoring_router, "/api/v1/monitoring"),
        (setup_router, "/api/v1/setup"),
        (scheduler_router, "/api/v1/scheduler"),
        (gameplay.router, "/api/v1/gameplay"),
        (market_bot.router, "/api/v1/gameplay"),
        (item_catalog.router, "/api/v1/items"),
    ]

    for router, prefix in routers:
        app.include_router(router, prefix=prefix)
        logger.debug(f"Registered: {prefix}")

    _setup_frontend_routes()


register_routers()


# ── Health Check ───────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0", "provider": cfg.provider}


# ── WebSocket: Live Console ──────────────────────────────────────────────────

@app.websocket("/api/v1/ws/console")
async def ws_console(ws: WebSocket):
    """Live console WebSocket – na razie echo, w przyszłości logi serwera."""
    await ws.accept()
    await ws.send_text("[SYSTEM] Connected to Dune Admin Manager console.\n")
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
            else:
                await ws.send_text(f"[ECHO] {data}")
    except WebSocketDisconnect:
        logger.debug("WebSocket client disconnected")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")


# ── WebSocket: Embedded PowerShell Terminal ─────────────────────────────────

import asyncio as _asyncio
import json as _json

@app.websocket("/api/v1/ws/terminal")
async def ws_terminal(ws: WebSocket):
    """Embedded PowerShell terminal — spawns pwsh.exe and bridges I/O."""
    await ws.accept()

    # Try pwsh (PS 7), fall back to powershell (PS 5)
    ps_exe = None
    for candidate in ["pwsh.exe", "powershell.exe"]:
        try:
            proc = await _asyncio.create_subprocess_exec(
                candidate, "-NoLogo", "-NoProfile", "-NonInteractive",
                "-Command", "-",
                stdin=_asyncio.subprocess.PIPE,
                stdout=_asyncio.subprocess.PIPE,
                stderr=_asyncio.subprocess.PIPE,
            )
            ps_exe = candidate
            break
        except FileNotFoundError:
            continue

    if not ps_exe:
        await ws.send_text(_json.dumps({
            "type": "error",
            "message": "PowerShell not found. Install PowerShell 7: winget install Microsoft.PowerShell"
        }))
        return

    await ws.send_text(_json.dumps({"type": "ready", "cwd": "C:\\Users\\YOUR_USERNAME"}))

    async def read_stream(stream, stream_name):
        """Read lines from subprocess and send to WebSocket."""
        while True:
            line = await stream.readline()
            if not line:
                break
            try:
                text = line.decode("utf-8", errors="replace")
                await ws.send_text(_json.dumps({
                    "type": "output", "stream": stream_name, "data": text
                }))
            except Exception:
                break

    async def ws_reader():
        """Read commands from WebSocket and send to PowerShell."""
        try:
            while True:
                raw = await ws.receive_text()
                try:
                    msg = _json.loads(raw)
                    cmd = msg.get("cmd", "")
                    if cmd:
                        proc.stdin.write((cmd + "\n").encode())
                        await proc.stdin.drain()
                except _json.JSONDecodeError:
                    # Plain text = direct command
                    proc.stdin.write((raw + "\n").encode())
                    await proc.stdin.drain()
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            try:
                proc.stdin.write(b"exit\n")
                await proc.stdin.drain()
            except Exception:
                pass

    # Run reader + stdout/stderr readers concurrently
    try:
        await _asyncio.gather(
            ws_reader(),
            read_stream(proc.stdout, "stdout"),
            read_stream(proc.stderr, "stderr"),
        )
    except Exception as e:
        logger.warning(f"Terminal WS error: {e}")
    finally:
        try: proc.kill()
        except: pass


# ── Entry Point ────────────────────────────────────────────────────────────────

def main():
    """Główny punkt wejścia aplikacji."""
    logger.info(f"Starting Dune Admin Manager v0.1.0 (provider={cfg.provider})")
    logger.info(f"Listening on {cfg.listen_addr}:{cfg.listen_port}")

    uvicorn.run(
        "backend.main:app",
        host=cfg.listen_addr,
        port=cfg.listen_port,
        reload=False,
        log_level=cfg.logging.level.lower(),
    )


if __name__ == "__main__":
    main()
