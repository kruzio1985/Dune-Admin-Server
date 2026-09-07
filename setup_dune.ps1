# DUNE AWAKENING — Auto Setup
# Kliknij dwukrotnie. Sam poprosi o uprawnienia administratora.

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

$ErrorActionPreference = "Continue"
$host.UI.RawUI.WindowTitle = "Dune Awakening — Auto Setup"
Clear-Host

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DUNE AWAKENING — AUTO SETUP" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. FIND SERVER
Write-Host "[1/5] Szukam serwera..." -ForegroundColor White
$steam = (Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -EA 0).InstallPath
if (-not $steam) { $steam = "${env:ProgramFiles(x86)}\Steam" }

$searchPaths = @("$steam\steamapps\common\Dune Awakening Self-Hosted Server")
$vdf = "$steam\steamapps\libraryfolders.vdf"
if (Test-Path $vdf) {
    (Get-Content $vdf | Select-String '"path"').Line | ForEach-Object {
        $lib = ($_ -split '"')[3] -replace '\\\\', '\'
        $searchPaths += "$lib\steamapps\common\Dune Awakening Self-Hosted Server"
    }
}

$SERVER = $null
foreach ($p in $searchPaths) { if (Test-Path $p) { $SERVER = $p; break } }
if (-not $SERVER) { Write-Host "NIE ZNALEZIONO! Steam -> Library -> TOOLS -> Dune Awakening Self-Hosted Server -> INSTALL" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "  OK: $SERVER" -ForegroundColor Green
Set-Location $SERVER

# 2. START VM
Write-Host "[2/5] VM..." -ForegroundColor White
$vm = Get-VM -Name "dune-awakening" -ErrorAction SilentlyContinue
if (-not $vm) {
    Write-Host "  Brak VM! Uruchom battlegroup.bat -> a (initial-setup) najpierw." -ForegroundColor Red
    Read-Host; exit 1
}
if ($vm.State -ne "Running") {
    Start-VM -Name "dune-awakening"
    Write-Host "  VM uruchomiona" -ForegroundColor Green
} else {
    Write-Host "  VM dziala" -ForegroundColor Green
}

# 3. WAIT FOR IP
Write-Host "[3/5] Czekam na IP" -NoNewline -ForegroundColor White
$ip = $null
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep 5; Write-Host "." -NoNewline
    try {
        $ips = (Get-VMNetworkAdapter -VMName "dune-awakening" -EA Stop).IPAddresses
        $ip = $ips | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1
        if ($ip) { break }
    } catch {}
}
if (-not $ip) { Write-Host " BRAK IP!" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host " $ip" -ForegroundColor Green

# 4. SSH KEY
Write-Host "[4/5] Klucz SSH..." -ForegroundColor White
$keyDir = "$env:LOCALAPPDATA\DuneAwakeningServer"
$keyPath = "$keyDir\sshKey"
if (-not (Test-Path $keyDir)) { New-Item -ItemType Directory -Path $keyDir -Force | Out-Null }

& "C:\Windows\System32\OpenSSH\ssh-keygen.exe" -t ed25519 -f $keyPath -N '""' -q 2>$null

$pubKey = Get-Content "$keyPath.pub" -Raw
Write-Host "  Kopiuje na VM (haslo: dune)..." -ForegroundColor White

$ssh = "C:\Windows\System32\OpenSSH\ssh.exe"
$result = & $ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR -o ConnectTimeout=15 "dune@$ip" "mkdir -p ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY_OK" 2>&1
if ($result -match "KEY_OK") { Write-Host "  Klucz OK!" -ForegroundColor Green }
else { Write-Host "  Klucz moze juz istniec lub blad hasla" -ForegroundColor Yellow }

# 5. BATTLEGROUP
Write-Host "[5/5] Battlegroup..." -ForegroundColor White
$bgResult = & $ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15 -i $keyPath "dune@$ip" "ls /home/dune/.dune/bin/battlegroup 2>/dev/null && /home/dune/.dune/bin/battlegroup start || ls /usr/local/bin/battlegroup 2>/dev/null && sudo /usr/local/bin/battlegroup start || echo 'Brak battlegroup - uruchom battlegroup.bat -> a ponownie'" 2>&1
Write-Host "  $bgResult" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  GOTOWE! VM: $ip" -ForegroundColor Green
Write-Host "  Panel: http://127.0.0.1:8080" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "Nacisnij Enter"
