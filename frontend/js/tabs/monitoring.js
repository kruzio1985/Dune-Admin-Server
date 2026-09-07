// Monitoring tab — pods, director, file browser
const MonitoringTab={_data:null,
async render(){document.getElementById('content').innerHTML=`
<h2>⊙ Monitoring</h2>
<div class="grid-2 mt-2">
<div class="card card-border-purple"><div class="card-header">⊙ Director</div>
<div class="card-body text-sm">
    <p class="text-muted mb-2">Live battlegroup stats, player counts, character transfers.</p>
    <span id="monDirectorLink"><span class="spinner-text">Detecting...</span></span>
</div></div>
<div class="card card-border-green"><div class="card-header">□ File Browser</div>
<div class="card-body text-sm">
    <p class="text-muted mb-2">Config files, logs, DB dumps, UserSettings.</p>
    <span id="monFileBrowserLink"><span class="spinner-text">Detecting...</span></span>
</div></div>
</div>
<div class="card mt-2"><div class="card-header card-header-actions">
    <span>⊞ Pod Resources</span>
    <button class="btn btn-sm" onclick="MonitoringTab.loadPods()">↻</button>
</div><div class="card-body" id="podResources"><div class="spinner"></div><p class="text-sm">Loading pods...</p></div></div>

<div class="card mt-2"><div class="card-header">◇ VM Resources</div>
<div class="card-body" id="vmResources"><div class="spinner"></div><p class="text-sm">Loading VM stats...</p></div></div>
`;this.loadPods();this.loadVM();this._loadLinks()},

_loadLinks(){api.dashboard.get().then(d=>{const ip=(d.vm||{}).ip_address||'192.168.1.100';
document.getElementById('monDirectorLink').innerHTML='<a href="http://'+ip+':32218" target="_blank" class="btn btn-primary btn-sm">→ Open Director ('+ip+':32218) →</a>';
document.getElementById('monFileBrowserLink').innerHTML='<a href="http://'+ip+':18888" target="_blank" class="btn btn-primary btn-sm">→ Open File Browser ('+ip+':18888) →</a>';
}).catch(()=>{const ip='192.168.1.100';
document.getElementById('monDirectorLink').innerHTML='<a href="http://'+ip+':32218" target="_blank" class="btn btn-primary btn-sm">→ Open Director →</a>';
document.getElementById('monFileBrowserLink').innerHTML='<a href="http://'+ip+':18888" target="_blank" class="btn btn-primary btn-sm">→ Open File Browser →</a>';
})},

async loadPods(){try{const d=await api.battlegroup.status();this._data=d;
const el=document.getElementById('podResources');
if(d.pods&&d.pods.length){
    const running=d.pods.filter(p=>p.status==='Running').length;
    const total=d.pods.length;
el.innerHTML=`<div class="flex gap-2 mb-2 items-center"><span class="badge badge-success">${running}/${total} Running</span><span class="text-xs text-muted">Status: <strong>${d.status||'?'}</strong> · Healthy: ${d.healthy_servers}/${d.server_count}</span></div>
<table class="data-table"><thead><tr><th>NS</th><th>Name</th><th>Ready</th><th>Status</th><th>Restarts</th><th>Age</th></tr></thead><tbody>
${d.pods.map(p=>'<tr><td style="font-size:11px">'+p.namespace+'</td><td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name.substring(0,50)+'</td><td>'+p.ready+'</td><td><span class="badge badge-'+(p.status==='Running'?'success':'warning')+'">'+p.status+'</span></td><td>'+p.restarts+'</td><td>'+p.age+'</td></tr>').join('')}
</tbody></table>`}else{el.innerHTML='<p class="text-muted text-sm">No pods (VM not accessible)</p>'}}catch(e){document.getElementById('podResources').innerHTML='<p class="text-danger text-sm">Error: '+e.message+'</p>'}},

async loadVM(){try{const r=await api.dashboard.status();const d=r||{};
document.getElementById('vmResources').innerHTML=`
<div class="flex gap-3">
    <div style="padding:8px 12px;background:var(--bg-primary);border-radius:6px;flex:1"><div class="text-xs text-muted">CPU</div><div style="font-size:18px;font-weight:bold">${d.cpu||'?'}%</div></div>
    <div style="padding:8px 12px;background:var(--bg-primary);border-radius:6px;flex:1"><div class="text-xs text-muted">RAM</div><div style="font-size:18px;font-weight:bold">${d.ram||'?'}</div></div>
    <div style="padding:8px 12px;background:var(--bg-primary);border-radius:6px;flex:1"><div class="text-xs text-muted">Uptime</div><div style="font-size:18px;font-weight:bold">${d.uptime||'?'}</div></div>
    <div style="padding:8px 12px;background:var(--bg-primary);border-radius:6px;flex:1"><div class="text-xs text-muted">VM Status</div><div style="font-size:18px;font-weight:bold;color:var(--green)">${d.vm_status||'?'}</div></div>
</div>`}catch(e){document.getElementById('vmResources').innerHTML='<p class="text-muted text-sm">VM status unavailable</p>'}},

destroy(){this._data=null}};
