"""Dashboard API - VM and battlegroup status."""
from fastapi import APIRouter
from backend.services.ssh_service import get_ssh
from backend.services.db_service import get_db
import subprocess, socket, urllib.request, json, asyncio, concurrent.futures, logging
logger = logging.getLogger("dune-admin.dashboard")

router = APIRouter(tags=["Dashboard"])

def _ssh_raw(cmd: str, timeout: int = 10):
    """Run a raw SSH command, return stdout or empty string."""
    try:
        ssh = get_ssh()
        key = ssh._find_key()
        c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
             '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
        if key: c += ['-i', key]
        c += [f'dune@{ssh.host}', cmd]
        r = subprocess.run(c, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() if r.returncode == 0 else ""
    except:
        return ""

@router.get("/")
async def get_dashboard():
    ssh = get_ssh(); db = get_db()
    pods = []
    try: pods = await ssh.get_pods()
    except: pass
    running = sum(1 for p in pods if p["status"]=="Running")
    stats = {"total":0,"online":0}
    try: stats = db.get_server_stats()
    except: pass

    # VM CPU, RAM, Uptime — use non-sudo commands
    cpu_percent = 0.0
    memory_used_gb = 0.0
    memory_total_gb = 0.0
    swap_used_gb = 0.0
    swap_total_gb = 0.0
    uptime_seconds = 0
    try:
        # CPU from /proc/stat (no sudo needed)
        cpu_raw = _ssh_raw("grep 'cpu ' /proc/stat | awk '{print ($2+$4)*100/($2+$4+$5)}'", 5)
        if cpu_raw: cpu_percent = round(float(cpu_raw), 1)
        # Memory from /proc/meminfo
        mem_raw = _ssh_raw("grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo | awk '{print $1,$2}'", 5)
        if mem_raw:
            for line in mem_raw.split('\n'):
                parts = line.split()
                if len(parts) >= 2 and parts[1].isdigit():
                    kb = int(parts[1])
                    if parts[0] == 'MemTotal:': memory_total_gb = kb / 1024 / 1024
                    elif parts[0] == 'MemAvailable:': memory_used_gb = (memory_total_gb or 1) - (kb / 1024 / 1024)
                    elif parts[0] == 'SwapTotal:': swap_total_gb = kb / 1024 / 1024
                    elif parts[0] == 'SwapFree:': swap_used_gb = (swap_total_gb or 1) - (kb / 1024 / 1024)
        # Uptime
        uptime_raw = _ssh_raw("cat /proc/uptime 2>/dev/null | awk '{print $1}'", 5)
        if uptime_raw: uptime_seconds = int(float(uptime_raw))
    except: pass

    # Detect Director and FileBrowser URLs
    director_url = ""
    file_browser_url = ""
    vm_ip = ""
    try:
        vm_ip = ssh.host
        code, out, _ = await ssh.run(
            "sudo kubectl get svc -A 2>/dev/null | grep 'bgd-svc' | awk '{print $6}' | cut -d':' -f2 | cut -d'/' -f1", 10)
        director_port = out.strip()
        if director_port and director_port.isdigit():
            director_url = f"http://{vm_ip}:{director_port}"
        code, out, _ = await ssh.run(
            "sudo kubectl get pods -A 2>/dev/null | grep 'fb-deploy'", 5)
        if out.strip() and vm_ip:
            file_browser_url = f"http://{vm_ip}:3001"
    except: pass

    # Check battlegroup CRD for actual stopped state
    bg_status = "down"
    bg_server_count = 0
    bg_healthy = 0
    try:
        code, out, err = await ssh.run(
            f"sudo kubectl get battlegroup -n funcom-seabass-sh-1ba9d7a35da882ec-qagalq sh-1ba9d7a35da882ec-qagalq -o json 2>&1", 10)
        logger.info(f"BG status check: code={code}, out_len={len(out)}, err={err[:100] if err else 'none'}")
        if code == 0 and out.strip():
            import json as _json
            bg_data = _json.loads(out)
            bg_spec = bg_data.get("spec", {})
            bg_status_raw = bg_data.get("status", {})
            bg_stopped = bg_spec.get("stop", False)
            bg_server_count = bg_status_raw.get("serverCount", 0) or bg_status_raw.get("servers", 0)
            bg_healthy = bg_status_raw.get("healthyServers", 0) or bg_status_raw.get("healthy", 0)
            if isinstance(bg_server_count, list): bg_server_count = len(bg_server_count)
            if isinstance(bg_healthy, list): bg_healthy = sum(1 for s in bg_healthy if str(s.get("health","")).lower()=="healthy")
            bg_status = "stopped" if bg_stopped else ("healthy" if bg_healthy >= bg_server_count else "running")
            logger.info(f"BG: stopped={bg_stopped}, servers={bg_server_count}, healthy={bg_healthy}, status={bg_status}")
    except Exception as e:
        logger.warning(f"BG status check failed: {e}")

    return {"vm":{"name":"dune-awakening","status":"running" if pods else "offline",
        "ip_address":vm_ip or "172.28.248.224",
        "cpu_percent":cpu_percent,"memory_used_gb":memory_used_gb,"memory_total_gb":memory_total_gb,
        "swap_used_gb":swap_used_gb,"swap_total_gb":swap_total_gb,
        "uptime_seconds":uptime_seconds},
        "battlegroup":{"status":bg_status,"pods":pods,"server_count":bg_server_count or len(pods),"healthy_servers":bg_healthy or running,"uptime_seconds":uptime_seconds},
        "stats":stats,"quick_links":{"director_url":director_url,"file_browser_url":file_browser_url},
        "tcp_ports": await _check_tcp_ports(vm_ip),
        "public_ip": await _get_public_ip()}

async def _check_tcp_ports(host: str):
    """Check if common TCP ports are open on the VM."""
    ports = [{"port":8080,"name":"Admin Panel"},{"port":18888,"name":"File Browser"},
             {"port":32218,"name":"Director"},{"port":15432,"name":"PostgreSQL"},
             {"port":15672,"name":"RabbitMQ"},{"port":22,"name":"SSH"}]
    if not host or host == "127.0.0.1":
        return [{"port":p["port"],"name":p["name"],"open":False} for p in ports]
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        tasks = []
        for p in ports:
            tasks.append(loop.run_in_executor(pool, _tcp_connect, host, p))
        results = await asyncio.gather(*tasks, return_exceptions=True)
    return [{"port":p["port"],"name":p["name"],"open":r is True} if r is not False and not isinstance(r,Exception) else {"port":p["port"],"name":p["name"],"open":False} for p,r in zip(ports,results)]

def _tcp_connect(host, port_info):
    try:
        s = socket.create_connection((host, port_info["port"]), timeout=3)
        s.close()
        return True
    except: return False

async def _get_public_ip():
    try:
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            data = await loop.run_in_executor(pool, lambda: urllib.request.urlopen("https://api.ipify.org?format=json", timeout=5).read())
            ip_info = json.loads(data)
            ip = ip_info.get("ip","")
            # Try to get ISP via ip-api
            try:
                data2 = await loop.run_in_executor(pool, lambda: urllib.request.urlopen(f"http://ip-api.com/json/{ip}?fields=isp", timeout=5).read())
                isp_data = json.loads(data2)
                return {"ip":ip,"isp":isp_data.get("isp","")}
            except:
                return {"ip":ip,"isp":""}
    except: return {"ip":"N/A","isp":""}

@router.get("/vm-status")
async def vm_status():
    pods = await get_ssh().get_pods()
    return {"status":"running" if pods else "offline","name":"dune-awakening","ip":"127.0.0.1"}

@router.get("/battlegroup-status")
async def battlegroup_status():
    pods = await get_ssh().get_pods()
    r = sum(1 for p in pods if p["status"]=="Running")
    return {"status":"healthy" if r==len(pods) and pods else ("degraded" if r>0 else "down"),"pods_total":len(pods),"pods_healthy":r}
