"""Task scheduler service."""
import logging
logger = logging.getLogger("dune-admin.scheduler")

class SchedulerService:
    def __init__(self):
        self.config = {"enabled":False,"daily_restart_time":"04:00",
            "restart_warning_lead_minutes":30,"timezone":"Europe/Warsaw",
            "update_apply_enabled":False}

    def get_config(self):
        from backend.config import get_config
        cfg = get_config()
        return {"enabled":cfg.scheduler.enabled,
            "daily_restart_time":cfg.scheduler.daily_restart_time,
            "restart_warning_lead_minutes":cfg.scheduler.restart_warning_lead_minutes,
            "timezone":cfg.scheduler.timezone,
            "update_apply_enabled":cfg.scheduler.update_apply_enabled}
