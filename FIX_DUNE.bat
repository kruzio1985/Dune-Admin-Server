@echo off
title Dune Server — Auto Fix & Start
cd /d "%~dp0..\.."
net session >nul 2>&1 || ( powershell -Command "Start-Process '%~f0' -Verb RunAs"; exit )

echo =======================================
echo   DUNE — AUTO FIX + START
echo =======================================
echo.

set "SERVER=D:\SteamLibrary\steamapps\common\Dune Awakening Self-Hosted Server"
if not exist "%SERVER%" set "SERVER=C:\Program Files (x86)\Steam\steamapps\common\Dune Awakening Self-Hosted Server"

echo [1] Fix network + start VM...
powershell -NoProfile -Command ^
"$vm=Get-VM 'dune-awakening' -EA 0; ^
if(-not $vm){Write-Host 'VM not found! Run battlegroup.bat -^> a first'; exit 1}; ^
if($vm.State -ne 'Running'){Start-VM 'dune-awakening'}; ^
Start-Sleep 3; ^
$adapter=Get-VMNetworkAdapter -VMName 'dune-awakening'; ^
if($adapter.SwitchName -ne 'Default Switch'){Connect-VMNetworkAdapter -VMName 'dune-awakening' -SwitchName 'Default Switch'}; ^
Write-Host 'VM OK'"

echo [2] Wait for IP...
powershell -NoProfile -Command ^
"$ip=$null; for($i=0;$i -lt 60;$i++){Start-Sleep 5; Write-Host '.' -NoNewline; try{$ip=(Get-VMNetworkAdapter 'dune-awakening' -EA Stop).IPAddresses ^|?{$_ -match '^\d+\.'}^|Select -First 1; if($ip){break}}catch{}}; ^
if(-not $ip){Write-Host ' NO IP!'; exit 1}; Write-Host (' '+$ip); Write-Output $ip" > "%TEMP%\dune_ip.txt"
set /p IP=<"%TEMP%\dune_ip.txt"
echo   VM IP: %IP%

echo [3] Start battlegroup...
echo   (password: dune - only once)
C:\Windows\System32\OpenSSH\ssh.exe -t -o StrictHostKeyChecking=no dune@%IP% "/home/dune/.dune/bin/battlegroup start 2>/dev/null || sudo /usr/local/bin/battlegroup start 2>/dev/null || echo BG_NOT_INSTALLED"

echo.
echo Done! Panel: http://127.0.0.1:8080
pause
