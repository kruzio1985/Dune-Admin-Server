# Dune Admin Manager — Historia Rozwoju (Development Log)

## O projekcie
Aplikacja webowa do zarządzania serwerem Dune Awakening (self-hosted). 
Zastępuje `battlegroup.bat`. Działa na Windows 10/11 Pro z Hyper-V.
Python 3.11+ backend (FastAPI) + vanilla HTML/CSS/JS frontend (Dune dark theme).

**Portable**: skopiuj folder, kliknij START.bat — działa.
**Adres**: http://127.0.0.1:8080

---

## Sesja 9 — 2026-08-18: Konfiguracja SSH w interfejsie

### Nowe: Settings → Steam/SSH — pełna konfiguracja połączenia SSH
Pozwala skonfigurować połączenie SSH z serwerem bez edycji kodu/configu:

- **Backend** (`backend/api/server_settings.py`):
  - `GET/POST /ssh` — odczyt/zapis (host, port, user, password, key_path) do `config.yaml`
  - `POST /ssh/test` — test połączenia (paramiko, hasło+klucz)
  - `GET /ssh/key` — status klucza (ścieżka, istnienie, rozmiar)
  - `POST /ssh/key` — nadpisanie klucza (wklejona treść, chmod 600)
  - `DELETE /ssh/key` — usunięcie klucza
  - `GET /ssh/key/autodetect` — auto-wykrycie klucza battlegroup
- **Backend** (`backend/services/ssh_service.py`): dodano `reset_ssh()` — reset singletona po zmianie configu
- **Frontend** (`frontend/js/tabs/settings.js`): zakładka Steam/SSH z polami Host/Port/User/Password/KeyPath + przyciski Save/Test/Auto-Find/Overwrite/Delete

### Klucz SSH battlegroup
`battlegroup.bat` zapisuje klucz w `%LOCALAPPDATA%\DuneAwakeningServer\sshKey`.
Aplikacja auto-wykrywa go przez `_find_key()` oraz przycisk ⊙ Auto-Find.

---

## Sesja 1 — 2026-07-30: Analiza i szkielet
- Analiza 3 projektów GitHub jako referencji:
  - `Icehunter/dune-admin` (Go + React/TS, 115 releases) — główne źródło
  - `the4rchangel/dune-awakening-server-manager` (Python/Flask)
  - `adainrivers/dune-dedicated-server-manager` (Node.js)
- Stworzenie szkieletu projektu (FastAPI + vanilla frontend)
- Przekopiowanie danych: item-catalog.json (1664 itemów), cheat-scripts.json, vehicles.json
- Uruchomienie serwera na http://127.0.0.1:8080

## Sesja 2 — Rozbudowa do pełnej aplikacji
- Rozbudowa z 5 do 16 zakładek (wszystkie z realnymi funkcjami)
- Implementacja:
  - Dashboard (VM status, BG status, quick actions, pods)
  - Players (lista, edycja, give item, give currency, cheat scripts)
  - Characters (stats, inventory, tech-tree, keystones, economy)
  - Database (SQL console, backup/restore, table browser)
  - Logs (game logs, cheat events)
  - Market Bot (start/stop/restart)
  - Welcome Kits + MOTD
  - Battlegroup (start/stop/restart/update)
  - Server Settings (23 ustawienia w 5 kategoriach)
  - Monitoring (Director, FileBrowser, pod resources)
  - Setup Wizard (6 kroków instalacji)
  - Scheduler, Storage, Bases, Blueprints, Battlepass
- Backend: 28 API endpointów, middleware autoryzacji (RBAC 28 capabilities)
- Provider Hyper-V (PowerShell + SSH)

## Sesja 3 — Bugfixing
- **Static files 404**: StaticFiles pod /static/, HTML używa /static/ prefix
- **TABS undefined**: Wszystkie obiekty tabów definiowane PRZED rejestrem TABS
- **CharactersTab.showTab**: Przekazywanie `event` jako parametr onclick
- **Blueprints tylko 5 itemów**: API nie zwracało `is_schematic`. Fix: ładowanie z katalogu JSON
- **Server Settings puste pola**: `renderForm()` używa `f.value || f.default || ''`
- **Mock DB cursor error**: `_FallbackPool._Cursor` — dodane `__enter__`/`__exit__`
- **Dashboard crash (toFixed on undefined)**: Dodane `||0` fallbacki dla cpu_percent, memory_*
- **WebSocket error spam**: Wyciszone console.error, reconnect co 30s zamiast 5s

## Sesja 4 — Server Settings i Presety
- Przepisane `server-settings.js`:
  - 23 zweryfikowane ustawienia w 5 kategoriach
  - Typy pól: float, bool, int, str (z badge'ami)
  - Opisy pod każdą nazwą pola
  - Podpowiedzi (hints): "1.0=normal 2.0=double 5.0=5x"
  - Wartości domyślne pre-filled
  - 3 presety: PvE Private, Full PvP, Solo Easy Mode
  - Funkcja `applyPreset()` — klikanie presetu wypełnia wszystkie pola
  - Przycisk "💾 Save All Settings"
- Backend `/sections` endpoint zwraca kategorie + presety

## Sesja 6 — 2026-07-30: Full Production Deployment

### 🚀 Auto-Installer (URUCHOM.bat)
- Stworzony `URUCHOM.bat` — samowystarczalny launcher
- Automatycznie sprawdza/instaluje Python (winget)
- Automatycznie instaluje pakiety (requirements.txt)
- Automatycznie tworzy config.yaml
- Automatycznie tworzy foldery (logs, backups, data)
- Uruchamia serwer i otwiera przeglądarkę

### 🔌 RabbitMQ Integration (kluczowe!)
- **AuthToken**: `Nu6VmPWUMvdPMeB7qErr` (stały token serwera)
- **Metoda**: `rabbitmqctl eval` z Erlangiem (NIE rabbitmqadmin!)
- **Exchange**: `heartbeats`, routing key: `notifications`
- **Format**: `{Version: 2, AuthToken, MessageContent: "{ServerCommand:...}"}`
- **Ważne**: RMQ działa TYLKO gdy gracz jest ONLINE w grze
- Plik: `backend/services/rmq_service.py`

### 🗄️ Database przez SSH/kubectl exec
- PostgreSQL wewnątrz VM Kubernetes (ClusterIP, niedostępny bezpośrednio)
- Połączenie przez: `ssh -> kubectl exec -> psql`
- Namespace: `funcom-seabass-sh-1ba9d7a35da882ec-qagalq` (auto-detekcja)
- DB Pod: `sh-1ba9d7a35da882ec-qagalq-db-dbdepl-sts-0` (auto-detekcja)
- Port: `localhost:15432` (wewnątrz poda)
- User: `postgres`, baza: `dune`
- Plik: `backend/services/db_service.py`

### 💰 Solaris/Scrip — WAŻNE!
- **Solaris = currency_id 0** (NIE 1!)
- **Scrip = currency_id 1**
- Tabela: `dune.player_virtual_currency_balances`
- Gra NADPISUJE saldo przy logout! Ustawiać TYLKO gdy gracz OFFLINE
- Funkcja: `dune.get_solaris_id()` zwraca 0
- `dune.adjust_player_virtual_currency_balance(controller_id, currency_id, delta)`
- Controller ID gracza = 4 (dla account_id=1)

### 🎮 Gameplay Admin (nowa zakładka)
- Nowy plik: `backend/api/gameplay.py` (30+ endpointów)
- Nowy plik: `frontend/js/tabs/gameplay.js`
- Endpointy:
  - `/gameplay/give-solari` — Solaris (DB, currency_id=0)
  - `/gameplay/give-scrip` — Scrip (DB, currency_id=1)
  - `/gameplay/intel/award` — Intel/Tech Knowledge (SQL)
  - `/gameplay/skills/set-points` — Skill points (RMQ)
  - `/gameplay/skills/set-module` — Skill module level (RMQ)
  - `/gameplay/teleport/to-location` — Teleport (RMQ)
  - `/gameplay/teleport/to-player` — Teleport do gracza (RMQ)
  - `/gameplay/chat/whisper` — GM Whisper (RMQ)
  - `/gameplay/chat/broadcast` — Server broadcast (RMQ)
  - `/gameplay/vehicles/spawn` — Spawn pojazdu (RMQ)
  - `/gameplay/give-item-live` — Give item online (RMQ)
  - `/gameplay/grant-all-skills` — Max wszystkie skille (RMQ)
  - `/gameplay/grant-all-tech` — Wszystkie tech recipes (RMQ)
  - `/gameplay/journey/complete` — Ukończ journey node (SQL)
  - `/gameplay/journey/reset` — Reset journey (SQL)
  - `/gameplay/journey/wipe` — Wyczyść wszystkie journey (SQL)
  - `/gameplay/unlock-trainer` — Odblokuj trainera (SQL+RMQ)
  - `/gameplay/unlock-main-quest` — Ukończ główny quest (SQL)
  - `/gameplay/contracts/complete` — Ukończ kontrakty (SQL)
  - `/gameplay/repair-gear` — Napraw ekwipunek (RMQ)
  - `/gameplay/fill-water` — Napełnij wodę (RMQ)
  - `/gameplay/clean-inventory` — Wyczyść inventory (RMQ)
  - `/gameplay/reset-progression` — Reset progresji (RMQ)
  - `/gameplay/faction/reset` — Reset fakcji (SQL)
  - `/gameplay/set-starter-class` — Ustaw klasę startową (SQL)
  - `/gameplay/delete-tutorials` — Usuń tutoriale (SQL)
  - `/gameplay/wipe-codex` — Wyczyść codex (SQL)
  - `/gameplay/landsraad/overview` — Landsraad domy (SQL)
  - `/gameplay/landsraad/player/{id}` — Gracz Landsraad (SQL)
  - `/gameplay/players/export/{id}` — Eksport gracza (DB)
  - `/gameplay/progression/presets` — Presety progresji
  - `/gameplay/coriolis/seeds` — Nasiona burz Coriolis

### 🐛 Naprawione błędy
- **Dashboard 307 redirect**: `/dashboard` → `/dashboard/`
- **WebSocket 403**: Dodany endpoint `/api/v1/ws/console`
- **Config.yaml**: Auto-kreacja z absolutną ścieżką (nie względną)
- **Player lista**: Poprawione nazwy kolumn (fls_id→user, faction_id→takeoverable)
- **Level w UI**: `player_state_id` NIE jest levelem — zmienione na `character_state`
- **Auto-detekcja IP VM**: Cache + ARP + Hyper-V + logi
- **Auto-detekcja ścieżki Steam/Dune**: Rejestr + libraryfolders.vdf

### 🏜️ Piaskowe czerwia (Sandworm) — UserGame.ini
- Dodane do `/home/dune/.dune/download/scripts/setup/config/UserGame.ini`
- `HarvestSpicePickupThreatUnit=0.01` (było 10.0 — 1000x mniej aggro)
- `WalkingThreatPerSec=1.0` (było 15.0)
- `ThreatDecreasingValuePerSec=50.0` (było 0 — szybki spadek zagrożenia)
- `m_GiantWormSystemEnabled=False`
- Aby zastosować: restart battlegroup (opcja 3)

### 📡 Monitoring
- Director URL: auto-detekcja przez `kubectl get svc | grep bgd-svc`
- FileBrowser URL: auto-detekcja przez `kubectl get pods | grep fb-deploy`
- Endpointy: `/api/v1/monitoring/director`, `/api/v1/monitoring/file-browser`

### 🖥️ Dostępne klasy (6/6)
- Trooper, Mentat, Swordmaster, BeneGesserit, Planetologist, Fremen
- Odblokowywanie przez CheatScript RMQ
- Skille: `Skills.Key.{Class}1-3` na level 3

### 🚗 Pojazdy
- Sandbike CHOAM, Buggy CHOAM, Ornithopter, Carryall, Sandbike Basic, Buggy Basic
- Spawn przez RMQ: `SpawnVehicleAt`

### 📋 Questy główne (7/7)
- DA_MQ_ANewBeginning, DA_MQ_FindTheFremen, DA_MQ_AssassinsHandbook
- DA_MQ_TheGreatConvention, DA_MQ_TheGreatConventionPt2
- DA_MQ_BloodAndGold, DA_MQ_WhereGodsDwell
- Ukończenie: SQL do `journey_story_node` + tagi `Journey.RewardsUnblocked`

---

## Kluczowe konfiguracje

### Porty
| Port | Protokół | Cel |
|------|----------|-----|
| 7777-7810 | UDP | Serwery gry |
| 27015 | UDP | Steam server browser |
| 8080 | TCP | Panel admina (localhost) |
| 15432 | TCP | PostgreSQL (wewnątrz VM) |
| 32218 | TCP | Director WWW |
| 3001 | TCP | FileBrowser |

### VM Info
- Nazwa: `dune-awakening`
- IP: auto-detekcja (obecnie 192.168.1.217)
- SSH: `dune@192.168.1.217`, klucz: `%LOCALAPPDATA%\DuneAwakeningServer\sshKey`
- Battlegroup: `sh-1ba9d7a35da882ec-qagalq`

### Ścieżki
- Serwer Dune: `D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server`
- Panel admin: `C:\Projects\OfflineWorkspace\dune-admin-manager`
- Config: `config/config.yaml` (auto-tworzony)

---

## Znane problemy
1. **RMQ działa tylko ONLINE**: Cheat scripts, give item, skills, vehicles wymagają gracza online
2. **DB overwrite na logout**: Solaris/Scrip ustawiać tylko gdy gracz offline
3. **Brak psycopg2**: Panel używa SSH fallback — działa poprawnie
4. **Intel points**: Przez SQL do `actor_fgl_entities` — gra może nadpisać

---

## Struktura projektu
```
dune-admin-manager/
├── START.bat              # Auto-launcher (Python check + pip install + start)
├── START.ps1              # PowerShell wersja
├── INSTALL.txt            # Instrukcja instalacji
├── CLAUDE.md              # Zasady dla AI (market bot, etc.)
├── backend/
│   ├── main.py            # FastAPI app, 28 routes, StaticFiles
│   ├── config.py          # AppConfig (config.yaml + .env)
│   ├── middleware.py       # Auth, rate limiter, RBAC (28 capabilities)
│   ├── providers/
│   │   ├── base.py        # Abstract BaseProvider
│   │   └── hyperv.py      # Hyper-V + PowerShell + SSH
│   ├── services/
│   │   ├── ssh_service.py # SSH z auto key detection
│   │   ├── db_service.py  # PostgreSQL + FallbackPool
│   │   └── ini_service.py # INI parser/generator
│   └── api/
│       ├── dashboard.py   # VM/BG status
│       ├── players.py     # CRUD + give-item/currency
│       ├── characters.py  # Stats, tech-tree, economy
│       ├── database.py    # SQL, backup/restore
│       ├── logs.py        # Game logs, cheat events
│       ├── market.py      # Market bot
│       ├── welcome.py     # Welcome kits + MOTD
│       ├── battlegroup.py # Start/stop/restart
│       ├── server_settings.py  # 23 settings + 3 presets
│       └── remaining.py   # Blueprints, Storage, Bases, itd.
├── frontend/
│   ├── index.html         # Sidebar 13 tabs, Dune-themed top bar
│   ├── css/style.css      # Full dark theme (Arrakis palette)
│   ├── js/
│   │   ├── app.js         # Nawigacja, login/logout, TABS registry
│   │   ├── api.js         # REST client (API_BASE=/api/v1)
│   │   ├── websocket.js   # Live console (30s reconnect)
│   │   └── tabs/
│   │       ├── dashboard.js
│   │       ├── players.js
│   │       ├── characters.js
│   │       ├── server-settings.js
│   │       ├── database.js
│   │       ├── logs.js
│   │       ├── market.js
│   │       ├── welcome.js
│   │       ├── monitoring.js
│   │       ├── setup-wizard.js
│   │       └── scheduler.js
│   └── data/
│       └── catalogs/
│           ├── item-catalog.json    # 1664 itemów
│           └── item-data.json       # 485 schematics
└── config/
    ├── config.example.yaml
    └── permissions.example.yaml
```

## Stack techniczny
- **Backend**: Python 3.11+, FastAPI, uvicorn, asyncssh, psycopg2
- **Frontend**: Vanilla HTML/CSS/JS, Dune dark theme
- **Infra**: Windows 10/11 Pro, Hyper-V, Dune Self-Hosted Server (Steam)
- **Port**: 8080

## Sesja 8 (finalna) — 2026-07-30: Uruchomienie produkcyjne

### Serwer Dune — status
- ✅ VM: dune-awakening, Default Switch, 172.28.248.224
- ✅ Battlegroup: sh-1ba9d7a35da882ec-cbmknc, 22 pody, 20 healthy
- ✅ World: MyDune (Europe)
- ✅ Token: zaakceptowany przez Funcom
- ✅ Wszystkie mapy: Hagga Basin, Deep Desert, Arrakeen, Harko Village, dungeony, ecolaby, survival
- ✅ Auto-backup: co 10 minut (144 backupy, 24h retencji)
- ✅ Director: http://172.28.248.224:31176
- ✅ FileBrowser: http://172.28.248.224:3001
- ✅ Public IP: YOUR.PUBLIC.IP (może się zmieniać)

### Admin Panel — status
- ✅ Dashboard: 22 pody na żywo, VM status
- ✅ Logi: pobierają z namespace funcom-seabass, pokazują logi PostgreSQL
- ✅ Database: SQL Console, Table Browser, auto-backup co 10min
- ✅ DB Editor: GOD MODE, keystones, recipes, level, currency
- ✅ Server Settings: 23 ustawienia, 3 presety
- ✅ Setup Wizard: auto-checki Hyper-V, dysk, Steam path, SSH key
- ✅ Server Control: auto-setup, start/stop VM i battlegroup
- ✅ SSH: działa bez hasła (klucz w %USERPROFILE%\.ssh\dune_key)
- ✅ Auto-start: skrót w Startup folder

### Rozwiązane problemy
- Battlegroup nie instalował się automatycznie → ręczne `/home/dune/.dune/bin/setup`
- SSH key permissions → klucz przeniesiony do .ssh, wygenerowany przez cmd
- Bitdefender blokował SSH → dodane wyjątki
- PowerShell 5.1 + OpenSSH brak w PATH → dodane do PATH
- Hyper-V wymaga restartu po włączeniu
- Windows portproxy nie obsługuje UDP → użyty NAT lub External Switch
- Cache przeglądarki → cache busting ?ts= w HTML

### Pliki projektu
- `START.bat` — launcher (auto-admin, Python check, pip install, start)
- `FIREWALL_PORTS.md` — porty, firewall, router
- `INSTALL_OTHER_PC.md` — instalacja na innym PC
- `DEVELOPMENT.md` — ten plik
- `SESSION_SAVE.md` — stan sesji
- `setup_dune.ps1` / `run_dune_setup.ps1` / `FIX_DUNE.bat` — skrypty pomocnicze

### Na innym PC (kroki)
1. Python 3.11+ + Steam + Dune Self-Hosted Server
2. Hyper-V włączony + restart
3. battlegroup.bat → a (initial-setup)
4. SSH: `/home/dune/.dune/bin/setup` (instaluje battlegroup)
5. Klucz SSH: `cmd /c 'copy "%LOCALAPPDATA%\DuneAwakeningServer\sshKey" "%USERPROFILE%\.ssh\dune_key"'`
6. START.bat → http://127.0.0.1:8080

---
## Sesja 6 — 2026-07-30: Database Editor, Firewall Guide, Setup Wizard fix

### Nowe pliki:
- **`FIREWALL_PORTS.md`** — pełny poradnik portów: Windows Firewall, 7 antywirusów, 8 routerów, Hyper-V portproxy
- **`DEVELOPMENT.md`** — ten plik

### Nowa zakładka: 🔧 DB Editor
- **Backend**: `backend/api/database_editor.py` — 10 endpointów
  - Search players, player info
  - Grant/reset keystones (205 perków)
  - Unlock all recipes (485 schematów)
  - Max all specs (5 specjalizacji na Lv100)
  - Set player level (1-60)
  - Max currency (9,999,999 Solari + Scrip)
  - Grant all job skills (9 klas)
  - 🔥 GOD MODE — wszystkie powyższe jednym kliknięciem
- **Frontend**: `frontend/js/tabs/database-editor.js`
  - Player search z podglądem statusu online
  - Player info z keystone count i spec levels
  - Operation log z timestampami

### Naprawiony Setup Wizard
- **Backend**: 4 nowe endpointy w `remaining.py`
  - `GET /status` — realne checki: Hyper-V (sc query + DISM + pliki), dysk, Steam path (registry + libraryfolders.vdf), SSH key, config.yaml
  - `POST /save-config` — zapisuje token + config do config.yaml
  - `POST /test-ssh` — testuje połączenie SSH do VM
  - `GET /key-status` — sprawdza istnienie klucza SSH
- **Frontend**: przepisany `setup-wizard.js`
  - Step 1: auto-check systemu z ✅/❌, wykrywa ścieżkę Steam z rejestru
  - Step 2: zapisuje token (type=password) do config.yaml
  - Step 3: dynamicznie pokazuje wykrytą ścieżkę serwera
  - Step 4: pokazuje status klucza SSH z pełną ścieżką
  - Step 5: port info + public IP detection
  - Step 6: podsumowanie konfiguracji

### Poprawki błędów:
- **Hyper-V check**: nie wymaga admina (sc query + DISM + file check)
- **Steam path detection**: registry + libraryfolders.vdf (wszystkie biblioteki)
- **Cache busting**: `?ts=20260730b` na setup-wizard.js
- **Button feedback**: pokazuje ⏳ "Checking..." podczas ładowania
- **Table Browser** dodany do Database tab (dropdown + browse)

### Audyt bezpieczeństwa tokena:
- Token NIE jest nigdzie wysyłany — tylko w RAM przeglądarki
- Zapisuje się lokalnie do config.yaml przez POST (localhost only)
- Jedyne zewnętrzne połączenie: api.ipify.org (GET, tylko IP)
- Brak localStorage, cookies, external fetch z tokenem

---
## Sesja 7 — 2026-07-30: Restart PC (Hyper-V)

### Stan przed restartem:
- ✅ Serwer Dune zainstalowany: `C:\Program Files (x86)\Steam\steamapps\common\Dune Awakening Self-Hosted Server`
- ❌ Hyper-V: wymaga restartu po włączeniu w Windows Features
- ❌ SSH key: powstanie po `battlegroup.bat initial-setup`
- ✅ Admin panel działa na http://127.0.0.1:8080
- ✅ config.yaml z tokenem zapisany

### Po restarcie:
1. Otwórz START.bat (lub `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8080`)
2. Sprawdź Setup Wizard — Hyper-V powinien być ✅
3. Administrator PowerShell:
   ```
   cd "C:\Program Files (x86)\Steam\steamapps\common\Dune Awakening Self-Hosted Server"
   .\battlegroup.bat
   ```
4. Wybierz `initial-setup` → VM się zaimportuje
5. Setup Wizard → Step 3 → Test SSH
6. Dashboard → Start Battlegroup
