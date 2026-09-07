@echo off
cd /d C:\Projects
echo === Dune Admin Manager ===
taskkill /F /IM python.exe 2>nul
timeout /t 1 /nobreak >nul
echo Starting server...
start "DuneAdmin" "C:\Espressif\tools\python\python.exe" -c "import sys; sys.path.insert(0, r'C:\Projects\OfflineWorkspace\dune-admin-manager'); from backend.main import app; import uvicorn; uvicorn.run(app, host='127.0.0.1', port=8080, log_level='warning')"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8080/?v=17"
echo Panel: http://127.0.0.1:8080
pause
