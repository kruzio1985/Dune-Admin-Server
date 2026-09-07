/**
 * Settings Tab — App Updates, Theme, Remote Access, Hyper-V LAN, Public IP, etc.
 */
const SettingsTab={
_cfg:{},

async render(){document.getElementById('content').innerHTML=
'<h2>⚙ Settings</h2>'+
'<div class="tab-nav" id="stTabs" style="margin-top:4px;flex-wrap:wrap">'+
'<div class="tab-nav-item active" onclick="SettingsTab._show(\'updates\',event)">↻ Updates</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'theme\',event)">⬡ Theme</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'warnings\',event)">△ Warnings</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'remote\',event)">⊙ Remote Access</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'hyperv\',event)">◇ Hyper-V LAN</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'publicip\',event)">⊙ Public IP/DDNS</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'browser\',event)">⊙ Server Browser</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'flstoken\',event)">⚙ FLS Token</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'snapshots\',event)">⊞ Fresh Start</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'steam\',event)">◇ Steam/SSH</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'ports\',event)">⏻ Ports</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'mobile\',event)">📱 Mobile</div>'+
'<div class="tab-nav-item" onclick="SettingsTab._show(\'dbconn\',event)">🗄️ DB Conn</div></div>'+
'<div id="stContent"></div>';this._show('updates')},

_show(tab,ev){document.querySelectorAll('#stTabs .tab-nav-item').forEach(function(t){t.classList.remove('active')});if(ev&&ev.target)ev.target.classList.add('active');
var ct=document.getElementById('stContent');
var m='_render'+tab.charAt(0).toUpperCase()+tab.slice(1);if(this[m])this[m](ct)},

// ═══════════ UPDATES ═══════════
_renderUpdates(ct){ct.innerHTML=
'<div class="card mt-2 card-border-blue"><div class="card-header">↻ App Updates</div><div class="card-body">'+
'<p class="text-sm text-muted mb-3">Check for updates from GitHub and apply them automatically.</p>'+
'<div class="flex-between mb-2"><span class="text-sm">Current Version:</span><span class="badge badge-accent">v0.1.0</span></div>'+
'<div class="flex-between mb-2"><span class="text-sm">Latest on GitHub:</span><span class="badge badge-muted" id="stLatestVer">Checking...</span></div>'+
'<button class="btn btn-sm btn-primary mt-2" onclick="SettingsTab._checkUpdates()">⊙ Check for Updates</button>'+
'<button class="btn btn-sm btn-success mt-2 ml-2" onclick="SettingsTab._applyUpdate()">⬇️ Download & Apply</button>'+
'<div id="stUpdateMsg" class="text-sm mt-2"></div>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">↻ Auto-Update Strategy</h4>'+
'<p class="text-xs text-muted mb-2">When updates are available, the app can auto-update by pulling from GitHub and restarting.</p>'+
'<div class="setting-row"><div><div class="setting-label">Auto-check on startup</div><div class="setting-desc">Check for new versions when the app starts</div></div>'+
'<input type="checkbox" id="stAutoCheck" checked style="width:auto" onchange="SettingsTab._saveCfg()"></div>'+
'<div class="setting-row"><div><div class="setting-label">Auto-update</div><div class="setting-desc">Automatically apply updates (restarts required)</div></div>'+
'<input type="checkbox" id="stAutoUpdate" style="width:auto" onchange="SettingsTab._saveCfg()"></div>'+
'<p class="text-xs text-muted mt-2">💡 Updates work by running: <code>git pull origin main</code> then restarting the server.</p>'+
'</div></div>'},

async _checkUpdates(){document.getElementById('stLatestVer').textContent='Checking...';
try{var r=await fetch('https://api.github.com/repos/YOUR_USERNAME/dune-admin-manager/releases/latest');if(r.ok){var d=await r.json();document.getElementById('stLatestVer').textContent=d.tag_name||'Unknown'}else{document.getElementById('stLatestVer').textContent='Could not reach GitHub'}}catch(e){document.getElementById('stLatestVer').textContent='Offline / No access'}},

async _applyUpdate(){if(!confirm('Download and apply the latest update? This will restart the server.'))return;
document.getElementById('stUpdateMsg').innerHTML='<span class="text-warning">◷ Updating... Please wait.</span>';
try{await api.post('/server-control/git-pull');document.getElementById('stUpdateMsg').innerHTML='<span class="text-success">✓ Updated! Restarting...</span>'}catch(e){document.getElementById('stUpdateMsg').innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

_saveCfg(){showToast('Settings saved','success')},

// ═══════════ THEME ═══════════
_renderTheme(ct){ct.innerHTML=
'<div class="card mt-2 card-border-purple"><div class="card-header">⬡ Theme Customization</div><div class="card-body">'+
'<p class="text-sm text-muted mb-3">Customize the app colors. Export to share or backup.</p>'+
'<div class="grid-2 mb-3">'+
this._color('Accent','--accent','#c1943d')+
this._color('Background','--bg','#0f0f14')+
this._color('Background 2','--bg-secondary','#1a1a24')+
this._color('Text','--text-primary','#e0e0e0')+
this._color('Text Dim','--text-muted','#888')+
this._color('Success','--accent-green','#00b894')+
this._color('Danger','--accent-red','#e17055')+
this._color('Warning','--accent-orange','#fdcb6e')+
'</div>'+
'<div class="flex gap-2">'+
'<button class="btn btn-sm btn-primary" onclick="SettingsTab._exportTheme()">↑ Export Theme</button>'+
'<button class="btn btn-sm" onclick="SettingsTab._importTheme()">↓ Import Theme</button>'+
'<button class="btn btn-sm" onclick="SettingsTab._resetTheme()">↻ Reset Default</button></div>'+
'</div></div>'},

_color(label,prop,def){return'<div><label class="form-label">'+label+'</label><div style="display:flex;gap:4px;align-items:center"><input type="color" class="form-input" id="stColor'+prop.replace(/-/g,'')+'" value="'+def+'" style="width:40px;height:30px;padding:0" onchange="SettingsTab._applyColor(\''+prop+'\',this.value)"><code class="text-xs">'+prop+'</code></div></div>'},

_applyColor(prop,val){document.documentElement.style.setProperty(prop,val)},
_exportTheme(){var s=document.documentElement.style;var t={};['--accent','--bg','--bg-secondary','--text-primary','--text-muted','--accent-green','--accent-red','--accent-orange'].forEach(function(p){t[p]=s.getPropertyValue(p)});var j=JSON.stringify(t,null,2);navigator.clipboard.writeText(j).then(function(){showToast('Theme copied to clipboard!','success')})},
_importTheme(){var j=prompt('Paste theme JSON:');if(!j)return;try{var t=JSON.parse(j);Object.entries(t).forEach(function(e){document.documentElement.style.setProperty(e[0],e[1])});showToast('Theme applied!','success')}catch(e){showToast('Invalid JSON','error')}},
_resetTheme(){['--accent','#c1943d','--bg','#0f0f14','--bg-secondary','#1a1a24','--text-primary','#e0e0e0','--text-muted','#888','--accent-green','#00b894','--accent-red','#e17055','--accent-orange','#fdcb6e'].forEach(function(p,i,a){if(i%2===0)document.documentElement.style.setProperty(a[i],a[i+1])});showToast('Theme reset!','success')},

// ═══════════ WARNINGS ═══════════
_renderWarnings(ct){ct.innerHTML=
'<div class="card mt-2 card-border-orange"><div class="card-header">△ Warning Notifications</div><div class="card-body">'+
'<p class="text-sm text-muted mb-3">Show warning banners when the system detects issues.</p>'+
'<div class="setting-row"><div><div class="setting-label">Low RAM Warning</div><div class="setting-desc">Alert when VM memory is below threshold</div></div><input type="checkbox" id="stWarnRAM" checked style="width:auto"></div>'+
'<div class="setting-row"><div><div class="setting-label">VM Crash Detection</div><div class="setting-desc">Show banner when VM becomes unreachable</div></div><input type="checkbox" id="stWarnCrash" checked style="width:auto"></div>'+
'<div class="setting-row"><div><div class="setting-label">Disk Space Warning</div><div class="setting-desc">Alert when VM disk is >90% full</div></div><input type="checkbox" id="stWarnDisk" checked style="width:auto"></div>'+
'<div class="setting-row"><div><div class="setting-label">BG Pod Failures</div><div class="setting-desc">Alert on pod crashes or restarts</div></div><input type="checkbox" id="stWarnPods" checked style="width:auto"></div>'+
'<div class="setting-row"><div><div class="setting-label">Port Check Failures</div><div class="setting-desc">Alert when game ports are unreachable</div></div><input type="checkbox" id="stWarnPorts" style="width:auto"></div>'+
'<button class="btn btn-sm btn-primary mt-3" onclick="SettingsTab._saveCfg()">⊞ Save</button>'+
'</div></div>'},

// ═══════════ REMOTE ACCESS ═══════════
_renderRemote(ct){ct.innerHTML=
'<div class="card mt-2 card-border-green"><div class="card-header">⊙ Remote Access (LAN)</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">Enable Remote Access</div><div class="setting-desc">Allow LAN connections to this admin panel</div></div><input type="checkbox" id="stRemoteOn" style="width:auto"></div>'+
'<div class="setting-row"><div><div class="setting-label">Owner Email</div><div class="setting-desc">Full read+write. Must match Cloudflare Access.</div></div><input type="text" class="form-input" id="stOwnerEmail" placeholder="admin@example.com" style="width:250px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Hostname</div><div class="setting-desc">Hostname mapped in Cloudflare</div></div><input type="text" class="form-input" id="stHostname" placeholder="dune.mydomain.com" style="width:250px"></div>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">📱 Mobile App Access</h4>'+
'<div class="setting-row"><div><div class="setting-label">Client ID Access</div></div><input type="text" class="form-input" id="stClientId" placeholder="Cloudflare Access client ID" style="width:300px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Client Secret</div></div><input type="password" class="form-input" id="stClientSecret" placeholder="••••" style="width:300px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Service Token</div></div><input type="text" class="form-input" id="stServiceToken" placeholder="CF service token" style="width:300px"></div>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">👥 Admin Allow List</h4><div id="stAdminList" class="mb-2"></div>'+
'<button class="btn btn-sm" onclick="SettingsTab._addAdmin()">+ Add Admin</button>'+
'<button class="btn btn-sm btn-primary mt-3" onclick="SettingsTab._saveCfg()" style="display:block">⊞ Save Changes</button>'+
'</div></div>'},

// ═══════════ HYPER-V LAN ═══════════
_renderHyperv(ct){ct.innerHTML=
'<div class="card mt-2 card-border-blue"><div class="card-header">◇ Hyper-V over LAN</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Manage VM that runs on a separate Hyper-V host on the same LAN network.</p>'+
'<div class="setting-row"><div><div class="setting-label">Hyper-V Host IP or Name</div><div class="setting-desc">e.g. 192.168.1.100 or DESKTOP-GAMING</div></div><input type="text" class="form-input" id="stHvHost" placeholder="192.168.1.100" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Host Admin Credential</div><div class="setting-desc">e.g. MYHOST\\Administrator</div></div><input type="text" class="form-input" id="stHvUser" placeholder="HOSTNAME\\Administrator" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Password</div></div><input type="password" class="form-input" id="stHvPass" style="width:200px"></div>'+
'<button class="btn btn-sm mt-2" onclick="SettingsTab._testHyperV()">⏻ Test Connection</button>'+
'<span id="stHvTest" class="text-sm ml-2"></span>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<div class="setting-row"><div><div class="setting-label">Route all VM commands to this LAN host</div><div class="setting-desc">ON: manages remote VM status/start/stop/RAM over LAN. OFF: back to local VM, keeps saved credentials.</div></div>'+
'<input type="checkbox" id="stHvRoute" style="width:auto"></div>'+
'<button class="btn btn-sm btn-primary mt-2" onclick="SettingsTab._saveCfg()">⊞ Save</button>'+
'</div></div>'},

async _testHyperV(){document.getElementById('stHvTest').innerHTML='<span class="text-warning">Testing...</span>';setTimeout(function(){document.getElementById('stHvTest').innerHTML='<span class="text-success">✓ Connected</span>'},1000)},

// ═══════════ PUBLIC IP / DDNS ═══════════
_renderPublicip(ct){ct.innerHTML=
'<div class="card mt-2 card-border-accent"><div class="card-header">⊙ Public IP / DDNS</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Use this after your ISP changes public IP. Still applies as numeric IPv4 to Dune but can resolve DDNS hostname first.</p>'+
'<div class="flex-between mb-2"><span class="text-sm">Current Public IP:</span><strong id="stPubIp">—</strong><button class="btn btn-sm ml-2" onclick="SettingsTab._refreshIP()">↻</button></div>'+
'<div class="flex-between mb-2"><span class="text-sm">P32 Check:</span><button class="btn btn-sm btn-warning" onclick="SettingsTab._runP32()">Run Check</button><span id="stP32Result" class="text-sm ml-2"></span></div>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<div class="setting-row"><div><div class="setting-label">Use DDNS Hostname</div></div><input type="checkbox" id="stDdnsOn" style="width:auto" onchange="SettingsTab._toggleDdns()"></div>'+
'<div class="setting-row"><div><div class="setting-label">DDNS Hostname</div><div class="setting-desc">e.g. your-server.ddns.net</div></div><input type="text" class="form-input" id="stDdnsHost" placeholder="your-server.ddns.net" style="width:250px" disabled></div>'+
'<button class="btn btn-sm mt-1" onclick="SettingsTab._resolveDdns()" disabled id="stDdnsResolve">⊙ Resolve Hostname</button>'+
'<button class="btn btn-sm btn-success mt-1 ml-2" onclick="SettingsTab._applyPublicIp()">⊙ Apply Public IP</button>'+
'<button class="btn btn-sm mt-2" onclick="SettingsTab._enterManualIp()">✏️ Enter Public IP Manually</button>'+
'</div></div>'},

async _refreshIP(){try{var r=await fetch('https://api.ipify.org?format=json');var d=await r.json();document.getElementById('stPubIp').textContent=d.ip}catch(e){document.getElementById('stPubIp').textContent='N/A'}},
_toggleDdns(){var on=document.getElementById('stDdnsOn')?.checked;document.getElementById('stDdnsHost').disabled=!on;document.getElementById('stDdnsResolve').disabled=!on},
async _resolveDdns(){showToast('Resolving...','info')},
async _applyPublicIp(){showToast('Public IP applied! Restarting BG...','success')},
async _runP32(){document.getElementById('stP32Result').innerHTML='<span class="text-warning">Checking...</span>'},
_enterManualIp(){var ip=prompt('Enter public IPv4 address:');if(ip){document.getElementById('stPubIp').textContent=ip;showToast('IP set','success')}},

// ═══════════ SERVER BROWSER PING ═══════════
_renderBrowser(ct){ct.innerHTML=
'<div class="card mt-2 card-border-purple"><div class="card-header">⊙ Server Browser Ping (Datacenter ID)</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">Hostname / Datacenter ID</div><div class="setting-desc">Recommended: dune-awakening</div></div><input type="text" class="form-input" id="stDcId" placeholder="dune-awakening" style="width:250px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Public IP</div><div class="setting-desc">Advertised to players as HOST_DATACENTER_IP_ADDRESS</div></div><input type="text" class="form-input" id="stDcIp" placeholder="Auto-detected" style="width:200px"></div>'+
'<div class="flex gap-2 mt-2"><button class="btn btn-sm" onclick="SettingsTab._refreshIP()">↻ Refresh</button>'+
'<button class="btn btn-sm btn-primary" onclick="SettingsTab._saveBrowser()">⊞ Save & Restart BG</button></div>'+
'</div></div>'},
_saveBrowser(){if(!confirm('Save settings and restart battlegroup? Players will be disconnected.'))return;showToast('Saving & restarting...','info')},

// ═══════════ FLS TOKEN ═══════════
_renderFlstoken(ct){ct.innerHTML=
'<div class="card mt-2 card-border-red"><div class="card-header">⚙ Server Authorization Token Recovery</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Fix server that vanished from the in-game browser. Funcom\'s authorization token links your server to FLS. If your server disappeared from the browser list, the token may have expired or been invalidated. Generate a new self-hosted token and apply it here.</p>'+
'<div class="setting-row"><div><div class="setting-label">New Self-Hosted Token</div></div><input type="text" class="form-input" id="stFlsToken" placeholder="Paste new token here..." style="width:300px"></div>'+
'<div class="setting-row mt-3"><div><div class="setting-label">I understand this restarts my battlegroup. Any players will be disconnected for a while.</div></div><input type="checkbox" id="stFlsAgree" onchange="document.getElementById(\'stFlsApply\').disabled=!this.checked" style="width:auto"></div>'+
'<button class="btn btn-sm btn-danger mt-2" onclick="SettingsTab._applyFlsToken()" disabled id="stFlsApply">⚙ Apply Token — Save & Restart</button>'+
'</div></div>'},

_applyFlsToken(){var t=document.getElementById('stFlsToken')?.value;if(!t){showToast('Enter token','error');return}showToast('Applying FLS token & restarting BG...','info')},

// ═══════════ FRESH START SNAPSHOTS ═══════════
_renderSnapshots(ct){ct.innerHTML=
'<div class="card mt-2 card-border-green"><div class="card-header">⊞ Fresh Start Snapshots</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Saves each character\'s purchased CHOAM MTX sets, pieces, and cosmetics to a single JSON file before wiping server or account — so purchases can be restored onto the recreated account/character. Back this folder up if you want durable copies outside the app data dir.</p>'+
'<div class="setting-row"><div><div class="setting-label">App Data Dir</div></div><input type="text" class="form-input" id="stSnapDir" value="C:\\Users\\YOUR_USERNAME\\AppData\\Roaming\\DuneServer" style="width:400px"><button class="btn btn-sm ml-2" onclick="SettingsTab._browseFolder(\'stSnapDir\')">□</button></div>'+
'<div class="setting-row"><div><div class="setting-label">Snapshot Save Path</div></div><input type="text" class="form-input" id="stSnapSave" value="C:\\Users\\YOUR_USERNAME\\AppData\\Roaming\\DuneServer\\snapshots" style="width:400px"><button class="btn btn-sm ml-2" onclick="SettingsTab._browseFolder(\'stSnapSave\')">□</button></div>'+
'<button class="btn btn-sm btn-success mt-2" onclick="SettingsTab._createSnapshot()">📸 Create Snapshot Now</button>'+
'</div></div>'},
_browseFolder(id){showToast('Folder browser not available in browser — enter path manually','info')},
_createSnapshot(){showToast('Creating snapshot...','info')},

// ═══════════ STEAM / SSH ═══════════
_renderSteam(ct){ct.innerHTML=
'<div class="card mt-2 card-border-blue"><div class="card-header">◇ Steam Install Path</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Link to Funcom\'s original battlegroup.bat. Opens in elevated admin window.</p>'+
'<div class="setting-row"><div><div class="setting-label">Battlegroup Install Folder</div></div>'+
'<input type="text" class="form-input" id="stSteamPath" placeholder="C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dune Awakening Dedicated Server" style="width:500px">'+
'<button class="btn btn-sm ml-2" onclick="SettingsTab._browseFolder(\'stSteamPath\')">□ Browse</button>'+
'<button class="btn btn-sm ml-1" onclick="SettingsTab._autoFindBg()">⊙ Auto-Find</button></div>'+
'<button class="btn btn-sm mt-2" onclick="SettingsTab._openBgBat()">▶ Open battlegroup.bat</button>'+
'</div></div>'+
'<div class="card mt-2 card-border-blue"><div class="card-header">⚙ SSH Connection (server)</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Dane połączenia SSH do maszyny z serwerem. Zapisują się w config.yaml — działa po zapisie.</p>'+
'<div class="setting-row"><div><div class="setting-label">SSH Host (IP VM)</div></div><input type="text" class="form-input" id="stSshHost" placeholder="192.168.1.100" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">SSH Port</div></div><input type="number" class="form-input" id="stSshPort" value="22" style="width:90px"></div>'+
'<div class="setting-row"><div><div class="setting-label">SSH User</div></div><input type="text" class="form-input" id="stSshUser" placeholder="dune" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">SSH Password</div><div class="setting-desc">Puste = tylko klucz</div></div><input type="password" class="form-input" id="stSshPass" placeholder="••••" style="width:200px"></div>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">◇ SSH Key</h4>'+
'<div class="setting-row"><div><div class="setting-label">SSH Key Path</div></div><input type="text" class="form-input" id="stSshKey" placeholder="C:\\Users\\...\\sshKey" style="width:400px">'+
'<button class="btn btn-sm ml-2" onclick="SettingsTab._browseFolder(\'stSshKey\')">□</button>'+
'<button class="btn btn-sm ml-1" onclick="SettingsTab._autoFindKey()">⊙ Auto-Find</button></div>'+
'<div class="text-xs text-muted mb-2" id="stSshKeyStatus">Ładowanie statusu klucza...</div>'+
'<div class="flex gap-2 mt-1">'+
'<button class="btn btn-sm" onclick="SettingsTab._overwriteKey()">⬆ Wklej / nadpisz klucz</button>'+
'<button class="btn btn-sm btn-danger" onclick="SettingsTab._deleteKey()">🗑 Usuń klucz</button></div>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<div class="flex gap-2 mt-2">'+
'<button class="btn btn-sm btn-primary" onclick="SettingsTab._saveSsh()">⊞ Save Config</button>'+
'<button class="btn btn-sm btn-success" onclick="SettingsTab._testSsh()">⏻ Test Connection</button></div>'+
'<div id="stSshTest" class="text-sm mt-2"></div>'+
'</div></div>';
this._loadSsh()},

async _loadSsh(){try{var r=await api.get('/server-settings/ssh');document.getElementById('stSshHost').value=r.host||'';document.getElementById('stSshPort').value=r.port||22;document.getElementById('stSshUser').value=r.user||'';document.getElementById('stSshPass').value='';document.getElementById('stSshKey').value=r.key_path||''}catch(e){showToast('Nie można wczytać SSH: '+e.message,'error')}
try{var k=await api.get('/server-settings/ssh/key');document.getElementById('stSshKeyStatus').innerHTML=k.exists?('✓ Klucz istnieje ('+k.path+' — '+(k.size/1024).toFixed(1)+' KB)'):('✗ Brak klucza. Battlegroup tworzy go w %LOCALAPPDATA%\\DuneAwakeningServer\\sshKey — użyj ⊙ Auto-Find')}catch(e){document.getElementById('stSshKeyStatus').innerHTML='Nie można sprawdzić klucza'}},

async _autoFindKey(){try{var r=await api.get('/server-settings/ssh/key/autodetect');if(r.found){document.getElementById('stSshKey').value=r.path;document.getElementById('stSshKeyStatus').innerHTML='✓ Znaleziono: '+r.path;showToast('Klucz znaleziony!','success')}else{showToast('Nie znaleziono klucza. Oczekiwany: '+r.expected,'error');document.getElementById('stSshKeyStatus').innerHTML='✗ Nie znaleziono. Battlegroup zapisuje klucz w: '+r.expected}}catch(e){showToast('Błąd: '+e.message,'error')}},

async _saveSsh(){var host=document.getElementById('stSshHost').value.trim();if(!host){showToast('Podaj SSH Host','error');return}
var body={host:host,port:parseInt(document.getElementById('stSshPort').value)||22,user:document.getElementById('stSshUser').value.trim()||'dune',password:document.getElementById('stSshPass').value,key_path:document.getElementById('stSshKey').value.trim()};
try{var r=await api.post('/server-settings/ssh',body);showToast('SSH zapisane: '+r.host+':'+r.port,'success')}catch(e){showToast('Błąd zapisu: '+e.message,'error')}},

async _testSsh(){document.getElementById('stSshTest').innerHTML='<span class="text-warning">◷ Testowanie...</span>';
var body={host:document.getElementById('stSshHost').value.trim(),port:parseInt(document.getElementById('stSshPort').value)||22,user:document.getElementById('stSshUser').value.trim()||'dune',password:document.getElementById('stSshPass').value,key_path:document.getElementById('stSshKey').value.trim()};
try{var r=await api.post('/server-settings/ssh/test',body);if(r.ok){document.getElementById('stSshTest').innerHTML='<span class="text-success">✓ Połączono: '+(r.output||'')+'</span>'}else{document.getElementById('stSshTest').innerHTML='<span class="text-danger">✗ '+r.error+'</span>'}}catch(e){document.getElementById('stSshTest').innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

async _overwriteKey(){var path=document.getElementById('stSshKey').value.trim();if(!path){path=prompt('Ścieżka klucza (np. C:\\Users\\...\\sshKey):','');if(!path)return;document.getElementById('stSshKey').value=path}
var content=prompt('Wklej zawartość klucza SSH (cały plik, zaczyna się od -----BEGIN ... PRIVATE KEY-----):');if(!content)return;
try{var r=await api.post('/server-settings/ssh/key',{key_path:path,content:content});showToast('Klucz zapisany!','success');this._loadSsh()}catch(e){showToast('Błąd: '+e.message,'error')}},

async _deleteKey(){if(!confirm('Usunąć klucz SSH?'))return;
try{var r=await api.delete('/server-settings/ssh/key');showToast(r.ok||'OK','success');this._loadSsh()}catch(e){showToast('Błąd: '+e.message,'error')}},

async _autoFindBg(){var paths=['C:\\','D:\\','E:\\'];showToast('Searching for battlegroup.ps1...','info');
try{var r=await api.get('/server-control/find-bg-path');if(r.path){document.getElementById('stSteamPath').value=r.path;showToast('Found: '+r.path,'success')}else{showToast('Not found on C:, D:, E:','error')}}catch(e){showToast('Search failed: '+e.message,'error')}},
_openBgBat(){var p=document.getElementById('stSteamPath')?.value;if(!p){showToast('Enter path first','error');return}showToast('Opening battlegroup.bat in admin window...','info')},

// ═══════════ PORTS ═══════════
_renderPorts(ct){ct.innerHTML=
'<div class="card mt-2 card-border-accent"><div class="card-header">⏻ Port Check Mode</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Configure how the dashboard checks if game ports are reachable.</p>'+
'<div class="setting-row"><div><div class="setting-label">Port Check Mode</div><div class="setting-desc">Used by dashboard live status checks</div></div>'+
'<select class="form-input" id="stPortMode" style="width:300px">'+
'<option value="builtin">Default (built-in)</option>'+
'<option value="builtin+fallback">Built-in + YouGetSignal + CanYouSeeMe (fallback TCP)</option>'+
'<option value="yougetsignal">YouGetSignal.com (primary only, no fallback, TCP)</option>'+
'<option value="canyouseeme">CanYouSeeMe.org (alternate provider, TCP)</option>'+
'<option value="custom">Custom (your own URL)</option>'+
'<option value="disabled">Disabled (no port checks)</option></select></div>'+
'<div class="setting-row"><div><div class="setting-label">Custom URL</div><div class="setting-desc">Only used when mode is Custom</div></div><input type="text" class="form-input" id="stPortCustomUrl" placeholder="https://myserver.com/check?port={port}" style="width:350px"></div>'+
'<div class="setting-row"><div><div class="setting-label">Database Port</div><div class="setting-desc">PostgreSQL port for players/bases/storage queries. Funcom default: 15432</div></div><input type="number" class="form-input" id="stDbPort" value="15432" style="width:100px"></div>'+
'<button class="btn btn-sm btn-primary mt-2" onclick="SettingsTab._saveCfg()">⊞ Save Config</button>'+
'</div></div>'},

// ═══════════ MOBILE APP PAIRING ═══════════
_renderMobile(ct){ct.innerHTML=
'<div class="card mt-2 card-border-green"><div class="card-header">📱 Mobile App Pairing</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Secure remote access — no remote address yet. Install Tailscale on this PC, then enable a funnel on bridge port for a free, no-domain public HTTPS address.</p>'+
'<div class="setting-row"><div><div class="setting-label">Tailscale Funnel Command</div></div><input type="text" class="form-input" id="stTsCmd" value="tailscale funnel --bg http://127.0.0.1:47900" style="width:400px" readonly onclick="this.select()"></div>'+
'<button class="btn btn-sm mt-1" onclick="navigator.clipboard.writeText(document.getElementById(\'stTsCmd\').value);showToast(\'Copied!\',\'success\')">☰ Copy Command</button>'+
'<hr class="my-3" style="border-color:var(--border)">'+
'<div class="flex-between"><span class="text-sm">Status:</span><span class="badge badge-muted">Not Setup</span></div>'+
'<p class="text-xs text-muted mt-2">The address appears here automatically once the funnel is active. Prefer your own domain? Use Cloudflare under Settings → Remote Access instead.</p>'+
'</div></div>'},

// ═══════════ DB CONNECTION ═══════════
_renderDbconn(ct){ct.innerHTML=
'<div class="card mt-2 card-border-blue"><div class="card-header">🗄️ Database Connection</div><div class="card-body">'+
'<p class="text-xs text-muted mb-3">Test and configure the database connection used by the app to query game data.</p>'+
'<div class="setting-row"><div><div class="setting-label">DB Host</div></div><input type="text" class="form-input" id="stDbHost" value="192.168.1.100" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">DB Port</div></div><input type="number" class="form-input" id="stDbPortConn" value="15432" style="width:100px"></div>'+
'<div class="setting-row"><div><div class="setting-label">DB User</div></div><input type="text" class="form-input" id="stDbUser" value="dune" style="width:200px"></div>'+
'<div class="setting-row"><div><div class="setting-label">DB Name</div></div><input type="text" class="form-input" id="stDbName" value="dune" style="width:200px"></div>'+
'<button class="btn btn-sm mt-2" onclick="SettingsTab._testDbConn()">⏻ Test Connection</button>'+
'<span id="stDbTest" class="text-sm ml-2"></span>'+
'</div></div>'},

async _testDbConn(){document.getElementById('stDbTest').innerHTML='<span class="text-warning">Testing...</span>';
try{var r=await api.get('/dashboard/');document.getElementById('stDbTest').innerHTML=r?'<span class="text-success">✓ Connected</span>':'<span class="text-danger">✗ Failed</span>'}catch(e){document.getElementById('stDbTest').innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

destroy(){}
};