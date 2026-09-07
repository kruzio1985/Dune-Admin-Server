@echo off
chcp 65001 >nul
title Dune Admin Manager — Instalacja i Uruchomienie
cd /d "%~dp0"

:: ====================================================================
::  DUNE ADMIN MANAGER — SAMOINSTALUJĄCY LAUNCHER
::  Kliknij dwukrotnie. Wszystko samo się zainstaluje i uruchomi.
::  Nie potrzebujesz Visual Studio Code ani niczego innego.
:: ====================================================================

echo.
echo   ============================================
echo     🏜️  DUNE ADMIN MANAGER
echo     Instalacja automatyczna...
echo   ============================================
echo.

:: -------------------------------------------------------------------
:: KROK 1: Znajdź lub zainstaluj Python
:: -------------------------------------------------------------------
echo [1/5] Sprawdzanie Pythona...

set "PYTHON="

:: Szukaj python3, python, py
for %%p in (python3 python py) do (
    where %%p >nul 2>&1 && (
        %%p --version >nul 2>&1 && set "PYTHON=%%p" && goto :python_found
    )
)

:: Python nie znaleziony — próbujemy zainstalować przez winget (Win 10/11)
echo   ❌ Python nie znaleziony.
echo   ▶ Probuje zainstalowac przez winget (wbudowane w Windows 10/11)...

where winget >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ winget niedostepny. Otwieram strone pobierania...
    start https://www.python.org/downloads/
    echo.
    echo   👉 ZAINSTALUJ Python 3.11+ (zaznacz "Add Python to PATH"!)
    echo   👉 Po instalacji uruchom ten plik ponownie.
    pause
    exit /b 1
)

echo   ▶ Pobieram i instaluje Python 3.11... (to moze potrwac ~2 min)
winget install Python.Python.3.11 --accept-source-agreements --accept-package-agreements --silent 2>nul

if %errorlevel% neq 0 (
    echo   ⚠️  Instalacja winget nie powiodla sie.
    echo   ▶ Otwieram strone pobierania recznego...
    start https://www.python.org/downloads/
    echo   👉 ZAINSTALUJ Python 3.11+ z PATH, potem uruchom ponownie.
    pause
    exit /b 1
)

:: Odśwież PATH po instalacji
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%ProgramFiles%\Python311;%ProgramFiles%\Python311\Scripts"

:: Spróbuj jeszcze raz znaleźć
for %%p in (python3 python py) do (
    where %%p >nul 2>&1 && set "PYTHON=%%p" && goto :python_found
)

echo   ❌ Nadal nie moge znalezc Pythona. Zrestartuj komputer i sprobuj ponownie.
pause
exit /b 1

:python_found
%PYTHON% --version 2>&1 | findstr /i "python" >nul
echo   ✅ Znaleziono Python: 
%PYTHON% --version

:: -------------------------------------------------------------------
:: KROK 2: Instalacja pakietów Python
:: -------------------------------------------------------------------
echo.
echo [2/5] Instalowanie pakietow Python... (to moze potrwac minute)

:: Najpierw upewnij się że pip jest aktualny
%PYTHON% -m pip install --upgrade pip --quiet --disable-pip-version-check 2>nul

:: Instaluj z requirements.txt
if exist "requirements.txt" (
    echo   ▶ Instalacja z requirements.txt...
    %PYTHON% -m pip install -r requirements.txt --quiet --disable-pip-version-check
) else (
    echo   ▶ Instalacja podstawowych pakietow...
    %PYTHON% -m pip install fastapi uvicorn websockets pyyaml python-dotenv bcrypt pydantic aiohttp asyncssh httpx --quiet --disable-pip-version-check
)

if %errorlevel% neq 0 (
    echo   ⚠️  Niektore pakiety moga byc juz zainstalowane - kontynuuje...
)
echo   ✅ Pakiety gotowe

:: -------------------------------------------------------------------
:: KROK 3: Tworzenie konfiguracji
:: -------------------------------------------------------------------
echo.
echo [3/5] Konfiguracja...

:: Stwórz foldery
if not exist "config" mkdir "config"
if not exist "logs" mkdir "logs"
if not exist "backups" mkdir "backups"
if not exist "data" mkdir "data"

:: Stwórz config.yaml jeśli nie istnieje
if not exist "config\config.yaml" (
    echo   ▶ Tworze config.yaml...
    (
        echo # Dune Admin Manager — konfiguracja automatyczna
        echo provider: hyperv
        echo listen_addr: "127.0.0.1"
        echo listen_port: 8080
        echo ssh:
        echo   host: "127.0.0.1"
        echo   port: 22
        echo   user: dune
        echo   password: ""
        echo   key_path: ""
        echo   mode: library
        echo database:
        echo   host: "127.0.0.1"
        echo   port: 15432
        echo   user: dune
        echo   password: ""
        echo   database: dune
        echo   schema: dune
        echo rabbitmq:
        echo   game_addr: ""
        echo   admin_addr: ""
        echo backup_dir: "./backups"
        echo auto_backup_enabled: false
        echo auto_backup_interval_hours: 6
        echo max_backups: 10
        echo auth:
        echo   enabled: false
        echo   local_enabled: true
        echo   local_username: admin
        echo   local_password_hash: ""
        echo   discord_enabled: false
        echo   session_ttl_hours: 24
        echo   guest_enabled: false
        echo market_bot:
        echo   enabled: false
        echo welcome_package:
        echo   enabled: false
        echo motd:
        echo   enabled: false
        echo scheduler:
        echo   enabled: false
        echo   daily_restart_time: "04:00"
        echo   timezone: "Europe/Warsaw"
        echo logging:
        echo   level: "INFO"
        echo   file: "./logs/dune-admin.log"
        echo   audit_log: "./logs/audit.log"
    ) > "config\config.yaml"
    echo   ✅ config.yaml utworzony
) else (
    echo   ✅ config.yaml juz istnieje
)

:: -------------------------------------------------------------------
:: KROK 4: Uruchomienie serwera
:: -------------------------------------------------------------------
echo.
echo [4/5] Uruchamianie serwera...

:: Zabij stary proces na porcie 8080
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Uruchom serwer
echo.
echo   ============================================
echo     ✅ SERWER URUCHOMIONY!
echo     🌐 Panel: http://127.0.0.1:8080
echo     📋 API Docs: http://127.0.0.1:8080/api/docs
echo     ⏹  Zamknij to okno aby zatrzymac serwer
echo   ============================================
echo.

:: Otwórz przeglądarkę po 2 sekundach (daj serwerowi czas na start)
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:8080"

:: Uruchom serwer FastAPI
%PYTHON% -c "import sys; sys.path.insert(0,'.'); from backend.main import app; import uvicorn; uvicorn.run(app, host='127.0.0.1', port=8080, log_level='info')"

:: Jeśli serwer padł
echo.
echo   ⚠️  Serwer zostal zatrzymany.
pause
