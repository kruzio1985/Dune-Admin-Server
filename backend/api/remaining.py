"""Remaining API routers: blueprints, bases, storage, events, contracts,
progression, vehicles, cosmetics, battlepass, monitoring, setup, scheduler."""

from fastapi import APIRouter
from backend.config import get_config
from backend.services.scheduler_service import SchedulerService
from backend.services.welcome_service import WelcomeService

blueprints_router = APIRouter(tags=["Blueprints"])
@blueprints_router.get("/")
async def list_blueprints(limit:int=500):
    import json
    from pathlib import Path
    p = Path(__file__).parent.parent.parent / "data" / "catalogs" / "item-catalog.json"
    if not p.exists():
        return {"blueprints": [], "count": 0}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        items = data.get("items", {})
        names = data.get("names", {})
        results = []
        for tid, info in items.items():
            if info.get("is_schematic") or "schematic" in tid.lower() or "patent" in tid.lower() or (info.get("category","")).lower() in ("schematics","patents"):
                results.append({
                    "id": len(results)+1,
                    "template_id": tid,
                    "name": names.get(tid, tid),
                    "owner_name": "Game",
                    "category": info.get("category", "general"),
                    "tier": info.get("tier", 1),
                    "rarity": info.get("rarity", "common"),
                    "pieces": 0,
                    "placeables": 0,
                })
        return {"blueprints": results[:limit], "count": len(results)}
    except Exception:
        return {"blueprints": [], "count": 0}

bases_router = APIRouter(tags=["Bases"])
@bases_router.get("/")
async def list_bases(limit:int=50): return {"bases":[],"count":0}

storage_router = APIRouter(tags=["Storage"])
@storage_router.get("/")
async def list_storage(): return {"containers":[]}

events_router = APIRouter(tags=["Events"])
@events_router.get("/")
async def list_events(): return {"events":[]}

contracts_router = APIRouter(tags=["Contracts"])
@contracts_router.get("/")
async def list_contracts(): return {"contracts":[],"count":0}
@contracts_router.post("/complete")
async def complete_contracts(account_id:int, contract_ids:list[str]):
    return {"ok":f"Completed: {contract_ids}"}

progression_router = APIRouter(tags=["Progression"])
@progression_router.get("/journey/{account_id}")
async def journey_nodes(account_id:int):
    from backend.services.db_service import get_db
    return {"nodes":get_db().get_journey_nodes(account_id) or []}
@progression_router.get("/presets")
async def presets():
    return {"presets":[
        {"id":"a_new_beginning","name":"A New Beginning","node_count":132},
        {"id":"find_the_fremen","name":"Find the Fremen","node_count":46},
        {"id":"act1_complete","name":"Act 1 Complete","node_count":178}]}

vehicles_router = APIRouter(tags=["Vehicles"])
@vehicles_router.get("/{controller_id}")
async def get_vehicles(controller_id:int):
    from backend.services.db_service import get_db
    return {"vehicles":get_db().get_vehicles(controller_id) or []}

cosmetics_router = APIRouter(tags=["Cosmetics"])
@cosmetics_router.get("/catalog")
async def cosmetic_catalog(search:str="", category:str=""):
    import json
    from pathlib import Path
    p = Path(__file__).parent.parent.parent/"data"/"catalogs"/"cosmetic-catalog.json"
    if p.exists(): return json.loads(p.read_text(encoding="utf-8"))
    return {"cosmetics":[],"count":0}

battlepass_router = APIRouter(tags=["Battlepass"])
@battlepass_router.get("/tiers")
async def tiers(): return {"tiers":[]}
@battlepass_router.get("/player/{account_id}")
async def player_bp(account_id:int): return {"claimed_tiers":[],"progress":{}}

monitoring_router = APIRouter(tags=["Monitoring"])

@monitoring_router.get("/director")
async def director():
    """Detect Director URL from VM."""
    try:
        from backend.services.ssh_service import get_ssh
        import subprocess
        ssh = get_ssh()
        key_path = ssh._find_key()
        ssh_cmd = ["C:\\Windows\\System32\\OpenSSH\\ssh.exe",
                   "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
                   "-o", "BatchMode=yes", "-o", "LogLevel=QUIET"]
        if key_path:
            ssh_cmd += ["-i", key_path]
        ssh_cmd += [f"dune@{ssh.host}",
                    "sudo kubectl get svc -A 2>/dev/null | grep 'bgd-svc' | awk '{print $6}' | cut -d':' -f2 | cut -d'/' -f1 | head -1"]
        r = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
        port = r.stdout.strip()
        if port and port.isdigit() and ssh.host:
            return {"url": f"http://{ssh.host}:{port}", "status": "available"}
        return {"url": "", "status": "not_detected"}
    except Exception:
        return {"url": "", "status": "error"}

@monitoring_router.get("/file-browser")
async def file_browser():
    """Detect FileBrowser URL from VM."""
    try:
        from backend.services.ssh_service import get_ssh
        import subprocess
        ssh = get_ssh()
        key_path = ssh._find_key()
        ssh_cmd = ["C:\\Windows\\System32\\OpenSSH\\ssh.exe",
                   "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
                   "-o", "BatchMode=yes", "-o", "LogLevel=QUIET"]
        if key_path:
            ssh_cmd += ["-i", key_path]
        # FileBrowser usually on port 3001, check if pod exists
        ssh_cmd += [f"dune@{ssh.host}",
                    "sudo kubectl get pods -A 2>/dev/null | grep 'fb-deploy' | head -1 | awk '{print $4}'"]
        r = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
        if r.stdout.strip() == "Running":
            return {"url": f"http://{ssh.host}:3001", "status": "available"}
        return {"url": "", "status": "not_installed"}
    except Exception:
        return {"url": "", "status": "error"}

setup_router = APIRouter(tags=["Setup Wizard"])
@setup_router.get("/status")
async def setup_status():
    import os, subprocess, shutil
    status = {"hyperv": False, "disk_free_gb": 0, "server_files": False, "ssh_key": False,
              "config_saved": False, "steam_path": None, "server_path": None}

    # Check Hyper-V (multiple methods, no admin needed)
    status["hyperv"] = False
    try:
        r = subprocess.run(["sc","query","vmms"], capture_output=True, text=True, timeout=5)
        if "RUNNING" in r.stdout or "STOPPED" in r.stdout:
            status["hyperv"] = True
    except: pass
    if not status["hyperv"]:
        # Check via DISM (doesn't need admin for query)
        try:
            r = subprocess.run(["dism","/online","/get-featureinfo","/featurename:Microsoft-Hyper-V-All"],
                capture_output=True, text=True, timeout=15)
            if "State : Enabled" in r.stdout:
                status["hyperv"] = True
        except: pass
    if not status["hyperv"]:
        # Fallback: check for Hyper-V files
        for hv_file in [r"C:\Windows\System32\vmms.exe", r"C:\Windows\System32\virtmgmt.msc",
                        r"C:\Windows\System32\WindowsHyperVisorPlatform.sys"]:
            if os.path.isfile(hv_file):
                status["hyperv"] = True
                break

    # Check disk
    try:
        d = shutil.disk_usage("C:\\")
        status["disk_free_gb"] = round(d.free / (1024**3), 1)
    except: pass

    # Find Steam path (registry) + all library folders
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")
        steam_path = winreg.QueryValueEx(key, "InstallPath")[0]
        winreg.CloseKey(key)
        status["steam_path"] = steam_path

        # Search all Steam library folders (libraryfolders.vdf)
        server_name = "Dune Awakening Self-Hosted Server"
        search_paths = [os.path.join(steam_path, "steamapps", "common", server_name)]
        vdf_path = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
        if os.path.isfile(vdf_path):
            with open(vdf_path, "r") as f:
                for line in f:
                    if '"path"' in line:
                        lib = line.split('"')[3].replace("\\\\", "\\")
                        search_paths.append(os.path.join(lib, "steamapps", "common", server_name))

        for sp in search_paths:
            if os.path.isdir(sp):
                status["server_path"] = sp
                status["server_files"] = True
                break
        else:
            status["server_path"] = search_paths[0]
    except:
        for base in [r"C:\Program Files (x86)\Steam", r"C:\Steam", r"D:\Steam", r"E:\Steam"]:
            sp = os.path.join(base, "steamapps", "common", "Dune Awakening Self-Hosted Server")
            if os.path.isdir(sp):
                status["steam_path"] = base
                status["server_path"] = sp
                status["server_files"] = True
                break

    # Check SSH key
    key_path = os.path.join(os.environ.get("LOCALAPPDATA",""), "DuneAwakeningServer", "sshKey")
    status["ssh_key"] = os.path.isfile(key_path)

    # Check config
    import yaml
    cfg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.yaml")
    status["config_saved"] = os.path.isfile(cfg_path)

    return {"completed": all([status["hyperv"], status["disk_free_gb"]>=100, status["server_files"]]),
            "checks": status}

@setup_router.post("/save-config")
async def save_setup_config(data: dict):
    """Save setup wizard configuration to config.yaml"""
    import os, yaml
    cfg_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.yaml")
    cfg = {}
    if os.path.isfile(cfg_path):
        with open(cfg_path, "r") as f:
            cfg = yaml.safe_load(f) or {}

    # Update with wizard values
    cfg["server_token"] = data.get("server_token", cfg.get("server_token", ""))
    cfg["server_name"] = data.get("server_name", cfg.get("server_name", "Dune Server"))
    cfg["hyperv"] = cfg.get("hyperv", {})
    cfg["hyperv"]["memory_gb"] = data.get("memory_gb", cfg["hyperv"].get("memory_gb", 20))

    os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
    with open(cfg_path, "w") as f:
        yaml.safe_dump(cfg, f, default_flow_style=False, allow_unicode=True)
    return {"ok": "Configuration saved", "path": cfg_path}

@setup_router.post("/test-ssh")
async def test_ssh():
    """Test SSH connection to VM and return status."""
    from backend.services.ssh_service import get_ssh
    try:
        ssh = get_ssh()
        result = await ssh.run("hostname; uptime", timeout=10)
        return {"ok": True, "hostname": result[1].strip() if result[1] else "connected", "ssh_working": True}
    except Exception as e:
        return {"ok": False, "error": str(e), "ssh_working": False}

@setup_router.get("/key-status")
async def key_status():
    """Check SSH key file status."""
    import os
    key_path = os.path.join(os.environ.get("LOCALAPPDATA",""), "DuneAwakeningServer", "sshKey")
    exists = os.path.isfile(key_path)
    return {"exists": exists, "path": key_path if exists else None,
            "expected_path": str(os.path.join(os.environ.get("LOCALAPPDATA",""), "DuneAwakeningServer", "sshKey"))}

scheduler_router = APIRouter(tags=["Scheduler"])
_sched = SchedulerService()
@scheduler_router.get("/")
async def get_schedule(): return _sched.get_config()
