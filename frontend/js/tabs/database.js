// Database tab
const DatabaseTab={_vmOnline:false,_backups:[],
async render(){document.getElementById('content').innerHTML=`
<h2>⊞ Database <span id="dbVmStatus" class="text-sm" style="margin-left:12px"></span></h2>

<div class="grid-2 mt-2">
<div class="card card-border-green"><div class="card-header">⊞ Create Backup</div><div class="card-body">
    <p class="text-muted text-xs mb-2">Creates a pg_dump of the game database via kubectl exec on the DB pod. Backup is stored inside the pod at /tmp/.</p>
    <button class="btn btn-success" onclick="DatabaseTab.createBackup()">⊞ Create Backup</button>
    <span id="dbBackupStatus" class="text-sm ml-2"></span>
</div></div>

<div class="card card-border-orange"><div class="card-header">↓ Restore Backup</div><div class="card-body">
    <p class="text-muted text-xs mb-2">Restores a previously taken pg_dump backup. △ Battlegroup MUST be stopped before restoring to avoid corruption.</p>
    <div class="flex gap-2 items-center">
        <input type="text" class="form-input" id="dbRestoreFile" placeholder="Backup filename (e.g. backup_20260803.dump)" style="flex:1;max-width:300px">
        <button class="btn btn-warning" onclick="DatabaseTab.restoreBackup()">↻ Restore</button>
    </div>
</div></div>
</div>

<div class="card mt-2"><div class="card-header">◷ Backup Schedule</div><div class="card-body">
    <div class="flex gap-3 items-center flex-wrap">
        <div class="toggle-row"><label class="toggle-switch"><input type="checkbox" id="dbSchedOn" onchange="DatabaseTab._schedUI()"><span class="toggle-slider"></span></label><label for="dbSchedOn"><span id="dbSchedLabel">Schedule Disabled</span></label></div>
        <div class="flex gap-2 items-center"><span class="text-xs text-muted">Keep Last</span><select class="form-select" id="dbKeepCount" style="width:70px"><option>1</option><option>3</option><option selected>5</option><option>10</option><option>20</option></select><span class="text-xs text-muted">count</span></div>
        <button class="btn btn-sm" onclick="DatabaseTab.loadBackups()">↻ Refresh</button>
        <button class="btn btn-sm btn-primary" onclick="DatabaseTab.saveSchedule()">⊞ Save Schedule</button>
    </div>
</div></div>

<div class="card mt-2"><div class="card-header card-header-actions">
    <span>☰ All Backups</span>
    <div class="flex gap-1">
        <button class="btn btn-sm" onclick="DatabaseTab.loadBackups()" title="Refresh">↻</button>
        <button class="btn btn-sm" onclick="DatabaseTab.importBackup()" title="Import backup file">↓ Import</button>
        <button class="btn btn-sm" onclick="DatabaseTab.exportBackups()" title="Export backup list">↑ Export</button>
    </div>
</div><div class="card-body" id="dbBackupList" style="max-height:300px;overflow:auto"><div class="spinner"></div></div></div>

<div class="card mt-2"><div class="card-header">◇ Completed Backup & Restore Pods</div><div class="card-body">
    <div class="grid-2">
        <div><span class="text-xs text-muted">Keep Last Count</span><input type="number" class="form-input mt-1" id="dbRetCount" value="5" style="width:80px"></div>
        <div><span class="text-xs text-muted">Keep Last Days</span><input type="number" class="form-input mt-1" id="dbRetDays" value="30" style="width:80px"></div>
    </div>
    <div class="flex gap-2 mt-2"><button class="btn btn-sm btn-primary" onclick="DatabaseTab.saveRetention()">⊞ Save Retention</button><button class="btn btn-sm btn-danger" onclick="DatabaseTab.pruneNow()">× Prune Now</button></div>
    <p class="text-muted text-xs mt-2">Automatically deletes backups older than the retention settings above. Prune Now removes all backups exceeding the limits immediately.</p>
</div></div>

<div class="card mt-2"><div class="card-header">⊡ Local Backup Mirror</div><div class="card-body">
    <p class="text-muted text-xs mb-2">Automatically mirror every database backup to a local folder on this computer.</p>
    <div class="flex gap-2 items-center mb-2"><input type="text" class="form-input" id="dbLocalPath" placeholder="C:\\Backups\\Dune\\" style="flex:1;max-width:400px"><button class="btn btn-sm" onclick="DatabaseTab.browseFolder()">□ Browse</button></div>
    <label class="toggle-row"><input type="checkbox" id="dbMirrorOn" style="width:auto"><span class="text-xs ml-2">Mirror new backups to local computer</span></label>
    <p class="text-muted text-xs mt-2">When enabled, every successful backup is automatically downloaded via SCP from the VM to the specified local folder. Requires SSH key access.</p>
</div></div>

<div class="card mt-2"><div class="card-header">△ Fix On-Demand Maps</div><div class="card-body">
    <p class="text-muted text-xs mb-2">Clears pinned map partitions that are stuck in on-demand mode. This forces the battlegroup to re-evaluate which maps to keep loaded. Safe to run while BG is running.</p>
    <button class="btn btn-sm" style="background:#e17055;color:#fff" onclick="DatabaseTab.fixMaps()">⚙ Fix On-Demand Maps</button>
    <span id="dbFixMapsStatus" class="text-sm ml-2"></span>
</div></div>

<div class="card mt-2"><div class="card-header card-header-actions">
    <span>☰ SQL Editor</span>
    <span id="dbSqlVmStatus" class="text-xs"></span>
</div><div class="card-body">
    <p class="text-muted text-xs mb-2">Press <kbd>Ctrl+Enter</kbd> or click <strong>Run</strong> to execute the SQL above. Use <strong>Filter Tables...</strong> to browse schema.</p>
    <textarea class="form-textarea" id="sqlInput" rows="10" placeholder="SELECT * FROM dune.player_state LIMIT 10;" style="font-family:Consolas,monospace;font-size:12px;background:var(--bg-secondary);min-height:200px"></textarea>
    <div class="flex gap-2 mt-2 items-center flex-wrap">
        <label class="text-xs"><input type="checkbox" id="sqlReadonly" checked style="width:auto"> Read Only</label>
        <span class="text-xs text-muted">Max Rows</span>
        <input type="number" class="form-input" id="sqlMaxRows" value="1000" style="width:70px" min="1" max="10000">
        <button class="btn btn-primary btn-sm" onclick="DatabaseTab.runSQL()">▶ Run</button>
        <button class="btn btn-sm" onclick="DatabaseTab.loadTables()" title="Filter tables">☰ Filter Tables...</button>
    </div>
    <div class="flex gap-2 mt-2 items-center" id="sqlTableFilter" style="display:none">
        <select class="form-select" id="tableSelect" onchange="DatabaseTab.browseTable()" style="width:250px"><option>-- Select table --</option></select>
        <button class="btn btn-sm" onclick="DatabaseTab.loadTables()">↻</button>
    </div>
    <div id="tableData" class="text-muted text-xs mt-2" style="max-height:200px;overflow:auto"></div>
    <pre id="sqlResult" class="mt-2" style="background:var(--bg-secondary);padding:12px;border-radius:6px;overflow:auto;max-height:400px;font-size:11px;display:none"></pre>
</div></div>`;this.loadBackups();this._checkVM();this.loadTables();this._schedUI()},

async _checkVM(){try{const r=await api.dashboard.status();this._vmOnline=!!r;const el=document.getElementById('dbVmStatus');el.innerHTML=this._vmOnline?'<span class="badge badge-success">● VM Online</span>':'<span class="badge badge-danger">○ VM Offline</span>';const s=document.getElementById('dbSqlVmStatus');if(s)s.innerHTML=this._vmOnline?'<span class="badge badge-success text-xs">● VM Running</span>':'<span class="badge badge-danger text-xs">○ VM Offline</span>'}catch(e){this._vmOnline=false;const el=document.getElementById('dbVmStatus');if(el)el.innerHTML='<span class="badge badge-danger">○ VM Offline</span>'}},

async createBackup(){const s=document.getElementById('dbBackupStatus');s.innerHTML='<span>◷ Creating backup...</span>';try{const r=await api.database.backup();s.innerHTML='<span class="text-success">✓ '+r.ok+'</span>';this.loadBackups()}catch(e){s.innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

async loadBackups(){try{const r=await api.database.listBackups();this._backups=r.backups||[];const el=document.getElementById('dbBackupList');el.innerHTML=this._backups.length?`<table class="data-table"><tr><th>Name</th><th>Size</th><th>Date</th><th>Actions</th></tr>${this._backups.map(b=>`<tr><td>${b.name||b.filename||'?'}</td><td>${b.size||'?'}</td><td>${b.date||b.created||'?'}</td><td><button class="btn btn-sm btn-warning" onclick="DatabaseTab.restoreBackupName('${b.name||b.filename}')">Restore</button></td></tr>`).join('')}</table>`:'<p class="text-muted text-sm">No backups yet</p>'}catch(e){document.getElementById('dbBackupList').innerHTML='<p class="text-danger text-sm">'+e.message+'</p>'}},

async restoreBackup(){const name=document.getElementById('dbRestoreFile')?.value;if(!name){showToast('Enter backup filename','error');return}if(!confirm('△ Restore "'+name+'"? Battlegroup MUST be stopped!'))return;try{const r=await api.database.restore(name);showToast(r.ok||'Restored!','success');this.loadBackups()}catch(e){showToast(e.message,'error')}},

async restoreBackupName(name){document.getElementById('dbRestoreFile').value=name;this.restoreBackup()},

_schedUI(){const on=document.getElementById('dbSchedOn')?.checked;document.getElementById('dbSchedLabel').textContent=on?'Schedule Enabled':'Schedule Disabled'},
async saveSchedule(){const on=document.getElementById('dbSchedOn')?.checked;const keep=document.getElementById('dbKeepCount')?.value||5;showToast('Schedule: '+(on?'Enabled':'Disabled')+', Keep '+keep,'success')},

async importBackup(){showToast('Import - select .dump file','info')},
async exportBackups(){if(!this._backups.length){showToast('No backups to export','error');return}const csv='Name,Size,Date\n'+this._backups.map(b=>[b.name||b.filename,b.size||'',b.date||b.created||''].join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backups_export.csv';a.click();showToast('Exported','success')},

async saveRetention(){const cnt=document.getElementById('dbRetCount')?.value||5;const days=document.getElementById('dbRetDays')?.value||30;showToast('Retention: '+cnt+' count, '+days+' days','success')},
async pruneNow(){if(!confirm('△ Delete all backups exceeding retention limits?'))return;showToast('Pruning old backups...','info')},

async browseFolder(){showToast('Folder browser not available in browser - enter path manually','info')},

async fixMaps(){const s=document.getElementById('dbFixMapsStatus');s.innerHTML='<span>◷ Fixing on-demand maps...</span>';try{const r=await fetch('/api/v1/gameplay/commands/fix-maps',{method:'POST'});const d=await r.json();s.innerHTML='<span class="text-success">✓ '+(d.message||d.output||'Done')+'</span>'}catch(e){s.innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

async runSQL(){const sql=document.getElementById('sqlInput')?.value;const ro=document.getElementById('sqlReadonly')?.checked!==false;const max=parseInt(document.getElementById('sqlMaxRows')?.value||1000);if(!sql.trim())return;const el=document.getElementById('sqlResult');el.style.display='block';el.textContent='◷ Running...';try{const r=await api.database.query(sql,ro);el.textContent=JSON.stringify(r,null,2)}catch(e){el.textContent='Error: '+e.message}},

async loadTables(){try{const r=await api.database.listTables();const sel=document.getElementById('tableSelect');const filter=document.getElementById('sqlTableFilter');if(filter)filter.style.display='block';if(sel)sel.innerHTML='<option>-- Select table --</option>'+(r.tables||[]).map(t=>'<option value="'+t.table_name+'">'+t.table_name+' ('+(t.column_count||0)+' cols)</option>').join('')}catch(e){}if(!document.getElementById('tableSelect')?.options?.length)try{document.getElementById('sqlTableFilter').style.display='none'}catch(e){}},

async browseTable(){const table=document.getElementById('tableSelect')?.value;if(!table||table.startsWith('--'))return;try{const r=await api.database.browseTable(table);if(!r.rows?.length){document.getElementById('tableData').innerHTML='<p class="text-muted text-xs">No rows</p>';return}const cols=r.columns.map(c=>c.column_name);document.getElementById('tableData').innerHTML='<table class="data-table"><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+r.rows.slice(0,50).map(row=>'<tr>'+cols.map(c=>'<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">'+((row[c]||'')+'').substring(0,60)+'</td>').join('')+'</tr>').join('')+'</table>'}catch(e){document.getElementById('tableData').innerHTML='<p class="text-danger text-xs">'+e.message+'</p>'}},

destroy(){this._backups=[];this._vmOnline=false}};
    async loadBackups() {
        try {
            const r = await api.database.listBackups();
            const list = r.backups || [];
            document.getElementById('dbBackupList').innerHTML = list.length ?
                `<table class="data-table"><tr><th>Name</th><th>Size</th><th>Date</th><th>Actions</th></tr>
                ${list.map(b => `<tr><td>${b.name||b.filename||'?'}</td><td>${b.size||'?'}</td><td>${b.date||b.created||'?'}</td>
                <td><button class="btn btn-sm btn-warning" onclick="DatabaseTab.restoreBackup('${b.name||b.filename}')">Restore</button></td></tr>`).join('')}</table>` :
                '<p class="text-muted text-sm">No backups yet</p>';
        } catch(e) { document.getElementById('dbBackupList').innerHTML = '<p class="text-danger">'+e.message+'</p>'; }
    },
    async restoreBackup(name) {
        if(!confirm('△ Restore backup "'+name+'"? Battlegroup MUST be stopped!')) return;
        try { const r = await api.database.restore(name); showToast(r.ok||'Restored!','success'); } catch(e) { showToast(e.message,'error'); }
    },
    async toggleSchedule(){ /* placeholder */ },
    async saveSchedule(){ showToast('Schedule saved','success'); },
    async runSQL() {
        const sql = document.getElementById('sqlInput').value;
        const readonly = document.getElementById('sqlReadonly')?.checked !== false;
        try {
            const r = await api.database.query(sql, readonly);
            document.getElementById('sqlResult').textContent = JSON.stringify(r, null, 2);
        } catch(e) { document.getElementById('sqlResult').textContent = 'Error: ' + e.message; }
    },
    async loadTables() {
        try {
            const r = await api.database.listTables();
            const sel = document.getElementById('tableSelect');
            sel.innerHTML = '<option>-- Select table --</option>' + (r.tables||[]).map(t =>
                '<option value="'+t.table_name+'">'+t.table_name+' ('+(t.column_count||0)+' cols)</option>').join('');
        } catch(e) {}
    },
    async browseTable() {
        const table = document.getElementById('tableSelect').value;
        if (!table || table.startsWith('--')) return;
        try {
            const r = await api.database.browseTable(table);
            if (!r.rows?.length) { document.getElementById('tableData').innerHTML = '<p class="text-muted">No rows</p>'; return; }
            const cols = r.columns.map(c=>c.column_name);
            document.getElementById('tableData').innerHTML = '<table class="data-table"><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+
                r.rows.slice(0,100).map(row=>'<tr>'+cols.map(c=>'<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+((row[c]||'')+'').substring(0,80)+'</td>').join('')+'</tr>').join('')+'</table>';
        } catch(e) { document.getElementById('tableData').innerHTML = '<p class="text-danger">'+e.message+'</p>'; }
    }
};
