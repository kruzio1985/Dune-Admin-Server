"""
Dune Admin Manager - Backend Configuration Module

Ładuje konfigurację z config.yaml, .env, zmiennych środowiskowych.
Kolejność: config.yaml > .env > env vars.
"""

import os
import yaml
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Literal

ProviderType = Literal["hyperv", "docker", "kubectl", "amp", "local"]


@dataclass
class HyperVConfig:
    vm_name: str = "dune-awakening"
    server_path: str = ""
    memory_gb: int = 20

    def __post_init__(self):
        if not self.server_path:
            self.server_path = self._detect_server_path()

    @staticmethod
    def _detect_server_path() -> str:
        """Auto-detect Dune Self-Hosted Server path from Steam libraries."""
        server_name = "Dune Awakening Self-Hosted Server"
        candidates = []

        # Check Steam registry
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")
            steam_path = winreg.QueryValueEx(key, "InstallPath")[0]
            winreg.CloseKey(key)
            candidates.append(steam_path)

            # Parse libraryfolders.vdf for additional libraries
            vdf = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
            if os.path.isfile(vdf):
                with open(vdf, "r") as f:
                    for line in f:
                        if '"path"' in line:
                            lib = line.split('"')[3].replace("\\\\", "\\")
                            if lib not in candidates:
                                candidates.append(lib)
        except Exception:
            pass

        # Fallback common paths
        for base in [r"D:\SteamLibrary", r"D:\Steam", r"E:\SteamLibrary",
                     r"C:\Program Files (x86)\Steam", r"C:\Steam"]:
            if base not in candidates:
                candidates.append(base)

        for lib in candidates:
            sp = os.path.join(lib, "steamapps", "common", server_name)
            if os.path.isdir(sp):
                return sp

        return r"D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server"


@dataclass
class SSHConfig:
    host: str = "127.0.0.1"
    port: int = 22
    user: str = "dune"
    key_path: str = ""
    password: str = ""
    mode: Literal["library", "command"] = "library"


@dataclass
class DatabaseConfig:
    host: str = "127.0.0.1"
    port: int = 15432
    user: str = "dune"
    password: str = ""
    database: str = "dune"
    schema: str = "dune"


@dataclass
class RabbitMQConfig:
    game_addr: str = ""
    admin_addr: str = ""


@dataclass
class AuthConfig:
    enabled: bool = False
    local_enabled: bool = True
    local_username: str = "admin"
    local_password_hash: str = ""
    discord_enabled: bool = False
    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_bot_token: str = ""
    discord_guild_id: str = ""
    session_ttl_hours: int = 24
    guest_enabled: bool = False
    owner_discord_ids: List[str] = field(default_factory=list)
    owner_role_ids: List[str] = field(default_factory=list)


@dataclass
class MarketBotConfig:
    enabled: bool = False
    cache_db: str = "./data/market-bot-cache.db"
    item_data: str = "./data/catalogs/item-catalog.json"
    buy_interval_minutes: int = 5
    list_interval_minutes: int = 30
    buy_threshold: float = 1.05
    max_buys: int = 50


@dataclass
class WelcomePackageConfig:
    enabled: bool = False
    scan_interval_seconds: int = 30
    active_version: str = "v1"
    packages: List[dict] = field(default_factory=list)


@dataclass
class MOTDConfig:
    enabled: bool = False
    message: str = "Welcome to the server, {player}!"
    source_player: str = ""


@dataclass
class SchedulerConfig:
    enabled: bool = False
    daily_restart_time: str = "04:00"
    restart_warning_lead_minutes: int = 30
    restart_warning_frequency_minutes: int = 10
    timezone: str = "Europe/Warsaw"
    update_apply_enabled: bool = False
    update_apply_lead_hours: int = 1


@dataclass
class LoggingConfig:
    level: str = "INFO"
    file: str = "./logs/dune-admin.log"
    audit_log: str = "./logs/audit.log"


@dataclass
class AppConfig:
    provider: ProviderType = "hyperv"
    hyperv: HyperVConfig = field(default_factory=HyperVConfig)
    ssh: SSHConfig = field(default_factory=SSHConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    rabbitmq: RabbitMQConfig = field(default_factory=RabbitMQConfig)
    backup_dir: str = "./backups"
    auto_backup_enabled: bool = False
    auto_backup_interval_hours: int = 6
    max_backups: int = 10
    listen_addr: str = "127.0.0.1"
    listen_port: int = 8080
    auth: AuthConfig = field(default_factory=AuthConfig)
    permissions_file: str = "./config/permissions.yaml"
    market_bot: MarketBotConfig = field(default_factory=MarketBotConfig)
    welcome_package: WelcomePackageConfig = field(default_factory=WelcomePackageConfig)
    motd: MOTDConfig = field(default_factory=MOTDConfig)
    scheduler: SchedulerConfig = field(default_factory=SchedulerConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)


# ── Project root (absolute, based on this file's location) ──────────────────

_PROJECT_ROOT = Path(__file__).resolve().parent.parent  # backend/config.py → backend/ → dune-admin-manager/


def _find_config() -> Optional[Path]:
    """Szuka config.yaml w standardowych lokalizacjach."""
    candidates = [
        _PROJECT_ROOT / "config" / "config.yaml",
        Path.home() / ".dune-admin-manager" / "config.yaml",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _load_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _env_override(data: dict, prefix: str = "DUNE_") -> dict:
    """Nadpisuje wartości z configu zmiennymi środowiskowymi."""
    import re

    result = dict(data)

    for key, value in os.environ.items():
        if not key.startswith(prefix):
            continue
        config_key = key[len(prefix):].lower()
        # Konwersja typów
        if value.lower() in ("true", "yes", "1"):
            result[config_key] = True
        elif value.lower() in ("false", "no", "0"):
            result[config_key] = False
        elif value.isdigit():
            result[config_key] = int(value)
        else:
            result[config_key] = value

    return result


def _dict_to_config(data: dict) -> AppConfig:
    """Konwertuje słownik na obiekt AppConfig."""
    config = AppConfig()

    # Top-level fields
    if "provider" in data:
        config.provider = data["provider"]
    if "listen_addr" in data:
        config.listen_addr = str(data["listen_addr"])
    if "listen_port" in data:
        config.listen_port = int(data["listen_port"])
    if "backup_dir" in data:
        config.backup_dir = str(data["backup_dir"])
    if "auto_backup_enabled" in data:
        config.auto_backup_enabled = bool(data["auto_backup_enabled"])
    if "auto_backup_interval_hours" in data:
        config.auto_backup_interval_hours = int(data["auto_backup_interval_hours"])
    if "max_backups" in data:
        config.max_backups = int(data["max_backups"])

    # Nested configs
    for section, cls in [
        ("ssh", SSHConfig),
        ("database", DatabaseConfig),
        ("rabbitmq", RabbitMQConfig),
        ("hyperv", HyperVConfig),
        ("auth", AuthConfig),
        ("market_bot", MarketBotConfig),
        ("welcome_package", WelcomePackageConfig),
        ("motd", MOTDConfig),
        ("scheduler", SchedulerConfig),
        ("logging", LoggingConfig),
    ]:
        if section in data and isinstance(data[section], dict):
            section_data = data[section]
            instance = cls()
            for field_name in instance.__dataclass_fields__:
                if field_name in section_data:
                    setattr(instance, field_name, section_data[field_name])
            setattr(config, section, instance)

    return config


def _create_default_config(path: Path) -> None:
    """Tworzy domyślny config.yaml jeśli nie istnieje."""
    path.parent.mkdir(parents=True, exist_ok=True)
    default = {
        "provider": "hyperv",
        "listen_addr": "127.0.0.1",
        "listen_port": 8080,
        "hyperv": {"vm_name": "dune-awakening", "server_path": HyperVConfig._detect_server_path(), "memory_gb": 20},
        "ssh": {"host": "127.0.0.1", "port": 22, "user": "dune", "password": "", "key_path": "", "mode": "library"},
        "database": {"host": "127.0.0.1", "port": 15432, "user": "dune", "password": "", "database": "dune", "schema": "dune"},
        "rabbitmq": {"game_addr": "", "admin_addr": ""},
        "backup_dir": "./backups",
        "auto_backup_enabled": False,
        "auto_backup_interval_hours": 6,
        "max_backups": 10,
        "auth": {
            "enabled": False, "local_enabled": True, "local_username": "admin",
            "local_password_hash": "", "discord_enabled": False,
            "session_ttl_hours": 24, "guest_enabled": False,
        },
        "market_bot": {"enabled": False},
        "welcome_package": {"enabled": False},
        "motd": {"enabled": False},
        "scheduler": {"enabled": False, "daily_restart_time": "04:00", "timezone": "Europe/Warsaw"},
        "logging": {"level": "INFO", "file": "./logs/dune-admin.log", "audit_log": "./logs/audit.log"},
    }
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(default, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def load_config() -> AppConfig:
    """Ładuje pełną konfigurację."""
    data = {}

    # 1. config.yaml
    config_path = _find_config()
    if config_path is None:
        # Auto-tworzenie domyślnego configu
        default_path = _PROJECT_ROOT / "config" / "config.yaml"
        _create_default_config(default_path)
        config_path = default_path

    if config_path and config_path.exists():
        data = _load_yaml(config_path)

    # 2. .env w obecnym katalogu
    env_path = Path(".env")
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)

    # 3. Zmienne środowiskowe
    data = _env_override(data)

    return _dict_to_config(data)


# Singleton config
_config: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """Zwraca singleton konfiguracji."""
    global _config
    if _config is None:
        _config = load_config()
    return _config


def reload_config():
    """Przeładowuje konfigurację z dysku."""
    global _config
    _config = load_config()
    return _config
