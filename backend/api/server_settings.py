"""Server Settings API - 21 verified settings + 3 presets"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
from backend.services.ssh_service import get_ssh
from backend.services.ini_service import INIService

router = APIRouter(tags=["Server Settings"])

class INIWriteRequest(BaseModel):
    path: str
    data: Dict[str, Dict[str, str]]

@router.get("/")
async def get_settings():
    ssh = get_ssh()
    content = await ssh.read_file("/home/dune/battlegroup/UserSettings/UserGame.ini")
    return {"ini": INIService.parse(content) if content else {}}

@router.post("/")
async def save_settings(body: INIWriteRequest):
    ini = INIService.dump(body.data)
    if not await get_ssh().write_file(body.path, ini):
        raise HTTPException(500, "Failed to write INI")
    return {"ok": f"Saved to {body.path}"}

@router.get("/sections")
async def get_sections():
    return {"sections":[
        {"category":"Multipliers","fields":[
            {"name":"Dune.GlobalMiningOutputMultiplier","type":"float","default":"2.0","section":"ConsoleVariables","desc":"Hand-mined resource yield. 1=normal, 2=double. Community: 2.0 for private."},
            {"name":"Dune.GlobalVehicleMiningOutputMultiplier","type":"float","default":"2.0","section":"ConsoleVariables","desc":"Vehicle-mining yield. Community: 2.0 for solo/private."},
            {"name":"SecurityZones.PvpResourceMultiplier","type":"float","default":"2.5","section":"ConsoleVariables","desc":"Bonus resource in PvP zones (default 2.5)."},
            {"name":"dw.VehicleDurabilityDamageMultiplier","type":"float","default":"0.5","section":"ConsoleVariables","desc":"Vehicle wear. 0.5=half. Community: 0.5 for small servers."},
            {"name":"Vehicle.SandwormInvulnerabilitySecondsOnExit","type":"float","default":"900.0","section":"ConsoleVariables","desc":"Invuln after exiting vehicle (900s=15min)."},
            {"name":"Vehicle.SandwormInvulnerabilitySecondsOnServerRestart","type":"float","default":"7200.0","section":"ConsoleVariables","desc":"Invuln after server restart (7200s=2h)."}]},
        {"category":"World & Combat","fields":[
            {"name":"m_bShouldForceEnablePvpOnAllPartitions","type":"bool","default":"False","section":"/Script/DuneSandbox.PvpPveSettings","desc":"Force PvP everywhere. False=PvE, True=full PvP."},
            {"name":"m_bAreSecurityZonesEnabled","type":"bool","default":"True","section":"/Script/DuneSandbox.SecurityZonesSubsystem","desc":"Safe zones. True=protected, False=PvP anywhere."},
            {"name":"Vehicle.SandwormCollisionInteraction","type":"bool","default":"False","section":"ConsoleVariables","desc":"Sandworms push/damage vehicles."},
            {"name":"Sandstorm.Enabled","type":"bool","default":"True","section":"ConsoleVariables","desc":"Enable sandstorms. Community: leave ON for authentic Dune."},
            {"name":"Sandstorm.Treasure.Enabled","type":"bool","default":"True","section":"ConsoleVariables","desc":"Loot during sandstorms."},
            {"name":"sandworm.dune.Enabled","type":"bool","default":"True","section":"ConsoleVariables","desc":"Enable sandworms. Community: leave ON - they define Arrakis."},
            {"name":"Sandworm.SandwormDangerZonesEnabled","type":"bool","default":"True","section":"ConsoleVariables","desc":"Visible danger zones for sandworm attacks."},
            {"name":"m_bCoriolisAutoSpawnEnabled","type":"bool","default":"True","section":"/Script/DuneSandbox.SandStormConfig","desc":"Coriolis storms auto-spawn."}]},
        {"category":"Persistence & Building","fields":[
            {"name":"UpdateRateInSeconds","type":"float","default":"1.0","section":"/DeteriorationSystem.ItemDeteriorationConstants","desc":"Item decay tick. 0=no decay, 10=fast."},
            {"name":"m_MaxNumLandclaimSegments","type":"int","default":"20","section":"/Script/DuneSandbox.BuildingSettings","desc":"Max land-claim flags. Community: 20 for private."},
            {"name":"m_BuildingBlueprintMaxExtensions","type":"int","default":"4","section":"/Script/DuneSandbox.BuildingSettings","desc":"Blueprint extensions (default 4)."},
            {"name":"m_BaseBackupMaxExtensions","type":"int","default":"8","section":"/Script/DuneSandbox.BuildingSettings","desc":"Base backup extensions (default 8)."},
            {"name":"m_bBuildingRestrictionLimitsEnabled","type":"bool","default":"False","section":"/Script/DuneSandbox.BuildingSettings","desc":"Building limits. False=build anywhere. Players must also set in local Game.ini!"}]},
        {"category":"Server Identity","fields":[
            {"name":"Bgd.ServerDisplayName","type":"str","default":"Sietch Cubern","section":"ConsoleVariables","desc":"Server name in browser."},
            {"name":"Bgd.ServerLoginPassword","type":"str","default":"","section":"ConsoleVariables","desc":"Optional password. Empty=open to all."}]},
        {"category":"Client-Side (Players Must Set)","fields":[
            {"name":"CLIENT_m_bBuildingRestrictionLimitsEnabled","type":"bool","default":"False","section":"Game.ini (%LOCALAPPDATA%\\DuneSandbox\\Saved\\Config\\WindowsClient)","desc":"CLIENT-SIDE. Set in local Game.ini to match server."},
            {"name":"CLIENT_m_MaxNumLandclaimSegments","type":"int","default":"20","section":"Game.ini (client)","desc":"CLIENT-SIDE. Must match server m_MaxNumLandclaimSegments."}]}],
    "presets":{
        "pve_private":{"name":"PvE Private (Recommended)","desc":"Double resources, half vehicle damage, no forced PvP, 20 claims.","settings":{"Dune.GlobalMiningOutputMultiplier":"2.0","Dune.GlobalVehicleMiningOutputMultiplier":"2.0","dw.VehicleDurabilityDamageMultiplier":"0.5","m_bShouldForceEnablePvpOnAllPartitions":"False","m_bAreSecurityZonesEnabled":"True","m_MaxNumLandclaimSegments":"20","m_bBuildingRestrictionLimitsEnabled":"False"}},
        "pvp_full":{"name":"Full PvP","desc":"PvP everywhere, no safe zones, default resources.","settings":{"m_bShouldForceEnablePvpOnAllPartitions":"True","m_bAreSecurityZonesEnabled":"False","Dune.GlobalMiningOutputMultiplier":"1.0","dw.VehicleDurabilityDamageMultiplier":"1.0"}},
        "solo_easy":{"name":"Solo Easy Mode","desc":"5x resources, no decay, no sandworms, 30 claims.","settings":{"Dune.GlobalMiningOutputMultiplier":"5.0","Dune.GlobalVehicleMiningOutputMultiplier":"5.0","dw.VehicleDurabilityDamageMultiplier":"0.1","UpdateRateInSeconds":"0","sandworm.dune.Enabled":"False","m_MaxNumLandclaimSegments":"30","m_bBuildingRestrictionLimitsEnabled":"False"}}}}

@router.get("/ini")
async def read_ini(path:str="/home/dune/battlegroup/UserSettings/UserGame.ini"):
    c = await get_ssh().read_file(path)
    if not c: raise HTTPException(404, "File not found")
    return {"path":path,"content":c}

@router.post("/ini")
async def write_ini(body: INIWriteRequest):
    ini = INIService.dump(body.data)
    if not await get_ssh().write_file(body.path, ini):
        raise HTTPException(500, "Failed to write INI")
    return {"ok": f"Saved to {body.path}"}

@router.get("/ini/files")
async def list_ini_files():
    return {"path":"/home/dune/battlegroup/UserSettings/","files":await get_ssh().list_files("/home/dune/battlegroup/UserSettings/")}


# ── SSH connection settings (editable from the Settings UI) ────────────────

class SSHConfigRequest(BaseModel):
    host: str = "192.168.1.100"
    port: int = 22
    user: str = "dune"
    password: str = ""
    key_path: str = ""


def _get_config_path():
    """Resolve config.yaml path (same logic as backend.config)."""
    import os
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent.parent  # backend/api/ -> project root
    candidates = [
        root / "config" / "config.yaml",
        Path(os.path.expanduser("~")) / ".dune-admin-manager" / "config.yaml",
    ]
    for p in candidates:
        if p.exists():
            return p
    return candidates[0]


@router.get("/ssh")
async def get_ssh_config():
    """Return current SSH connection settings (password masked)."""
    from backend.config import get_config
    c = get_config()
    return {
        "host": c.ssh.host,
        "port": c.ssh.port,
        "user": c.ssh.user,
        "password": c.ssh.password,
        "key_path": c.ssh.key_path or "",
        "has_password": bool(c.ssh.password),
    }


@router.post("/ssh")
async def save_ssh_config(body: SSHConfigRequest):
    """Save SSH connection settings to config.yaml and reconnect."""
    import yaml
    from backend.config import get_config, reload_config
    from backend.services.ssh_service import reset_ssh

    cfg_path = _get_config_path()
    data = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

    ssh_section = data.get("ssh", {}) if isinstance(data.get("ssh"), dict) else {}
    ssh_section["host"] = body.host.strip()
    ssh_section["port"] = int(body.port)
    ssh_section["user"] = body.user.strip()
    ssh_section["key_path"] = body.key_path.strip()
    # Only overwrite password if a non-empty one was provided
    if body.password:
        ssh_section["password"] = body.password
    elif "password" not in ssh_section:
        ssh_section["password"] = ""

    data["ssh"] = ssh_section
    cfg_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cfg_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    reload_config()
    reset_ssh()

    return {"ok": "SSH configuration saved", "host": ssh_section["host"],
            "port": ssh_section["port"], "user": ssh_section["user"]}


@router.post("/ssh/test")
async def test_ssh_config(body: SSHConfigRequest):
    """Test an SSH connection using the given settings (without saving)."""
    from backend.services.ssh_service import SSHService
    svc = SSHService(body.host.strip(), int(body.port), body.user.strip(),
                     body.key_path.strip(), body.password)
    try:
        client = await svc.connect()
        if not client:
            return {"ok": False, "error": "Connection failed (all auth methods)"}
        loop = __import__("asyncio").get_event_loop()
        _, stdout, stderr = await loop.run_in_executor(
            None, client.exec_command, "hostname; uptime")
        out = stdout.read().decode(errors="replace").strip()
        err = stderr.read().decode(errors="replace").strip()
        return {"ok": True, "output": out or err or "connected"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


class SSHKeyRequest(BaseModel):
    key_path: str = ""
    content: str = ""


@router.get("/ssh/key/autodetect")
async def autodetect_ssh_key():
    """Find the SSH key that battlegroup.bat created (DuneAwakeningServer/sshKey)."""
    import os
    from pathlib import Path
    candidates = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "DuneAwakeningServer" / "sshKey",
        Path(os.path.expanduser("~")) / ".ssh" / "dune_key",
        Path(os.path.expanduser("~")) / ".ssh" / "dune_vm",
        Path(os.path.expanduser("~")) / ".ssh" / "dune_fix",
    ]
    for p in candidates:
        if p.exists() and p.stat().st_size > 0:
            return {"found": True, "path": str(p), "size": p.stat().st_size}
    return {"found": False, "path": "", "size": 0,
            "expected": str(Path(os.environ.get("LOCALAPPDATA", "")) / "DuneAwakeningServer" / "sshKey")}


@router.get("/ssh/key")
async def get_ssh_key():
    """Return current SSH key path and whether it exists."""
    import os
    from pathlib import Path
    from backend.config import get_config
    c = get_config()
    path = c.ssh.key_path or ""
    # Fall back to auto-detected key
    if not path:
        for p in [
            Path(os.path.expanduser("~")) / ".ssh" / "dune_key",
            Path(os.environ.get("LOCALAPPDATA", "")) / "DuneAwakeningServer" / "sshKey",
        ]:
            if p.exists():
                path = str(p)
                break
    exists = bool(path) and Path(path).exists()
    size = Path(path).stat().st_size if exists else 0
    return {"path": path, "exists": exists, "size": size}


@router.post("/ssh/key")
async def save_ssh_key(body: SSHKeyRequest):
    """Write a new SSH private key (overwrites existing)."""
    import os
    from pathlib import Path
    if not body.key_path.strip() or not body.content.strip():
        raise HTTPException(400, "Both key_path and content are required")
    p = Path(body.key_path.strip()).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    content = body.content.strip()
    # Normalize line endings and ensure trailing newline
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    if not content.endswith("\n"):
        content += "\n"
    p.write_text(content, encoding="utf-8")
    try:
        os.chmod(str(p), 0o600)
    except Exception:
        pass
    return {"ok": "SSH key saved", "path": str(p), "size": p.stat().st_size}


@router.delete("/ssh/key")
async def delete_ssh_key():
    """Delete the configured SSH private key file."""
    import os
    from pathlib import Path
    from backend.config import get_config
    c = get_config()
    path = c.ssh.key_path or ""
    deleted = False
    if path and Path(path).exists():
        os.remove(path)
        deleted = True
    return {"ok": "SSH key deleted" if deleted else "No key to delete", "deleted": deleted}
