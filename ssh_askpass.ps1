# SSH password helper script for Windows OpenSSH
# Usage: set SSH_ASKPASS=this_script, DISPLAY=dummy, then ssh will call this for password
$password = $env:SSH_PASSWORD
Write-Output $password
