// Dune Admin Manager - Clean Application - No inline tab definitions
let currentTab=null,currentTabName=null;

// ══════════════════════ BATTLEPASS TAB ══════════════════════
const BattlepassTab={async render(){document.getElementById('content').innerHTML='<h2>◆ Battlepass</h2><div class="grid-2 mt-3"><div class="card"><div class="card-header">Tier Structure (158 tiers)</div><div class="card-body"><table class="data-table"><tr><th>Category</th><th>Tiers</th><th>Signal</th></tr><tr><td>Level Progression</td><td>50</td><td>Player level 1-50</td></tr><tr><td>Journey Nodes</td><td>40</td><td>Story completion</td></tr><tr><td>Exploration</td><td>40</td><td>Discovery tags</td></tr><tr><td>Special Rewards</td><td>28</td><td>Unique schematics</td></tr></table><p class="text-muted mt-2">~1,469 bonus intel. Includes Mendek T5 heavy armor schematics.</p></div></div><div class="card"><div class="card-header">Player Progress</div><div class="card-body"><input type="number" class="form-input mb-2" id="bpAccId" placeholder="Account ID (default: 1)" value="1" style="width:150px"><button class="btn btn-sm btn-primary" onclick="BattlepassTab._check()">Check</button><div id="bpRes" class="mt-2"></div></div></div></div>'},async _check(){const id=document.getElementById('bpAccId').value||'1';if(!id)return;try{const d=await api.get('/gameplay/battlepass/player/'+id);const specs=(d.specializations||[]).map(s=>'<tr><td>'+s.track+'</td><td>'+s.xp+' XP</td><td>Lvl '+s.level+'</td></tr>').join('');document.getElementById('bpRes').innerHTML='<p><strong>Account #'+id+'</strong></p><p>Total XP: <strong>'+d.total_xp+'</strong></p>'+(specs?'<table class="data-table mt-1"><tr><th>Track</th><th>XP</th><th>Level</th></tr>'+specs+'</table>':'<p class="text-muted">No spec data</p>')}catch(e){document.getElementById('bpRes').innerHTML='<p class="text-danger">Error: '+e.message+'</p>'}}};

// ══════════════════════ TAB REGISTRY ══════════════════════
const TABS={dashboard:DashboardTab,battlegroup:BattlegroupTab,players:PlayersTab,characters:CharactersTab,'server-settings':ServerSettingsTab,'extra-settings':ExtraSettingsTab,database:DatabaseTab,'database-editor':DatabaseEditorTab,logs:LogsTab,market:MarketTab,'market-bot':MarketBotTab,broadcast:BroadcastTab,landsraad:LandsraadTab,welcome:WelcomeTab,monitoring:MonitoringTab,setup:SetupTab,scheduler:SchedulerTab,storage:StorageTab,bases:BasesTab,blueprints:BlueprintsTab,battlepass:BattlepassTab,gameplay:GameplayTab,'give-items':GiveItemsTab,items:ItemsTab,settings:SettingsTab,commands:CommandsTab};

// ══════════════════════ INIT ══════════════════════
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.sidebar-link').forEach(l=>{l.addEventListener('click',e=>{e.preventDefault();navigateTo(l.getAttribute('data-tab'))})});checkSession();navigateTo('dashboard')});

async function navigateTo(tabName){if(currentTab&&currentTab.destroy){try{currentTab.destroy()}catch(e){}}document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.remove('active'));const link=document.querySelector('[data-tab="'+tabName+'"]');if(link)link.classList.add('active');const tab=TABS[tabName];if(!tab||typeof tab.render!=='function'){document.getElementById('content').innerHTML='<div class="loading"><p>Tab not found: '+tabName+'</p></div>';return}try{await tab.render();currentTab=tab;currentTabName=tabName}catch(e){document.getElementById('content').innerHTML='<div class="loading"><p class="text-danger">Error: '+(e.message||e)+'</p></div>'}}

async function checkSession(){try{const s=await api.auth.session();const el=document.getElementById('userArea');if(s.authenticated){el.innerHTML='<span>'+s.username+'</span> <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>'}}catch(e){}}
function showLogin(){const ov=document.createElement('div');ov.className='modal-overlay';ov.innerHTML='<div class="modal"><div class="modal-title">Login</div><div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="lgUser" placeholder="admin"></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="lgPass"></div><div id="lgErr" class="text-danger mb-2" style="display:none"></div><div class="flex gap-2"><button class="btn btn-primary" id="lgBtn">Login</button><button class="btn btn-ghost" id="lgCancel">Cancel</button></div></div>';document.body.appendChild(ov);document.getElementById('lgBtn').onclick=async()=>{try{await api.auth.login(document.getElementById('lgUser').value,document.getElementById('lgPass').value);ov.remove();showToast('OK','success');checkSession()}catch(e){document.getElementById('lgErr').textContent=e.message;document.getElementById('lgErr').style.display='block'}};document.getElementById('lgCancel').onclick=()=>ov.remove();document.getElementById('lgPass').onkeyup=e=>{if(e.key==='Enter')document.getElementById('lgBtn').click()}}
async function logout(){try{await api.auth.logout();showToast('Logged out','info');checkSession()}catch(e){}}
function toggleConsole(){const p=document.getElementById('consolePanel');p.style.display=p.style.display==='none'?'flex':'none'}

// ══════════════════════ SAFETY HELPERS ══════════════════════

/** Two-step confirmation: user must TYPE the required word to proceed. */
function safeConfirm(message, requiredWord) {
    const answer = prompt(message + '\n\n┌─────────────────────────────────────────┐\n│  Type "' + requiredWord + '" to confirm:                   │\n└─────────────────────────────────────────┘');
    return answer === requiredWord;
}

/** Show help tooltip for an input field */
function showHelp(el, text) {
    const old = el.getAttribute('title');
    el.setAttribute('title', text);
    el.style.borderColor = 'var(--sand-gold)';
    el.style.boxShadow = '0 0 4px rgba(214,168,95,0.2)';
}

/** Validate numeric input — prevent non-numeric keys */
function numOnly(e) {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter','Escape','Home','End'];
    if (allowed.includes(e.key)) return true;
    if (e.ctrlKey || e.metaKey) return true;
    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return false; }
    return true;
}
