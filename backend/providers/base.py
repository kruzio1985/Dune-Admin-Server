"""
Dune Admin Manager - Provider Base Class

Abstrakcyjny interfejs dla wszystkich providerów (Hyper-V, Docker, k8s, AMP, local).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum


class ServerStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    STARTING = "starting"
    STOPPING = "stopping"
    ERROR = "error"
    UNKNOWN = "unknown"


class BattlegroupStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    STARTING = "starting"
    UNKNOWN = "unknown"


@dataclass
class VMInfo:
    """Informacje o maszynie wirtualnej."""
    name: str
    status: ServerStatus
    cpu_usage_percent: float = 0.0
    memory_usage_gb: float = 0.0
    memory_total_gb: float = 0.0
    uptime_seconds: int = 0
    ip_address: str = ""
    swap_enabled: bool = False


@dataclass
class PodInfo:
    """Informacje o podzie Kubernetes."""
    name: str
    namespace: str
    status: str
    ready: str
    restarts: int
    age: str
    cpu_usage: str = ""
    memory_usage: str = ""


@dataclass
class BattlegroupInfo:
    """Informacje o battlegroup."""
    name: str
    status: BattlegroupStatus
    server_count: int = 0
    healthy_servers: int = 0
    pods: List[PodInfo] = None
    director_url: str = ""
    file_browser_url: str = ""
    rmq_port: int = 31982

    def __post_init__(self):
        if self.pods is None:
            self.pods = []


@dataclass
class ServerSettings:
    """Konfiguracja serwera gry."""
    server_name: str = ""
    server_password: str = ""
    game_port: int = 7777
    igw_port: int = 7778
    pvp_enabled: bool = True
    security_zones: bool = True
    coriolis_storms: bool = True
    sandstorms: bool = True
    sandworm_enabled: bool = True
    sandworm_danger_zones: bool = True
    mining_multiplier: float = 2.0
    vehicle_output_multiplier: float = 1.0
    item_decay_rate: float = 1.0
    vehicle_durability_multiplier: float = 1.0
    max_landclaims: int = 2
    max_blueprint_extensions: int = 5
    max_base_backup_extensions: int = 3
    pvp_resource_multiplier: float = 1.0


@dataclass
class LogEntry:
    """Wpis logu."""
    timestamp: str
    level: str
    component: str
    message: str


@dataclass
class DatabaseBackup:
    """Informacje o backupie bazy danych."""
    filename: str
    size_bytes: int
    created_at: str
    battlegroup_running: bool = False


class BaseProvider(ABC):
    """Abstrakcyjna klasa bazowa dla wszystkich providerów."""

    def __init__(self, config):
        self.config = config

    # ── VM Management ──────────────────────────────────────────────────────

    @abstractmethod
    async def get_vm_info(self) -> VMInfo:
        """Pobiera informacje o maszynie wirtualnej."""
        ...

    @abstractmethod
    async def start_vm(self) -> bool:
        """Uruchamia maszynę wirtualną."""
        ...

    @abstractmethod
    async def stop_vm(self) -> bool:
        """Zatrzymuje maszynę wirtualną."""
        ...

    @abstractmethod
    async def restart_vm(self) -> bool:
        """Restartuje maszynę wirtualną."""
        ...

    @abstractmethod
    async def vm_status(self) -> ServerStatus:
        """Sprawdza status maszyny wirtualnej."""
        ...

    # ── Battlegroup Management ─────────────────────────────────────────────

    @abstractmethod
    async def get_battlegroup_info(self) -> BattlegroupInfo:
        """Pobiera informacje o battlegroup."""
        ...

    @abstractmethod
    async def start_battlegroup(self) -> bool:
        """Uruchamia battlegroup."""
        ...

    @abstractmethod
    async def stop_battlegroup(self) -> bool:
        """Zatrzymuje battlegroup."""
        ...

    @abstractmethod
    async def restart_battlegroup(self) -> bool:
        """Restartuje battlegroup."""
        ...

    @abstractmethod
    async def update_battlegroup(self) -> bool:
        """Aktualizuje battlegroup do najnowszej wersji."""
        ...

    @abstractmethod
    async def battlegroup_status(self) -> BattlegroupStatus:
        """Sprawdza status battlegroup."""
        ...

    # ── SSH / Remote Execution ─────────────────────────────────────────────

    @abstractmethod
    async def run_command(self, command: str, timeout: int = 30) -> tuple[int, str, str]:
        """Wykonuje komendę na zdalnej maszynie. Zwraca (exit_code, stdout, stderr)."""
        ...

    # ── Database ───────────────────────────────────────────────────────────

    @abstractmethod
    async def db_query(self, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Wykonuje zapytanie SQL na bazie gry."""
        ...

    @abstractmethod
    async def db_backup(self, output_path: str) -> bool:
        """Wykonuje backup bazy danych."""
        ...

    @abstractmethod
    async def db_restore(self, backup_path: str) -> bool:
        """Przywraca bazę danych z backupu."""
        ...

    # ── File Operations ────────────────────────────────────────────────────

    @abstractmethod
    async def read_file(self, path: str) -> str:
        """Odczytuje plik z maszyny VM."""
        ...

    @abstractmethod
    async def write_file(self, path: str, content: str) -> bool:
        """Zapisuje plik na maszynie VM."""
        ...

    @abstractmethod
    async def list_files(self, path: str) -> List[Dict[str, Any]]:
        """Listuje pliki w katalogu na VM."""
        ...

    # ── INI Configuration ──────────────────────────────────────────────────

    @abstractmethod
    async def read_ini(self, path: str) -> Dict[str, Dict[str, str]]:
        """Odczytuje plik INI."""
        ...

    @abstractmethod
    async def write_ini(self, path: str, data: Dict[str, Dict[str, str]]) -> bool:
        """Zapisuje plik INI."""
        ...

    # ── Server Settings ────────────────────────────────────────────────────

    @abstractmethod
    async def get_server_settings(self) -> ServerSettings:
        """Pobiera ustawienia serwera."""
        ...

    @abstractmethod
    async def set_server_settings(self, settings: ServerSettings) -> bool:
        """Zapisuje ustawienia serwera."""
        ...

    # ── Logs ────────────────────────────────────────────────────────────────

    @abstractmethod
    async def get_logs(self, component: str = None, lines: int = 100) -> List[LogEntry]:
        """Pobiera logi battlegroup."""
        ...

    @abstractmethod
    async def stream_logs(self, component: str = None):
        """Generator strumieniujący logi na żywo."""
        ...

    # ── RabbitMQ ───────────────────────────────────────────────────────────

    @abstractmethod
    async def rmq_publish(self, routing_key: str, message: dict) -> bool:
        """Wysyła komendę przez RabbitMQ."""
        ...

    # ── Swap Memory ────────────────────────────────────────────────────────

    @abstractmethod
    async def enable_swap(self) -> bool:
        """Włącza swap memory na VM."""
        ...

    @abstractmethod
    async def disable_swap(self) -> bool:
        """Wyłącza swap memory na VM."""
        ...

    # ── Multi-Sietch ───────────────────────────────────────────────────────

    @abstractmethod
    async def add_sietch(self) -> bool:
        """Dodaje dodatkowy sietch do battlegroup."""
        ...

    @abstractmethod
    async def remove_sietch(self) -> bool:
        """Usuwa sietch z battlegroup."""
        ...

    # ── SSH Key Management ─────────────────────────────────────────────────

    @abstractmethod
    async def rotate_ssh_key(self) -> bool:
        """Rotuje klucz SSH."""
        ...

    @abstractmethod
    async def change_vm_password(self, new_password: str) -> bool:
        """Zmienia hasło użytkownika dune na VM."""
        ...
