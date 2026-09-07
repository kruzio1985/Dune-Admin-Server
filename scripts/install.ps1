# Dune Admin Manager - Installer (Windows PowerShell)
# Uruchom jako Administrator

param(
    [switch]$SkipDeps,
    [string]$InstallDir = "$env:ProgramFiles\DuneAdminManager",
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
Write-Host "🏜️  Dune Admin Manager v0.1.0 - Installer" -ForegroundColor Yellow

# Check admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Please run as Administrator" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Install Python 3.11+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Create install dir
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Write-Host "📁 Install directory: $InstallDir" -ForegroundColor Cyan

# Copy files
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Split-Path -Parent $sourceDir
Copy-Item -Path "$sourceDir\*" -Destination $InstallDir -Recurse -Force

# Install dependencies
if (-not $SkipDeps) {
    Write-Host "📦 Installing Python dependencies..." -ForegroundColor Cyan
    pip install -r "$InstallDir\requirements.txt"
}

# Create start script
@"
@echo off
title Dune Admin Manager
echo 🏜️  Starting Dune Admin Manager on port $Port...
cd /d "$InstallDir"
python backend\main.py
pause
"@ | Out-File -FilePath "$InstallDir\start.bat" -Encoding ASCII

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Dune Admin Manager.lnk")
$Shortcut.TargetPath = "$InstallDir\start.bat"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "shell32.dll,13"
$Shortcut.Save()

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "   Start with: $InstallDir\start.bat" -ForegroundColor White
Write-Host "   Or use the desktop shortcut" -ForegroundColor White
Write-Host "   Then open: http://localhost:$Port" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Copy config\config.example.yaml to config\config.yaml" -ForegroundColor White
Write-Host "   2. Edit config.yaml with your server details" -ForegroundColor White
Write-Host "   3. Run start.bat" -ForegroundColor White
