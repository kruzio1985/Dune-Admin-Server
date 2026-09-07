// Dashboard tab
function formatUptime(s){if(!s||s<=0)return '0d 0h 0m';const d=Math.floor(s/86400);const h=Math.floor((s%86400)/3600);const m=Math.floor((s%3600)/60);return d+'d '+h+'h '+m+'m'}
const DashboardTab={_interval:null,
async render(){document.getElementById('content').innerHTML=`
<h2>◇ Dashboard</h2>
<div class="grid-2 mt-2">
<div class="card card-border-green"><div class="card-header card-header-actions"><span>◇ Server Health</span><span id="svHealthBadge" class="text-xs"></span></div><div class="card-body" id="svHealth">
<div class="flex gap-3"><div id="svVmStatus" style="flex:1"><span class="spinner-text">Loading...</span></div><div id="svTcpPorts" style="flex:1"><span class="spinner-text">Checking ports...</span></div></div>
<div class="mt-2" id="svPublicIp"><span class="spinner-text">Fetching IP...</span></div></div></div>

<div class="card card-border-blue"><div class="card-header card-header-actions"><span>◆ Battlegroup Info</span><span id="bgHealthBadge" class="text-xs"></span></div><div class="card-body" id="bgInfo">
<div class="grid-2"><div id="bgStatus" style="flex:1"><span class="spinner-text">Loading...</span></div><div id="bgResources" style="flex:1"><span class="spinner-text">Loading...</span></div></div>
<div class="mt-2"><a href="#" onclick="navigateTo('gameplay')" class="btn btn-sm btn-primary">◇ Gameplay Admin</a></div></div></div></div>

<div class="grid-2 mt-2">
<div class="card card-border-purple"><div class="card-header">⊙ Web Interfaces</div><div class="card-body" id="webIfaces">
<span class="spinner-text">Detecting VM IP...</span></div></div>

<div class="card card-border-orange"><div class="card-header">◇ VM Info</div><div class="card-body" id="vmInfoDetail">
<span class="spinner-text">Loading VM info...</span></div></div></div>

<div class="card mt-2"><div class="card-header card-header-actions"><span>⏻ Quick Actions</span><span id="actionStatus" class="text-xs"></span></div><div class="card-body">
<div class="flex gap-2 flex-wrap">
<button class="btn btn-primary" onclick="DashboardTab.startVM()">◇ Start VM</button>
<button class="btn btn-success" onclick="DashboardTab.startBG()">▶ Start Battlegroup</button>
<button class="btn btn-danger" onclick="DashboardTab.stopBG()">⏹ Stop Battlegroup <span class="text-xs" style="opacity:0.5">(type: STOP)</span></button>
<button class="btn btn-warning" onclick="DashboardTab.restartBG()">↻ Restart Battlegroup <span class="text-xs" style="opacity:0.5">(type: RESTART)</span></button>
<button class="btn btn-sm" style="background:#555;color:#fff" onclick="DashboardTab.openConsole()">⊡ BG Console</button></div>
<div id="consoleOutput" class="mt-2" style="display:none;background:#0a0a0a;border:1px solid var(--border);border-radius:6px;padding:8px 12px;max-height:250px;overflow:auto;font-family:Consolas,monospace;font-size:11px;color:#0f0;white-space:pre-wrap"></div></div></div>

<div class="card mt-2"><div class="card-header">⊞ Pods</div><div class="card-body">
<table class="data-table" id="podsTable"><thead><tr><th>Namespace</th><th>Name</th><th>Ready</th><th>Status</th><th>Restarts</th><th>Age</th></tr></thead>
<tbody id="podsBody"><tr><td colspan="6" class="text-muted">Loading...</td></tr></tbody></table></div></div>
`;await this.refresh();this._interval=setInterval(()=>{if(currentTabName==='dashboard')this.refresh()},10000)},

async refresh(){try{const d=await api.dashboard.get();this._renderHealth(d);this._renderBG(d);this._renderVM(d);this._renderPods(d);this._renderWebIfaces(d)}catch(e){console.error('Dashboard:',e)}},

_renderHealth(d){const vm=d.vm||{};const bg=d.battlegroup||{};
const vmRunning=vm.status==='running'||vm.status==='Running';
const bgRunning=bg.status&&bg.status!=='down'&&bg.status!=='stopped';
let vmHtml='<div style="font-size:13px"><strong>VM:</strong> <span class="badge badge-'+(vmRunning?'success':'danger')+'">'+(vm.status||'Offline')+'</span> <span class="text-xs text-muted ml-1">Uptime: '+formatUptime(vm.uptime_seconds||0)+'</span></div>';
vmHtml+='<div style="font-size:13px;margin-top:4px"><strong>BG:</strong> <span class="badge badge-'+(bgRunning?'success':'danger')+'">'+(bgRunning?'Running':'Stopped')+'</span> <span class="text-xs text-muted ml-1">Uptime: '+formatUptime(bg.uptime_seconds||0)+'</span></div>';
document.getElementById('svVmStatus').innerHTML=vmHtml;

// Update topbar status
const dot=document.getElementById('statusDot');const st=document.getElementById('statusLine');
if(dot)dot.className='status-dot '+(vmRunning?'online':'offline');
if(st)st.innerHTML=bgRunning?'● SYSTEM ONLINE | BG '+((bg.healthy_servers||0)+'/'+(bg.server_count||0))+' | VM '+(Math.round(vm.cpu_percent||0))+'% | Up '+formatUptime(bg.uptime_seconds||0):'○ SYSTEM OFFLINE';

const ports=d.tcp_ports||[{port:8080,name:'Admin Panel'},{port:18888,name:'File Browser'},{port:32218,name:'Director'},{port:15432,name:'PostgreSQL'},{port:15672,name:'RabbitMQ'},{port:22,name:'SSH'}];
const tcp=ports.map(p=>{const open=p.open!==undefined?p.open:vmRunning;return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0"><span>Port ${p.port}</span><span style="color:${open?'var(--green)':'var(--red)'};font-weight:bold">${open?'● Open':'● Closed'}</span><span class="text-muted text-xs">${p.name}</span></div>`}).join('');
document.getElementById('svTcpPorts').innerHTML='<div style="font-size:13px"><strong>TCP Ports</strong></div>'+tcp;

const pip=d.public_ip;const ip=typeof pip==='object'&&pip?pip.ip:((typeof pip==='string'?pip:vm.ip_address||'N/A'));const isp=typeof pip==='object'&&pip?pip.isp||'':'';
document.getElementById('svPublicIp').innerHTML=`<div style="font-size:12px"><strong>Public IP:</strong> ${ip||'N/A'}${isp?' <span class="text-muted">('+isp+')</span>':''}</div>`;

const hb=document.getElementById('svHealthBadge');hb.innerHTML=vmRunning?'<span class="badge badge-success text-xs">● Online</span>':'<span class="badge badge-danger text-xs">○ Offline</span>';},

_renderBG(d){const bg=d.battlegroup||{};const bgRunning=bg.status&&bg.status!=='down'&&bg.status!=='stopped';
document.getElementById('bgStatus').innerHTML=`<div style="font-size:13px"><strong>Status:</strong> <span class="badge badge-${bgRunning?'success':'danger'}">${bgRunning?'Running':'Stopped'}</span></div><div style="font-size:12px;margin-top:4px"><strong>Uptime:</strong> ${formatUptime(bg.uptime_seconds||0)}</div>`;
const cpuPct=Math.round((d.vm||{}).cpu_percent||0);const ramUsed=((d.vm||{}).memory_used_gb||0).toFixed(1);const ramTotal=(d.vm||{}).memory_total_gb||'?';
document.getElementById('bgResources').innerHTML=`<div style="font-size:12px"><strong>CPU:</strong> <div class="progress-bar mt-1 mb-1" style="max-width:200px"><div class="progress-fill-${cpuPct>80?'red':cpuPct>50?'blue':'green'}" style="width:${Math.min(100,cpuPct)}%"></div></div>${cpuPct}%</div><div style="font-size:12px;margin-top:4px"><strong>RAM:</strong> ${ramUsed}/${ramTotal} GB</div><div style="font-size:12px;margin-top:4px"><strong>Servers:</strong> ${bg.healthy_servers||0}/${bg.server_count||0} healthy</div>`;
const bhb=document.getElementById('bgHealthBadge');bhb.innerHTML=bgRunning?'<span class="badge badge-success text-xs">● Running</span>':'<span class="badge badge-danger text-xs">○ Stopped</span>'},

_renderVM(d){const vm=d.vm||{};const bg=d.battlegroup||{};
const cpuPct=Math.round(vm.cpu_percent||0);const ramUsed=(vm.memory_used_gb||0).toFixed(1);const ramTotal=vm.memory_total_gb||'?';const swapUsed=(vm.swap_used_gb||0).toFixed(1);const swapTotal=vm.swap_total_gb||0;
const cpuColor=cpuPct>80?'#e17055':cpuPct>50?'#fdcb6e':'#00b894';
document.getElementById('vmInfoDetail').innerHTML=
'<div style="font-size:12px"><strong>Name:</strong> '+(vm.name||'dune-awakening')+'</div>'+
'<div style="font-size:12px;margin-top:3px"><strong>IP:</strong> '+(vm.ip_address||'192.168.1.100')+'</div>'+
'<div style="font-size:12px;margin-top:3px"><strong>VM Uptime:</strong> '+formatUptime(vm.uptime_seconds||0)+'</div>'+
'<div style="font-size:12px;margin-top:3px"><strong>BG Uptime:</strong> '+formatUptime(bg.uptime_seconds||0)+'</div>'+
'<div style="font-size:12px;margin-top:6px"><strong>CPU:</strong> <div class="progress-bar mt-1" style="max-width:200px"><div class="progress-fill" style="width:'+Math.min(100,cpuPct)+'%;background:'+cpuColor+'"></div></div>'+cpuPct+'%</div>'+
'<div style="font-size:12px;margin-top:4px"><strong>RAM:</strong> '+ramUsed+' / '+ramTotal+' GB</div>'+
'<div style="font-size:12px;margin-top:4px"><strong>Swap:</strong> '+swapUsed+' / '+swapTotal.toFixed(1)+' GB</div>'},

_renderWebIfaces(d){const vm=d.vm||{};const vmIp=vm.ip_address||'192.168.1.100';const wb=document.getElementById('webIfaces');
if(!wb)return;
wb.innerHTML=
'<a href="http://'+vmIp+':18888" target="_blank" class="btn btn-sm" style="display:block;margin-bottom:4px">□ File Browser ('+vmIp+':18888) →</a>'+
'<a href="http://'+vmIp+':32218" target="_blank" class="btn btn-sm" style="display:block;margin-top:8px">⊙ Battlegroup Director ('+vmIp+':32218) →</a>';},

_renderPods(d){const pods=(d.battlegroup||{}).pods||[];const tbody=document.getElementById('podsBody');
tbody.innerHTML=pods.length?pods.map(p=>`<tr><td style="font-size:11px">${p.namespace}</td><td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</td><td>${p.ready}</td><td><span class="badge badge-${p.status==='Running'?'success':'warning'}">${p.status}</span></td><td>${p.restarts}</td><td>${p.age}</td></tr>`).join(''):'<tr><td colspan="6" class="text-muted">No pods</td></tr>'},

async startVM(){const el=document.getElementById('actionStatus');el.innerHTML='<span>◷ Starting VM...</span>';try{const r=await api.post('/battlegroup/start-vm');el.innerHTML='<span class="text-success">✓ '+(r.ok||'VM starting')+'</span>';showToast('VM starting...','success');setTimeout(()=>this.refresh(),5000)}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>';showToast(e.message,'error')}},
async startBG(){const el=document.getElementById('actionStatus');el.innerHTML='<span>◷ Starting BG...</span>';try{await api.battlegroup.start();el.innerHTML='<span class="text-success">✓ BG starting</span>';showToast('BG starting...','success');setTimeout(()=>this.refresh(),3000)}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>';showToast(e.message,'error')}},
async stopBG(){if(!safeConfirm('STOP the Battlegroup?\n\nAll players will be disconnected!', 'STOP'))return;const el=document.getElementById('actionStatus');el.innerHTML='<span>◷ Stopping BG...</span>';
const st=document.getElementById('statusLine');if(st)st.innerHTML='◷ STOPPING BATTLEGROUP...';
try{await api.battlegroup.stop();el.innerHTML='<span class="text-success">✓ BG stopped</span>';showToast('BG stopping...','success');setTimeout(()=>this.refresh(),3000)}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>';showToast(e.message,'error')}},
async restartBG(){if(!safeConfirm('RESTART the Battlegroup?\n\nAll players will be disconnected!', 'RESTART'))return;const el=document.getElementById('actionStatus');el.innerHTML='<span>◷ Restarting BG...</span>';try{await api.battlegroup.restart();el.innerHTML='<span class="text-success">✓ BG restarting</span>';showToast('BG restarting...','success');setTimeout(()=>this.refresh(),5000)}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>';showToast(e.message,'error')}},
async openConsole(){const el=document.getElementById('consoleOutput');el.style.display='block';el.textContent='=== Battlegroup Console Output ===\nConnecting to PowerShell console...\n';try{const r=await api.post('/battlegroup/open-console');el.textContent+=(r.output||r.ok||'Console opened')+'\n';showToast('Console opened','success')}catch(e){el.textContent+='Error: '+e.message;showToast(e.message,'error')}},

destroy(){if(this._interval){clearInterval(this._interval);this._interval=null}}};