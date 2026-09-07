@echo off
title Dune Admin Manager
cd /d "%~dp0"

:: Admin elevation
net session >nul 2>&1 || ( powershell -Command "Start-Process '%~f0' -Verb RunAs"; exit )

echo  Dune Admin Manager v0.1.0
echo  http://127.0.0.1:8080
echo.

:: Find Python
set PY=
for %%p in (python python3 py) do ( where %%p >nul 2>&1 && set PY=%%p && goto :found )
:found
if "%PY%"=="" ( echo Install Python 3.11+ from python.org & pause & exit /b 1 )

:: Install packages (fast, quiet)
%PY% -m pip install fastapi uvicorn pyyaml python-dotenv bcrypt pydantic aiohttp httpx --quiet --disable-pip-version-check 2>nul

:: Kill old
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080.*LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: Start server + open browser
start http://127.0.0.1:8080
%PY% -c "import sys; sys.path.insert(0,'.'); import uvicorn; uvicorn.run('backend.main:app',host='127.0.0.1',port=8080,log_level='warning')"
pause
