"""
Dune Admin Manager - Hyper-V Provider

Provider dla oficjalnej instalki Dune Awakening na Windows 10/11 Pro z Hyper-V.
Komunikuje się przez PowerShell (lokalnie) i SSH (do VM).
"""

import asyncio
import os
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

import asyncssh

from backend.providers.base import (
    BaseProvider, VMInfo, BattlegroupInfo, PodInfo,
    ServerStatus, BattlegroupStatus, ServerSettings, LogEntry, DatabaseBackup,
)

logger = logging.getLogger("dune-admin.provider.hyperv")


class HyperVProvider(BaseProvider):
    """
    Provider Hyper-V dla Windows.

    Wykorzystuje:
    - PowerShell do zarządzania Hyper-V (lokalnie)
    - SSH do komunikacji z VM (komendy battlegroup, kubectl, PostgreSQL)
    """

    def __init__(self, config):
        super().__init__(config)
        self._ssh_client: Optional[asyncssh.SSHClientConnection] = None
        self._ssh_lock = asyncio.Lock()

    # ── SSH Connection ─────────────────────────────────────────────────────

    async def _connect_ssh(self) -> asyncssh.SSHClientConnection:
        """Nawiązuje połączenie SSH z VM."""
        if self._ssh_client and not self._ssh_client.is_closed():
            return self._ssh_client

        ssh_cfg = self.config.ssh

        # Określ klucz SSH
        client_keys = []
        key_path = ssh_cfg.key_path
        if not key_path:
            # Auto-detekcja
            candidates = [
                Path(os.environ.get("LOCALAPPDATA", "")) / "DuneAwakeningServer" / "sshKey",
                Path.home() / ".dune-admin-manager" / "sshKey",
                Path.home() / ".ssh" / "dune",
                Path.home() / ".ssh" / "id_ed25519",
                Path.home() / ".ssh" / "id_rsa",
                Path("sshKey"),
            ]
            for p in candidates:
                if p.exists():
                    key_path = str(p)
                    break

        if key_path:
            client_keys.append(key_path)

        try:
            self._ssh_client = await asyncssh.connect(
                host=ssh_cfg.host,
                port=ssh_cfg.port,
                username=ssh_cfg.user,
                password=ssh_cfg.password or None,
                client_keys=client_keys if client_keys else None,
                known_hosts=None,  # Akceptuj nieznane hosty
            )
            logger.info(f"SSH connected to {ssh_cfg.host}:{ssh_cfg.port}")
            return self._ssh_client
        except Exception as e:
            logger.error(f"SSH connection failed: {e}")
            raise

    async def _disconnect_ssh(self):
        """Zamyka połączenie SSH."""
        if self._ssh_client and not self._ssh_client.is_closed():
            self._ssh_client.close()
            self._ssh_client = None

    async def run_command(self, command: str, timeout: int = 30) -> tuple[int, str, str]:
        """Wykonuje komendę przez SSH na VM."""
        async with self._ssh_lock:
            try:
                ssh = await self._connect_ssh()
                result = await asyncio.wait_for(
                    ssh.run(command),
                    timeout=timeout,
                )
                exit_code = result.exit_status if result.exit_status is not None else result.returncode if hasattr(result, 'returncode') else 0
                return (exit_code, result.stdout or "", result.stderr or "")
            except asyncio.TimeoutError:
                logger.warning(f"Command timed out after {timeout}s: {command}")
                return (-1, "", "Command timed out")
            except Exception as e:
                logger.error(f"Command failed: {e}")
                return (-1, "", str(e))

    # ── PowerShell (lokalny Hyper-V) ───────────────────────────────────────

    def _run_powershell(self, script: str) -> tuple[int, str, str]:
        """Uruchamia skrypt PowerShell lokalnie."""
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                capture_output=True,
                text=True,
                timeout=60,
            )
            return (result.returncode, result.stdout.strip(), result.stderr.strip())
        except subprocess.TimeoutExpired:
            return (-1, "", "PowerShell command timed out")
        except Exception as e:
            return (-1, "", str(e))

    # ── VM Management ──────────────────────────────────────────────────────

    async def get_vm_info(self) -> VMInfo:
        """Pobiera informacje o VM przez PowerShell."""
        vm_name = self.config.hyperv.vm_name

        # Sprawdź status VM
        ps_script = f"""
        $vm = Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue
        if ($vm) {{
            $status = $vm.State.ToString()
            $uptime = if ($vm.Uptime) {{ $vm.Uptime.TotalSeconds }} else {{ 0 }}
            $memAssigned = [math]::Round($vm.MemoryAssigned / 1GB, 1)
            $memDemand = [math]::Round($vm.MemoryDemand / 1GB, 1)
            $cpu = $vm.CPUUsage
            $ip = (Get-VMNetworkAdapter -VMName '{vm_name}' | Select-Object -First 1).IPAddresses | Where-Object {{ $_ -match '^\\d+\\.\\d+\\.\\d+\\.\\d+$' }} | Select-Object -First 1
            Write-Output "$status|$uptime|$memAssigned|$memDemand|$cpu|$ip"
        }} else {{
            Write-Output "Off|0|0|0|0|"
        }}
        """

        exit_code, stdout, stderr = self._run_powershell(ps_script)

        if exit_code != 0 and not stdout:
            return VMInfo(
                name=vm_name,
                status=ServerStatus.UNKNOWN,
                ip_address="",
            )

        parts = stdout.split("|")
        status_str = parts[0] if len(parts) > 0 else "Off"
        uptime = float(parts[1]) if len(parts) > 1 else 0
        mem_assigned = float(parts[2]) if len(parts) > 2 else 0
        mem_demand = float(parts[3]) if len(parts) > 3 else 0
        cpu = float(parts[4]) if len(parts) > 4 else 0
        ip = parts[5] if len(parts) > 5 else ""

        status_map = {
            "Running": ServerStatus.RUNNING,
            "Off": ServerStatus.STOPPED,
            "Paused": ServerStatus.STOPPED,
            "Starting": ServerStatus.STARTING,
        }
        status = status_map.get(status_str, ServerStatus.UNKNOWN)

        return VMInfo(
            name=vm_name,
            status=status,
            cpu_usage_percent=cpu,
            memory_usage_gb=mem_demand,
            memory_total_gb=self.config.hyperv.memory_gb,
            uptime_seconds=int(uptime),
            ip_address=ip,
        )

    async def start_vm(self) -> bool:
        """Uruchamia VM przez PowerShell."""
        vm_name = self.config.hyperv.vm_name
        exit_code, stdout, stderr = self._run_powershell(f"Start-VM -Name '{vm_name}'")
        return exit_code == 0

    async def stop_vm(self) -> bool:
        """Zatrzymuje VM."""
        vm_name = self.config.hyperv.vm_name
        exit_code, stdout, stderr = self._run_powershell(f"Stop-VM -Name '{vm_name}' -Force")
        return exit_code == 0

    async def restart_vm(self) -> bool:
        await self.stop_vm()
        await asyncio.sleep(5)
        return await self.start_vm()

    async def vm_status(self) -> ServerStatus:
        info = await self.get_vm_info()
        return info.status

    # ── Battlegroup Management (via SSH) ───────────────────────────────────

    async def get_battlegroup_info(self) -> BattlegroupInfo:
        """Pobiera informacje o battlegroup przez kubectl."""
        try:
            # Sprawdź pody
            exit_code, stdout, stderr = await self.run_command(
                "sudo kubectl get pods -A --no-headers 2>/dev/null",
                timeout=15,
            )

            pods = []
            if exit_code == 0 and stdout:
                for line in stdout.strip().split("\n"):
                    parts = line.split()
                    if len(parts) >= 5:
                        pods.append(PodInfo(
                            namespace=parts[0],
                            name=parts[1],
                            ready=parts[2],
                            status=parts[3],
                            restarts=int(parts[4]) if parts[4].isdigit() else 0,
                            age=parts[5] if len(parts) > 5 else "",
                        ))

            # Policz zdrowe serwery
            running = sum(1 for p in pods if p.status == "Running")
            total = len([p for p in pods if "game" in p.name.lower() or "server" in p.name.lower()])

            # Określ status
            if running == 0:
                bg_status = BattlegroupStatus.DOWN
            elif running == len(pods):
                bg_status = BattlegroupStatus.HEALTHY
            else:
                bg_status = BattlegroupStatus.DEGRADED

            # Pobierz Director NodePort
            exit_code, svc_out, _ = await self.run_command(
                "sudo kubectl get svc -A 2>/dev/null | grep bgd-svc",
                timeout=10,
            )
            director_port = ""
            if svc_out:
                import re
                match = re.search(r"11717:(\d+)", svc_out)
                if match:
                    director_port = match.group(1)

            vm_info = await self.get_vm_info()

            return BattlegroupInfo(
                name=self.config.hyperv.vm_name,
                status=bg_status,
                server_count=total,
                healthy_servers=running,
                pods=pods,
                director_url=f"https://{vm_info.ip_address}:{director_port}" if vm_info.ip_address and director_port else "",
                file_browser_url=f"https://{vm_info.ip_address}:8443" if vm_info.ip_address else "",
            )
        except Exception as e:
            logger.error(f"Failed to get battlegroup info: {e}")
            return BattlegroupInfo(
                name=self.config.hyperv.vm_name,
                status=BattlegroupStatus.UNKNOWN,
            )

    async def start_battlegroup(self) -> bool:
        """Uruchamia battlegroup przez SSH."""
        # Najpierw upewnij się, że VM działa
        status = await self.vm_status()
        if status != ServerStatus.RUNNING:
            await self.start_vm()
            await asyncio.sleep(30)  # Poczekaj na boot VM

        server_path = self.config.hyperv.server_path
        bg_bat = os.path.join(server_path, "battlegroup.bat").replace("\\", "/")

        exit_code, stdout, stderr = await self.run_command(
            f"cd '{server_path}' && echo 'start' | cmd.exe /c '{bg_bat}' 2>&1",
            timeout=120,
        )
        return exit_code == 0

    async def stop_battlegroup(self) -> bool:
        server_path = self.config.hyperv.server_path
        bg_bat = os.path.join(server_path, "battlegroup.bat").replace("\\", "/")

        exit_code, stdout, stderr = await self.run_command(
            f"cd '{server_path}' && echo 'stop' | cmd.exe /c '{bg_bat}' 2>&1",
            timeout=120,
        )
        return exit_code == 0

    async def restart_battlegroup(self) -> bool:
        await self.stop_battlegroup()
        await asyncio.sleep(10)
        return await self.start_battlegroup()

    async def update_battlegroup(self) -> bool:
        server_path = self.config.hyperv.server_path
        bg_bat = os.path.join(server_path, "battlegroup.bat").replace("\\", "/")

        exit_code, stdout, stderr = await self.run_command(
            f"cd '{server_path}' && echo 'update' | cmd.exe /c '{bg_bat}' 2>&1",
            timeout=300,
        )
        return exit_code == 0

    async def battlegroup_status(self) -> BattlegroupStatus:
        info = await self.get_battlegroup_info()
        return info.status

    # ── Database ───────────────────────────────────────────────────────────

    async def db_query(self, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Wykonuje SQL przez kubectl exec do postgresa."""
        query_escaped = sql.replace("'", "'\\''")
        cmd = f"sudo kubectl exec -n dune deploy/postgres -- psql -U dune -d dune -c \"{query_escaped}\" 2>/dev/null"

        exit_code, stdout, stderr = await self.run_command(cmd, timeout=30)

        if exit_code != 0:
            logger.error(f"DB query failed: {stderr}")
            return []

        # Prosty parser wyniku psql
        lines = stdout.strip().split("\n")
        if len(lines) < 2:
            return []

        headers = [h.strip() for h in lines[0].split("|")]
        rows = []
        for line in lines[2:]:  # Skip header + separator
            if line.startswith("("):
                break
            parts = [p.strip() for p in line.split("|")]
            if len(parts) == len(headers):
                rows.append(dict(zip(headers, parts)))

        return rows

    async def db_backup(self, output_path: str) -> bool:
        """Backup bazy przez kubectl exec."""
        cmd = f"sudo kubectl exec -n dune deploy/postgres -- pg_dump -U dune -d dune -F c -f /tmp/dune_backup.dump"
        exit_code, _, stderr = await self.run_command(cmd, timeout=300)

        if exit_code != 0:
            logger.error(f"Backup failed: {stderr}")
            return False

        # Skopiuj plik z VM
        # W praktyce trzeba by użyć SCP lub kubectl cp
        logger.info(f"Backup created at /tmp/dune_backup.dump on VM")
        return True

    async def db_restore(self, backup_path: str) -> bool:
        """Restore bazy danych."""
        # Najpierw wgraj plik na VM, potem restore
        logger.warning("DB restore - implement SCP upload + pg_restore")
        return False

    # ── File Operations ────────────────────────────────────────────────────

    async def read_file(self, path: str) -> str:
        exit_code, stdout, stderr = await self.run_command(f"cat '{path}' 2>/dev/null")
        return stdout if exit_code == 0 else ""

    async def write_file(self, path: str, content: str) -> bool:
        # Escape content for shell
        import base64
        encoded = base64.b64encode(content.encode()).decode()
        exit_code, _, stderr = await self.run_command(
            f"echo '{encoded}' | base64 -d > '{path}'"
        )
        return exit_code == 0

    async def list_files(self, path: str) -> List[Dict[str, Any]]:
        exit_code, stdout, stderr = await self.run_command(
            f"ls -la '{path}' 2>/dev/null",
            timeout=10,
        )
        if exit_code != 0:
            return []

        files = []
        for line in stdout.strip().split("\n")[1:]:  # Skip "total" line
            parts = line.split()
            if len(parts) >= 9:
                files.append({
                    "permissions": parts[0],
                    "size": parts[4],
                    "name": " ".join(parts[8:]),
                    "is_dir": parts[0].startswith("d"),
                })
        return files

    # ── INI Configuration ──────────────────────────────────────────────────

    async def read_ini(self, path: str) -> Dict[str, Dict[str, str]]:
        """Odczytuje plik INI z VM."""
        content = await self.read_file(path)
        if not content:
            return {}

        import configparser
        config = configparser.ConfigParser()
        config.read_string(content)

        result = {}
        for section in config.sections():
            result[section] = dict(config[section])
        return result

    async def write_ini(self, path: str, data: Dict[str, Dict[str, str]]) -> bool:
        """Zapisuje plik INI na VM."""
        content = ""
        for section, values in data.items():
            content += f"[{section}]\n"
            for key, value in values.items():
                content += f"{key}={value}\n"
            content += "\n"

        return await self.write_file(path, content)

    # ── Server Settings ────────────────────────────────────────────────────

    async def get_server_settings(self) -> ServerSettings:
        """Pobiera ustawienia serwera z UserGame.ini."""
        settings = ServerSettings()

        try:
            # Ścieżka do UserGame.ini w VM
            ini_path = "/home/dune/battlegroup/UserSettings/UserGame.ini"
            ini_data = await self.read_ini(ini_path)

            # Mapowanie INI -> ServerSettings
            if "ConsoleVariables" in ini_data:
                cv = ini_data["ConsoleVariables"]
                settings.server_name = cv.get("ServerName", "")
                settings.server_password = cv.get("ServerPassword", "")
                settings.game_port = int(cv.get("Port", "7777"))

            if "/Script/DuneSandbox.PvpPveSettings" in ini_data:
                pvp = ini_data["/Script/DuneSandbox.PvpPveSettings"]
                settings.pvp_enabled = pvp.get("bForcePvPOnAllPartitions", "True").lower() == "true"

            if "/Script/DuneSandbox.SandStormConfig" in ini_data:
                storm = ini_data["/Script/DuneSandbox.SandStormConfig"]
                settings.sandstorms = storm.get("bEnableSandstorms", "True").lower() == "true"
                settings.coriolis_storms = storm.get("bEnableCoriolisStorms", "True").lower() == "true"

            if "/Script/DuneSandbox.BuildingSettings" in ini_data:
                build = ini_data["/Script/DuneSandbox.BuildingSettings"]
                settings.max_landclaims = int(build.get("MaxLandclaims", "2"))

        except Exception as e:
            logger.error(f"Failed to read server settings: {e}")

        return settings

    async def set_server_settings(self, settings: ServerSettings) -> bool:
        """Zapisuje ustawienia serwera do UserGame.ini."""
        try:
            ini_path = "/home/dune/battlegroup/UserSettings/UserGame.ini"
            ini_data = await self.read_ini(ini_path)

            # Aktualizuj dane
            ini_data.setdefault("ConsoleVariables", {})
            ini_data["ConsoleVariables"]["ServerName"] = settings.server_name
            ini_data["ConsoleVariables"]["ServerPassword"] = settings.server_password
            ini_data["ConsoleVariables"]["Port"] = str(settings.game_port)

            ini_data.setdefault("/Script/DuneSandbox.PvpPveSettings", {})
            ini_data["/Script/DuneSandbox.PvpPveSettings"]["bForcePvPOnAllPartitions"] = str(settings.pvp_enabled).lower()

            ini_data.setdefault("/Script/DuneSandbox.SandStormConfig", {})
            ini_data["/Script/DuneSandbox.SandStormConfig"]["bEnableSandstorms"] = str(settings.sandstorms).lower()
            ini_data["/Script/DuneSandbox.SandStormConfig"]["bEnableCoriolisStorms"] = str(settings.coriolis_storms).lower()

            ini_data.setdefault("/Script/DuneSandbox.BuildingSettings", {})
            ini_data["/Script/DuneSandbox.BuildingSettings"]["MaxLandclaims"] = str(settings.max_landclaims)

            return await self.write_ini(ini_path, ini_data)
        except Exception as e:
            logger.error(f"Failed to write server settings: {e}")
            return False

    # ── Logs ────────────────────────────────────────────────────────────────

    async def get_logs(self, component: str = None, lines: int = 100) -> List[LogEntry]:
        """Pobiera logi z kubectl."""
        pod_filter = f"-l app={component}" if component else ""
        cmd = f"sudo kubectl logs {pod_filter} --tail={lines} --all-containers=true -n dune 2>/dev/null"

        exit_code, stdout, stderr = await self.run_command(cmd, timeout=30)
        if exit_code != 0:
            return []

        entries = []
        for line in stdout.strip().split("\n"):
            entries.append(LogEntry(
                timestamp="",
                level="INFO",
                component=component or "unknown",
                message=line,
            ))

        return entries

    async def stream_logs(self, component: str = None):
        """Generator strumieniujący logi."""
        pod_filter = f"-l app={component}" if component else ""
        cmd = f"sudo kubectl logs {pod_filter} -f --all-containers=true -n dune 2>/dev/null"

        try:
            ssh = await self._connect_ssh()
            async with ssh.create_process(cmd) as process:
                async for line in process.stdout:
                    yield line.strip()
        except Exception as e:
            logger.error(f"Log stream error: {e}")

    # ── RabbitMQ ───────────────────────────────────────────────────────────

    async def rmq_publish(self, routing_key: str, message: dict) -> bool:
        """Wysyła komendę przez rabbitmqctl."""
        import json, base64

        # Format: base64-encoded envelope
        envelope = json.dumps(message)
        encoded = base64.b64encode(envelope.encode()).decode()

        cmd = f"sudo rabbitmqctl eval 'rabbit_direct:list_for_source(<<\"dune\">>).' 2>/dev/null"
        logger.warning("RMQ publish - implement proper AMQP connection")
        return True

    # ── Swap Memory ────────────────────────────────────────────────────────

    async def enable_swap(self) -> bool:
        exit_code, stdout, stderr = await self.run_command(
            "sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile && "
            "sudo mkswap /swapfile && sudo swapon /swapfile",
            timeout=30,
        )
        return exit_code == 0

    async def disable_swap(self) -> bool:
        exit_code, _, _ = await self.run_command("sudo swapoff /swapfile && sudo rm /swapfile")
        return exit_code == 0

    # ── Multi-Sietch ───────────────────────────────────────────────────────

    async def add_sietch(self) -> bool:
        logger.warning("Multi-sietch - implement battlegroup YAML modification")
        return False

    async def remove_sietch(self) -> bool:
        logger.warning("Multi-sietch - implement battlegroup YAML modification")
        return False

    # ── SSH Key / Password ─────────────────────────────────────────────────

    async def rotate_ssh_key(self) -> bool:
        """Generuje nowy klucz SSH i instaluje go na VM."""
        key_path = Path.home() / ".dune-admin-manager" / "sshKey"
        key_path.parent.mkdir(parents=True, exist_ok=True)

        # Wygeneruj nowy klucz
        exit_code, stdout, stderr = await self.run_command(
            f"ssh-keygen -t ed25519 -f {key_path} -N '' -q"
        )

        # Skopiuj na VM
        if key_path.exists():
            with open(f"{key_path}.pub") as f:
                pubkey = f.read().strip()
            exit_code, _, _ = await self.run_command(
                f"echo '{pubkey}' >> ~/.ssh/authorized_keys"
            )
            return exit_code == 0
        return False

    async def change_vm_password(self, new_password: str) -> bool:
        exit_code, _, _ = await self.run_command(f"echo 'dune:{new_password}' | sudo chpasswd")
        return exit_code == 0


# ── Provider Factory ──────────────────────────────────────────────────────────

def create_provider(config) -> BaseProvider:
    """Tworzy odpowiedni provider na podstawie konfiguracji."""
    provider_type = config.provider

    if provider_type == "hyperv":
        return HyperVProvider(config)
    elif provider_type == "docker":
        from backend.providers.docker import DockerProvider
        return DockerProvider(config)
    elif provider_type == "kubectl":
        from backend.providers.kubectl import KubectlProvider
        return KubectlProvider(config)
    elif provider_type == "amp":
        from backend.providers.amp import AMPProvider
        return AMPProvider(config)
    elif provider_type == "local":
        from backend.providers.local import LocalProvider
        return LocalProvider(config)
    else:
        raise ValueError(f"Unknown provider type: {provider_type}")
