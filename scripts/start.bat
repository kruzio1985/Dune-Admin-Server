@echo off
title Dune Admin Manager
echo ========================================
echo   🏜️  Dune Admin Manager v0.1.0
echo ========================================
echo.
echo Starting server on http://localhost:8080
echo.
cd /d "%~dp0.."
python backend\main.py
pause
