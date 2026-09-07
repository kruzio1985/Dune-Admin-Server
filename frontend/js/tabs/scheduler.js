// Scheduler — configurable automated tasks: restart, backup, update
const SchedulerTab={_cfg:{enabled:false,daily_restart:'04:00',restart_warning:30,timezone:'Europe/Warsaw',auto_update:false,auto_backup:false,backup_time:'03:00',backup_keep:5},
async render(){document.getElementById('content').innerHTML=
'<h2>◷ Scheduler</h2>'+
'<div class="card mt-2 card-border-blue"><div class="card-header">⚙ Automated Tasks</div><div class="card-body">'+
'<div class="setting-row"><div><div class="setting-label">Scheduler Enabled</div><div class="setting-desc">Master switch for all automated tasks</div></div><input type="checkbox" id="schOn" '+(this._cfg.enabled?'checked':'')+' style="width:auto" onchange="SchedulerTab._upd()"></div>'+
'<hr class="my-2" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">↻ Daily Restart</h4>'+
'<div class="setting-row"><div><div class="setting-label">Restart Time</div><div class="setting-desc">24h format, server local time</div></div><input type="time" class="form-input" id="schRestart" value="'+this._cfg.daily_restart+'" style="width:140px" onchange="SchedulerTab._upd()"></div>'+
'<div class="setting-row"><div><div class="setting-label">Warning Lead (minutes)</div><div class="setting-desc">Broadcast warning before restart</div></div><input type="number" class="form-input" id="schWarn" value="'+this._cfg.restart_warning+'" style="width:80px" min="1" max="120" onchange="SchedulerTab._upd()"></div>'+
'<hr class="my-2" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">⊞ Auto Backup</h4>'+
'<div class="setting-row"><div><div class="setting-label">Auto Backup</div><div class="setting-desc">Daily database backup</div></div><input type="checkbox" id="schBackup" '+(this._cfg.auto_backup?'checked':'')+' style="width:auto" onchange="SchedulerTab._upd()"></div>'+
'<div class="setting-row"><div><div class="setting-label">Backup Time</div></div><input type="time" class="form-input" id="schBackupTime" value="'+this._cfg.backup_time+'" style="width:140px" onchange="SchedulerTab._upd()"></div>'+
'<div class="setting-row"><div><div class="setting-label">Keep Last</div><div class="setting-desc">Number of backups to retain</div></div><select class="form-input" id="schKeep" style="width:100px" onchange="SchedulerTab._upd()"><option '+(this._cfg.backup_keep==3?'selected':'')+'>3</option><option '+(this._cfg.backup_keep==5?'selected':'')+'>5</option><option '+(this._cfg.backup_keep==10?'selected':'')+'>10</option><option '+(this._cfg.backup_keep==20?'selected':'')+'>20</option></select></div>'+
'<hr class="my-2" style="border-color:var(--border)">'+
'<h4 class="text-sm mb-2">⬇️ Auto Update</h4>'+
'<div class="setting-row"><div><div class="setting-label">Auto Update</div><div class="setting-desc">Check GitHub for updates daily</div></div><input type="checkbox" id="schUpdate" '+(this._cfg.auto_update?'checked':'')+' style="width:auto" onchange="SchedulerTab._upd()"></div>'+
'<div class="setting-row"><div><div class="setting-label">Timezone</div></div><input type="text" class="form-input" id="schTz" value="'+this._cfg.timezone+'" style="width:200px" onchange="SchedulerTab._upd()"></div>'+
'<button class="btn btn-primary mt-3" onclick="SchedulerTab._save()">⊞ Save Schedule</button><span id="schMsg" class="ml-2 text-sm"></span>'+
'</div></div>'+
'<div class="card mt-2"><div class="card-header">☰ Task History</div><div class="card-body text-muted text-sm" id="schHistory">Task history will appear here when scheduler is active.</div></div>'},

_upd(){this._cfg.enabled=document.getElementById('schOn')?.checked||false;this._cfg.daily_restart=document.getElementById('schRestart')?.value||'04:00';this._cfg.restart_warning=parseInt(document.getElementById('schWarn')?.value)||30;this._cfg.auto_backup=document.getElementById('schBackup')?.checked||false;this._cfg.backup_time=document.getElementById('schBackupTime')?.value||'03:00';this._cfg.backup_keep=parseInt(document.getElementById('schKeep')?.value)||5;this._cfg.auto_update=document.getElementById('schUpdate')?.checked||false;this._cfg.timezone=document.getElementById('schTz')?.value||'Europe/Warsaw'},

async _save(){this._upd();var el=document.getElementById('schMsg');el.innerHTML='<span class="text-warning">Saving...</span>';
try{await api.post('/scheduler/config',this._cfg);el.innerHTML='<span class="text-success">✓ Saved!</span>'}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},
destroy(){}};
