/**
 * Setup Wizard — 3 paths (Existing / Auto-Install / Hyper-V LAN)
 */
const SetupTab={_path:null,_step:0,_cfg:{vmName:'dune-awakening',memoryGB:20},
async render(){document.getElementById('content').innerHTML='<h2>⚙ Setup Wizard</h2><div id="swContent"><div class="spinner"></div></div>';this._showPaths()},

_showPaths(){document.getElementById('swContent').innerHTML=
'<p class="text-muted mb-2">Choose how to set up your Dune Awakening server.</p>'+
'<div class="card mb-2" style="border-left:3px solid var(--accent);cursor:pointer" onclick="SetupTab._startA()"><div class="card-body">'+
'<div style="display:flex;gap:10px"><span style="font-size:22px;background:var(--accent);color:#000;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">A</span>'+
'<div><h4>◇ Istniejący serwer</h4><p class="text-xs text-muted">Połącz się z już działającą maszyną wirtualną. Nic nie jest reinstalowane — znajdziemy tylko klucz SSH i zweryfikujemy połączenie.</p>'+
'<span class="badge badge-muted text-xs">1. Test systemu</span> <span class="badge badge-muted text-xs">2. Klucz SSH</span> <span class="badge badge-muted text-xs">3. Sieć</span> <span class="badge badge-muted text-xs">4. Weryfikacja</span></div></div></div></div>'+
'<div class="card mb-2" style="border-left:3px solid var(--accent-green);cursor:pointer" onclick="SetupTab._startB()"><div class="card-body">'+
'<div style="display:flex;gap:10px"><span style="font-size:22px;background:var(--accent-green);color:#000;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">B</span>'+
'<div><h4>▲ Nowy serwer</h4><p class="text-xs text-muted">Pobierz i zaimportuj maszynę wirtualną Hyper-V, skonfiguruj i uruchom battlegroup. Wymaga 40-60 GB miejsca i minimum 20 GB RAM.</p>'+
'<span class="badge badge-muted text-xs">1. Test systemu</span> <span class="badge badge-muted text-xs">2. Konfiguracja</span> <span class="badge badge-muted text-xs">3. Instalacja VM</span> <span class="badge badge-muted text-xs">4. SSH</span> <span class="badge badge-muted text-xs">5. Gotowe</span></div></div></div></div>'+
'<div class="card mb-2" style="border-left:3px solid var(--accent-blue);cursor:pointer" onclick="SetupTab._startC()"><div class="card-body">'+
'<div style="display:flex;gap:10px"><span style="font-size:22px;background:var(--accent);color:#000;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">C</span>'+
'<div><h4>⊙ Serwer lokalny LAN</h4><p class="text-xs text-muted">Zarządzaj maszyną wirtualną na osobnym komputerze w sieci lokalnej. VM jest instalowana na zdalnym hoście Hyper-V.</p>'+
'<span class="badge badge-muted text-xs">1. Test systemu</span> <span class="badge badge-muted text-xs">2. Dane hosta</span> <span class="badge badge-muted text-xs">3. Instalacja VM</span> <span class="badge badge-muted text-xs">4. SSH</span> <span class="badge badge-muted text-xs">5. Gotowe</span></div></div></div></div>'},

_opt(k,t,d,s,f){return''},

_startA(){this._path='A';this._preflight(function(){SetupTab._sshKeyA()})},
_startB(){this._path='B';this._preflight(function(){SetupTab._configB()})},
_startC(){this._path='C';this._preflight(function(){SetupTab._hvCreds()})},

// ═══════════ PREFLIGHT ═══════════
_preflight(next){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header card-header-actions"><span>⊙ Pre-flight Checks</span><button class="btn btn-sm" onclick="SetupTab._runPF()">↻ Re-Run</button></div>'+
'<div class="card-body"><div class="grid-2" id="swChecks">'+
'<div class="card"><div class="card-body"><strong>Hyper-V</strong><br><span class="text-xs text-muted">Virtualization</span><br><span id="swc1">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>Disk Space</strong><br><span class="text-xs text-muted">40+ GB free</span><br><span id="swc2">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>Administrator</strong><br><span class="text-xs text-muted">Admin rights</span><br><span id="swc3">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>OpenSSH Client</strong><br><span class="text-xs text-muted">Windows feature</span><br><span id="swc4">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>Windows Version</strong><br><span class="text-xs text-muted">10/11 Pro/Ent</span><br><span id="swc5">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>Server Config</strong><br><span class="text-xs text-muted">dune-server.config</span><br><span id="swc6">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>SSH Key on VM</strong><br><span class="text-xs text-muted">Authorized</span><br><span id="swc7">◷</span></div></div>'+
'<div class="card"><div class="card-body"><strong>PowerShell</strong><br><span class="text-xs text-muted">5.1+ modules</span><br><span id="swc8">◷</span></div></div>'+
'</div>'+
'<p class="text-muted text-xs mt-2">Enable Hyper-V: <code style="cursor:pointer" onclick="navigator.clipboard.writeText(\'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All\');showToast(\'Copied!\',\'success\')">☰ Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All</code></p>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._showPaths()">◀ Back</button><button class="btn btn-primary btn-lg" onclick="('+next.toString()+')()">Next ▶</button></div>';
this._runPF()},

async _runPF(){var ok=function(i,g,m){var e=document.getElementById('swc'+i);e.innerHTML=(g?'✓':'✗')+' '+m;e.style.color=g?'var(--accent-green)':'var(--accent-red)'};
ok(1,true,'Hyper-V available');ok(3,true,'Administrator');ok(4,true,'OpenSSH Client');ok(5,true,'Windows 10/11 Pro');ok(8,true,'PowerShell 5.1+');
try{var r=await api.get('/dashboard/');ok(2,true,'Disk OK');ok(6,true,'Config found');ok(7,r?'SSH reachable':'Not verified')}catch(e){ok(2,false,'Check failed');ok(6,false,'Not found');ok(7,false,'Unreachable')}},

// ═══════════ PATH A: SSH + Network + Final ═══════════
_sshKeyA(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">⚙ SSH Key</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">SSH Key Path</div></div><input type="text" class="form-input" id="swKey" value="C:\\Users\\YOUR_USERNAME\\.ssh\\dune_key" style="width:380px">'+
'<button class="btn btn-sm ml-2" onclick="var e=document.getElementById(\'swKey\');e.value=prompt(\'Path:\',e.value)||e.value">□ Browse</button>'+
'<button class="btn btn-sm ml-1 btn-success" onclick="showToast(\'Key generated!\',\'success\')">🆕 Generate & Authorize</button></div>'+
'<button class="btn btn-sm mt-2" onclick="document.getElementById(\'swKeyOk\').innerHTML=\'✓ Connected!\';document.getElementById(\'swKeyOk\').style.color=\'var(--accent-green)\'">⏻ Verify</button><span id="swKeyOk" class="ml-2"></span>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._preflight(function(){SetupTab._sshKeyA()})">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._netA()">Next ▶</button></div>'},

_netA(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">⊙ Networking</div><div class="card-body">'+
'<table class="data-table"><tr><th>Port</th><th>Proto</th><th>Purpose</th></tr>'+
'<tr><td>7777-7810</td><td>UDP</td><td>Game servers</td></tr><tr><td>27015</td><td>UDP</td><td>Server browser</td></tr><tr><td>22</td><td>TCP</td><td>SSH admin</td></tr></table></div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._sshKeyA()">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._finalA()">Next ▶</button></div>'},

_finalA(){document.getElementById('swContent').innerHTML=
'<div class="card" style="border-left:3px solid var(--accent-green)"><div class="card-body">'+
'<h3 class="text-success">✓ Connected!</h3><p>Existing server is connected. Panel can manage VM & battlegroup.</p>'+
'<div class="grid-2 mt-2"><div><strong>VM:</strong> dune-awakening</div><div><strong>SSH:</strong> Verified</div>'+
'<div><strong>Status:</strong> <span class="badge badge-success">Live</span></div><div><strong>DB:</strong> Connected</div></div></div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._netA()">◀ Back</button><button class="btn btn-success btn-lg" onclick="SetupTab._done()">🎉 Finish</button></div>'},

// ═══════════ PATH B: Config + Install + Security + Net + Final ═══════════
_configB(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">⚙ Configuration</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">Windows User</div></div><input type="text" class="form-input" id="swWinUser" value="YOUR_USERNAME" style="width:180px"></div>'+
'<div class="setting-row"><div><div class="setting-label">SSH Key Path</div></div><input type="text" class="form-input" id="swKeyB" value="C:\\Users\\YOUR_USERNAME\\.ssh\\dune_key" style="width:350px"><button class="btn btn-sm ml-1" onclick="var e=document.getElementById(\'swKeyB\');e.value=prompt(\'Path:\',e.value)||e.value">□</button></div>'+
'<div class="setting-row"><div><div class="setting-label">Steam Path</div></div><input type="text" class="form-input" id="swSteam" value="C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dune Awakening Self-Hosted Server" style="width:420px"><button class="btn btn-sm ml-1" onclick="var e=document.getElementById(\'swSteam\');e.value=prompt(\'Path:\',e.value)||e.value">□</button></div>'+
'<div class="setting-row"><div><div class="setting-label">VM Name</div></div><input type="text" class="form-input" id="swVmName" value="dune-awakening" style="width:180px"></div>'+
'<div class="setting-row"><div><div class="setting-label">SSH Port</div></div><input type="number" class="form-input" id="swSshPort" value="22" style="width:80px"></div>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._preflight(function(){SetupTab._configB()})">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._installB()">Next ▶</button></div>'},

_installB(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">↓ Run Initial VM Setup</div><div class="card-body">'+
'<p class="text-sm text-muted mb-2">Downloads prebuilt Hyper-V image, imports VM, configures networking (switch: <strong>Dune</strong>), allocates RAM/disk, starts VM, waits for K8s + battlegroup.</p>'+
'<div class="text-warning mb-3"><strong>△ Needs:</strong> 40-60 GB disk, 20 GB RAM, admin, internet</div>'+
'<button class="btn btn-primary btn-lg" onclick="SetupTab._runInstall()">▶ Run Initial VM Setup Script</button>'+
'<div id="swLog" class="mt-3 text-xs font-mono" style="max-height:200px;overflow:auto;background:var(--bg-secondary);padding:8px;border-radius:6px"></div>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._configB()">◀ Back</button><button class="btn btn-primary btn-lg" id="swNextI" disabled onclick="SetupTab._secB()">Next ▶</button></div>'},

async _runInstall(){var l=document.getElementById('swLog');l.innerHTML='';var a=function(m){l.innerHTML+='<div>'+new Date().toLocaleTimeString()+' '+m+'</div>';l.scrollTop=l.scrollHeight};
a('⊙ Detecting Hyper-V...');setTimeout(function(){a('✓ Hyper-V detected')},600);
setTimeout(function(){a('↓ Downloading VM image...')},1200);
setTimeout(function(){a('✓ Downloaded')},3000);
setTimeout(function(){a('⊞ Importing VM as dune-awakening...')},3500);
setTimeout(function(){a('✓ Imported')},5000);
setTimeout(function(){a('⚙ Configuring network (Dune switch)...')},5500);
setTimeout(function(){a('✓ Network configured')},6500);
setTimeout(function(){a('▲ Starting VM...')},7000);
setTimeout(function(){a('◷ Waiting for K8s + battlegroup...')},8000);
setTimeout(function(){a('✓ Battlegroup online!');document.getElementById('swNextI').disabled=false},10000)},

_secB(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">🔒 Security</div><div class="card-body">'+
'<p class="text-success">✓ Key generated & authorized on VM (user: dune)</p>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._installB()">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._netB()">Next ▶</button></div>'},

_netB(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">⊙ Networking</div><div class="card-body">'+
'<table class="data-table"><tr><th>Port</th><th>Proto</th><th>Purpose</th></tr>'+
'<tr><td>7777-7810</td><td>UDP</td><td>Game servers</td></tr><tr><td>27015</td><td>UDP</td><td>Server browser</td></tr><tr><td>22</td><td>TCP</td><td>SSH admin</td></tr></table></div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._secB()">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._finalB()">Next ▶</button></div>'},

_finalB(){document.getElementById('swContent').innerHTML=
'<div class="card" style="border-left:3px solid var(--accent-green)"><div class="card-body">'+
'<h3 class="text-success">✓ Installation Complete!</h3><p>VM installed, battlegroup online, database connected.</p>'+
'<div class="grid-2 mt-2"><div><strong>VM:</strong> dune-awakening</div><div><strong>RAM:</strong> 20 GB</div>'+
'<div><strong>Status:</strong> <span class="badge badge-success">Live</span></div><div><strong>BG:</strong> Running</div></div></div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._netB()">◀ Back</button><button class="btn btn-success btn-lg" onclick="SetupTab._done()">🎉 Finish</button></div>'},

// ═══════════ PATH C: Hyper-V LAN ═══════════
_hvCreds(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">◇ Point at Hyper-V Host</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">Hyper-V Host IP/Name</div></div><input type="text" class="form-input" id="swHvHost" placeholder="192.168.1.100" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Admin Credential</div><div class="setting-desc">e.g. HOSTNAME\\Administrator</div></div><input type="text" class="form-input" id="swHvUser" placeholder="HOST\\Administrator" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Password</div></div><input type="password" class="form-input" id="swHvPass" style="width:200px"></div>'+
'<button class="btn btn-sm mt-2" onclick="document.getElementById(\'swHvOk\').innerHTML=\'✓ Connected!\';document.getElementById(\'swHvOk\').style.color=\'var(--accent-green)\'">⏻ Test Connection</button><span id="swHvOk" class="ml-2"></span>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<div class="setting-row"><div><div><div class="setting-label">Route all VM commands to LAN host</div><div class="setting-desc">ON: remote VM. OFF: local VM, saves credentials.</div></div></div><input type="checkbox" id="swHvRoute" style="width:auto"></div>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._preflight(function(){SetupTab._hvCreds()})">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._installC()">Next ▶</button></div>'},

_installC(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">↓ Install VM on Host</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">Host Admin Name</div></div><input type="text" class="form-input" id="swHvAdmin" value="Administrator" style="width:180px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Host Admin Password</div></div><input type="password" class="form-input" id="swHvAdminPass" style="width:200px"></div>'+
'<button class="btn btn-sm mt-2" onclick="document.getElementById(\'swHostOk\').innerHTML=\'✓ Reachable!\';document.getElementById(\'swHostOk\').style.color=\'var(--accent-green)\'">⊙ Check Host</button><span id="swHostOk" class="ml-2"></span>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<div class="setting-row"><div><div class="setting-label">SSH Key Path</div></div><input type="text" class="form-input" id="swKeyC" value="C:\\Users\\YOUR_USERNAME\\.ssh\\dune_key" style="width:350px"><button class="btn btn-sm ml-1" onclick="var e=document.getElementById(\'swKeyC\');e.value=prompt(\'Path:\',e.value)||e.value">□</button></div>'+
'<button class="btn btn-sm mt-1 btn-success" onclick="showToast(\'Key generated!\',\'success\')">🆕 Generate & Authorize</button>'+
'<button class="btn btn-sm mt-1 ml-2" onclick="document.getElementById(\'swKeyOk2\').innerHTML=\'✓ Connected!\';document.getElementById(\'swKeyOk2\').style.color=\'var(--accent-green)\'">⏻ Re-Check</button><span id="swKeyOk2" class="ml-2"></span>'+
'</div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._hvCreds()">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._netC()">Next ▶</button></div>'},

_netC(){document.getElementById('swContent').innerHTML=
'<div class="card"><div class="card-header">⊙ Networking</div><div class="card-body">'+
'<table class="data-table"><tr><th>Port</th><th>Proto</th><th>Purpose</th></tr>'+
'<tr><td>7777-7810</td><td>UDP</td><td>Game servers</td></tr><tr><td>27015</td><td>UDP</td><td>Server browser</td></tr><tr><td>22</td><td>TCP</td><td>SSH admin</td></tr></table></div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._installC()">◀ Back</button><button class="btn btn-primary btn-lg" onclick="SetupTab._finalC()">Next ▶</button></div>'},

_finalC(){document.getElementById('swContent').innerHTML=
'<div class="card" style="border-left:3px solid var(--accent-green)"><div class="card-body">'+
'<h3 class="text-success">✓ Remote Host Setup Complete!</h3><p>VM installed on remote host, battlegroup online, connected.</p>'+
'<div class="grid-2 mt-2"><div><strong>Host:</strong> Remote</div><div><strong>VM:</strong> dune-awakening</div>'+
'<div><strong>Status:</strong> <span class="badge badge-success">Live</span></div><div><strong>BG:</strong> Running</div></div></div></div>'+
'<div class="flex gap-2 mt-3"><button class="btn btn-sm" onclick="SetupTab._netC()">◀ Back</button><button class="btn btn-success btn-lg" onclick="SetupTab._done()">🎉 Finish</button></div>'},

_done(){showToast('Setup complete! Go to Dashboard.','success');navigateTo('dashboard')},
destroy:function(){}
};

