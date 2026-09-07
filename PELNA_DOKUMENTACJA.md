# 🌌 Dune Admin Manager — Pełna Dokumentacja Projektu

> **Wersja:** 0.1.0 | **Ostatnia aktualizacja:** 2026-08-18
> **Stack:** Python 3.11 (FastAPI + uvicorn) | Vanilla JS/CSS | PostgreSQL (SSH/kubectl)
> **Lokalizacja:** `C:\Projects\OfflineWorkspace\dune-admin-manager`
> **Produkcja:** `C:\dune-admin-manager` na hoście `192.168.1.102`

---

## 1. Opis projektu

Aplikacja webowa do zarządzania self-hosted serwerem **Dune: Awakening**.
Zastępuje oficjalny `battlegroup.bat`. Zarządza maszyną wirtualną Hyper-V,
battlegroupem Kubernetes (k3s), bazą PostgreSQL oraz RabbitMQ.

**Działa:** Windows 10/11 Pro + Hyper-V, Python 3.11+, Steam + Dune Self-Hosted Server.

---

## 2. Architektura

```
dune-admin-manager/
├── backend/                    # FastAPI (Python)
│   ├── main.py                 # Entry point, rejestracja routerów
│   ├── config.py               # Konfiguracja (YAML + env)
│   ├── middleware.py           # Auth, CORS, rate limiting
│   ├── api/                    # 28 modułów API
│   │   ├── auth.py             # Autentykacja (local + Discord)
│   │   ├── dashboard.py        # Status VM + BG
│   │   ├── battlegroup.py      # Start/stop/restart/update BG
│   │   ├── players.py          # Gracze
│   │   ├── characters.py       # Postacie
│   │   ├── inventory.py        # Ekwipunek
│   │   ├── server_settings.py  # INI + ⚙ NOWE: konfiguracja SSH
│   │   ├── database.py         # SQL console, backup/restore
│   │   ├── database_editor.py  # DB Editor (GOD MODE)
│   │   ├── server_control.py   # Kontrola serwera/VM
│   │   ├── logs.py             # Logi
│   │   ├── market.py           # Market
│   │   ├── market_bot.py       # Market bot
│   │   ├── welcome.py          # Welcome kits + MOTD
│   │   ├── gameplay.py         # Gameplay Admin (30+ endpointów)
│   │   ├── item_catalog.py     # Katalog itemów
│   │   └── remaining.py        # Blueprints, Bases, Storage, Events, Contracts,
│   │                           # Progression, Vehicles, Cosmetics, Battlepass,
│   │                           # Monitoring, Setup Wizard, Scheduler
│   ├── services/
│   │   ├── ssh_service.py      # SSH (paramiko + system ssh) — ⚙ reset_ssh()
│   │   ├── db_service.py       # PostgreSQL
│   │   ├── rmq_service.py      # RabbitMQ
│   │   ├── ini_service.py      # Parser INI
│   │   ├── backup_service.py   # Backup bazy
│   │   ├── log_service.py      # Logi
│   │   ├── market_bot.py       # Bot rynku
│   │   ├── welcome_service.py  # Welcome package
│   │   └── scheduler_service.py# Harmonogram
│   └── models/                 # Modele Pydantic
├── frontend/
│   ├── index.html              # Sidebar + 26 zakładek
│   ├── css/style.css           # Motyw Arrakis
│   ├── js/
│   │   ├── app_clean.js        # Routing zakładek
│   │   ├── api.js              # Klient REST
│   │   ├── websocket.js        # Live console
│   │   └── tabs/               # 26 modułów zakładek
├── config/config.yaml          # Konfiguracja (auto-tworzona)
├── data/catalogs/              # 1664 itemy, blueprinty, pojazdy
├── backups/                    # Kopie zapasowe
├── logs/                       # Logi aplikacji
├── scripts/                    # Instalatory
└── cmd-reference/              # Referencja Go (Icehunter/dune-admin)
```

---

## 3. Wszystkie zakładki (26)

### Operations
| Zakładka | Ikona | Opis |
|----------|-------|------|
| Dashboard | ◇ | Status VM (CPU/RAM/uptime), status BG, pody, szybkie akcje |
| Battlegroup | ◆ | Start/stop/restart/update BG, dodawanie sietch |
| Logs | ☰ | Logi gry + cheat detection |
| Database | ⊞ | SQL console, Table Browser, backup/restore |
| DB Editor | ⚙ | GOD MODE — keystones, recipes, level, currency |
| Server Settings | ◉ | 23 ustawień INI + 3 presety |
| Extra Settings | ⊕ | Dodatkowe ustawienia |

### Player World
| Zakładka | Ikona | Opis |
|----------|-------|------|
| Players | ● | Lista graczy, edycja, give item/currency, cheat scripts |
| Characters | ⬡ | Stats, inventory, tech-tree, keystones, economy |
| Storage | □ | Kontenery storage |
| Bases | ▣ | Bazy graczy (delete z potwierdzeniem) |
| Blueprints | ◻ | 485 blueprintów + give |

### Economy
| Zakładka | Ikona | Opis |
|----------|-------|------|
| Landsraad | △ | Auto-complete 25 domów, dekrety, wkład własny |
| Market | ▲ | Oferty rynku |
| Market Bot | ⊗ | Bot handlowy (start/stop) |
| Broadcast | ⊙ | Broadcast na serwer |
| Welcome Kits | ☆ | Starter kit dla nowych graczy |
| Give Items | ⊞ | 3 podzakładki: Weapons/Armor, Ammo/Resources, Consumables |
| Item Catalog | ⊞ | Katalog 1664 itemów |

### Management
| Zakładka | Ikona | Opis |
|----------|-------|------|
| Settings | ⚙ | Updates, Theme, Remote, Hyper-V LAN, **⚙ SSH**, Ports, DB |
| Commands | ⏻ | Komendy serwera |
| Gameplay Admin | ◇ | 30+ akcji: Solaris, XP, klasy, teleport, questy |
| Monitoring | ⊙ | Director + FileBrowser linki, zasoby podów |
| Scheduler | ◷ | Zaplanowane taski |
| Setup Wizard | ⚙ | 3 ścieżki instalacji (istniejący/nowy/LAN) |

---

## 4. Konfiguracja SSH w UI (NOWE — 2026-08-18)

Zakładka **Settings → Steam/SSH** umożliwia pełną konfigurację połączenia SSH
bez edycji kodu. Inny użytkownik może skonfigurować połączenie samodzielnie.

### Pola
| Pole | Opis |
|------|------|
| SSH Host | IP VM (np. `192.168.1.100`) |
| SSH Port | Port SSH (domyślnie `22`) |
| SSH User | Użytkownik (domyślnie `dune`) |
| SSH Password | Hasło (puste = tylko klucz) |
| SSH Key Path | Ścieżka klucza prywatnego |

### Przyciski
| Przycisk | Działanie |
|----------|-----------|
| ⊙ Auto-Find | Znajduje klucz battlegroup (`%LOCALAPPDATA%\DuneAwakeningServer\sshKey`) |
| ⬆ Wklej/nadpisz klucz | Zapisuje nowy klucz z wklejonej treści (chmod 600) |
| 🗑 Usuń klucz | Usuwa plik klucza |
| ⊞ Save Config | Zapisuje do `config.yaml` + reset połączenia |
| ⏻ Test Connection | Testuje połączenie bez zapisu |

### Klucz SSH battlegroup
`battlegroup.bat` zapisuje klucz w `%LOCALAPPDATA%\DuneAwakeningServer\sshKey`.
Aplikacja auto-wykrywa go przez `_find_key()` oraz przycisk ⊙ Auto-Find.

### Endpointy
```
GET    /api/v1/server-settings/ssh              # odczyt konfiguracji SSH
POST   /api/v1/server-settings/ssh              # zapis konfiguracji SSH
POST   /api/v1/server-settings/ssh/test         # test połączenia
GET    /api/v1/server-settings/ssh/key          # status klucza
POST   /api/v1/server-settings/ssh/key          # nadpisanie klucza
DELETE /api/v1/server-settings/ssh/key          # usunięcie klucza
GET    /api/v1/server-settings/ssh/key/autodetect  # auto-wykrycie klucza
```

---

## 5. Wszystkie endpointy API (prefiksy)

| Prefiks | Moduł | Zawartość |
|---------|-------|-----------|
| `/api/v1/auth` | auth.py | Login, logout, session, set-password |
| `/api/v1/dashboard` | dashboard.py | Status VM, status BG, public IP |
| `/api/v1/battlegroup` | battlegroup.py | Start/stop/restart/update/status, swap, sietch |
| `/api/v1/players` | players.py | CRUD graczy, give-item, give-currency |
| `/api/v1/characters` | characters.py | Stats, tech-tree, economy |
| `/api/v1/inventory` | inventory.py | Ekwipunek |
| `/api/v1/server-settings` | server_settings.py | INI + **SSH config** |
| `/api/v1/database` | database.py | SQL, backup/restore |
| `/api/v1/database-editor` | database_editor.py | GOD MODE |
| `/api/v1/server-control` | server_control.py | VM start/stop, git-pull, find-bg-path |
| `/api/v1/logs` | logs.py | Logi gry |
| `/api/v1/market` | market.py | Oferty |
| `/api/v1/welcome` | welcome.py | Welcome kits + MOTD |
| `/api/v1/blueprints` | remaining.py | Blueprinty |
| `/api/v1/bases` | remaining.py | Bazy |
| `/api/v1/storage` | remaining.py | Storage |
| `/api/v1/events` | remaining.py | Event log |
| `/api/v1/contracts` | remaining.py | Kontrakty |
| `/api/v1/progression` | remaining.py | Questy, journey |
| `/api/v1/vehicles` | remaining.py | Pojazdy |
| `/api/v1/cosmetics` | remaining.py | Kosmetyki |
| `/api/v1/battlepass` | remaining.py | Battle pass |
| `/api/v1/monitoring` | remaining.py | Director/FileBrowser |
| `/api/v1/setup` | remaining.py | Setup wizard |
| `/api/v1/scheduler` | remaining.py | Harmonogram |
| `/api/v1/gameplay` | gameplay.py + market_bot.py | Gameplay admin + bot |
| `/api/v1/items` | item_catalog.py | Katalog itemów |

---

## 6. Pełna konfiguracja (config.yaml)

```yaml
provider: hyperv                    # hyperv | docker | kubectl | amp | local
listen_addr: 0.0.0.0                # 127.0.0.1 = tylko lokalnie, 0.0.0.0 = LAN
listen_port: 8080

hyperv:
  vm_name: dune-awakening
  server_path: D:\duneserver       # ścieżka battlegroup
  memory_gb: 20

ssh:
  host: 192.168.1.100               # IP VM (edytowalne w UI)
  port: 22
  user: dune
  password: ''                      # edytowalne w UI
  key_path: ''                      # edytowalne w UI
  mode: library

database:
  host: 127.0.0.1
  port: 15432
  user: dune
  database: dune
  schema: dune

rabbitmq: { game_addr: '', admin_addr: '' }
backup_dir: ./backups
auto_backup_enabled: false
auth: { enabled: false, local_enabled: true, session_ttl_hours: 24 }
market_bot: { enabled: false }
welcome_package: { enabled: false }
motd: { enabled: false }
scheduler: { enabled: false, daily_restart_time: "04:00", timezone: Europe/Warsaw }
logging: { level: INFO, file: ./logs/dune-admin.log }
```

### Zmienne środowiskowe
Prefiks `DUNE_` nadpisuje config (np. `DUNE_SSH__HOST=192.168.1.100`).
Kolejność: `config.yaml` → `.env` → env vars.

---

## 7. Wdrożenie produkcyjne (2026-08-18)

### Topologia
```
LAN 192.168.1.0/24
├── 192.168.1.102   — Windows Server (host Hyper-V + panel admina)
│   ├── C:\dune-admin-manager          — panel (task systemowy DuneAdminPanel)
│   ├── D:\duneserver                  — battlegroup.bat
│   └── VM: dune-awakening (16 GB RAM, switch Dune)
│       └── 192.168.1.100              — Alpine + k3s + PostgreSQL + RabbitMQ
└── 192.168.1.101  — laptop (dawniej host)
```

### Dostęp
| Usługa | URL |
|--------|-----|
| Panel admina | `http://192.168.1.102:8080` |
| SSH do VM | `dune@192.168.1.100` (port 22) |
| Director | `http://192.168.1.100:32218` (NodePort — może się zmienić) |
| FileBrowser | `http://192.168.1.100:3001` |
| Gra | UDP 7777, 27015 |

### Battlegroup
- Namespace: `funcom-seabass-sh-1ba9d7a35da882ec-qagalq`
- BG: `sh-1ba9d7a35da882ec-qagalq` (tytuł: MyDune)
- Pody: DB, MQ (admin+game), Overmap, Survival_1, Gateway, Director, FileBrowser

### Panel — autostart
Zadanie systemowe `DuneAdminPanel` (schtasks, ONSTART, jako Administrator):
```
schtasks /create /tn "DuneAdminPanel" /tr "cmd /c cd /d C:\dune-admin-manager && C:\Espressif\tools\python\python.exe -m backend.main" /sc ONSTART /ru Administrator /rp *** /rl HIGHEST /f
```

### Firewall (192.168.1.102)
```
New-NetFirewallRule -DisplayName "Dune Admin" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Any
```

---

## 8. Historia sesji

| Data | Praca |
|------|-------|
| 2026-07-30 | Szkielet projektu (FastAPI + vanilla frontend), analiza 3 repo referencyjnych |
| 2026-07-31 | Pełna rozbudowa do 26 zakładek, RabbitMQ, DB przez SSH |
| 2026-08-03 | Market, Market Bot, Broadcast, Commands, Scheduler, Give Items, motyw Arrakis |
| 2026-08-04/05 | Give Items tab z player selectorem, naprawa kodowania UTF-8, raport RAPORT_DUNE_AWAKENING.md |
| 2026-08-09/10 | Migracja serwera laptop→192.168.1.102. Naprawa MAC (00:15:5D:01:15:01), switch Dune, RAM 16GB, odtworzenie BG z kopii dysku |
| 2026-08-18 | ⚙ Konfiguracja SSH w UI, audyt danych osobowych, pełny backup, ta dokumentacja |

### Kluczowe rozwiązane problemy
- **MAC VM**: poprawny to `00:15:5D:01:15:01` (nie `...:25`) — bez tego VM nie odpowiadała na sieci
- **Switch Dune**: musi być External na fizycznej karcie Ethernet
- **RAM VM**: Dynamic Memory nie działa z Alpine — ustawić static 16 GB
- **BG po backupie**: `stop: true` blokuje start — patchać na `stop: false`
- **Panel jako SYSTEM**: nie widzi klucza Administratora — task musi działać jako Administrator
- **Windows Server**: port 8080 blokowany — dodać regułę firewalla

---

## 9. Backup

### Pełny backup (wszystkie pliki)
```powershell
cd C:\Projects\OfflineWorkspace\dune-admin-manager
tar -a -c -f "C:\Projects\OfflineWorkspace\BACKUPS\dune-admin-full_$(Get-Date -Format yyyy-MM-dd_HHmm).zip" *
```

### Ostatnie backupy
| Plik | Rozmiar | Data |
|------|---------|------|
| `dune-admin-full_2026-08-18_2253.zip` | 208.6 MB | 2026-08-18 |
| `dune-admin-manager16082026.zip` | 209.5 MB | 2026-08-16 |

---

## 10. Znane ograniczenia / TODO

- [ ] Tryb instalacji npm/pnpm (drugi tryb uruchamiania)
- [ ] Port check przez zewnętrzne serwisy
- [ ] Pairing z aplikacją mobilną
- [ ] Dokumentacja API OpenAPI/Swagger
- [ ] Testy jednostkowe backendu
- [ ] RMQ działa TYLKO gdy gracz jest ONLINE
- [ ] Solaris/Scrip ustawiać TYLKO gdy gracz OFFLINE (gra nadpisuje przy logout)
- [ ] Cache przeglądarki — zawsze aktualizować `?ts=` w index.html
