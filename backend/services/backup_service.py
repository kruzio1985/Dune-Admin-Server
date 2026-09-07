"""Backup service for game database."""
import os, datetime, logging
logger = logging.getLogger("dune-admin.backup")

class BackupService:
    def __init__(self, backup_dir="./backups"):
        self.backup_dir = backup_dir
        os.makedirs(backup_dir, exist_ok=True)

    def list_backups(self):
        files = []
        for f in sorted(os.listdir(self.backup_dir), reverse=True):
            path = os.path.join(self.backup_dir, f)
            if os.path.isfile(path):
                files.append({"filename":f,"size":os.path.getsize(path),
                    "created":datetime.datetime.fromtimestamp(os.path.getmtime(path)).isoformat()})
        return files

    def get_backup_path(self, name=None):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        return os.path.join(self.backup_dir, name or f"backup_{ts}.dump")
