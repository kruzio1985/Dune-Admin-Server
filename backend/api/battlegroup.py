"""Battlegroup controls — via SSH kubectl + battlegroup.bat."""
from fastapi import APIRouter, HTTPException
from backend.services.ssh_service import get_ssh
import subprocess, logging, os

router = APIRouter(tags=["Battlegroup"])
logger = logging.getLogger("dune-admin.battlegroup")

# Paths
BG_DIR = r"D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server"
BG_BAT = os.path.join(BG_DIR, "battlegroup.bat")

# Cached namespace/battlegroup name
_NS = "funcom-seabass-sh-1ba9d7a35da882ec-qagalq"
_BG = "sh-1ba9d7a35da882ec-qagalq"

def _ssh(cmd: str, timeout: int = 60):
    """Run command on VM via SSH. Returns (returncode, stdout, stderr)."""
    ssh = get_ssh()
    key = ssh._find_key()
    c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
         '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
    if key: c += ['-i', key]
    c += [f'dune@{ssh.host}', cmd]
    r = subprocess.run(c, capture_output=True, text=True, timeout=timeout)
    return (r.returncode, r.stdout, r.stderr)


def _bg_ssh(cmd: str, timeout: int = 60):
    """Run battlegroup command on VM via the battlegroup binary."""
    return _ssh(f"sudo /home/dune/.dune/bin/battlegroup {cmd}", timeout)


@router.get("/status")
async def status():
    pods = await get_ssh().get_pods()
    r = sum(1 for p in pods if p["status"]=="Running")
    return {"status":"healthy" if r==len(pods) and pods else ("degraded" if r>0 else "down"),
        "pods":pods,"server_count":len(pods),"healthy_servers":r}


@router.post("/start")
async def start():
    """Start battlegroup — uses spec.stop=false."""
    # Method 1: Patch battlegroup CRD
    rc, out, err = _ssh(f"sudo kubectl patch battlegroup -n {_NS} {_BG} --type merge -p '{{\"spec\":{{\"stop\":false}}}}' 2>&1", timeout=30)
    if rc == 0 and 'patched' in out:
        # Also run the VM binary for good measure
        _bg_ssh("start", timeout=10)
        return {"ok": f"Battlegroup {_BG} starting (spec.stop=false)"}
    
    # Method 2: VM battlegroup binary
    rc2, out2, err2 = _bg_ssh("start", timeout=60)
    if rc2 == 0:
        return {"ok": f"Battlegroup starting via VM binary", "output": out2[-500:]}
    
    raise HTTPException(500, f"Failed: {err or err2}")


@router.post("/stop")
async def stop():
    """Stop battlegroup — uses spec.stop=true."""
    rc, out, err = _ssh(f"sudo kubectl patch battlegroup -n {_NS} {_BG} --type merge -p '{{\"spec\":{{\"stop\":true}}}}' 2>&1", timeout=30)
    if rc == 0 and 'patched' in out:
        return {"ok": f"Battlegroup {_BG} stopping (spec.stop=true)"}
    
    # Fallback: VM binary
    rc2, out2, err2 = _bg_ssh("stop", timeout=60)
    if rc2 == 0:
        return {"ok": "Battlegroup stopping via VM binary"}
    
    raise HTTPException(500, f"Failed: {err or err2}")


@router.post("/restart")
async def restart():
    """Restart battlegroup via VM binary."""
    rc, out, err = _bg_ssh("restart", timeout=120)
    if rc == 0:
        return {"ok": "Battlegroup restarting", "output": out[-500:]}
    raise HTTPException(500, f"Restart failed: {err}")


@router.post("/update")
async def update():
    """Update battlegroup - restart operators."""
    rc, out, _ = _ssh("sudo kubectl rollout restart deployment -n funcom-operators --all 2>&1", timeout=60)
    if rc != 0:
        # Try deleting pods to force restart
        _ssh("sudo kubectl delete pods -n funcom-operators --all 2>/dev/null", timeout=30)
    return {"ok": "Battlegroup update triggered (operators restarting)"}


@router.post("/open-console")
async def open_console():
    """Launch battlegroup.bat in a new PowerShell window for manual control."""
    if not os.path.exists(BG_BAT):
        raise HTTPException(500, f"battlegroup.bat not found at {BG_BAT}")
    try:
        subprocess.Popen(
            ['powershell', '-NoExit', '-NoProfile', '-Command',
             f'Set-Location "{BG_DIR}"; & ".\\battlegroup.bat"'],
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        return {"ok": "battlegroup.bat launched in new window"}
    except Exception as e:
        raise HTTPException(500, f"Failed to launch: {e}")


@router.get("/console-path")
async def console_path():
    """Return battlegroup.bat path for UI display."""
    return {"path": BG_BAT, "dir": BG_DIR, "cmd": f'cd "{BG_DIR}" && battlegroup.bat'}


# ── Backup / Restore ──

import base64, os as _os
from datetime import datetime as _dt

_BACKUP_LOCAL_DIR = r"C:\Projects\OfflineWorkspace\BACKUPS\DB"
_BACKUP_VM_DIR = f"/funcom/artifacts/database-dumps/{_BG}"


@router.post("/backup")
async def create_backup():
    """Create a full database backup (players, buildings, settings, etc.)."""
    rc, out, err = _bg_ssh("backup", timeout=120)
    if rc != 0:
        raise HTTPException(500, f"Backup failed: {err or out[-500:]}")
    
    # Find the newest backup file
    rc2, out2, _ = _ssh(f"sudo ls -t {_BACKUP_VM_DIR}/*.backup 2>/dev/null | head -1")
    latest = out2.strip()
    
    # Copy to Windows
    local_files = []
    if latest:
        for ext in ['.backup', '.backup.yaml']:
            vm_file = latest.replace('.backup', ext)
            fname = _os.path.basename(vm_file)
            rc3, b64, _ = _ssh(f"sudo base64 {vm_file} 2>/dev/null", timeout=30)
            if rc3 == 0 and b64:
                data = base64.b64decode(b64.replace('\n', '').replace('\r', ''))
                local_path = _os.path.join(_BACKUP_LOCAL_DIR, fname)
                _os.makedirs(_BACKUP_LOCAL_DIR, exist_ok=True)
                with open(local_path, 'wb') as f:
                    f.write(data)
                local_files.append({"name": fname, "size": len(data), "path": local_path})
    
    return {
        "ok": "Backup complete",
        "vm_file": latest,
        "local_files": local_files,
        "backup_dir": _BACKUP_LOCAL_DIR
    }


@router.post("/restore")
async def restore_backup(filename: str = ""):
    """Restore database from a backup file."""
    if not filename:
        # List available backups
        rc, out, _ = _ssh(f"sudo ls -t {_BACKUP_VM_DIR}/*.backup 2>/dev/null | head -10")
        return {"available": [f.strip() for f in out.strip().split('\n') if f.strip()]}
    
    # Restore specific backup
    vm_path = f"{_BACKUP_VM_DIR}/{filename}"
    rc, out, err = _ssh(f"echo yes | sudo /home/dune/.dune/bin/battlegroup import {vm_path} 2>&1", timeout=300)
    if rc == 0:
        return {"ok": f"Restored from {filename}", "output": out[-500:]}
    raise HTTPException(500, f"Restore failed: {err or out[-500:]}")


@router.get("/backup/list")
async def list_backups():
    """List all backups (VM and local)."""
    # VM backups
    rc, out, _ = _ssh(f"sudo ls -lh {_BACKUP_VM_DIR}/*.backup 2>/dev/null")
    vm_backups = [l.strip() for l in out.strip().split('\n') if l.strip()] if out.strip() else []
    
    # Local backups
    local = []
    if _os.path.exists(_BACKUP_LOCAL_DIR):
        for f in sorted(_os.listdir(_BACKUP_LOCAL_DIR)):
            if f.endswith('.backup'):
                fp = _os.path.join(_BACKUP_LOCAL_DIR, f)
                local.append({"name": f, "size": _os.path.getsize(fp), "date": _dt.fromtimestamp(_os.path.getmtime(fp)).isoformat()})
    
    return {"vm_backups": vm_backups, "local_backups": local, "local_dir": _BACKUP_LOCAL_DIR}
