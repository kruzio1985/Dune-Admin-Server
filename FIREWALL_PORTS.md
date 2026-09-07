# Dune Awakening — Firewall & Router Configuration Guide
## Porty wymagane do działania serwera

### Porty serwera Dune Awakening (na VM)

| Port | Protokół | Cel | Uwagi |
|------|----------|-----|-------|
| **7777** | UDP | Game Port | Główny port gry (Unreal Engine). Gracze łączą się przez ten port. |
| **27015** | UDP | Query Port | Steam server browser + zapytania o status serwera. |
| **27016** | UDP | Additional Query | Dodatkowy port query (niektóre konfiguracje). |
| **7778–7787** | UDP | Dodatkowe game porty | Używane przy wielu instancjach (Multi-Sietch). Po jednym na sietch. |
| **8080** | TCP | Admin Panel Web UI | Panel zarządzania Dune Admin Manager. |
| **3000** | TCP | Director (opcjonalnie) | Battlegroup Director web UI (jeśli tunele SSH). |
| **3001** | TCP | File Browser (opcjonalnie) | File Browser web UI (jeśli tunele SSH). |

### Porty infrastrukturalne (wewnątrz VM, nie wystawiać na zewnątrz!)

| Port | Cel |
|------|-----|
| 5432 | PostgreSQL |
| 5672 | RabbitMQ |
| 15672 | RabbitMQ Management UI |
| 22 | SSH (administracja) |

---

## Windows Firewall (na hoście Hyper-V)

### Dodawanie reguł przez PowerShell (jako Administrator):

```powershell
# Game port (UDP)
New-NetFirewallRule -DisplayName "Dune Awakening - Game (7777 UDP)" `
  -Direction Inbound -Protocol UDP -LocalPort 7777 -Action Allow

# Query port (UDP)
New-NetFirewallRule -DisplayName "Dune Awakening - Query (27015 UDP)" `
  -Direction Inbound -Protocol UDP -LocalPort 27015 -Action Allow

# Admin Panel (TCP)
New-NetFirewallRule -DisplayName "Dune Admin Manager (8080 TCP)" `
  -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### Dodawanie przez GUI:
1. Otwórz **Windows Defender Firewall with Advanced Security** (wf.msc)
2. **Inbound Rules** → **New Rule...**
3. Wybierz **Port** → **UDP** → wpisz `7777, 27015`
4. **Allow the connection** → zaznacz **Domain, Private, Public**
5. Nazwij: `Dune Awakening Server`

---

## Zapory firm trzecich

### ESET Internet Security / NOD32
1. Otwórz ESET → **Setup** → **Network Protection**
2. **Firewall** → koło zębate → **Rules** → **Edit**
3. Dodaj regułę:
   - **Name**: Dune Awakening
   - **Direction**: In
   - **Protocol**: UDP
   - **Local Port**: 7777, 27015
   - **Action**: Allow
4. Uwaga: ESET może blokować `asyncssh` — dodaj wyjątek dla `python.exe`

### Norton 360
1. Otwórz Norton → **Settings** → **Firewall**
2. **Program Rules** → **Add**
3. Dodaj `python.exe` z folderu `C:\Users\<user>\AppData\Local\Programs\Python\Python311\`
4. Ustaw **Allow** dla wszystkich portów
5. **Traffic Rules** → **Add** → wybierz porty UDP 7777, 27015

### McAfee Total Protection
1. Otwórz McAfee → **PC Security** → **Firewall**
2. **Ports and System Services** → **Add**
3. Dodaj porty UDP: 7777, 27015
4. **Program Permissions** → znajdź `python.exe` → **Full Access**

### Kaspersky
1. Otwórz Kaspersky → **Settings** → **Protection** → **Firewall**
2. **Configure packet rules** → **Add**
3. **Name**: Dune Awakening
4. **Protocol**: UDP, **Local ports**: 7777, 27015
5. **Action**: Allow
6. Dodaj też regułę dla TCP 8080 (admin panel)

### Bitdefender
1. Otwórz Bitdefender → **Protection** → **Firewall**
2. **Settings** → **Rules** → **Add Rule**
3. **Protocol**: UDP, **Port**: 7777, 27015
4. **Network Type**: Home/Office
5. **Permission**: Allow

### Comodo Firewall
1. Otwórz Comodo → **Firewall** → **Network Security Policy**
2. **Add** → nowa reguła:
   - **Action**: Allow
   - **Protocol**: UDP
   - **Source Port**: Any
   - **Destination Port**: 7777, 27015

---

## Forwardowanie portów na routerze

### Krok po kroku (większość routerów):

1. Znajdź IP swojego komputera:
   ```powershell
   ipconfig | findstr "IPv4"
   ```
   Przykład: `192.168.1.100`

2. Zaloguj się do routera (zwykle `http://192.168.1.1` lub `http://192.168.0.1`)

3. Znajdź sekcję: **Port Forwarding**, **Virtual Server**, **NAT**, lub **Applications & Gaming**

4. Dodaj reguły:

| Nazwa | Port zewn. | Port wewn. | Protokół | IP lokalne |
|-------|-----------|-----------|----------|------------|
| Dune Game | 7777 | 7777 | UDP | 192.168.1.100 |
| Dune Query | 27015 | 27015 | UDP | 192.168.1.100 |
| Dune Admin | 8080 | 8080 | TCP | 192.168.1.100 |

5. Zapisz i zrestartuj router (jeśli wymagane)

### Popularne routery — gdzie szukać:

| Router | Ścieżka |
|--------|---------|
| **TP-Link** | Advanced → NAT Forwarding → Virtual Servers |
| **ASUS** | Advanced Settings → WAN → Port Forwarding |
| **D-Link** | Advanced → Port Forwarding |
| **Netgear** | Advanced → Advanced Setup → Port Forwarding |
| **Linksys** | Security → Apps and Gaming → Port Forwarding |
| **Fritz!Box** | Internet → Freigaben → Portfreigaben |
| **Orange Funbox** | Zaawansowane → NAT → Przekierowanie portów |
| **UPC Connect Box** | Advanced → Port Forwarding |

---

## Sprawdzenie czy porty są otwarte

### Z zewnątrz (po konfiguracji routera):
- https://www.yougetsignal.com/tools/open-ports/
- https://portchecker.co/
- Wpisz `7777` i sprawdź

### Lokalnie:
```powershell
# Sprawdź czy port nasłuchuje
netstat -ano | findstr ":7777"
netstat -ano | findstr ":8080"

# Test z innego komputera w sieci lokalnej
Test-NetConnection -ComputerName 192.168.1.100 -Port 7777
```

---

## Hyper-V — dodatkowe uwagi

Jeśli używasz Hyper-V z Default Switch (NAT):

1. VM dostaje IP z innej podsieci (np. 172.x.x.x)
2. Port forwarding trzeba skonfigurować na hoście Hyper-V:
   ```powershell
   # Sprawdź IP VM
   Get-VMNetworkAdapter -VMName dune-awakening | Select IPAddresses
   
   # Forward portów przez Hyper-V NAT (jako Administrator)
   # Game port
   netsh interface portproxy add v4tov4 listenport=7777 listenaddress=0.0.0.0 connectport=7777 connectaddress=<VM_IP>
   ```
3. Alternatywnie: użyj **External Switch** zamiast Default Switch — VM dostanie własne IP w sieci lokalnej.

---

## Szybka checklista

- [ ] Windows Firewall: UDP 7777, 27015 — odblokowane
- [ ] Windows Firewall: TCP 8080 — odblokowany (dla admin panel)
- [ ] Firewall firm trzecich (jeśli jest): python.exe + porty dodane
- [ ] Router: porty 7777 UDP, 27015 UDP, 8080 TCP przekierowane na IP komputera
- [ ] Hyper-V: jeśli Default Switch, portproxy skonfigurowany
- [ ] Porty sprawdzone przez yougetsignal.com / portchecker.co
- [ ] Test połączenia z zewnątrz przez znajomego
