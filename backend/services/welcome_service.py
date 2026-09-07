"""Welcome package + MOTD service."""
import logging
logger = logging.getLogger("dune-admin.welcome")

class WelcomeService:
    def __init__(self):
        self.config = {"enabled":False,"scan_interval_seconds":30,"active_version":"v1","packages":[]}
        self.motd = {"enabled":False,"message":"Welcome, {player}!","source_player":""}

    def get_config(self):
        from backend.config import get_config
        cfg = get_config()
        return {"enabled":cfg.welcome_package.enabled,
            "scan_interval_seconds":cfg.welcome_package.scan_interval_seconds,
            "active_version":cfg.welcome_package.active_version,
            "packages":cfg.welcome_package.packages,
            "motd":{"enabled":cfg.motd.enabled,"message":cfg.motd.message,
                "source_player":cfg.motd.source_player or "(GM Persona)"}}
