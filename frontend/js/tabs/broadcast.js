/**
 * Broadcast Tab — Generic Broadcast / Server Alert / GM Whisper / Links
 */
const BroadcastTab={
_players:[],_playersLoaded:false,

async render(){document.getElementById('content').innerHTML=
'<h2>⊙ Broadcasts & Whispers</h2>'+
'<p class="text-muted text-sm">Server-wide announcements, shutdown countdowns, per-player whispers, and useful links.</p>'+
'<div class="tab-nav" id="bcTabs" style="margin-top:4px">'+
'<div class="tab-nav-item active" onclick="BroadcastTab._show(\'generic\',event)">⊙ Broadcast</div>'+
'<div class="tab-nav-item" onclick="BroadcastTab._show(\'shutdown\',event)">△ Server Alert</div>'+
'<div class="tab-nav-item" onclick="BroadcastTab._show(\'whisper\',event)">⊙ GM Whisper</div>'+
'<div class="tab-nav-item" onclick="BroadcastTab._show(\'links\',event)">→ Links</div></div>'+
'<div id="bcContent"></div>';
this._show('generic')},

_show(tab,ev){document.querySelectorAll('#bcTabs .tab-nav-item').forEach(function(t){t.classList.remove('active')});if(ev&&ev.target)ev.target.classList.add('active');
var ct=document.getElementById('bcContent');
if(tab==='generic')this._renderGeneric(ct);
else if(tab==='shutdown')this._renderShutdown(ct);
else if(tab==='whisper'){this._loadPlayers();this._renderWhisper(ct)}
else if(tab==='links')this._renderLinks(ct)},

// ═══════════ GENERIC BROADCAST ═══════════
_renderGeneric(ct){ct.innerHTML=
'<div class="card mt-2"><div class="card-body">'+
'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'+
'<div style="width:32px;height:32px;border-radius:8px;background:rgba(193,148,61,.15);border:1px solid rgba(193,148,61,.3);display:flex;align-items:center;justify-content:center;font-size:16px">⊙</div>'+
'<div><div class="font-semibold">Broadcast</div><div class="text-xs text-muted">Wyświetla komunikat na ekranie wszystkich graczy online.</div></div></div>'+
'<label class="form-label">Header</label><input type="text" class="form-input mb-2" id="bcTitle" placeholder="Server Announcement">'+
'<label class="form-label">Message</label><input type="text" class="form-input mb-2" id="bcBody" placeholder="Message to all players...">'+
'<div style="display:flex;align-items:end;gap:8px">'+
'<div style="flex:1"><label class="form-label">Duration (s)</label><input type="number" class="form-input" id="bcDuration" value="30" min="1" max="3600"></div>'+
'<button class="btn btn-primary" onclick="BroadcastTab._sendGeneric()">⊙ Send</button></div>'+
'<div id="bcGenResult" class="text-sm mt-2"></div></div></div>'},

async _sendGeneric(){var t=document.getElementById('bcTitle')?.value?.trim();var b=document.getElementById('bcBody')?.value||'';var d=parseInt(document.getElementById('bcDuration')?.value)||30;var el=document.getElementById('bcGenResult');
if(!t){el.innerHTML='<span class="text-danger">Header is required</span>';return}
el.innerHTML='<span>◷ Sending...</span>';
try{var r=await api.post('/gameplay/broadcast/generic',{title:t,body:b,durationSec:d});el.innerHTML=r.ok?'<span class="text-success">✓ '+r.message+'</span>':'<span class="text-danger">✗ '+r.message+'</span>'}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

// ═══════════ SHUTDOWN BROADCAST ═══════════
_renderShutdown(ct){ct.innerHTML=
'<div class="card mt-2"><div class="card-body">'+
'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'+
'<div style="width:32px;height:32px;border-radius:8px;background:rgba(225,112,85,.15);border:1px solid rgba(225,112,85,.3);display:flex;align-items:center;justify-content:center;font-size:16px">△</div>'+
'<div><div class="font-semibold">Server Alert</div><div class="text-xs text-muted">Restart/shutdown countdown banner.</div></div></div>'+
'<label class="form-label">Type</label><select class="form-input mb-2" id="bcShutdownType">'+
'<option value="Restart">Restart</option><option value="Shutdown">Shutdown</option><option value="Maintenance">Maintenance</option><option value="Update">Update</option></select>'+
'<label class="form-label">Delay (minutes)</label><input type="number" class="form-input mb-2" id="bcShutdownDelay" value="10" min="0" max="1440">'+
'<div style="display:flex;gap:8px;justify-content:flex-end">'+
'<button class="btn btn-sm" onclick="BroadcastTab._sendShutdown(true)">× Cancel</button>'+
'<button class="btn btn-danger" onclick="BroadcastTab._sendShutdown(false)">△ Broadcast</button></div>'+
'<div id="bcShutdownResult" class="text-sm mt-2"></div></div></div>'},

async _sendShutdown(cancel){var type=document.getElementById('bcShutdownType')?.value||'Restart';var delay=parseInt(document.getElementById('bcShutdownDelay')?.value)||0;var el=document.getElementById('bcShutdownResult');
if(!cancel&&!confirm('Broadcast a '+type.toLowerCase()+' in '+delay+' minute'+(delay===1?'':'s')+'? All connected players will see a countdown.'))return;
el.innerHTML='<span>◷ '+(cancel?'Cancelling...':'Sending...')+'</span>';
try{var r=await api.post('/gameplay/broadcast/shutdown',{shutdownType:type,delayMinutes:cancel?0:delay,cancel:cancel});el.innerHTML=r.ok?'<span class="text-success">✓ '+r.message+'</span>':'<span class="text-danger">✗ '+r.message+'</span>'}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

// ═══════════ GM WHISPER ═══════════
async _loadPlayers(){if(this._playersLoaded)return;
try{var r=await api.get('/gameplay/players');this._players=r.players||[];this._playersLoaded=true}catch(e){this._players=[]}},

_renderWhisper(ct){var self=this;var players=this._players||[];
ct.innerHTML=
'<div class="card mt-2"><div class="card-body">'+
'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'+
'<div style="width:32px;height:32px;border-radius:8px;background:rgba(9,132,227,.15);border:1px solid rgba(9,132,227,.3);display:flex;align-items:center;justify-content:center;font-size:16px">⊙</div>'+
'<div><div class="font-semibold">GM Whisper</div><div class="text-xs text-muted">Private chat to one online player.</div></div></div>'+
'<label class="form-label">Player</label><select class="form-input mb-2" id="bcWhisperPlayer">'+
'<option value="">'+(!self._playersLoaded?'Loading online players...':players.length===0?'No players online':'Pick a player')+'</option>'+
players.map(function(p){return'<option value="'+(p.fls_id||p.pawn_id||p.id)+'">'+(p.name||p.display_name||p.character_name||'Player')+' (ID: '+(p.account_id||p.id)+')</option>'}).join('')+'</select>'+
'<label class="form-label">Message</label><textarea class="form-input mb-2" id="bcWhisperMsg" rows="3" placeholder="Hello from the admin team..." style="resize:none"></textarea>'+
'<p class="text-xs text-muted mb-2">△ Note: whisper publish is experimental — broker accepts but the game may silently drop.</p>'+
'<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" onclick="BroadcastTab._sendWhisper()">⊙ Whisper</button></div>'+
'<div id="bcWhisperResult" class="text-sm mt-2"></div></div></div>'},

async _sendWhisper(){var fls=document.getElementById('bcWhisperPlayer')?.value;var msg=document.getElementById('bcWhisperMsg')?.value?.trim();var el=document.getElementById('bcWhisperResult');
if(!fls||!msg){el.innerHTML='<span class="text-danger">Select a player and type a message</span>';return}
el.innerHTML='<span>◷ Sending...</span>';
try{var r=await api.post('/gameplay/chat/whisper',{target_fls_id:fls,message:msg});el.innerHTML=r.ok?'<span class="text-success">✓ '+r.message+'</span>':'<span class="text-warning">△ '+r.message+'</span>';document.getElementById('bcWhisperMsg').value=''}catch(e){el.innerHTML='<span class="text-danger">✗ '+e.message+'</span>'}},

// ═══════════ LINKS ═══════════
_renderLinks(ct){ct.innerHTML=
'<div class="card mt-2"><div class="card-header">→ Useful Links</div><div class="card-body">'+
'<div style="display:flex;flex-direction:column;gap:8px">'+
this._link('△','Deep Desert Map','Interactive deep desert map','https://dune.gaming.tools/deep-desert')+
this._link('△','Hagga Basin Map','Hagga Basin map table','https://dune.gaming.tools/hagga-basin')+
this._link('⊞','Items Database','Full Dune Awakening items database','https://dune.gaming.tools')+
this._link('□','Deep Desert Loot Table','Loot companion & drop rates','https://www.method.gg/dune-awakening/deep-desert-companion')+
this._link('⚙','Augmentation Database','All augmentations & stats','https://www.method.gg/dune-awakening/augmentations-database')+
this._link('⭐','Best Augments Tier List','Ranked augmentations guide','https://www.method.gg/dune-awakening/dune-awakening-best-augments-tier-list')+
'</div></div></div>'},

_link(icon,label,desc,url){return'<a href="'+url+'" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-secondary);border-radius:8px;text-decoration:none;border:1px solid var(--border)" onmouseenter="this.style.borderColor=\'var(--accent)\'" onmouseleave="this.style.borderColor=\'var(--border)\'"><span style="font-size:20px">'+icon+'</span><div><div class="text-sm">'+label+'</div><div class="text-xs text-muted">'+desc+'</div></div><span style="margin-left:auto;color:var(--accent)">→</span></a>'},

destroy:function(){this._players=[];this._playersLoaded=false}
};