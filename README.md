# 🌌 Dune Admin Manager

A web admin panel for managing a self-hosted **Dune: Awakening** server.
It replaces the official `battlegroup.bat`. It manages the Hyper-V virtual
machine, the Kubernetes battlegroup (k3s), PostgreSQL and RabbitMQ — through a
friendly browser interface.

Panel administracyjny (web) do zarządzania self-hosted serwerem **Dune: Awakening**.
Zastępuje oficjalny `battlegroup.bat`. Zarządza maszyną wirtualną Hyper-V,
battlegroupem Kubernetes (k3s), bazą PostgreSQL oraz RabbitMQ.

---

## ✨ Features / Funkcje (26 tabs / zakładek)

| Section | Tabs / Zakładki |
|---------|-----------------|
| **Operations** | Dashboard, Battlegroup, Logs, Database, DB Editor, Server Settings, Extra Settings |
| **Player World** | Players, Characters, Storage, Bases, Blueprints |
| **Economy** | Landsraad, Market, Market Bot, Broadcast, Welcome Kits, Give Items, Item Catalog |
| **Management** | Settings, Commands, Gameplay Admin, Monitoring, Scheduler, Setup Wizard |

Key features:
- **Dashboard** — VM status (CPU/RAM/uptime), battlegroup status, pod list
- **DB Editor** — GOD MODE: keystones, recipes, levels, currency
- **Gameplay Admin** — 30+ actions (currency, XP, classes, teleport, quests)
- **Item Catalog** — 1664 items catalog
- **SSH configuration** — full SSH setup from the UI (Settings → Steam/SSH)

---

## 📋 Requirements / Wymagania

- **Windows 10/11 Pro** with **Hyper-V** enabled
- **Python 3.11+**
- **Steam** + "Dune Awakening Self-Hosted Server" (filter: Tools)
- At least **20 GB RAM**, **40 GB** free disk space
- Server token from https://account.duneawakening.com/ → Self-Hosted Servers

---

## 🚀 Installation / Instalacja

### 1. Download / Pobierz
Copy the whole project folder (e.g. `Dune Admin Server`) to your disk.

### 2. Install Python dependencies / Zainstaluj zależności

```powershell
cd "C:\path\to\Dune Admin Server"
pip install -r requirements.txt
```

Required packages: `fastapi`, `uvicorn`, `websockets`, `asyncssh`, `paramiko`,
`pyyaml`, `python-dotenv`, `python-multipart`.

### 3. Configure / Skonfiguruj

Edit `config/config.yaml` (or `config.yaml` in the root):

```yaml
provider: hyperv
listen_addr: 0.0.0.0          # 127.0.0.1 = local only, 0.0.0.0 = LAN
listen_port: 8080

hyperv:
  vm_name: dune-awakening
  server_path: D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server
  memory_gb: 20

ssh:
  host: 192.168.1.100          # ← IP of your virtual machine
  port: 22
  user: dune
  password: dune               # ← password (or leave empty and use a key)
  key_path: ''                 # ← path to SSH key (optional)

database:
  host: 127.0.0.1
  port: 15432
  user: dune
  database: dune
  schema: dune
```

> 💡 **You can also configure SSH from the UI:**
> `Settings → Steam/SSH` — Host/Port/User/Password/KeyPath fields + **Auto-Find**
> button (finds the key created by battlegroup.bat).

### 4. Run / Uruchom

```powershell
cd "C:\path\to\Dune Admin Server"
python -m backend.main
```

Or double-click **START.bat** / **URUCHOM.bat**.

The panel is available at: **http://127.0.0.1:8080**

---

## 🔑 SSH Configuration / Konfiguracja SSH

### Battlegroup SSH key / Klucz SSH battlegroup
`battlegroup.bat` saves the key at:
```
%LOCALAPPDATA%\DuneAwakeningServer\sshKey
```
The app auto-detects it (the **Auto-Find** button in Settings).

### Authentication / Uwierzytelnianie
The app tries in order: **password** → **key** → **default** (agent/keys).

### SSH endpoints (API)
```
GET    /api/v1/server-settings/ssh              # read config
POST   /api/v1/server-settings/ssh              # save config
POST   /api/v1/server-settings/ssh/test         # test connection
GET    /api/v1/server-settings/ssh/key          # key status
POST   /api/v1/server-settings/ssh/key          # overwrite key
DELETE /api/v1/server-settings/ssh/key          # delete key
GET    /api/v1/server-settings/ssh/key/autodetect  # auto-detect key
```

---

## 🌐 Ports / Porty (router + firewall)

| Port | Protocol | Purpose / Cel |
|------|----------|---------------|
| 7777-7810 | UDP | Game servers / Serwery gry |
| 27015 | UDP | Steam server browser |
| 8080 | TCP | Admin panel |
| 22 | TCP | SSH |
| 15432 | TCP | PostgreSQL (inside VM) |

See `FIREWALL_PORTS.md` for details.

---

## 🖥️ Running on a separate host (LAN) / Uruchamianie na osobnym hoście

1. Copy the app folder to that computer
2. `pip install -r requirements.txt`
3. In `config/config.yaml` set `ssh.host` to the VM IP
4. Run `python -m backend.main`
5. Open `http://<computer_IP>:8080` from another machine on the LAN

### Auto-start after reboot (Task Scheduler) / Autostart po restarcie
```powershell
schtasks /create /tn "DuneAdminPanel" /tr "cmd /c cd /d C:\dune-admin-manager && C:\path\to\python\python.exe -m backend.main" /sc ONSTART /ru SYSTEM /rl HIGHEST /f
```

### Watchdog (auto-restart every 5 min) / Watchdog (auto-restart co 5 min)
See `watchdog.ps1` — checks if the panel is running and starts it if not.

---

## 📚 Documentation / Dokumentacja

- `PELNA_DOKUMENTACJA.md` — full documentation (architecture, all endpoints)
- `DOKUMENTACJA.md` — user documentation
- `DEVELOPMENT.md` — development history
- `FIREWALL_PORTS.md` — port configuration
- `INSTALL_OTHER_PC.md` — install on another PC

---

## 📜 License / Licencja

This project is licensed under the **MIT** license. See [LICENSE](LICENSE).

Ten projekt jest udostępniony na licencji **MIT**. Zobacz [LICENSE](LICENSE).
