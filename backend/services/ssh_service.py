"""SSH service for VM communication."""
import asyncio, logging, os, subprocess, socket, threading
from pathlib import Path
from typing import Optional, Tuple

import paramiko

logger = logging.getLogger("dune-admin.ssh")

_CACHE_FILE = Path(os.environ.get("TEMP", "")) / "dune_vm_ip.txt"


def _save_ip_cache(ip: str):
    """Save detected IP to cache for instant lookup next time."""
    try:
        _CACHE_FILE.write_text(ip)
    except Exception:
        pass


def _check_ssh(ip: str, timeout: float = 3.0) -> bool:
    """Quick check if SSH port 22 is open on given IP."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, 22))
        sock.close()
        return result == 0
    except Exception:
        return False


def _detect_vm_ip():
    """Auto-detect the Dune VM's IPv4 address. Multiple methods, no admin needed."""
    ip = None

    # Method 1: Hyper-V PowerShell (most reliable, always current)
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "(Get-VMNetworkAdapter -VMName 'dune-awakening' -EA Stop).IPAddresses | Where {$_ -match '^\\d+\\.'} | Select -First 1"],
            capture_output=True, text=True, timeout=10
        )
        ip = r.stdout.strip()
        if ip and '.' in ip:
            if _check_ssh(ip, 2.0):
                logger.info(f"VM IP (Hyper-V): {ip}")
                _save_ip_cache(ip)
                return ip
            else:
                # IP detected but SSH not ready yet - save for later, continue trying
                _save_ip_cache(ip)
                logger.info(f"VM IP detected ({ip}) but SSH not responding yet")
    except Exception:
        pass

    # Method 2: Cached IP (fast fallback)
    if _CACHE_FILE.exists():
        try:
            cached = _CACHE_FILE.read_text().strip()
            if cached and _check_ssh(cached, 1.0):
                logger.info(f"VM IP (cached): {cached}")
                return cached
        except Exception:
            pass

    # Method 3: ARP table scan — find devices on local subnet, try SSH
    try:
        r = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)
        imported_re = __import__('re')
        for line in r.stdout.splitlines():
            match = imported_re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
            if match:
                candidate = match.group(1)
                # Skip localhost, broadcast, gateway-like IPs
                if candidate.startswith(('127.', '0.', '224.', '255.')):
                    continue
                if candidate.endswith('.1') or candidate.endswith('.255'):
                    continue  # Usually gateway or broadcast
                if candidate == '192.168.1.100' or candidate == '192.168.1.217':  # Fast-track VM IPs
                    if _check_ssh(candidate, 1.0):
                        logger.info(f"VM IP (ARP): {candidate}")
                        _save_ip_cache(candidate)
                        return candidate
                # Don't scan all IPs — too slow. Just check if we have a known one.
        # Try the most common Dune VM IPs quickly
        for candidate in ['192.168.1.217', '192.168.1.218', '192.168.1.219']:
            if _check_ssh(candidate, 0.8):
                logger.info(f"VM IP (common): {candidate}")
                _save_ip_cache(candidate)
                return candidate
    except Exception:
        pass

    # Method 4: Try to find IP from battlegroup logs
    server_paths = [
        r"D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server",
        r"C:\Program Files (x86)\Steam\steamapps\common\Dune Awakening Self-Hosted Server",
    ]
    for sp in server_paths:
        log_dir = Path(sp) / ".logs"
        if log_dir.exists():
            try:
                for log_file in sorted(log_dir.glob("*.log"), reverse=True)[:3]:
                    content = log_file.read_text(errors='ignore')
                    imported_re = __import__('re')
                    match = imported_re.search(r'IP[:\s]+(\d+\.\d+\.\d+\.\d+)', content)
                    if match:
                        candidate = match.group(1)
                        if _check_ssh(candidate, 1.0):
                            logger.info(f"VM IP (logs): {candidate}")
                            _save_ip_cache(candidate)
                            return candidate
            except Exception:
                pass

    # Hard fallback to Dune VM
    return "192.168.1.100"

class SSHService:
    def __init__(self, host="127.0.0.1", port=22, user="dune", key_path="", password=""):
        # If host is explicitly set (not default 127.0.0.1), skip auto-detection
        if host and host != "127.0.0.1":
            self.host = host
            logger.info(f"Using configured VM host: {host}")
        else:
            # Auto-detect VM IP
            detected = _detect_vm_ip()
            if detected:
                logger.info(f"Detected VM at {detected}")
                self.host = detected
            else:
                self.host = host
        self.port, self.user = port, user
        self.key_path = key_path
        self.password = password
        self._client = None
        self._lock = threading.Lock()

    def _find_key(self):
        if self.key_path and Path(self.key_path).exists():
            return self.key_path
        for p in [
            Path.home()/".ssh"/"dune_key",
            Path.home()/".ssh"/"dune_fix",
            Path.home()/".ssh"/"dune_vm",
            Path(os.environ.get("LOCALAPPDATA",""))/"DuneAwakeningServer"/"sshKey",
        ]:
            if p.exists(): return str(p)
        return None

    def _ensure_connected(self):
        """Get or create paramiko SSH client."""
        with self._lock:
            if self._client is not None and self._client.get_transport() is not None and self._client.get_transport().is_active():
                return self._client
            
            logger.info(f"Connecting to {self.host}:{self.port} as {self.user}...")
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Try password first if configured, then key
            if self.password:
                try:
                    logger.info("Trying password auth")
                    client.connect(self.host, port=self.port, username=self.user,
                                  password=self.password, timeout=15, banner_timeout=30, auth_timeout=10,
                                  look_for_keys=False, allow_agent=False)
                    logger.info(f"Connected to {self.host} via password")
                    self._client = client
                    return client
                except Exception as e:
                    logger.warning(f"Password auth failed: {e}")
            
            key = self._find_key()
            if key:
                try:
                    logger.info(f"Trying key auth: {key}")
                    # Try all key types
                    pkey = None
                    for key_class in [paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey, paramiko.DSSKey]:
                        try:
                            pkey = key_class.from_private_key_file(key)
                            logger.info(f"Loaded key as {key_class.__name__}")
                            break
                        except Exception:
                            continue
                    
                    if pkey:
                        client.connect(self.host, port=self.port, username=self.user, 
                                      pkey=pkey, timeout=10, banner_timeout=30, auth_timeout=10,
                                      look_for_keys=False, allow_agent=False)
                    else:
                        client.connect(self.host, port=self.port, username=self.user,
                                      key_filename=key, timeout=10, banner_timeout=30, auth_timeout=10)
                    logger.info(f"Connected to {self.host} via key")
                    self._client = client
                    return client
                except paramiko.ssh_exception.PasswordRequiredException:
                    logger.warning("Key requires passphrase, skipping")
                except Exception as e:
                    logger.warning(f"Key auth failed: {e}")
            
            # Last resort: try default auth
            try:
                logger.info(f"Trying default auth (agent/keys)")
                client.connect(self.host, port=self.port, username=self.user,
                              timeout=10, banner_timeout=10, auth_timeout=10)
                logger.info(f"Connected to {self.host} via default")
                self._client = client
                return client
            except Exception as e:
                logger.error(f"All auth methods failed: {e}")
                try: client.close()
                except: pass
                raise

    async def connect(self):
        """Async wrapper for SSH connect."""
        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(None, self._ensure_connected)
        except Exception as e:
            logger.error(f"connect error: {e}")
            return False

    async def run(self, cmd, timeout=30):
        """Run command via system SSH with key."""
        key = self._find_key()
        ssh_cmd = ["C:\\Windows\\System32\\OpenSSH\\ssh.exe",
                   "-o", "StrictHostKeyChecking=no",
                   "-o", "ConnectTimeout=10",
                   "-o", "BatchMode=yes",
                   "-o", "LogLevel=QUIET"]
        if key:
            ssh_cmd += ["-i", key]
        ssh_cmd += [f"{self.user}@{self.host}", cmd]

        try:
            result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)
            return (result.returncode, result.stdout, result.stderr)
        except subprocess.TimeoutExpired:
            return (-1, "", "Timeout")
        except Exception as e:
            return (-1, "", str(e))

    async def kubectl(self, cmd, timeout=30):
        return await self.run(f"sudo kubectl {cmd}", timeout)

    async def get_pods(self):
        _, out, _ = await self.kubectl("get pods -A --no-headers 2>/dev/null", 15)
        pods = []
        for line in out.strip().split("\n"):
            p = line.split()
            if len(p) >= 5:
                pods.append({"namespace":p[0],"name":p[1],"ready":p[2],"status":p[3],
                    "restarts":int(p[4]) if p[4].isdigit() else 0, "age":p[5] if len(p)>5 else ""})
        return pods

    async def read_file(self, path):
        _, out, _ = await self.run(f"cat '{path}' 2>/dev/null")
        return out

    async def write_file(self, path, content):
        import base64
        b64 = base64.b64encode(content.encode()).decode()
        c, _, _ = await self.run(f"echo '{b64}' | base64 -d > '{path}'")
        return c == 0

    async def list_files(self, path):
        _, out, _ = await self.run(f"ls -la '{path}' 2>/dev/null")
        files = []
        for line in out.strip().split("\n")[1:]:
            p = line.split()
            if len(p) >= 9:
                files.append({"perms":p[0],"size":p[4],"name":" ".join(p[8:]),"is_dir":p[0].startswith("d")})
        return files

_ssh = None
def get_ssh():
    global _ssh
    if _ssh is None:
        from backend.config import get_config
        c = get_config()
        _ssh = SSHService(c.ssh.host, c.ssh.port, c.ssh.user, c.ssh.key_path, c.ssh.password)
    return _ssh


def reset_ssh():
    """Reset the SSH singleton so new config is picked up."""
    global _ssh
    _ssh = None
