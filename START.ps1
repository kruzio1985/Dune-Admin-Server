# Dune Admin Manager - Smart Installer
# Detects Python, installs if missing, starts server
# Run: Right-click -> Run with PowerShell

$host.ui.RawUI.WindowTitle = "Dune Admin Manager"
Write-Host "`n🏜️  Dune Admin Manager v0.1.0 - Smart Installer`n" -ForegroundColor Yellow

# ═══════════ FIND PYTHON ═══════════
Write-Host "[1/5] Checking Python..." -ForegroundColor Cyan
$python = $null
foreach ($cmd in @("python","python3","py")) {
    try { $v = & $cmd --version 2>&1; $python = $cmd; break } catch {}
}
if (-not $python) {
    Write-Host "`n  ❌ PYTHON NOT FOUND!`n" -ForegroundColor Red
    Write-Host "  Download: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "  ⚠️  CHECK 'Add Python to PATH' during install`n"
    $r = Read-Host "  Open download page? (y/n)"
    if ($r -eq 'y') { Start-Process "https://www.python.org/downloads/" }
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  ✅ Python: $v" -ForegroundColor Green

# ═══════════ CHECK VERSION ═══════════
$ver = (& $python --version 2>&1) -replace '[^0-9.]',''
$minor = [int]($ver -split '\.')[1]
if ($minor -lt 11) {
    Write-Host "  ❌ Version $ver too old (need 3.11+)" -ForegroundColor Red
    Start-Process "https://www.python.org/downloads/"
    exit 1
}

# ═══════════ CONFIG ═══════════
Write-Host "[2/5] Configuration..." -ForegroundColor Cyan
if (-not (Test-Path "config")) { New-Item -ItemType Directory "config" | Out-Null }
if (-not (Test-Path "config\config.yaml")) {
    @"
provider: hyperv
listen_addr: "127.0.0.1"
listen_port: 8080
ssh:
  host: "127.0.0.1"
  port: 22
  user: dune
database:
  host: "127.0.0.1"
  port: 15432
  user: dune
  database: dune
auth:
  enabled: false
"@ | Out-File "config\config.yaml" -Encoding utf8
    Write-Host "  📝 Created config.yaml" -ForegroundColor White
}
@("logs","backups") | ForEach-Object { if (-not (Test-Path $_)) { New-Item -ItemType Directory $_ | Out-Null } }

# ═══════════ INSTALL DEPS ═══════════
Write-Host "[3/5] Installing packages..." -ForegroundColor Cyan
$pkgs = @("fastapi","uvicorn","websockets","pyyaml","python-dotenv","bcrypt","pydantic","aiohttp","asyncssh","httpx")
foreach ($p in $pkgs) {
    & $python -m pip install $p --quiet --disable-pip-version-check 2>$null
}
Write-Host "  ✅ Ready" -ForegroundColor Green

# ═══════════ START ═══════════
Write-Host "[4/5] Starting server..." -ForegroundColor Cyan
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force 2>$null

Start-Process "http://127.0.0.1:8080"

Write-Host "`n  ✅ RUNNING: http://127.0.0.1:8080" -ForegroundColor Green
Write-Host "  📋 Press Ctrl+C to stop`n" -ForegroundColor Gray

& $python -c "import sys; sys.path.insert(0, '.'); import uvicorn; uvicorn.run('backend.main:app', host='127.0.0.1', port=8080, log_level='warning')"
