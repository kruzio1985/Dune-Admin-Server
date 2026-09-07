# Jak zainstalowac Dune Awakening Server na innym PC

## Wymagania
- Windows 10/11 Pro z Hyper-V
- Python 3.11+ (zaznacz "Add to PATH" przy instalacji)
- Steam + "Dune Awakening Self-Hosted Server" (Library -> filtr TOOLS)
- 32 GB RAM, 100+ GB miejsca

---

## Krok 1: Skopiuj admin panel
Przekopiuj caly folder `dune-admin-manager` na nowy PC.

## Krok 2: Wlacz Hyper-V (Admin PowerShell)
```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
```
**ZRESTARTUJ PC.**

## Krok 3: Utworz VM (initial-setup)
```powershell
cd "C:\Program Files (x86)\Steam\steamapps\common\Dune Awakening Self-Hosted Server"
.\battlegroup.bat
```
W menu: `a` -> wybierz dysk -> czekaj 5-15 min az zobaczysz:
"Initial setup complete. You can now start the battlegroup"
Haslo VM: `dune`

## Krok 4: Uruchom VM i zdobadz IP
W battlegroup.bat: `b` -> czekaj na "VM ready at X.X.X.X"
Zapisz to IP.

## Krok 5: ZAINSTALUJ BATTLEGROUP (to nie jest automatyczne!)
```powershell
C:\Windows\System32\OpenSSH\ssh.exe -t -o StrictHostKeyChecking=no dune@IP_Z_KROKU_4 "/home/dune/.dune/bin/setup"
```
Haslo: `dune`. Setup zapyta:
- Nazwa swiata (np. MojaDune)
- Region (1=Asia, 2=Europe, 3=NA, 4=Oceania, 5=SA)
- Token z https://account.duneawakening.com/ -> Self-Hosted Servers
- IP graczy (wybierz 1 = publiczny)

Czekaj 10-20 min az pobierze i zainstaluje.

## Krok 6: Klucz SSH dla admin panelu
```powershell
cmd /c 'copy "%LOCALAPPDATA%\DuneAwakeningServer\sshKey" "%USERPROFILE%\.ssh\dune_key"'
```

## Krok 7: Zapisz IP VM
```powershell
echo IP_Z_KROKU_4 > "%TEMP%\dune_vm_ip.txt"
```

## Krok 8: Uruchom admin panel
Kliknij `START.bat` w folderze `dune-admin-manager`
Panel: http://127.0.0.1:8080

---

## Porty na routerze
- 7777 UDP (gra)
- 27015 UDP (query)
- 8080 TCP (admin panel - opcjonalnie)

## Problemy
- "battlegroup: No such file" -> Krok 5 nie byl zrobiony
- "SSH failed" -> VM nie dziala, sprawdz Hyper-V Manager
- Bitdefender blokuje -> dodaj wylaczenie folderu dune-admin-manager
- "VM not found" -> Krok 3 nie byl zrobiony
