/**
 * Commands Tab — VM / Battlegroup / Tools categories + Embedded PowerShell
 * Each command copies a PowerShell snippet to clipboard.
 */
const CommandsTab={_psWs:null,_psReady:false,_psConnected:false,

async render(){document.getElementById('content').innerHTML=
'<h2>⏻ Commands</h2>'+
'<div class="tab-nav" id="cmdTabs" style="margin-top:4px">'+
'<div class="tab-nav-item active" onclick="CommandsTab._showTab(\'actions\',event)">◇ Quick Actions</div>'+
'<div class="tab-nav-item" onclick="CommandsTab._showTab(\'powershell\',event)">⊡ PowerShell</div></div>'+
'<div id="cmdContent"></div>';this._showTab('actions')},

_showTab(tab,ev){document.querySelectorAll('#cmdTabs .tab-nav-item').forEach(function(t){t.classList.remove('active')});if(ev&&ev.target)ev.target.classList.add('active');var ct=document.getElementById('cmdContent');if(tab==='powershell')this._renderPS(ct);else this._renderActions(ct)},

// ═══════════════ QUICK ACTIONS ═══════════════

_renderActions(ct){var self=this;
ct.innerHTML='<div class="grid-3 mt-2" style="gap:10px">'+
self._sec('◇ VM',[
{i:'▶',k:'V',l:'Start VM',d:'Power on Hyper-V VM',p:'Start-VM -Name dune-awakening'},
{i:'▲',k:'S',l:'Start Full Stack',d:'VM + Battlegroup',p:self._getStartAll()},
{i:'⏻',k:'B',l:'Start BG',d:'Battlegroup only',p:self._getBgStart()},
{i:'↻',k:'R',l:'Restart BG',d:'Restart battlegroup',p:self._getBgRestart()},
{i:'↻',k:'T',l:'Reboot VM',d:'Full VM restart',p:'Restart-VM -Name dune-awakening -Force'},
{i:'⏹',k:'X',l:'Stop BG',d:'Stop battlegroup',p:self._getBgStop()},
{i:'⏻',k:'Q',l:'Stop VM',d:'Power off VM',p:'Stop-VM -Name dune-awakening -Force'},
{i:'⊞',k:'A',l:'Backup DB',d:'Full pg_dump',p:self._getBackupCmd()},
{i:'⊙',k:'I',l:'Change VM IP',d:'Update network IP',p:self._getChangeIp()},
])+'</div><div class="grid-3 mt-2" style="gap:10px">'+
self._sec('◆ Battlegroup',[
{i:'☰',k:'E',l:'Edit Director',d:'YAML config in notepad',p:self._getEditDirector()},
{i:'☰',k:'U',l:'Apply INIs',d:'Apply config + restart',p:self._getApplyInis()},
{i:'↑',k:'L',l:'Logs Export',d:'Export pod logs to file',p:self._getLogsExport()},
{i:'⊡',k:'P',l:'Shell to Pod',d:'kubectl exec bash',p:'ssh dune@192.168.1.100'},
{i:'⚙',k:'H',l:'SSH to VM',d:'Open SSH session',p:'ssh dune@192.168.1.100'},
{i:'⊙',k:'D',l:'Director UI',d:'BG director web',u:'http://192.168.1.217:32218'},
{i:'□',k:'F',l:'File Browser',d:'VM file browser',u:'http://192.168.1.217:3001'},
{i:'△',k:'M',l:'Fix Maps',d:'Clear pinned partitions',p:self._getFixMaps()},
{i:'⊕',k:'G',l:'Exp. Swap',d:'Enable overcommit',p:'ssh dune@192.168.1.100 "echo 1 | sudo tee /proc/sys/vm/overcommit_memory"'},
])+'</div><div class="grid-3 mt-2" style="gap:10px">'+
self._sec('⚙ Tools & Diagnostics',[
{i:'⚙',k:'N',l:'Network Repair',d:'Fix VM/Host network',p:self._getNetRepair()},
{i:'⊙',k:'W',l:'Check Network',d:'IP, routes, ping',p:self._getNetCheck()},
{i:'◇',k:'K',l:'Kubectl Status',d:'All pod statuses',p:'ssh dune@192.168.1.100 "sudo kubectl get pods -A"'},
{i:'⏻',k:'Z',l:'Restart Dropbear',d:'SSH on VM restart',p:'ssh dune@192.168.1.100 "sudo systemctl restart dropbear"'},
{i:'⊞',k:'Y',l:'Check Disk',d:'VM disk usage',p:'ssh dune@192.168.1.100 "df -h"'},
{i:'⊡',k:'J',l:'Check Memory',d:'VM free -m',p:'ssh dune@192.168.1.100 "free -m"'},
{i:'⚙',k:'C',l:'Rotate SSH Key',d:'New ed25519 key',p:self._getRotateKey()},
{i:'⊕',k:'O',l:'Health Check',d:'Pods + RAM + disk',p:'ssh dune@192.168.1.100 "sudo kubectl get pods -A && free -m && df -h /"'},
])+'</div>'+
'<div id="cmdToast" class="card p-2 mt-2" style="display:none;background:var(--accent);color:#000"><span id="cmdToastMsg"></span></div>'},

_sec(title,btns){var self=this;return'<div class="card"><div class="card-header"><span>'+title+'</span><span class="text-xs text-muted ml-2">('+btns.length+')</span></div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">'+btns.map(function(b){return self._btn(b)}).join('')+'</div></div>'},

_btn(b){var self=this;var safe=b.u?'data-url="'+self._escHtml(b.u)+'" onclick="CommandsTab._openUrl(this)"':'data-cmd="'+self._escHtml(b.p||'')+'" onclick="CommandsTab._copyCmd(this)"';return'<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--bg-secondary);border-radius:8px;cursor:pointer;min-width:160px;flex:1" '+safe+' onmouseenter="this.style.background=\'var(--bg-primary)\'" onmouseleave="this.style.background=\'var(--bg-secondary)\'" title="'+(b.u?'Open: '+b.u:'Click to copy command')+'"><span style="font-size:18px">'+b.i+'</span><div><div class="text-sm font-medium">'+b.l+'</div><div class="text-xs text-muted">'+b.d+'</div></div><kbd style="margin-left:auto;background:var(--accent);color:#000;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:bold">'+b.k+'</kbd></div>'},

_copyCmd(el){var cmd=el.getAttribute('data-cmd');if(cmd){try{navigator.clipboard.writeText(cmd);this._toast('☰ Copied! Paste in PowerShell')}catch(e){this._toast('Copy failed:\n'+cmd)}}},
_openUrl(el){var url=el.getAttribute('data-url');if(url)window.open(url,'_blank')},
_escHtml:function(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')},

_esc:function(s){return(s||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\')},

async _copyPS(cmd){try{await navigator.clipboard.writeText(cmd);this._toast('☰ Copied! Paste in PowerShell')}catch(e){this._toast('Copy failed:\n'+cmd)}},

_toast:function(msg){var el=document.getElementById('cmdToast');var me=document.getElementById('cmdToastMsg');el.style.display='block';me.textContent=msg;setTimeout(function(){el.style.display='none'},4000)},

// ═══════ PowerShell command generators ═══════

_getStartAll:function(){return"$bg=Get-ChildItem C:\\,D:\\,E:\\ -Filter battlegroup.ps1 -Recurse -Depth 5 -EA 0|Select -First 1\nif($bg){cd(Split-Path(Split-Path $bg.FullName));&\".\\battlegroup-management\\battlegroup.ps1\" start}else{Write-Host 'BG not found on C:,D:,E:'}"},
_getBgStart:function(){return"$bg=Get-ChildItem C:\\,D:\\,E:\\ -Filter battlegroup.ps1 -Recurse -Depth 5 -EA 0|Select -First 1\nif($bg){cd(Split-Path(Split-Path $bg.FullName));&\".\\battlegroup-management\\battlegroup.ps1\" start}"},
_getBgStop:function(){return"$bg=Get-ChildItem C:\\,D:\\,E:\\ -Filter battlegroup.ps1 -Recurse -Depth 5 -EA 0|Select -First 1\nif($bg){cd(Split-Path(Split-Path $bg.FullName));&\".\\battlegroup-management\\battlegroup.ps1\" stop}"},
_getBgRestart:function(){return"$bg=Get-ChildItem C:\\,D:\\,E:\\ -Filter battlegroup.ps1 -Recurse -Depth 5 -EA 0|Select -First 1\nif($bg){cd(Split-Path(Split-Path $bg.FullName));&\".\\battlegroup-management\\battlegroup.ps1\" restart}"},
_getEditDirector:function(){return"$f=Get-ChildItem C:\\,D:\\,E:\\ -Filter director.yaml -Recurse -Depth 5 -EA 0|Select -First 1\nif($f){notepad $f.FullName}"},
_getApplyInis:function(){return"$bg=Get-ChildItem C:\\,D:\\,E:\\ -Filter battlegroup.ps1 -Recurse -Depth 5 -EA 0|Select -First 1\nif($bg){cd(Split-Path(Split-Path $bg.FullName));&\".\\battlegroup-management\\battlegroup.ps1\" apply-inis; &\".\\battlegroup-management\\battlegroup.ps1\" restart}"},
_getLogsExport:function(){return"$ns=(ssh dune@192.168.1.100 'sudo kubectl get pods -A --no-headers|grep sg-bgt|head -1' 2>$null).Split(' ')[0]\nif($ns){ssh dune@192.168.1.100 \"sudo kubectl logs -n $ns deployment/sg-bgt-worlddepl --tail=500\">logs_$(Get-Date -f yyyyMMdd_HHmmss).txt}"},
_getFixMaps:function(){return'ssh dune@192.168.1.100 "sudo kubectl exec -n $(sudo kubectl get pods -A --no-headers|grep db-dbdepl-sts|awk \'{print $1}\') $(sudo kubectl get pods -A --no-headers|grep db-dbdepl-sts|awk \'{print $2}\') -- psql -h localhost -p 15432 -U dune -d dune -c \"SELECT dune.clear_pinned_map_partitions()\""'},
_getBackupCmd:function(){return'ssh dune@192.168.1.100 "sudo kubectl exec -n $(sudo kubectl get pods -A --no-headers|grep db-dbdepl-sts|awk \'{print $1}\') $(sudo kubectl get pods -A --no-headers|grep db-dbdepl-sts|awk \'{print $2}\') -- pg_dump -h localhost -p 15432 -U dune -d dune -Fc -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump"'},
_getChangeIp:function(){return'$newIp="192.168.1.100"\nssh dune@192.168.1.100 "sudo sed -i \'s/IPADDR=.*/IPADDR=\'$newIp\'/\' /etc/sysconfig/network-scripts/ifcfg-eth0 && sudo systemctl restart network"'},
_getNetRepair:function(){return"# Network Repair — VM losing host visibility\nGet-VMSwitch|ft Name,SwitchType\nGet-VMNetworkAdapter -VMName dune-awakening|ft Name,SwitchName,IPAddresses\n# If needed: Stop-VM dune-awakening -Force; Remove-VMNetworkAdapter -VMName dune-awakening; Add-VMNetworkAdapter -VMName dune-awakening -SwitchName 'Default Switch'; Start-VM dune-awakening\nroute print 0.0.0.0\nTest-Connection 192.168.1.100 -Count 2"},
_getNetCheck:function(){return'ssh dune@192.168.1.100 "echo ===IP===&&ip a s eth0&&echo ===Routes===&&ip r&&echo ===DNS===&&cat /etc/resolv.conf&&echo ===Ping GW===&&ping -c2 $(ip r|grep default|awk \'{print $3}\')"'},
_getRotateKey:function(){return'ssh-keygen -t ed25519 -f "$env:USERPROFILE\\.ssh\\dune_key_new" -N \'""\'\nWrite-Host "New key ready. Copy to VM: type $env:USERPROFILE\\.ssh\\dune_key_new.pub | ssh dune@192.168.1.100 \'cat >> ~/.ssh/authorized_keys\'"'},

// ═══════════ EMBEDDED POWERSHELL ═══════════

_renderPS:function(ct){
ct.innerHTML='<div class="card mt-2"><div class="card-header card-header-actions"><span>⊡ Embedded PowerShell</span>'+
'<div style="display:flex;gap:4px"><button class="btn btn-sm btn-success" id="psConnect" onclick="CommandsTab._psConnect()">⏻ Connect</button>'+
'<button class="btn btn-sm" id="psClear" onclick="CommandsTab._psClear()">× Clear</button>'+
'<button class="btn btn-sm btn-danger" id="psDisconnect" onclick="CommandsTab._psDisconnect()" disabled>× Disconnect</button></div></div>'+
'<div class="card-body p-0"><div id="psInfo" class="text-xs text-muted p-2" style="border-bottom:1px solid var(--border)">'+
'Embedded PowerShell session — runs locally on this machine. Use for <code>kubectl</code>, <code>ssh dune@vm</code>, and other one-shot commands.<br>'+
'<strong>Requires PowerShell 7.x</strong> — <code>winget install Microsoft.PowerShell</code> if not installed.<br>'+
'<span id="psStatus" class="text-warning">△ Not connected</span></div>'+
'<div id="psOutput" style="background:#0c0c0c;color:#ccc;font-family:Consolas,monospace;font-size:13px;padding:12px;min-height:300px;max-height:500px;overflow:auto;white-space:pre-wrap" '+
'onclick="document.getElementById(\'psInput\').focus()"><span style="color:#888">PowerShell 7.x required. Click ⏻ Connect.</span></div>'+
'<div style="display:flex;align-items:center;padding:4px 8px;background:#1a1a1a;border-top:1px solid var(--border)">'+
'<span style="color:#569cd6;font-family:Consolas;font-size:13px;margin-right:8px" id="psPrompt">PS&gt;</span>'+
'<input type="text" id="psInput" class="form-input" style="flex:1;background:transparent;border:none;color:#ccc;font-family:Consolas;font-size:13px" '+
'placeholder="Type command..." disabled onkeydown="if(event.key===\'Enter\')CommandsTab._psSend()"></div></div></div>'},

_psConnect:function(){
var self=this;var proto=window.location.protocol==='https:'?'wss:':'ws:';var wsUrl=proto+'//'+window.location.host+'/api/v1/ws/terminal';
document.getElementById('psOutput').innerHTML+='<span style="color:#888">Connecting...</span>\n';
document.getElementById('psStatus').innerHTML='<span style="color:#fdcb6e">◷ Connecting...</span>';
try{this._psWs=new WebSocket(wsUrl);
this._psWs.onopen=function(){self._psConnected=true;document.getElementById('psStatus').innerHTML='<span style="color:#00b894">● Ready — C:\\Users\\YOUR_USERNAME</span>';document.getElementById('psInput').disabled=false;document.getElementById('psConnect').disabled=true;document.getElementById('psDisconnect').disabled=false;document.getElementById('psOutput').innerHTML+='<span style="color:#0f0">Connected ✓</span>\n'};
this._psWs.onmessage=function(ev){try{var msg=JSON.parse(ev.data);if(msg.type==='output'){var c=msg.stream==='stderr'?'#f44':'#ccc';document.getElementById('psOutput').innerHTML+='<span style="color:'+c+'">'+self._escHtml(msg.data||'')+'</span>'}else if(msg.type==='done'){document.getElementById('psPrompt').textContent='PS '+(msg.cwd||'>')+'>'}else if(msg.type==='error'){document.getElementById('psOutput').innerHTML+='<span style="color:#f44">'+self._escHtml(msg.message)+'</span>\n'}}catch(e){};var out=document.getElementById('psOutput');out.scrollTop=out.scrollHeight};
this._psWs.onclose=function(){self._psConnected=false;document.getElementById('psStatus').innerHTML='<span style="color:#e17055">△ Disconnected</span>';document.getElementById('psInput').disabled=true;document.getElementById('psConnect').disabled=false;document.getElementById('psDisconnect').disabled=true;document.getElementById('psOutput').innerHTML+='<span style="color:#888">--- Disconnected ---</span>\n'};
this._psWs.onerror=function(){document.getElementById('psOutput').innerHTML+='<span style="color:#f44">△ WebSocket error — PowerShell 7 may not be installed. Run: winget install Microsoft.PowerShell</span>\n'};
}catch(e){document.getElementById('psOutput').innerHTML+='<span style="color:#f44">Failed: '+e.message+'</span>\n'}},

_psSend:function(){var inp=document.getElementById('psInput');var cmd=inp.value.trim();if(!cmd||!this._psWs||!this._psConnected)return;document.getElementById('psOutput').innerHTML+='<span style="color:#569cd6">PS&gt; '+this._escHtml(cmd)+'</span>\n';this._psWs.send(JSON.stringify({type:'exec',cmd:cmd}));inp.value=''},

_psClear:function(){document.getElementById('psOutput').innerHTML=''},

_psDisconnect:function(){if(this._psWs){this._psWs.close();this._psWs=null}},

_escHtml:function(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')},

destroy:function(){if(this._psWs){this._psWs.close();this._psWs=null}}
};
