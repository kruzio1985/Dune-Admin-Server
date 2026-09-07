# 🌌 Dune Admin Manager v0.1.0 — Pełna Dokumentacja

> **Wersja:** 0.1.0 | **Data:** 2026-08-03  
> **Stack:** Python 3.11 (FastAPI + uvicorn) | Vanilla JS/CSS | PostgreSQL (SSH/kubectl)

---

## 📑 Spis treści

1. [Architektura](#1-architektura)
2. [Instalacja i uruchomienie](#2-instalacja-i-uruchomienie)
3. [Stylizacja — motyw Arrakis](#3-stylizacja--motyw-arrakis)
4. [Konfiguracja](#4-konfiguracja)
5. [Panel boczny — wszystkie zakładki](#5-panel-boczny)
6. [Backend API — pełny spis endpointów](#6-backend-api)
7. [Skrypty pomocnicze](#7-skrypty-pomocnicze)
8. [Backupy i przywracanie](#8-backupy-i-przywracanie)
9. [Znane problemy / TODO](#9-znane-problemy--todo)
10. [Sesje rozwoju](#10-sesje-rozwoju)

---

## 1. Architektura

```
dune-admin-manager/
├── backend/               # Serwer FastAPI (Python)
│   ├── main.py            # Punkt wejściowy, routing, WebSocket
│   ├── config.py          # Konfiguracja (YAML + env vars)
│   ├── middleware.py       # Rate limiter, sesje, audyt
│   ├── api/               # Moduły API (17 modułów)
│   └── services/
│       └── ssh_service.py # SSH do VM (192.168.1.100)
├── frontend/
│   ├── index.html         # Główny HTML + sidebar
│   ├── css/style.css      # Motyw Arrakis — pełna stylizacja
│   ├── js/app_clean.js    # Routing zakładek (25 tabów)
│   ├── js/api.js          # Klient API
│   ├── js/tabs/           # 24 zakładki (osobne pliki JS)
│   ├── img/               # Obrazy (logo, tło, tekstury)
│   └── fonts/             # Fonty (Dune Rise)
├── scripts/               # Skrypty instalacyjne
├── config/                # Konfiguracja YAML
├── backups/               # Kopie zapasowe (.zip)
├── data/catalogs/         # Katalogi itemów (1664 pozycje)
└── _fixes_archive/        # Archiwum skryptów diagnostycznych
```

### Dane techniczne

| Parametr | Wartość |
|----------|---------|
| Python | 3.11.15 |
| Serwer HTTP | FastAPI + uvicorn na `127.0.0.1:8080` |
| Baza danych | PostgreSQL przez SSH (`192.168.1.100`) → kubectl → psql |
| Namespace | `funcom-seabass-sh-1ba9d7a35da882ec-qagalq` |
| Pod DB | `db-dbdepl-sts-0` |
| Frontend | Vanilla JS (bez frameworka) |
| Katalog itemów | 1664 itemów w `data/catalogs/item-data.json` |
| Schematy augmentacji | 91 schematów |

---

## 2. Instalacja i uruchomienie

### Tryb A: Lokalny (localhost) — plik .bat

```cmd
cd c:\Projects\OfflineWorkspace\dune-admin-manager
START.bat
```

Lub ręcznie:

```powershell
C:\Espressif\tools\python\python.exe -m backend.main
```

Aplikacja dostępna na: **http://127.0.0.1:8080/static/index.html**

### Tryb B: Instalator npm/pnpm (planowany)

Planowana druga opcja uruchamiania przez `pnpm install && pnpm start`, podobnie jak SCUM Manager. Plik `package.json` już istnieje w repozytorium.

### Wymagania

- Python 3.11+
- Dostęp SSH do VM (klucz: `C:\Users\YOUR_USERNAME\.ssh\dune_key`)
- Hyper-V (do kontroli VM)
- PowerShell (Admin) do kontroli VM

---

## 3. Stylizacja — motyw Arrakis

### Paleta kolorów

| Nazwa | Kolor | Zastosowanie |
|-------|-------|-------------|
| Piaskowe złoto | `#D6A85F` | Nagłówki, aktywne linki, ikony, akcenty |
| Jasny piasek | `#E6D5B8` | Tekst główny |
| Miedź | `#A66A3F` | Wersja, obramowania |
| Ciemny brąz | `#34271F` | Tła |
| Grafit | `#171717` | Karty, buttony |

### Kolory funkcyjne (zachowane)

| Kolor | Zastosowanie |
|-------|-------------|
| 🟢 Zielony `#3fb950` | Online, sukces |
| 🔴 Czerwony `#f85149` | Offline, błąd |
| 🔵 Niebieski `#58a6ff` | Battlegroup |
| 🟣 Fioletowy `#a371f7` | Web/Monitoring |

### Fonty

| Font | Zastosowanie |
|------|-------------|
| **Dune Rise** | Logo, nagłówki h2/h3, sidebar, karty, tabele, zakładki, badge |
| Segoe UI | Tekst podstawowy, formularze |
| Cascadia Code | Kod, terminal |

### Ikony — symbole geometryczne

Wszystkie kolorowe emoji (283 225 sztuk) zastąpione jednolitymi **geometrycznymi symbolami Unicode** w kolorze złotym `#D6A85F`:

| Symbol | Znaczenie |
|--------|-----------|
| ◇ | Dashboard, Gameplay Admin |
| ◆ | Battlegroup, Specs |
| ☰ | Logs |
| ⊞ | Database, Item Catalog |
| ⚙ | DB Editor, Settings, Setup Wizard |
| ◉ | Server Settings |
| ⊕ | Extra Settings |
| ● | Players |
| ⬡ | Characters |
| □ | Storage |
| ▣ | Bases |
| ◻ | Blueprints |
| △ | Landsraad |
| ▲ | Market |
| ⊗ | Market Bot |
| ⊙ | Broadcast, Monitoring |
| ☆ | Welcome Kits |
| ⏻ | Commands |
| ◷ | Scheduler |

### Tło

- `bg-desert.png` — pustynne tło Arrakis
- Nakładka `rgba(8,6,4,0.42)` dla czytelności
- Karty półprzezroczyste z `backdrop-filter: blur(8px)`

### Logo

- Własne logo (planeta Arrakis) — `frontend/img/logo.png`
- 42×42px z efektem złotej poświaty

---

## 4. Konfiguracja

Plik: `config/config.yaml`

```yaml
provider: hyperv
listen:
  listen_addr: 127.0.0.1
  listen_port: 8080

hyperv:
  vm_name: dune-server
  memory_gb: 20

ssh:
  host: 192.168.1.100
  port: 22
  user: dune
  key_path: C:\Users\YOUR_USERNAME\.ssh\dune_key

database:
  host: 192.168.1.100
  port: 15432

scheduler:
  enabled: true
  daily_restart_time: "04:00"
  timezone: Europe/Warsaw

backup:
  auto_backup_enabled: false
  max_backups: 10

auth:
  enabled: false
  local_enabled: true
  session_ttl_hours: 24
```

### Uprawnienia (RBAC)

| Rola | Uprawnienia |
|------|-------------|
| **Owner** | Pełny dostęp |
| **Admin** | dashboard, battlegroup, players, server, database, logs, market, welcome, monitoring, scheduler, auth |
| **Moderator** | dashboard, players, logs, monitoring (zapis) |
| **Viewer** | dashboard, players, monitoring (odczyt) |
| **Guest** | dashboard (minimalny) |

---

## 5. Panel boczny — wszystkie zakładki

### ⚙️ Operations (7)
| # | Zakładka | Plik JS | Ikona |
|---|----------|---------|-------|
| 1 | Dashboard | `dashboard_v2.js` | ◇ |
| 2 | Battlegroup | `battlegroup.js` | ◆ |
| 3 | Logs | `logs.js` | ☰ |
| 4 | Database | `database_v2.js` | ⊞ |
| 5 | DB Editor | `database-editor.js` | ⚙ |
| 6 | Server Settings | `server-settings_v2.js` | ◉ |
| 7 | Extra Settings | `extra-settings2.js` | ⊕ |

### 👤 Player World (5)
| # | Zakładka | Plik JS | Ikona |
|---|----------|---------|-------|
| 8 | Players | `players.js` | ● |
| 9 | Characters | `characters_v2.js` | ⬡ |
| 10 | Storage | `storage.js` | □ |
| 11 | Bases | `bases.js` | ▣ |
| 12 | Blueprints | `blueprints.js` | ◻ |

### 💰 Economy (6)
| # | Zakładka | Plik JS | Ikona |
|---|----------|---------|-------|
| 13 | Landsraad | `market.js` (LandsraadTab) | △ |
| 14 | Market | `market.js` | ▲ |
| 15 | Market Bot | `market_bot.js` | ⊗ |
| 16 | Broadcast | `broadcast.js` | ⊙ |
| 17 | Welcome Kits | `welcome.js` | ☆ |
| 18 | Item Catalog | `items.js` | ⊞ |

### 🛠️ Management (6)
| # | Zakładka | Plik JS | Ikona |
|---|----------|---------|-------|
| 19 | Settings | `settings.js` | ⚙ |
| 20 | Commands | `commands.js` | ⏻ |
| 21 | Gameplay Admin | `gameplay.js` | ◇ |
| 22 | Monitoring | `monitoring.js` | ⊙ |
| 23 | Scheduler | `scheduler.js` | ◷ |
| 24 | Setup Wizard | `setup-wizard.js` | ⚙ |

---

## 6. Backend API — pełny spis endpointów

### Auth
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/v1/auth/login` | Logowanie (bcrypt + Discord OAuth) |
| POST | `/api/v1/auth/logout` | Wylogowanie |
| GET | `/api/v1/auth/session` | Status sesji |

### Dashboard — `GET /api/v1/dashboard/`
Pełny status: VM (CPU/RAM/Swap/Uptime), BG, porty TCP, public IP, lista podów.

### Battlegroup
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/battlegroup/status` | Status BG |
| POST | `/.../start` `/.../stop` `/.../restart` `/.../update` | Sterowanie BG |
| POST | `/.../enable-swap` `/.../disable-swap` | Swap memory |
| POST | `/.../add-sietch` `/.../remove-sietch` | Multi-sietch |

### Gameplay (główne API)
| Metoda | Endpoint |
|--------|----------|
| GET | `/api/v1/gameplay/players` |
| GET | `/api/v1/gameplay/players/{id}/detail` |
| POST | `/api/v1/gameplay/give-item` |
| POST | `/api/v1/gameplay/give-currency` |
| POST | `/api/v1/gameplay/cheat-script` |
| POST | `/api/v1/gameplay/kick` `/.../whisper` `/.../broadcast/generic` `/.../broadcast/shutdown` |
| POST | `/api/v1/gameplay/teleport` |
| GET | `/api/v1/gameplay/storage` `/.../storage/items` |
| GET | `/api/v1/gameplay/bases` `/.../bases/{id}/sublenne` |
| GET | `/api/v1/gameplay/blueprints` `/.../blueprints/export` |
| GET | `/api/v1/gameplay/game-config` |

### Database
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/v1/database/query` | SQL |
| POST | `/api/v1/database/backup` | pg_dump |
| POST | `/api/v1/database/restore` | Przywracanie |
| GET | `/api/v1/database/tables` `/.../tables/{table}` | Przeglądarka |

### Database Editor
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/.../players/search` | Szukaj graczy |
| POST | `/.../player/grant-keystones` | Keystones |
| POST | `/.../player/unlock-recipes` | Przepisy |
| POST | `/.../player/max-specs` | Specjalizacje |
| POST | `/.../player/set-level` | Poziom |
| POST | `/.../player/max-currency` | Waluta |
| POST | `/.../player/grant-job-skills` | Job skills |
| POST | `/.../player/god-mode` | God mode |

### Market & Market Bot
| Metoda | Endpoint |
|--------|----------|
| GET | `/api/v1/market/listings` |
| GET/POST | `/api/v1/market-bot/status` `/.../config` |
| POST | `/.../buy-tick` `/.../list-tick` `/.../clear` `/.../seed` |
| GET | `/.../snapshot` `/.../balance` |

### Pozostałe
| Moduł | Endpointy |
|--------|-----------|
| Characters | `/api/v1/characters/{id}/stats`, `/.../tech-tree/unlock-all`, `/.../keystones/grant-all`, `/.../economy/set` |
| Server Control | `/api/v1/server-control/start-vm`, `/.../stop-vm`, `/.../start-bg`, `/.../stop-bg` |
| Server Settings | `/api/v1/server-settings/` (GET/POST), `/.../sections`, `/.../presets` |
| Items | `/api/v1/items/catalog` |
| Inventory | `/api/v1/inventory/{id}` |
| Logs | `/api/v1/logs/`, `/.../cheat-events`, `/.../export` |
| Welcome | `/api/v1/welcome/` |
| WebSocket | `/api/v1/ws/console`, `/api/v1/ws/terminal` |

---

## 7. Skrypty pomocnicze

| Skrypt | Ścieżka | Opis |
|--------|---------|------|
| `START.bat` | `./` | Uruchamia serwer lokalnie |
| `setup.ps1` | `./` | Instaluje na Windows |
| `install-bot.sh` | `scripts/` | Bot Muaddib na VM (systemd) |

### Instalacja bota na VM
```bash
scp scripts/install-bot.sh dune@192.168.1.100:/tmp/ && ssh dune@192.168.1.100 "bash /tmp/install-bot.sh"
```

---

## 8. Backupy i przywracanie

### Backup ręczny
Zakładka **Database** → "Create Backup" — pg_dump przez kubectl.

### Backup całej aplikacji
```powershell
Get-ChildItem $src -Exclude @('backups','logs','__pycache__') | Compress-Archive -DestinationPath "backups\dune-admin_YYYY-MM-DD_HHmm.zip"
```

### Przywracanie
1. Rozpakuj `.zip`
2. Uruchom `START.bat`

---

## 9. Znane problemy / TODO

### Naprawione (2026-08-03)
| Problem | Status |
|---------|--------|
| `giveStarter()` hardcodowany ID 1 | ✅ |
| Martwy `<script>` w innerHTML (FLS Token) | ✅ |
| XSS w `database-editor.js` | ✅ |
| Wszystkie referencje zewnętrzne w kodzie | ✅ Usunięte |
| 212 skryptów diagnostycznych w katalogu głównym | ✅ Przeniesione do `_fixes_archive/` |
| 283 225 emoji zastąpionych symbolami geometrycznymi | ✅ |
| Font Dune Rise wdrożony | ✅ |
| Logo aplikacji | ✅ |

### Do zrobienia
- [ ] Tryb instalacji npm/pnpm
- [ ] Testy `install-bot.sh` na VM
- [ ] Testy jednostkowe backendu
- [ ] Walidacja formularzy w Settings

---

## 10. Sesje rozwoju

| Data | Zakres prac |
|------|-------------|
| 2026-08-03 | Market, Market Bot, Broadcast, Commands, Scheduler, Settings, Setup Wizard, Gameplay Admin, Dashboard VM, Welcome Kits, Item Catalog, Storage, **pełny rebranding Arrakis**: paleta kolorów, font Dune Rise, geometryczne ikony, logo, tło pustynne, audyt + czyszczenie kodu, backup, dokumentacja |

### Statystyki kodu (2026-08-03)

| Kategoria | Plików | Linii |
|-----------|--------|-------|
| Backend (Python) | ~17 | ~5000+ |
| Frontend JS (tabs) | 24 | ~10000+ |
| Frontend CSS | 1 | ~350 |
| Frontend HTML | 1 | ~160 |
| Konfiguracja | 3 | ~200 |
| Skrypty | ~10 | ~500 |
| **Razem** | **~56** | **~16 000+** |

---

> Dokumentacja wygenerowana: 2026-08-03 | Dune Admin Manager v0.1.0

---

## 📑 Spis treści

1. [Architektura](#1-architektura)
2. [Instalacja i uruchomienie](#2-instalacja-i-uruchomienie)
3. [Konfiguracja](#3-konfiguracja)
4. [Panel boczny — wszystkie zakładki](#4-panel-boczny)
5. [Backend API — pełny spis endpointów](#5-backend-api)
6. [Skrypty pomocnicze](#6-skrypty-pomocnicze)
7. [Backupy i przywracanie](#7-backupy-i-przywracanie)
8. [Znane problemy / TODO](#8-znane-problemy--todo)
9. [Sesje rozwoju](#9-sesje-rozwoju)
10. [Plany na przyszłość](#10-plany-na-przyszłość)

---

## 1. Architektura

```
dune-admin-manager/
├── backend/               # Serwer FastAPI (Python)
│   ├── main.py            # Punkt wejściowy, routing, WebSocket
│   ├── config.py          # Konfiguracja (YAML + env vars)
│   ├── middleware.py       # Rate limiter, sesje, audyt
│   ├── api/               # Moduły API
│   │   ├── auth.py            # Logowanie (bcrypt + Discord OAuth)
│   │   ├── dashboard.py       # Stan VM, BG, porty, IP
│   │   ├── battlegroup.py     # Sterowanie BG (start/stop/restart)
│   │   ├── gameplay.py        # Gracze, itemy, komendy, teleport
│   │   ├── characters.py      # Edycja postaci
│   │   ├── players.py         # Lista graczy, give item/currency
│   │   ├── database.py        # Backup/restore/SQL
│   │   ├── database_editor.py # Edycja save'ów graczy
│   │   ├── market.py          # Giełda (listings)
│   │   ├── market_bot.py      # Bot Muaddib
│   │   ├── server_control.py  # Kontrola Hyper-V VM
│   │   ├── server_settings.py # INI config serwera
│   │   ├── item_catalog.py    # Katalog itemów
│   │   ├── inventory.py       # Inwentarz gracza
│   │   ├── logs.py            # Logi gry
│   │   ├── welcome.py         # Pakiety startowe
│   │   └── remaining.py       # Routery pomocnicze
│   └── services/
│       └── ssh_service.py     # SSH do VM (192.168.1.100)
├── frontend/
│   ├── index.html             # Główny HTML
│   ├── css/style.css          # Stylizacja (ciemny motyw)
│   ├── js/app_clean.js        # Główna aplikacja (routing)
│   ├── js/api.js              # Klient API
│   ├── js/tabs/               # 24 zakładki (osobne pliki JS)
│   └── img/bg-desert.png      # Tło aplikacji
├── scripts/                   # Skrypty instalacyjne
├── config/
│   ├── config.yaml            # Główna konfiguracja
│   └── permissions.example.yaml # Role i uprawnienia
├── backups/                   # Kopie zapasowe (.zip)
├── data/catalogs/             # Katalogi itemów (1664 pozycji)
└── _fixes_archive/            # Archiwum skryptów diagnostycznych
```

### Dane techniczne

| Parametr | Wartość |
|----------|---------|
| Python | 3.11.15 (C:\Espressif\tools\python\python.exe) |
| Serwer HTTP | FastAPI + uvicorn na 127.0.0.1:8080 |
| Baza danych | PostgreSQL przez SSH (192.168.1.100) → kubectl → psql |
| Namespace | `funcom-seabass-sh-1ba9d7a35da882ec-qagalq` |
| Pod DB | `db-dbdepl-sts-0` |
| Frontend | Vanilla JS (bez frameworka), ciemny motyw |
| Cache bust | `?ts=20260803x` |
| Katalog itemów | 1664 itemów w `data/catalogs/item-data.json` |
| Schematy augmentacji | 91 schematów |

---

## 2. Instalacja i uruchomienie

### Tryb 1: Lokalny (localhost) — plik .bat

```cmd
cd c:\Projects\OfflineWorkspace\dune-admin-manager
START.bat
```

Lub ręcznie:

```powershell
C:\Espressif\tools\python\python.exe -m backend.main
```

Aplikacja dostępna na: **http://127.0.0.1:8080/static/index.html**

### Tryb 2: Instalator (planowany)

Instalacja przez npm/pnpm z gotowym instalatorem, podobnie jak SCUM Manager:
- `pnpm install` — instaluje zależności
- `pnpm start` — uruchamia serwer produkcyjny
- `pnpm build` — buduje frontend do dystrybucji
- Automatyczne wykrywanie ścieżek, konfiguracja z pliku `.env`

### Wymagania

- Python 3.11+
- Dostęp SSH do VM (klucz: `C:\Users\YOUR_USERNAME\.ssh\dune_key`)
- Hyper-V (do kontroli VM)
- PowerShell (Admin) do kontroli VM

---

## 3. Konfiguracja

Plik: `config/config.yaml`

```yaml
provider: hyperv           # hyperv | docker | kubectl | amp | local
listen:
  listen_addr: 127.0.0.1
  listen_port: 8080

hyperv:
  vm_name: dune-server
  server_path: C:\DuneServer
  memory_gb: 20

ssh:
  host: 192.168.1.100
  port: 22
  user: dune
  key_path: C:\Users\YOUR_USERNAME\.ssh\dune_key

database:
  host: 192.168.1.100
  port: 15432
  user: postgres
  password: "..."
  database: postgres
  schema: public

scheduler:
  enabled: true
  daily_restart_time: "04:00"
  timezone: Europe/Warsaw

backup:
  backup_dir: backups
  auto_backup_enabled: false
  auto_backup_interval_hours: 6
  max_backups: 10

auth:
  enabled: false
  local_enabled: true
  local_username: admin
  session_ttl_hours: 24
  guest_enabled: true

market_bot:
  enabled: true

logging:
  level: INFO
  audit_log: logs/audit.log
```

### Uprawnienia (RBAC)

| Rola | Uprawnienia |
|------|-------------|
| **Owner** | Pełny dostęp (`*`) |
| **Admin** | dashboard, battlegroup, players, server, database, logs, market, welcome, monitoring, scheduler, auth, events |
| **Moderator** | dashboard, players, logs, monitoring, events |
| **Viewer** | dashboard, players, monitoring, events (tylko odczyt) |
| **Guest** | dashboard (minimalny) |

---

## 4. Panel boczny — wszystkie zakładki

### ⚙️ Operations (7 zakładek)

| # | Zakładka | Plik JS | Opis |
|---|----------|---------|------|
| 1 | 📊 **Dashboard** | `dashboard_v2.js` | Stan VM (CPU/RAM/Swap/Uptime), status BG, porty TCP, public IP, lista podów |
| 2 | ⚔️ **Battlegroup** | `battlegroup.js` | Start/Stop/Restart/Update BG, swap memory, multi-sietch |
| 3 | 📋 **Logs** | `logs.js` | Kolorowe logi z filtrowaniem (game/director/operator), cheat detection |
| 4 | 🗄️ **Database** | `database_v2.js` | Backup/Restore PostgreSQL, harmonogram, SQL editor, przeglądarka tabel |
| 5 | 🔧 **DB Editor** | `database-editor.js` | Edycja save'ów: god mode, keystones, przepisy, specy, waluta, job skills |
| 6 | ⚙️ **Server Settings** | `server-settings_v2.js` | Edytor INI: nazwa/hasło, porty, 3 presety (PvE/PvP/Single) |
| 7 | 🧪 **Extra Settings** | `extra-settings2.js` | ~100+ opcji eksperymentalnych: survival, paliwo, czerw, hazardy, pojazdy, NPC |

### 👤 Player World (5 zakładek)

| # | Zakładka | Plik JS | Opis |
|---|----------|---------|------|
| 8 | 👤 **Players** | `players.js` | Lista graczy z wyszukiwarką, szczegóły, landsraad |
| 9 | 🎨 **Characters** | `characters_v2.js` | Edytor postaci: staty, specjalizacje, ekonomia, inwentarz |
| 10 | 📦 **Storage** | `storage.js` | Przeglądarka kontenerów: właściciel, typ, mapa, itemy |
| 11 | 🏗️ **Bases** | `bases.js` | Bazy graczy: jedna na wiersz, szczegóły sublenne, eksport |
| 12 | 📘 **Blueprints** | `blueprints.js` | Katalog blueprintów: szukaj, eksport JSON, import |

### 💰 Economy (5 zakładek)

| # | Zakładka | Plik JS | Opis |
|---|----------|---------|------|
| 13 | 🏛️ **Landsraad** | `market.js` (LandsraadTab) | Status Landsraadu: termin, dekrety, rody z paskami postępu |
| 14 | 📈 **Market** | `market.js` | Giełda: statystyki, filtry, tabela, dodawanie ofert, seed/clear |
| 15 | 🤖 **Market Bot** | `market_bot.js` | Bot Muaddib: status, buy/list ticki, konfiguracja cen, balans |
| 16 | 📢 **Broadcast** | `broadcast.js` | 4 podzakładki: Generic, Server Alert, GM Whisper, Linki |
| 17 | 🎁 **Welcome Kits** | `welcome.js` | Konfigurowalne pakiety startowe, wysyłka przez FLS ID |

### 🛠️ Management (6 zakładek)

| # | Zakładka | Plik JS | Opis |
|---|----------|---------|------|
| 18 | ⚙️ **Settings** | `settings.js` | 13 podzakładek: Updates, Theme, Warnings, Hyper-V LAN, Public IP, Server Browser, FLS Token, Fresh Start, Steam/SSH, Ports, Mobile, DB Connection |
| 19 | ⚡ **Commands** | `commands.js` | Kafelki z komendami PowerShell (VM/BG/Tools) + embedded terminal |
| 20 | 🎮 **Gameplay Admin** | `gameplay.js` | Panel admina: kick, whisper, broadcast, teleport, cheaty, waluta, specjalizacje, journey, pojazdy, inventory mutations, give itemy |
| 21 | 📡 **Monitoring** | `monitoring.js` | Director + File Browser, zasoby podów, zasoby VM |
| 22 | ⏰ **Scheduler** | `scheduler.js` | Automatyczny restart (czas + ostrzeżenie), auto backup, auto update |
| 23 | 🔧 **Setup Wizard** | `setup-wizard.js` | 3 ścieżki: Istniejący/Nowy/LAN serwer, pre-flight checki |

### 📦 Pozostałe (2 zakładki)

| # | Zakładka | Plik JS | Opis |
|---|----------|---------|------|
| 24 | 📦 **Item Catalog** | `items.js` | Katalog 1664 itemów z paginacją, wyszukiwarką, filtrem kategorii |
| 25 | 🎫 **Battlepass** | `app_clean.js` (inline) | Struktura tierów battlepass (ukryta — tylko programowo) |

---

## 5. Backend API — pełny spis endpointów

### Auth (`backend/api/auth.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/v1/auth/login` | Logowanie (lokalne bcrypt lub Discord OAuth) |
| POST | `/api/v1/auth/logout` | Wylogowanie |
| GET | `/api/v1/auth/session` | Status sesji |
| POST | `/api/v1/auth/set-password` | Ustaw hasło lokalne |

### Dashboard (`backend/api/dashboard.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/dashboard/` | Pełny status: VM (CPU/RAM/Swap/Uptime), BG, porty, IP, pody |

### Battlegroup (`backend/api/battlegroup.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/battlegroup/status` | Status BG |
| POST | `/api/v1/battlegroup/start` | Uruchom BG |
| POST | `/api/v1/battlegroup/stop` | Zatrzymaj BG |
| POST | `/api/v1/battlegroup/restart` | Restart BG |
| POST | `/api/v1/battlegroup/update` | Aktualizuj BG |
| POST | `/api/v1/battlegroup/enable-swap` | Włącz swap memory |
| POST | `/api/v1/battlegroup/disable-swap` | Wyłącz swap memory |
| POST | `/api/v1/battlegroup/add-sietch` | Dodaj sietch |
| POST | `/api/v1/battlegroup/remove-sietch` | Usuń sietch |

### Gameplay (`backend/api/gameplay.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/gameplay/players` | Lista graczy online |
| GET | `/api/v1/gameplay/players/{id}/detail` | Szczegóły gracza |
| GET | `/api/v1/gameplay/players/{id}/landsraad` | Dane landsraadu gracza |
| POST | `/api/v1/gameplay/give-item` | Daj item graczowi |
| POST | `/api/v1/gameplay/give-currency` | Daj walutę (solari/kredyty/scrip) |
| POST | `/api/v1/gameplay/cheat-script` | Uruchom skrypt cheat |
| POST | `/api/v1/gameplay/kick` | Wyrzuć gracza |
| POST | `/api/v1/gameplay/whisper` | Wyślij wiadomość prywatną |
| POST | `/api/v1/gameplay/broadcast/generic` | Wyślij broadcast |
| POST | `/api/v1/gameplay/broadcast/shutdown` | Odliczanie do restartu |
| POST | `/api/v1/gameplay/teleport` | Teleportuj |
| GET | `/api/v1/gameplay/storage` | Lista kontenerów |
| GET | `/api/v1/gameplay/storage/items` | Item w kontenerze |
| GET | `/api/v1/gameplay/bases` | Lista baz |
| GET | `/api/v1/gameplay/bases/{id}/sublenne` | Szczegóły sublenne bazy |
| GET | `/api/v1/gameplay/blueprints` | Lista blueprintów |
| GET | `/api/v1/gameplay/blueprints/export` | Eksport blueprintów |
| GET | `/api/v1/gameplay/game-config` | Konfiguracja gry (INI) |
| GET | `/api/v1/gameplay/battlepass/player/{id}` | Postęp battlepass gracza |
| GET | `/api/v1/gameplay/commands/fix-maps` | Napraw mapy on-demand |

### Characters (`backend/api/characters.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/characters/{id}/stats` | Statystyki postaci |
| POST | `/api/v1/characters/tech-tree/unlock-all` | Odblokuj całe drzewko |
| GET | `/api/v1/characters/{id}/keystones` | Keystones gracza |
| POST | `/api/v1/characters/keystones/grant-all` | Daj wszystkie keystones |
| POST | `/api/v1/characters/economy/set` | Ustaw ekonomię (solari/scrip) |

### Players (`backend/api/players.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/players/` | Lista wszystkich graczy |
| GET | `/api/v1/players/summary` | Podsumowanie graczy |
| GET | `/api/v1/players/{id}` | Szczegóły gracza |
| POST | `/api/v1/players/give-item` | Daj item |
| POST | `/api/v1/players/give-currency` | Daj walutę |
| POST | `/api/v1/players/cheat-script` | Uruchom skrypt |
| POST | `/api/v1/players/update-tags` | Aktualizuj tagi |

### Database (`backend/api/database.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/v1/database/query` | Wykonaj SQL |
| POST | `/api/v1/database/backup` | Stwórz backup pg_dump |
| GET | `/api/v1/database/backups` | Lista backupów |
| POST | `/api/v1/database/restore` | Przywróć backup |
| GET | `/api/v1/database/tables` | Lista tabel |
| GET | `/api/v1/database/tables/{table}` | Podgląd tabeli |

### Database Editor (`backend/api/database_editor.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/database-editor/players/search` | Szukaj graczy |
| POST | `/api/v1/database-editor/player/grant-keystones` | Daj keystones |
| POST | `/api/v1/database-editor/player/unlock-recipes` | Odblokuj przepisy |
| POST | `/api/v1/database-editor/player/max-specs` | Max specjalizacje |
| POST | `/api/v1/database-editor/player/set-level` | Ustaw poziom |
| POST | `/api/v1/database-editor/player/max-currency` | Max waluta |
| POST | `/api/v1/database-editor/player/grant-job-skills` | Daj job skills |
| POST | `/api/v1/database-editor/player/reset-keystones` | Reset keystones |
| POST | `/api/v1/database-editor/player/god-mode` | God mode |

### Market (`backend/api/market.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/market/listings` | Lista ofert giełdowych |
| GET | `/api/v1/market/bot/status` | Status bota |
| POST | `/api/v1/market/bot/start` | Uruchom bota |
| POST | `/api/v1/market/bot/stop` | Zatrzymaj bota |
| POST | `/api/v1/market/bot/restart` | Restart bota |

### Market Bot (`backend/api/market_bot.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/market-bot/status` | Status bota Muaddib |
| GET | `/api/v1/market-bot/config` | Konfiguracja bota |
| POST | `/api/v1/market-bot/config` | Zapisz konfigurację |
| POST | `/api/v1/market-bot/buy-tick` | Wykonaj tick kupna (k12 dice) |
| POST | `/api/v1/market-bot/list-tick` | Wykonaj tick wystawiania |
| POST | `/api/v1/market-bot/clear` | Wyczyść wszystkie oferty bota |
| POST | `/api/v1/market-bot/seed` | Zasiej rynek losowymi ofertami |
| GET | `/api/v1/market-bot/snapshot` | Snapshot rynku |
| GET | `/api/v1/market-bot/balance` | Balans solari bota |

### Server Control (`backend/api/server_control.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/server-control/status` | Status Hyper-V VM |
| POST | `/api/v1/server-control/start-vm` | Uruchom VM |
| POST | `/api/v1/server-control/stop-vm` | Zatrzymaj VM |
| POST | `/api/v1/server-control/restart-vm` | Restart VM |
| POST | `/api/v1/server-control/start-bg` | Uruchom BG |
| POST | `/api/v1/server-control/stop-bg` | Zatrzymaj BG |

### Server Settings (`backend/api/server_settings.py`)
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/server-settings/` | Odczytaj INI |
| POST | `/api/v1/server-settings/` | Zapisz INI |
| GET | `/api/v1/server-settings/sections` | Lista sekcji INI |
| GET | `/api/v1/server-settings/presets` | 3 presety (PvE/PvP/Single) |

### Pozostałe endpointy
| Metoda | Endpoint | Moduł | Opis |
|--------|----------|--------|------|
| GET | `/api/v1/items/catalog` | item_catalog.py | Katalog itemów |
| GET | `/api/v1/inventory/{id}` | inventory.py | Inwentarz gracza |
| POST | `/api/v1/inventory/add` | inventory.py | Dodaj item |
| GET | `/api/v1/logs/` | logs.py | Logi gry |
| GET | `/api/v1/logs/cheat-events` | logs.py | Eventy cheatów |
| GET | `/api/v1/logs/export` | logs.py | Eksport logów |
| GET | `/api/v1/welcome/` | welcome.py | Konfiguracja pakietów |
| WS | `/api/v1/ws/console` | main.py | Terminal PowerShell WebSocket |
| WS | `/api/v1/ws/terminal` | main.py | Terminal WebSocket |

---

## 6. Skrypty pomocnicze

| Skrypt | Ścieżka | Opis |
|--------|---------|------|
| `START.bat` | `./` | Uruchamia serwer lokalnie |
| `setup.ps1` | `./` | Instaluje na Windows (ProgramFiles, pip, skrót) |
| `deploy.ps1` | `./` | Deployment na serwer |
| `install-bot.sh` | `scripts/` | Instaluje bota Muaddib na VM (systemd) |
| `install.ps1` | `scripts/` | Instalator Windows |
| `install.sh` | `scripts/scripts/` | Instalator Linux (GitHub release, systemd) |

### Instalacja bota Muaddib na VM
```bash
scp scripts/install-bot.sh dune@192.168.1.100:/tmp/ && ssh dune@192.168.1.100 "bash /tmp/install-bot.sh"
```
Bot kupuje co 5 min (k12 dice), wystawia co 30 min.

---

## 7. Backupy i przywracanie

### Backup ręczny (zakładka Database)
Kliknij "Create Backup" — tworzy pg_dump bazy danych przez kubectl.

### Backup automatyczny (Scheduler)
Można skonfigurować automatyczny backup o określonej godzinie z zachowaniem N ostatnich kopii.

### Backup całej aplikacji
```powershell
Compress-Archive -Path "c:\Projects\OfflineWorkspace\dune-admin-manager\*" -DestinationPath "backups\dune-admin_YYYY-MM-DD_HHmm.zip"
```
Archiwum zawiera cały kod, konfigurację i dane (bez folderu `backups`, `logs`, `__pycache__`).

### Przywracanie
1. Rozpakuj backup `.zip`
2. Uruchom `START.bat`

---

## 8. Znane problemy / TODO

### Naprawione błędy (sesja 2026-08-03)

| Problem | Plik | Status |
|---------|------|--------|
| `giveStarter()` wysyłał itemy zawsze na konto 1 | `welcome.js` | ✅ Naprawione |
| `<script>` w innerHTML nie działał (FLS Token) | `settings.js` | ✅ Naprawione |
| XSS w `database-editor.js` przez nazwy postaci | `database-editor.js` | ✅ Naprawione |
| "Duke" zamiast "Muaddib" w Market | `market.js` | ✅ Naprawione |
| Referencje do oryginalnego kodu w komentarzach | Wszystkie pliki | ✅ Usunięte |

### Do zrobienia

- [ ] Tryb instalacji npm/pnpm (drugi tryb uruchamiania)
- [ ] Testowanie `scripts/install-bot.sh` na rzeczywistej VM
- [ ] Port check mode używający zewnętrznych serwisów
- [ ] Pairing z aplikacją mobilną
- [ ] Dokumentacja API w formacie OpenAPI/Swagger
- [ ] Testy jednostkowe backendu
- [ ] Automatyczne wykrywanie itemów (obecnie 1664 z katalogu)
- [ ] Walidacja formularzy w Settings (puste pola, nieprawidłowe formaty)

---

## 9. Sesje rozwoju

| Sesja | Data | Zakres prac |
|-------|------|-------------|
| Główna | 2026-08-03 | Market, Market Bot, Broadcast, Commands, Scheduler, Settings, Setup Wizard, Gameplay Admin, Dashboard VM, Welcome Kits, Item Catalog, Storage, dokumentacja, backup, audyt kodu |
| SSH Settings | 2026-08-18 | Konfiguracja połączenia SSH w UI (Settings → Steam/SSH) |

### Ostatnie zmiany (2026-08-18)

#### ⚙ Konfiguracja SSH w interfejsie (Settings → Steam/SSH)

Dodano pełną konfigurację połączenia SSH bez edycji kodu. Inny użytkownik może
skonfigurować połączenie z serwerem samodzielnie:

| Pole | Opis |
|------|------|
| SSH Host | IP maszyny wirtualnej (np. `192.168.1.100`) |
| SSH Port | Port SSH (domyślnie `22`) |
| SSH User | Użytkownik SSH (domyślnie `dune`) |
| SSH Password | Hasło (puste = tylko klucz) |
| SSH Key Path | Ścieżka do klucza prywatnego |
| ⊙ Auto-Find | Automatyczne znalezienie klucza utworzonego przez `battlegroup.bat` |
| ⬆ Wklej / nadpisz klucz | Zapis nowego klucza z wklejonej treści |
| 🗑 Usuń klucz | Usunięcie klucza |
| ⊞ Save Config | Zapis do `config.yaml` + ponowne połączenie |
| ⏻ Test Connection | Test połączenia bez zapisu |

**Gdzie battlegroup zapisuje klucz SSH:** `%LOCALAPPDATA%\DuneAwakeningServer\sshKey`.
Przycisk ⊙ Auto-Find wykrywa go automatycznie.

**Nowe endpointy backend:**
- `GET/POST /api/v1/server-settings/ssh` — odczyt/zapis konfiguracji SSH
- `POST /api/v1/server-settings/ssh/test` — test połączenia
- `GET /api/v1/server-settings/ssh/key` — status klucza
- `POST /api/v1/server-settings/ssh/key` — nadpisanie klucza
- `DELETE /api/v1/server-settings/ssh/key` — usunięcie klucza
- `GET /api/v1/server-settings/ssh/key/autodetect` — auto-wykrycie klucza

### Ostatnie zmiany (2026-08-03)
- 212 skryptów diagnostycznych przeniesionych do `_fixes_archive/`
- Usunięcie wszystkich referencji zewnętrznych z kodu źródłowego
- Naprawa 3 krytycznych bugów
- Pełny audyt kodu (24 pliki JS, 17 plików Python, CSS, HTML)
- Tło aplikacji: półprzezroczyste (overlay 50%), górny pasek nieprzezroczysty
- Backup: `dune-admin_2026-08-03_0910.zip`

---

## 10. Plany na przyszłość

### Tryb dualny uruchamiania

Aplikacja powinna mieć dwie opcje uruchamiania:

#### Tryb A: Lokalny (.bat) — obecny
```cmd
START.bat
```
- Szybkie uruchomienie z pliku .bat
- Działa od razu po pobraniu repozytorium
- Wymaga tylko Pythona 3.11+
- Dla administratorów serwerów lokalnych

#### Tryb B: Instalator npm/pnpm — planowany
```bash
pnpm install
pnpm start
```
- Profesjonalny instalator podobny do SCUM Manager
- `package.json` z zależnościami
- Automatyczne wykrywanie konfiguracji
- Plik `.env` do zarządzania zmiennymi
- Możliwość aktualizacji przez `pnpm update`
- Dla użytkowników chcących stabilnej instalacji

**Kroki do implementacji:**
1. Stworzenie `package.json` z sekcją `scripts` i `dependencies`
2. Przeniesienie konfiguracji do `.env.example`
3. Dodanie `pnpm-lock.yaml` (już istnieje)
4. Skrypt `build` do budowania frontendu
5. Skrypt `start` jako alias dla `python -m backend.main`
6. Dokumentacja instalacji dla obu trybów
7. Automatyczne wykrywanie Pythona i wymaganych narzędzi

---

## 📊 Statystyki kodu

| Kategoria | Plików | Linii kodu |
|-----------|--------|------------|
| Backend (Python) | ~17 | ~5000+ |
| Frontend JS (tabs) | 24 | ~8000+ |
| Frontend CSS | 1 | ~350 |
| Frontend HTML | 1 | ~160 |
| Konfiguracja | 3 | ~200 |
| Skrypty | ~10 | ~500 |
| **Razem** | **~56** | **~14 000+** |

---

> **Uwaga:** Ta dokumentacja nie zawiera żadnych referencji do zewnętrznych projektów ani autorów. Wszystkie funkcje i opisy dotyczą wyłącznie aplikacji Dune Admin Manager.
