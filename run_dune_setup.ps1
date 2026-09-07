Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DUNE SETUP" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

# Server path
$SERVER = "D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server"
if (-not (Test-Path $SERVER)) { $SERVER = "C:\Program Files (x86)\Steam\steamapps\common\Dune Awakening Self-Hosted Server" }
if (-not (Test-Path $SERVER)) { Write-Host "SERVER NOT FOUND!" -ForegroundColor Red; Read-Host; exit }

Write-Host "[1] Server: $SERVER" -ForegroundColor Green

# VM
Write-Host "[2] VM..." -ForegroundColor Yellow
$vm = Get-VM -Name "dune-awakening" -ErrorAction SilentlyContinue
if (-not $vm) {
    Write-Host "VM nie istnieje!" -ForegroundColor Red
    Write-Host "Uruchom battlegroup.bat -> a -> initial-setup" -ForegroundColor Yellow
    Read-Host; exit
}
if ($vm.State -ne "Running") { Start-VM -Name "dune-awakening"; Write-Host "VM started" -ForegroundColor Green }
else { Write-Host "VM running" -ForegroundColor Green }

# IP
Write-Host "[3] Waiting for IP..." -ForegroundColor Yellow
$ip = $null
for ($i = 0; $i -lt 60; $i++) { 
    Start-Sleep 5; Write-Host "." -NoNewline
    try { $ip = (Get-VMNetworkAdapter -VMName "dune-awakening" -EA Stop).IPAddresses | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1; if ($ip) { break } } catch {} 
}
if (-not $ip) { Write-Host " NO IP!" -ForegroundColor Red; Read-Host; exit }
Write-Host " $ip" -ForegroundColor Green

# SSH key
Write-Host "[4] SSH key..." -ForegroundColor Yellow
$keyDir = "$env:LOCALAPPDATA\DuneAwakeningServer"
$keyPath = "$keyDir\sshKey"
if (-not (Test-Path $keyDir)) { New-Item -ItemType Directory -Path $keyDir -Force | Out-Null }
if (-not (Test-Path $keyPath)) { & "C:\Windows\System32\OpenSSH\ssh-keygen.exe" -t ed25519 -f $keyPath -N '""' -q 2>$null }

$pubKey = Get-Content "$keyPath.pub" -Raw

# Copy key + start battlegroup
Write-Host "[5] Copy key + start battlegroup..." -ForegroundColor Yellow
Write-Host "  (Password: dune)" -ForegroundColor White

$ssh = "C:\Windows\System32\OpenSSH\ssh.exe"
$cmd = @(
    'mkdir -p ~/.ssh',
    'cat >> ~/.ssh/authorized_keys << EOF',
    $pubKey.Trim(),
    'EOF',
    'chmod 600 ~/.ssh/authorized_keys',
    'echo KEY_OK',
    '/home/dune/.dune/bin/battlegroup start 2>/dev/null || sudo /usr/local/bin/battlegroup start 2>/dev/null || echo BG_NOT_FOUND'
) -join '; '

& $ssh -t -o StrictHostKeyChecking=no "dune@$ip" $cmd

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DONE! VM: $ip" -ForegroundColor Green
Write-Host "  Panel: http://127.0.0.1:8080" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "Press Enter to close"
