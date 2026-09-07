@echo off
title Dune Setup
cd /d "%~dp0"

echo Prosze czekac - uruchamiam jako administrator...
powershell -Command "Start-Process PowerShell -Verb RunAs -ArgumentList '-NoExit -NoProfile -ExecutionPolicy Bypass -File \"\"%CD%\run_dune_setup.ps1\"\"'"
