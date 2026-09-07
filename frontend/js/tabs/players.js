// Players tab - full inspect/edit
const PlayersTab={_players:[],_sel:null,_selPawnId:null,
async render(){document.getElementById('content').innerHTML=`
<h2>● Players</h2>
<div class="flex gap-2 mt-2 mb-2 items-center">
    <input type="text" class="form-input" id="plSearch" placeholder="Search by name..." oninput="PlayersTab.search()" style="max-width:300px">
    <button class="btn btn-sm" onclick="PlayersTab.load()">↻</button>
    <span class="text-muted text-sm" id="plCount"></span>
</div>
<div class="grid-2">
    <div class="card"><div class="card-header">Player List</div>
    <div class="card-body" id="plList" style="max-height:600px;overflow:auto"><div class="spinner"></div></div></div>
    <div id="plDetail" style="display:none">
        <div class="card card-border-blue"><div class="card-header card-header-actions">
            <span id="plDetailTitle">● Player</span>
            <button class="btn btn-sm btn-ghost" onclick="document.getElementById('plDetail').style.display='none'">×</button>
        </div><div class="card-body" id="plDetailBody" style="max-height:500px;overflow:auto"></div></div>
        <div class="card mt-1"><div class="card-header">△ Landsraad</div><div class="card-body" id="plLandsraad"></div></div>
    </div>
</div>`;this.load()},
async load(){try{const r=await api.get('/gameplay/players');this._players=r.players||[];document.getElementById('plCount').textContent=this._players.length+' players';this._show(this._players)}catch(e){document.getElementById('plList').innerHTML='<p class="text-danger">'+e.message+'</p>'}},
search(){const q=(document.getElementById('plSearch')?.value||'').toLowerCase();this._show(q?this._players.filter(p=>p.name.toLowerCase().includes(q)):this._players)},
_show(list){const el=document.getElementById('plList');
if(!list.length){el.innerHTML='<p class="text-muted text-sm">No players</p>';return}
el.innerHTML=list.map(p=>`<div class="pl-row" onclick="PlayersTab.selectAccount(${p.account_id})" style="padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background .15s"
    onmouseenter="this.style.background='var(--bg-primary)'" onmouseleave="this.style.background=''">
<div><strong>${p.name||'?'}</strong> <span class="text-muted text-xs">#${p.account_id} · ${p.class||'?'}</span>
    <span class="badge badge-muted ml-1">${p.faction||'?'}</span></div>
<div style="text-align:right"><span class="badge ${p.online==='Online'?'badge-success':'badge-muted'} text-xs">${p.online||'Offline'}</span>
    <span class="text-xs text-muted ml-1">${p.map||''}</span></div></div>`).join('')},

async selectAccount(accountId) {
    this._sel = accountId;
    document.getElementById('plDetail').style.display = 'block';
    document.getElementById('plDetailTitle').textContent = '● Player #'+accountId;
    document.getElementById('plDetailBody').innerHTML = '<div class="spinner"></div>';
    document.getElementById('plLandsraad').innerHTML = '<div class="spinner"></div>';

    try {
        // Get character detail + landsraad
        const [charR, landsR] = await Promise.all([
            api.get('/gameplay/players/'+accountId+'/detail'),
            api.get('/gameplay/players/'+accountId+'/landsraad')
        ]);

        this._selPawnId = charR.pawn_id;

        const cs = charR.stats || {};
        const sp = charR.specs || [];
        const ec = charR.economy || {};
        const inv = charR.inventory || [];
        const cos = charR.cosmetics || {};

        document.getElementById('plDetailBody').innerHTML = `
        <div class="row">
            <div class="col-6">
                <h4 class="text-muted text-sm" style="margin:0 0 8px">◇ Stats</h4>
                ${this._renderStats(cs)}
                <h4 class="text-muted text-sm" style="margin:12px 0 8px">🎓 Specializations</h4>
                ${this._renderSpecsEditable(sp)}
            </div>
            <div class="col-6">
                <h4 class="text-muted text-sm" style="margin:0 0 8px">◆ Economy</h4>
                ${this._renderEconomy(ec, accountId)}
                <h4 class="text-muted text-sm" style="margin:12px 0 8px">□ Inventory <span class="text-xs text-muted">(${inv.length} items)</span></h4>
                ${this._renderInventory(inv, accountId)}
            </div>
        </div>
        <h4 class="text-muted text-sm" style="margin:12px 0 8px">⬡ Cosmetics & Identity</h4>
        ${this._renderCosmetics(cos)}`;

        const contribs = landsR.contributions || [];
        document.getElementById('plLandsraad').innerHTML = contribs.length
            ? `<table class="data-table"><tr><th>House</th><th>Amount</th></tr>${contribs.map(c=>`<tr><td>${c.house}</td><td>${c.amount?.toLocaleString()}</td></tr>`).join('')}</table>`
            : '<p class="text-muted text-sm">No faction contributions</p>';

    } catch(e) {
        document.getElementById('plDetailBody').innerHTML = '<p class="text-danger">'+e.message+'</p>';
    }
},

_renderStats(stats) {
    const map = {max_health:'Max Health',tech_points:'Tech Points',hydration:'Hydration',heat:'Heat',
        spice:'Spice',addiction:'Addiction',tolerance:'Tolerance',eyes_of_ibad:'Eyes of Ibad'};
    return Object.entries(map).map(([k,label])=>{
        const val = stats[k] !== undefined ? stats[k] : '?';
        const pct = k==='max_health'?Math.min(100,Math.round((val/100)*100)):k==='eyes_of_ibad'?Math.min(100,val*10):50;
        return `<div class="mb-1"><div class="flex justify-between text-xs"><span>${label}</span><span class="text-muted">${val}</span></div>
        <div class="progress-bar"><div class="progress-fill-${pct>80?'green':pct>40?'blue':'red'}" style="width:${pct}%"></div></div></div>`;
    }).join('');
},

_renderSpecsEditable(specs) {
    if(!specs.length) return '<p class="text-muted text-xs">No specs</p>';
    return specs.map(s=>`<div class="mb-1 flex justify-between text-xs" style="padding:4px 8px;background:var(--bg-primary);border-radius:4px">
        <span><strong>${s.name||s.track_id}</strong></span>
        <span><span class="text-muted">Level:</span> ${s.level||0} <span class="text-muted ml-1">XP:</span> ${s.xp||0}</span>
    </div>`).join('');
},

_renderEconomy(ec, accId) {
    return `
    <div class="text-xs mb-2" style="display:flex;flex-wrap:wrap;gap:8px">
        <div style="padding:6px 10px;background:var(--bg-primary);border-radius:4px;flex:1;min-width:100px">
            <div class="text-muted">● Solari</div><div style="font-size:16px;font-weight:bold">${ec.solari?.toLocaleString?.()??ec.solari??'?'}</div>
        </div>
        <div style="padding:6px 10px;background:var(--bg-primary);border-radius:4px;flex:1;min-width:100px">
            <div class="text-muted">◇ Scrip</div><div style="font-size:16px;font-weight:bold">${ec.scrip?.toLocaleString?.()??ec.scrip??'?'}</div>
        </div>
    </div>
    <div class="text-xs text-muted mb-1">Faction Rep: ${ec.faction_rep||'?'}</div>`;
},

_renderInventory(items, accId) {
    if(!items.length) return '<p class="text-muted text-xs">Empty</p>';
    return `<div style="max-height:200px;overflow:auto">${items.slice(0,50).map(it=>`
        <div class="flex justify-between text-xs" style="padding:3px 6px;border-bottom:1px solid var(--border)">
            <span>${it.name||it.item_id||'?'}</span>
            <span class="text-muted">${it.quantity||1}${it.quality!==undefined?' · Q'+it.quality:''}</span>
        </div>`).join('')}</div>`;
},

_renderCosmetics(cos) {
    return `<div class="text-xs" style="display:flex;flex-wrap:wrap;gap:4px">
        ${Object.entries(cos||{}).map(([k,v])=>`<span style="padding:2px 8px;background:var(--bg-primary);border-radius:4px"><span class="text-muted">${k}:</span> ${v}</span>`).join('')||'<span class="text-muted">None</span>'}
    </div>`;
},

async addItem(accId) {
    const itemId = prompt('Item template ID:');
    const qty = prompt('Quantity:','1');
    if(itemId&&qty) {
        try{await api.post('/gameplay/characters/'+accId+'/give-item',{template_id:itemId,quantity:parseInt(qty)});showToast('Item added!','success');this.selectAccount(accId)}catch(e){showToast(e.message,'error')}
    }
},

destroy(){this._players=[];this._sel=null;this._selPawnId=null}};
