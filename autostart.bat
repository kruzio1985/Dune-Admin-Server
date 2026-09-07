@echo off
:: Dune Admin Manager - AutoStart
:: Runs minimized on Windows startup
cd /d "C:\Projects\OfflineWorkspace\dune-admin-manager"

:: Start server in hidden window
start "" /MIN C:\Users\YOUR_USERNAME\AppData\Local\Programs\Python\Python311\python.exe -c "import sys; sys.path.insert(0,'C:\\Projects\\OfflineWorkspace\\dune-admin-manager'); import uvicorn; uvicorn.run('backend.main:app',host='127.0.0.1',port=8080,log_level='warning')"
