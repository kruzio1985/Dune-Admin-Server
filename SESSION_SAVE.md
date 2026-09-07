# SESSION SAVE — Stan koncowy 2026-07-30
## Serwer: MyDune — DZIALA

---

## Uruchamianie

**Panel admina**: http://127.0.0.1:8080 (auto-start po restarcie PC)
**Recznie**: kliknij START.bat w C:\Projects\OfflineWorkspace\dune-admin-manager\

**VM po restarcie**:
```powershell
Start-VM -Name "dune-awakening"
```

---

## Sciezki

| Co | Gdzie |
|----|-------|
| Admin panel | C:\Projects\OfflineWorkspace\dune-admin-manager\ |
| Serwer Dune | D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server\ |
| Klucz SSH | C:\Users\YOUR_USERNAME\.ssh\dune_key |
| VM | Hyper-V Manager -> dune-awakening |
| VM IP | 172.28.248.224 |

---

## Dostep

| Usluga | URL |
|--------|-----|
| Panel | http://127.0.0.1:8080 |
| Director | http://172.28.248.224:31176 |
| FileBrowser | http://172.28.248.224:3001 |

---

## Backupy: co 10 minut (auto)

## Szybkie komendy:

```powershell
# Status VM
Get-VM dune-awakening | Select Name,State

# SSH do VM
C:\Windows\System32\OpenSSH\ssh.exe -i C:\Users\YOUR_USERNAME\.ssh\dune_key dune@172.28.248.224

# Uruchom panel
C:/Users/YOUR_USERNAME/AppData/Local/Programs/Python/Python311/python.exe -c "import sys; sys.path.insert(0,r'C:\Projects\OfflineWorkspace\dune-admin-manager');import uvicorn;uvicorn.run('backend.main:app',host='127.0.0.1',port=8080)"
```
