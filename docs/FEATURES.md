# Dune Admin Manager — Pełna Lista Funkcji

Poniższa lista agreguje wszystkie funkcje z przeanalizowanych projektów:
- **[dune-admin](https://github.com/Icehunter/dune-admin)** (Go + React/TS, 115 releases, v0.47.1) — 41★
- **[dune-dedicated-server-manager](https://github.com/adainrivers/dune-dedicated-server-manager)** (Rust/Tauri, 53 releases, v0.3.16) — 47★
- **[dune-awakening-server-manager](https://github.com/the4rchangel/dune-awakening-server-manager)** (Node.js + vanilla HTML/CSS/JS) — 9★

Oraz z oficjalnej dokumentacji: https://duneawakening.com/self-hosted-servers/

---

## 📊 Dashboard & Monitoring

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Status VM (CPU, RAM, uptime, IP) | ✅ | ✅ | ✅ | ✅ |
| Status battlegroup (pody, serwery) | ✅ | ✅ | ✅ | ✅ |
| Auto-refresh dashboardu | ✅ | ✅ | ✅ | ✅ |
| Szybkie akcje (start/stop/restart) | ✅ | ✅ | ✅ | ✅ |
| Quick links (Director, FileBrowser) | ✅ | ✅ | ✅ | ✅ |
| Director web interface | ✅ (tunele SSH) | ✅ (tunele SSH) | ✅ | ✅ |
| File Browser | ✅ | ✅ | ✅ | ✅ |
| PgHero (monitoring bazy) | ✅ | ✅ | ❌ | 🔜 |
| SSH tunele (Director, FB, DB) | ❌ | ✅ | ❌ | 🔜 |
| Wykrywanie cheatów (log viewer) | ✅ | ❌ | ❌ | ✅ |

## ⚔️ Battlegroup Controls

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Start battlegroup | ✅ | ✅ | ✅ | ✅ |
| Stop battlegroup | ✅ | ✅ | ✅ | ✅ |
| Restart battlegroup | ✅ | ✅ | ✅ | ✅ |
| Update battlegroup | ✅ | ✅ | ✅ | ✅ |
| Status check | ✅ | ✅ | ✅ | ✅ |
| Multi-Sietch support | ❌ | ❌ | ✅ | ✅ |
| Swap memory | ❌ | ❌ | ✅ | ✅ |
| Edytor Battlegroup (YAML/K8s) | ❌ | ❌ | ✅ (oficjalny) | 🔜 |
| Shell do VM / podów | ❌ | ❌ | ✅ (oficjalny) | 🔜 |

## 👤 Zarządzanie Graczami

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Lista graczy z wyszukiwaniem | ✅ | ✅ | ❌ | ✅ |
| Podgląd ekwipunku | ✅ | ✅ | ✅ | ✅ |
| Dodawanie/usuwanie itemów | ✅ | ✅ | ✅ | ✅ |
| Przenoszenie/merge itemów | ✅ | ❌ | ❌ | ✅ |
| Waluta (Solaris, Scrip) | ✅ | ✅ | ✅ | ✅ |
| Frakcje i reputacja | ✅ | ✅ | ✅ | ✅ |
| Specjalizacje (5 tracków) | ✅ | ✅ | ✅ | ✅ |
| Keystones / perki | ✅ | ✅ | ✅ | ✅ |
| Character XP / Level | ✅ | ✅ | ✅ | ✅ |
| Journey nodes / Questy | ✅ | ✅ | ✅ | ✅ |
| Kontrakty (complete/reverse) | ✅ | ✅ | ❌ | ✅ |
| Job skills (grant/reset) | ✅ | ❌ | ❌ | ✅ |
| Skill modules | ✅ | ✅ | ❌ | ✅ |
| Gameplay tags | ✅ | ✅ | ❌ | ✅ |
| Cheat scripts (RMQ) | ✅ | ✅ (admin console) | ❌ | ✅ |
| Teleportacja gracza | ✅ | ✅ | ❌ | ✅ |
| Czyszczenie ekwipunku | ✅ | ✅ | ❌ | ✅ |
| Backup postaci | ✅ | ✅ | ✅ | ✅ |
| Usuwanie konta | ✅ | ❌ | ❌ | ✅ |
| Account takeover / migration | ✅ | ❌ | ❌ | 🔜 |
| Player position tracking | ✅ | ✅ | ❌ | 🔜 |

## 🎨 Edytor Postaci

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Statystyki (HP, woda, spice, etc.) | ✅ | ✅ | ✅ | ✅ |
| Tech tree — unlock all (356 nodów) | ✅ | ❌ | ✅ | ✅ |
| Specjalizacje (poziom, XP) | ✅ | ✅ | ✅ | ✅ |
| Wszystkie keystones (205) | ✅ | ❌ | ✅ | ✅ |
| Ekonomia (Solari, Scrip) | ✅ | ✅ | ✅ | ✅ |
| Faction reputation | ✅ | ✅ | ✅ | ✅ |
| Kosmetyki i skórki (621+) | ✅ | ✅ | ✅ | ✅ |
| Unlock All Cosmetics | ✅ | ❌ | ✅ | ✅ |
| Job skills (grant/reset) | ✅ | ❌ | ❌ | ✅ |
| Starter class change | ✅ | ❌ | ❌ | ✅ |
| Tutorial reset | ✅ | ❌ | ❌ | ✅ |
| Codex wipe | ✅ | ❌ | ❌ | ✅ |
| Progression presets (Act 1, etc.) | ✅ | ❌ | ❌ | ✅ |
| Vehicle management | ✅ | ✅ | ✅ | ✅ |
| Vehicle spawn | ✅ | ✅ | ❌ | ✅ |
| Repair items | ✅ | ❌ | ❌ | ✅ |

## ⚙️ Konfiguracja Serwera

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Edytor INI (UserGame.ini) | ✅ | ✅ | ✅ | ✅ |
| PvP & Security zones | ✅ | ❌ | ✅ | ✅ |
| Coriolis storms / sandstorms | ✅ | ❌ | ✅ | ✅ |
| Sandworm settings | ✅ | ❌ | ✅ | ✅ |
| Mining/vehicle multipliers | ✅ | ❌ | ✅ | ✅ |
| Item deterioration | ✅ | ❌ | ✅ | ✅ |
| Building limits | ✅ | ❌ | ✅ | ✅ |
| Server name, password, porty | ✅ | ✅ | ✅ | ✅ |
| AMP API (CubeCoders) | ✅ | ❌ | ❌ | 🔜 |
| Direct INI write (Docker/K8s/Local) | ✅ | ✅ | ✅ | ✅ |
| Wizualny edytor (curated schema) | ✅ | ❌ | ✅ | ✅ |
| Raw YAML editor | ❌ | ❌ | ✅ (oficjalny) | 🔜 |

## 🗄️ Baza Danych

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Backup bazy | ✅ | ✅ | ✅ | ✅ |
| Restore bazy | ✅ | ✅ | ✅ | ✅ |
| Raw SQL console | ✅ | ❌ | ❌ | ✅ |
| Przeglądarka tabel | ✅ | ❌ | ❌ | ✅ |
| Schema version | ✅ | ❌ | ❌ | ✅ |

## 📋 Logi

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Live log stream | ✅ | ✅ | ❌ | ✅ |
| Logi per komponent | ✅ | ✅ | ✅ | ✅ |
| Eksport logów | ✅ | ✅ | ✅ | ✅ |
| Cheat detection events | ✅ | ❌ | ❌ | ✅ |
| Player event log | ✅ | ❌ | ❌ | ✅ |

## 📈 Market Bot

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Live market listings | ✅ | ❌ | ❌ | ✅ |
| Start/Stop/Restart bota | ✅ | ❌ | ❌ | ✅ |
| Konfiguracja interwałów | ✅ | ❌ | ❌ | ✅ |
| Buy threshold | ✅ | ❌ | ❌ | ✅ |
| Disabled items list | ✅ | ❌ | ❌ | 🔜 |
| SQLite cache | ✅ | ❌ | ❌ | 🔜 |

## 🎁 Welcome Kits & MOTD

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Auto-grant itemów (first login) | ✅ | ✅ | ❌ | ✅ |
| Wersjonowane pakiety | ✅ | ✅ | ❌ | ✅ |
| MOTD whisper (every login) | ✅ | ✅ | ❌ | ✅ |
| Region join/leave messages | ✅ | ❌ | ❌ | 🔜 |
| SQLite ledger | ✅ | ✅ | ❌ | 🔜 |
| GM persona | ✅ | ✅ | ❌ | 🔜 |

## ⏰ Scheduler / Automatyzacja

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Daily restart | ❌ | ✅ | ❌ | ✅ |
| Restart warnings (in-game) | ❌ | ✅ | ❌ | ✅ |
| Auto backup | ❌ | ✅ | ❌ | ✅ |
| Auto update check + apply | ❌ | ✅ | ❌ | ✅ |
| Timezone support | ❌ | ✅ | ❌ | ✅ |
| Configurable intervals | ❌ | ✅ | ❌ | ✅ |

## 🔧 Setup Wizard

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Guided setup | ✅ | ❌ | ✅ | ✅ |
| Pre-flight check | ❌ | ❌ | ✅ | ✅ |
| VM import | ❌ | ❌ | ✅ | ✅ |
| Network configuration | ❌ | ❌ | ✅ | ✅ |
| SSH key generation | ❌ | ❌ | ✅ | ✅ |
| Bootstrap battlegroup | ❌ | ❌ | ✅ | ✅ |
| AMP auto-detection | ✅ | ❌ | ❌ | 🔜 |

## 🔐 Bezpieczeństwo

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Local username/password (bcrypt) | ✅ | ❌ | ❌ | ✅ |
| Discord OAuth | ✅ | ❌ | ❌ | ✅ |
| ~28 granulowanych uprawnień | ✅ | ❌ | ❌ | ✅ |
| Audit log | ✅ | ❌ | ❌ | ✅ |
| Rate limiting | ✅ | ❌ | ❌ | ✅ |
| Session management | ✅ | ❌ | ❌ | ✅ |
| Guest access (read-only) | ✅ | ❌ | ❌ | ✅ |
| Security headers (CSP, HSTS) | ✅ | ❌ | ❌ | ✅ |

## 🏗️ Blueprinty & Bazy

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Lista blueprintów | ✅ | ❌ | ❌ | ✅ |
| Lista baz graczy | ✅ | ❌ | ❌ | ✅ |
| Eksport baz | ✅ | ❌ | ❌ | ✅ |
| Base backup / recycle | ✅ | ❌ | ❌ | 🔜 |
| Vehicle backup / recovery | ✅ | ✅ | ❌ | 🔜 |

## 🏆 Battlepass

| Funkcja | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Tier definition (158 tierów) | ✅ | ❌ | ❌ | ✅ |
| Player progress tracking | ✅ | ❌ | ❌ | ✅ |
| Claim tracking | ✅ | ❌ | ❌ | ✅ |
| Exploration / journey signals | ✅ | ❌ | ❌ | 🔜 |

## 🖥️ Provider Support

| Provider | dune-admin | dune-server-mgr (Rust) | dune-server-mgr (Node) | Nasz projekt |
|---------|:---:|:---:|:---:|:---:|
| Hyper-V (Windows, oficjalny) | ❌ | ❌ | ✅ | ✅ |
| Docker / Podman | ✅ | ❌ | ❌ | ✅ |
| k3s / Kubernetes | ✅ | ✅ (przez SSH) | ❌ | ✅ |
| CubeCoders AMP | ✅ | ❌ | ❌ | ✅ |
| Bare metal / LGSM | ✅ | ❌ | ❌ | ✅ |
| Remote SSH profiles | ✅ (SSH lib + cmd) | ✅ (SSH profiles) | ❌ | ✅ |

---

## Legenda

- ✅ Zaimplementowane w naszym projekcie
- 🔜 Zaplanowane / częściowo zaimplementowane
- ❌ Nie dotyczy / nie planowane

---

## Statystyki

| Projekt | Język | ⭐ | Release | Architektura |
|---------|--------|-----|---------|-------------|
| dune-admin | Go 54% + TS 23% | 41 | v0.47.1 (115 releases) | Single binary + SPA |
| dune-server-mgr (Rust) | Rust 74% + TS 22% | 47 | v0.3.16 (53 releases) | Tauri desktop app |
| dune-server-mgr (Node) | JS 61% + HTML 21% | 9 | brak release | Express + vanilla frontend |
| **Nasz projekt** | **Python + HTML/CSS/JS** | - | **v0.1.0** | **FastAPI + vanilla SPA** |
