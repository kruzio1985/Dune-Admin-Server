"""Server Control API — one-click VM & battlegroup automation."""
from fastapi import APIRouter, HTTPException
from backend.services.ssh_service import get_ssh
import subprocess, os, json

router = APIRouter(tags=["Server Control"])

SERVER_DIR = None  # detected dynamically

def _find_server():
    """Auto-detect Dune server directory."""
    global SERVER_DIR
    if SERVER_DIR and os.path.isdir(SERVER_DIR):
        return SERVER_DIR
    # Check registry for Steam path
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")
        steam = winreg.QueryValueEx(key, "InstallPath")[0]
        winreg.CloseKey(key)
        # Check main + library folders
        vdf = os.path.join(steam, "steamapps", "libraryfolders.vdf")
        paths = [os.path.join(steam, "steamapps", "common", "Dune Awakening Self-Hosted Server")]
        if os.path.isfile(vdf):
            with open(vdf, "r") as f:
                for line in f:
                    if '"path"' in line:
                        lib = line.split('"')[3].replace("\\\\", "\\")
                        paths.append(os.path.join(lib, "steamapps", "common", "Dune Awakening Self-Hosted Server"))
        for p in paths:
            if os.path.isdir(p):
                SERVER_DIR = p
                return p
    except:
        pass
    return None

def _run_admin_ps(script):
    """Run PowerShell, return stdout. Note: Hyper-V commands need admin."""
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
            capture_output=True, text=True, timeout=120,
            cwd=_find_server() or "C:\\"
        )
        out = (result.stdout or "") + (result.stderr or "")
        # Check for access denied
        if "access is denied" in out.lower() or "nie masz uprawnień" in out.lower() or "administrator" in out.lower():
            return False, "ADMIN_REQUIRED: " + out[:200]
        if "nie masz uprawnie" in out.lower().replace('ń','n'):
            return False, "ADMIN_REQUIRED: Run as Administrator"
        return result.returncode == 0, out
    except subprocess.TimeoutExpired:
        return False, "Timeout (120s)"
    except Exception as e:
        return False, str(e)


@router.get("/status")
async def server_status():
    """Full server status: VM, battlegroup, networking."""
    server_dir = _find_server()
    vm_info = {"exists": False, "running": False, "state": "unknown", "ip": None}
    bg_info = {"started": False, "pods": [], "healthy": 0, "total": 0}

    # VM status
    ok, out = _run_admin_ps(
        'try { $vm = Get-VM -Name "dune-awakening" -ErrorAction Stop; '
        'Write-Host "EXISTS:$($vm.State)"; '
        '$ip = (Get-VMNetworkAdapter -VMName "dune-awakening").IPAddresses | Where {$_ -match "^\d+\."} | Select -First 1; '
        'Write-Host "IP:$ip" } catch { Write-Host "NO_VM" }'
    )
    for line in out.split('\n'):
        if line.startswith('EXISTS:'):
            state = line[7:].strip()
            vm_info["exists"] = True
            vm_info["running"] = state == "Running"
            vm_info["state"] = state
        elif line.startswith('IP:'):
            vm_info["ip"] = line[3:].strip() or None

    # Battlegroup via SSH
    if vm_info["running"] and vm_info["ip"]:
        try:
            ssh = get_ssh()
            code, pods_out, _ = await ssh.kubectl("get pods -n dune -o wide", timeout=15)
            if code == 0:
                pods = []
                for line in pods_out.strip().split('\n')[1:]:
                    parts = line.split()
                    if len(parts) >= 6:
                        pods.append({"name": parts[0], "ready": parts[1], "status": parts[2],
                                    "restarts": parts[3], "age": parts[4], "ip": parts[5] if len(parts)>5 else ""})
                        if parts[2] == "Running" and "/" in parts[1] and parts[1].split('/')[0] == parts[1].split('/')[1]:
                            bg_info["healthy"] += 1
                bg_info["pods"] = pods
                bg_info["total"] = len(pods)
                bg_info["started"] = len(pods) > 0
        except:
            pass

    return {
        "vm": vm_info,
        "battlegroup": bg_info,
        "server_dir": server_dir,
        "ssh_key": os.path.isfile(os.path.join(os.environ.get("LOCALAPPDATA",""), "DuneAwakeningServer", "sshKey"))
    }


@router.post("/vm/start")
async def start_vm():
    """Start the Dune VM."""
    ok, out = _run_admin_ps('Start-VM -Name "dune-awakening" -ErrorAction Stop; Write-Host "VM_STARTED"')
    if not ok and "is already running" not in out.lower():
        raise HTTPException(500, out[:200])
    return {"ok": "VM started", "output": out[:500]}


@router.post("/vm/stop")
async def stop_vm():
    """Stop the Dune VM."""
    ok, out = _run_admin_ps('Stop-VM -Name "dune-awakening" -Force -ErrorAction Stop; Write-Host "VM_STOPPED"')
    if not ok and "is not running" not in out.lower():
        raise HTTPException(500, out[:200])
    return {"ok": "VM stopped", "output": out[:500]}


@router.post("/vm/restart")
async def restart_vm():
    """Restart the VM."""
    _run_admin_ps('Stop-VM -Name "dune-awakening" -Force -ErrorAction SilentlyContinue')
    import asyncio
    await asyncio.sleep(3)
    ok, out = _run_admin_ps('Start-VM -Name "dune-awakening" -ErrorAction Stop; Write-Host "VM_RESTARTED"')
    return {"ok": "VM restarting", "output": out[:500]}


@router.post("/ssh-key/generate")
async def generate_ssh_key():
    """Generate new SSH key for VM access (requires VM running)."""
    server_dir = _find_server()
    if not server_dir:
        raise HTTPException(404, "Server directory not found")

    # Get VM IP
    ok, out = _run_admin_ps(
        'try { $ip = (Get-VMNetworkAdapter -VMName "dune-awakening").IPAddresses | Where {$_ -match "^\d+\."} | Select -First 1; Write-Host "IP:$ip" } catch { Write-Host "NO_IP" }'
    )
    vm_ip = None
    for line in out.split('\n'):
        if line.startswith('IP:'):
            vm_ip = line[3:].strip()
    if not vm_ip:
        raise HTTPException(500, "VM has no IPv4 address. Is it running?")

    # Generate key and copy to VM
    key_dir = os.path.join(os.environ.get("LOCALAPPDATA",""), "DuneAwakeningServer")
    os.makedirs(key_dir, exist_ok=True)
    key_path = os.path.join(key_dir, "sshKey")

    # Generate ed25519 key
    subprocess.run(["ssh-keygen", "-t", "ed25519", "-f", key_path, "-N", '""', "-q"], shell=True, capture_output=True)

    # Copy to VM (try ssh-copy-id equivalent)
    result = subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "LogLevel=QUIET",
         "-i", key_path, f"dune@{vm_ip}", "echo key_ok"],
        capture_output=True, text=True, timeout=30
    )

    return {"ok": f"SSH key generated at {key_path}", "vm_ip": vm_ip,
            "key_exists": os.path.isfile(key_path)}


@router.post("/battlegroup/start")
async def start_battlegroup():
    """Start the battlegroup on the VM via SSH."""
    ssh = get_ssh()
    code, out, err = await ssh.run("/home/dune/.dune/bin/battlegroup start 2>&1 || sudo /usr/local/bin/battlegroup start 2>&1 || echo BG_FAIL", timeout=120)
    if "BG_FAIL" in out + err or code != 0:
        raise HTTPException(500, f"Battlegroup start failed: {out[:300]}")
    return {"ok": "Battlegroup starting", "output": out[:500]}


@router.post("/battlegroup/stop")
async def stop_battlegroup():
    """Stop the battlegroup."""
    ssh = get_ssh()
    code, out, err = await ssh.run("/home/dune/.dune/bin/battlegroup stop 2>&1 || sudo /usr/local/bin/battlegroup stop 2>&1 || echo BG_FAIL", timeout=60)
    return {"ok": "Battlegroup stopping", "output": out[:500]}


@router.post("/auto-setup")
async def auto_setup():
    """Full automatic setup: check -> start VM -> wait IP -> SSH key -> start battlegroup."""
    steps = []

    # 1. Find server
    sd = _find_server()
    steps.append({"step": "server_dir", "ok": bool(sd), "detail": sd or "not found"})
    if not sd:
        raise HTTPException(404, "Server directory not found. Install Dune server in Steam first.")

    # 2. Check/start VM
    ok, out = _run_admin_ps(
        'try { $vm = Get-VM -Name "dune-awakening" -ErrorAction Stop; '
        'if ($vm.State -ne "Running") { Start-VM -Name "dune-awakening"; Write-Host "VM_STARTING" } '
        'else { Write-Host "VM_ALREADY_RUNNING" } } catch { Write-Host "NO_VM" }'
    )
    if "NO_VM" in out:
        raise HTTPException(500, "VM does not exist. Run battlegroup.bat → initial-setup first.")
    steps.append({"step": "vm_start", "ok": True, "detail": "VM is starting/running"})

    # 3. Wait for IP
    import asyncio
    vm_ip = None
    for i in range(30):  # wait up to 5 min
        await asyncio.sleep(10)
        ok, out = _run_admin_ps(
            'try { $ip = (Get-VMNetworkAdapter -VMName "dune-awakening").IPAddresses | Where {$_ -match "^\d+\."} | Select -First 1; Write-Host "IP:$ip" } catch { Write-Host "NO_IP" }'
        )
        for line in out.split('\n'):
            if line.startswith('IP:') and len(line) > 4:
                vm_ip = line[3:].strip()
                break
        if vm_ip:
            break
    steps.append({"step": "vm_ip", "ok": bool(vm_ip), "detail": vm_ip or "timeout"})
    if not vm_ip:
        raise HTTPException(500, "VM did not get IP after 5 minutes. Check network settings.")

    # 4. Generate SSH key if missing
    key_path = os.path.join(os.environ.get("LOCALAPPDATA",""), "DuneAwakeningServer", "sshKey")
    if not os.path.isfile(key_path):
        key_dir = os.path.dirname(key_path)
        os.makedirs(key_dir, exist_ok=True)
        subprocess.run(f'ssh-keygen -t ed25519 -f "{key_path}" -N "" -q', shell=True, capture_output=True, timeout=10)
        steps.append({"step": "ssh_key", "ok": True, "detail": "Generated new key"})
    else:
        steps.append({"step": "ssh_key", "ok": True, "detail": "Key already exists"})

    return {"ok": "Auto-setup complete", "vm_ip": vm_ip, "steps": steps, "next": "Click 'Save & Apply Token' then start battlegroup"}
