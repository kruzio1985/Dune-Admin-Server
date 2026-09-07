// Logs tab — colored log lines
const LogsTab={_logs:[],
async render(){document.getElementById('content').innerHTML=`
<h2>☰ Logs</h2>
<div class="card mt-2"><div class="card-header card-header-actions">
<span>☰ Log Viewer</span>
<div class="flex gap-2"><select class="form-select" id="logComponent" style="width:180px"><option value="">All Components</option><option value="game">Game Servers</option><option value="director">Director</option><option value="operator">Operator</option></select>
<button class="btn btn-sm btn-primary" onclick="LogsTab.refresh()">↻ Refresh</button>
<button class="btn btn-sm" onclick="LogsTab.exportLogs()">↑ Export</button></div>
</div><div class="card-body">
<div class="flex gap-3 mb-2 text-xs" id="logLegend">
<span><span style="color:#ff4444">⬤</span> Error</span>
<span><span style="color:#ffaa00">⬤</span> Warning</span>
<span><span style="color:#e040fb">⬤</span> Spice</span>
<span><span style="color:#00e676">⬤</span> Info</span>
<span><span style="color:#888">⬤</span> Default</span>
<span class="text-muted">|</span>
<span id="logLineCount" class="text-muted">0 lines</span>
</div>
<div id="logOutput" style="background:#0d1117;border:1px solid var(--border);border-radius:6px;padding:10px 14px;max-height:550px;overflow:auto;font-family:Consolas,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all">Click <strong>Refresh</strong> to load logs...</div>
</div></div>
<div class="card mt-2"><div class="card-header">🚨 Cheat Detection Events</div>
<div class="card-body" id="cheatEvents"><button class="btn btn-sm btn-warning" onclick="LogsTab.loadCheatEvents()">⊙ Load Cheat Events</button></div></div>
`},

_colorLine(line){const L=line.toLowerCase();
if(/error|fatal|critical|exception|panic|traceback/i.test(L))return'color:#ff4444';
if(/warn|warning/i.test(L))return'color:#ffaa00';
if(/spice/i.test(L))return'color:#e040fb';
if(/info|success|started|ready|healthy/i.test(L))return'color:#00e676';
return'color:#aaa'},

async refresh(){const comp=document.getElementById('logComponent')?.value||'';
try{const r=await api.logs.get(comp,500);this._logs=r.logs||[];
const el=document.getElementById('logOutput');
el.innerHTML=this._logs.length?this._logs.map(l=>`<span style="${this._colorLine(l.message||l)}">${(l.message||l).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`).join('\n'):'<span style="color:#888">No logs</span>';
document.getElementById('logLineCount').textContent=this._logs.length+' lines'}catch(e){showToast(e.message,'error')}},

async loadCheatEvents(){try{const r=await api.logs.cheatEvents();const events=r.cheat_events||[];
document.getElementById('cheatEvents').innerHTML=events.length?`<table class="data-table"><tr><th>Player</th><th>Type</th><th>Time</th></tr>${events.map(e=>`<tr><td>${e.character_name||e.fls_id||'?'}</td><td><span class="badge badge-danger">${e.cheat_type}</span></td><td>${e.event_time}</td></tr>`).join('')}</table>`:'<p class="text-muted text-sm">No cheat events detected</p>'}catch(e){document.getElementById('cheatEvents').innerHTML='<p class="text-danger text-sm">'+e.message+'</p>'}},

async exportLogs(){window.open('/api/v1/logs/export?format=text','_blank')},
destroy(){this._logs=[]}};
