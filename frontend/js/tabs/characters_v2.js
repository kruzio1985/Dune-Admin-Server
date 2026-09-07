/**
 * Characters Tab - Full Character Editor (v2)
 * Uses pawn_id (actor_id) for everything - no 3-ID confusion!
 */
const CharactersTab = {
    _char: null, _actorId: 0,

    async render() {
        document.getElementById('content').innerHTML = `
<h2>⬡ Character Editor</h2>
<div class="card mt-2"><div class="card-body" style="background:#2d1b0e;border-left:3px solid #d29922">
    <strong>△ Edytujesz bezpośrednio bazę danych.</strong> Zatrzymaj Battlegroup i wyloguj gracza przed edycją.
</div></div>
<div class="card mt-2"><div class="card-header">● Select Character</div><div class="card-body">
    <div class="flex gap-2" style="align-items:end">
        <select class="form-select" id="charSelect" style="max-width:300px"><option value="">-- Load characters --</option></select>
        <button class="btn btn-primary" onclick="CharactersTab.loadChar()">↓ Load</button>
        <button class="btn btn-sm" onclick="CharactersTab.refreshList()">↻</button>
    </div>
</div></div>
<div id="charEditor" style="display:none">
    <div class="grid-2 mt-2">
        <div class="card"><div class="card-header">◇ Stats <button class="btn btn-sm btn-success" onclick="CharactersTab.saveStats()">⊞ Save</button></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
            <div class="form-group"><label class="form-label">Max Health</label><input type="number" class="form-input" id="csMaxHealth" step="1"></div>
            <div class="form-group"><label class="form-label">Tech Knowledge Points</label><input type="number" class="form-input" id="csTechPts" step="1"></div>
            <div class="form-group"><label class="form-label">Hydration</label><input type="number" class="form-input" id="csHydration" step="0.1"></div>
            <div class="form-group"><label class="form-label">Heat Exhaustion</label><input type="number" class="form-input" id="csHeat" step="0.1"></div>
            <div class="form-group"><label class="form-label">Current Spice</label><input type="number" class="form-input" id="csSpice" step="1"></div>
            <div class="form-group"><label class="form-label">Spice Addiction Level</label><input type="number" class="form-input" id="csAddiction" step="0.1"></div>
            <div class="form-group"><label class="form-label">Spice Tolerance</label><input type="number" class="form-input" id="csTolerance" step="0.1"></div>
            <div class="form-group"><label class="form-label">Eyes of Ibad (0.0–1.0)</label><input type="number" class="form-input" id="csEyesIbad" step="0.05" min="0" max="1"></div>
        </div></div>
        <div class="card"><div class="card-header">⏻ Specializations</div><div class="card-body" id="charSpecs"><div class="spinner"></div></div></div>
    </div>
    <div class="grid-2 mt-2">
        <div class="card"><div class="card-header">◆ Economy</div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
            <div class="form-group"><label class="form-label">● Solari</label><div class="flex gap-2"><input type="number" class="form-input" id="csSolari"><button class="btn btn-sm btn-success" onclick="CharactersTab.setCurrency(0)">Set</button></div></div>
            <div class="form-group"><label class="form-label">△ House Scrip</label><div class="flex gap-2"><input type="number" class="form-input" id="csScrip"><button class="btn btn-sm btn-success" onclick="CharactersTab.setCurrency(1)">Set</button></div></div>
            <hr><div id="charFactionRep"></div>
        </div></div>
        <div class="card"><div class="card-header">⊞ Inventory <span class="badge" id="charInvCount">0</span></div>
        <div class="card-body" id="charInvBody" style="max-height:400px;overflow:auto"><p class="text-muted">Load character first</p></div></div>
    </div>
</div>`;
        this.refreshList();
    },

    async refreshList() {
        try {
            const d = await api.get('/gameplay/characters');
            const sel = document.getElementById('charSelect');
            sel.innerHTML = '<option value="">-- Select character --</option>';
            (d.characters || []).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.name} (ID: ${c.id})`; sel.appendChild(o); });
        } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    },

    async loadChar() {
        const id = parseInt(document.getElementById('charSelect')?.value);
        if (!id) return showToast('Select a character', 'error');
        this._actorId = id;
        try {
            this._char = await api.get('/gameplay/characters/' + id);
            document.getElementById('charEditor').style.display = '';
            const props = JSON.parse(this._char.properties || '{}');
            const gas = JSON.parse(this._char.gasAttributes || '{}');
            const rd = (o,k1,k2) => { const v = o?.[k1]; return v && typeof v === 'object' && !Array.isArray(v) ? (v[k2]?.BaseValue ?? v[k2]) : null; };
            document.getElementById('csMaxHealth').value = rd(props,'DamageableActorComponent','m_TotalMaxHealth') || 500;
            document.getElementById('csTechPts').value = rd(props,'TechKnowledgePlayerComponent','m_TechKnowledgePoints') || 50;
            document.getElementById('csHydration').value = rd(gas,'DuneHydrationAttributeSet','CurrentHydration') || 100;
            document.getElementById('csHeat').value = rd(gas,'DuneHydrationAttributeSet','HeatExhaustion') || 0;
            document.getElementById('csSpice').value = rd(gas,'DuneSpiceAddictionAttributeSet','CurrentSpice') || 5000;
            document.getElementById('csAddiction').value = rd(gas,'DuneSpiceAddictionAttributeSet','SpiceAddictionLevel') || 0;
            document.getElementById('csTolerance').value = rd(gas,'DuneSpiceAddictionAttributeSet','SpiceTolerance') || 0;
            document.getElementById('csEyesIbad').value = rd(props,'BP_DunePlayerCharacter_C','m_EyesOfIbadValue') || 0;
            this.loadSpecs(); this.loadEconomy(); this.renderInventory();
        } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    },

    async saveStats() {
        if (!this._actorId) return;
        const updates = [];
        const fields = [
            ['csMaxHealth','properties',['DamageableActorComponent','m_TotalMaxHealth']],
            ['csTechPts','properties',['TechKnowledgePlayerComponent','m_TechKnowledgePoints']],
            ['csHydration','gas_attributes',['DuneHydrationAttributeSet','CurrentHydration']],
            ['csHeat','gas_attributes',['DuneHydrationAttributeSet','HeatExhaustion']],
            ['csSpice','gas_attributes',['DuneSpiceAddictionAttributeSet','CurrentSpice']],
            ['csAddiction','gas_attributes',['DuneSpiceAddictionAttributeSet','SpiceAddictionLevel']],
            ['csTolerance','gas_attributes',['DuneSpiceAddictionAttributeSet','SpiceTolerance']],
            ['csEyesIbad','properties',['BP_DunePlayerCharacter_C','m_EyesOfIbadValue']],
        ];
        for (const [el, f, p] of fields) {
            const v = parseFloat(document.getElementById(el)?.value);
            if (!isNaN(v)) {
                updates.push({field:f, path:p, value:v});
                if (f === 'gas_attributes') { updates.push({field:f, path:[p[0],p[1],'BaseValue'], value:v}); updates.push({field:f, path:[p[0],p[1],'CurrentValue'], value:v}); }
                if (p[0] === 'DamageableActorComponent') updates.push({field:f, path:['DamageableActorComponent','m_CurrentMaxHealth'], value:v});
            }
        }
        try { const r = await api.post('/gameplay/characters/'+this._actorId+'/stats', {updates}); showToast(r.message||'Saved!', r.ok?'success':'error'); } catch(e) { showToast(e.message,'error'); }
    },

    async loadSpecs() {
        const div = document.getElementById('charSpecs');
        try {
            const d = await api.get('/gameplay/characters/'+this._actorId+'/specializations');
            const L = {Combat:'◆ Combat',Crafting:'⚙ Crafting',Exploration:'△ Exploration',Gathering:'◆ Gathering',Sabotage:'◇ Sabotage'};
            div.innerHTML = (d.tracks||[]).map(t => {
                const lv = Math.floor(t.level||0);
                return `<div class="flex gap-2 mb-1" style="align-items:center">
                    <span style="width:100px;font-size:12px">${L[t.track_type]||t.track_type}</span>
                    <span style="font-size:10px;color:var(--text-muted);width:80px">Lv${lv}</span>
                    <input type="number" class="form-input" id="sl_${t.track_type}" value="${lv}" style="width:50px" min="0" max="100">
                    <input type="number" class="form-input" id="sx_${t.track_type}" value="${t.xp_amount||0}" style="width:70px">
                    <button class="btn btn-sm btn-primary" onclick="CharactersTab.setSpec('${t.track_type}')">Set</button>
                    <button class="btn btn-sm" onclick="CharactersTab.unlockKeys('${t.track_type}_')">⭐</button>
                </div>`;
            }).join('') + `<p class="text-sm text-muted mt-1">Keystones: ${d.purchasedKeystones||0}/${d.maxKeystones||205}</p>
            <button class="btn btn-sm btn-success mt-1" onclick="CharactersTab.unlockAllKeys()">⭐ All 205</button>`;
        } catch(e) { div.innerHTML = '<p class="text-danger">'+e.message+'</p>'; }
    },

    async setSpec(track) {
        const lv = parseInt(document.getElementById('sl_'+track)?.value)||0;
        const xp = parseInt(document.getElementById('sx_'+track)?.value)||44182;
        try { await api.post('/gameplay/characters/'+this._actorId+'/specializations/track?track_type='+track+'&xp='+xp+'&level='+lv); showToast(track+'=Lv'+lv); this.loadSpecs(); } catch(e) { showToast(e.message,'error'); }
    },
    async unlockKeys(pref) { try { await api.post('/gameplay/characters/'+this._actorId+'/specializations/unlock-keystones?track_prefix='+pref); showToast(pref+'keys!'); this.loadSpecs(); } catch(e) { showToast(e.message,'error'); } },
    async unlockAllKeys() { for (const p of ['Combat_','Crafting_','Exploration_','Gathering_','Sabotage_']) await api.post('/gameplay/characters/'+this._actorId+'/specializations/unlock-keystones?track_prefix='+p); showToast('All 205!'); this.loadSpecs(); },

    async loadEconomy() {
        try {
            const d = await api.get('/gameplay/characters/'+this._actorId+'/economy');
            document.getElementById('csSolari').value = (d.currency||[]).find(c=>c.currency_id===0)?.balance||0;
            document.getElementById('csScrip').value = (d.currency||[]).find(c=>c.currency_id===1)?.balance||0;
            document.getElementById('charFactionRep').innerHTML = (d.factionRep||[]).map(r =>
                `<div class="flex gap-2 mb-1" style="align-items:center"><span style="width:80px;font-size:12px">${r.faction_name}</span><input type="number" class="form-input" id="cf_${r.faction_id}" value="${r.reputation}" style="width:100px"><button class="btn btn-sm btn-primary" onclick="CharactersTab.setFaction(${r.faction_id})">Set</button></div>`
            ).join('')||'<p class="text-muted">No factions</p>';
        } catch(e) {}
    },
    async setCurrency(cid) { const el = cid===0?document.getElementById('csSolari'):document.getElementById('csScrip'); try { await api.post('/gameplay/characters/'+this._actorId+'/economy/currency?currency_id='+cid+'&balance='+(parseInt(el?.value)||0)); showToast('Set!'); } catch(e) { showToast(e.message,'error'); } },
    async setFaction(fid) { const el = document.getElementById('cf_'+fid); try { await api.post('/gameplay/characters/'+this._actorId+'/economy/reputation?faction_id='+fid+'&amount='+(parseInt(el?.value)||0)); showToast('Set!'); } catch(e) { showToast(e.message,'error'); } },

    renderInventory() {
        const items = this._char?.items||[];
        document.getElementById('charInvCount').textContent = items.length;
        const L = {0:'□ Backpack',14:'◇ Social',15:'⏻ Hotbar',27:'◆ Equipped'};
        document.getElementById('charInvBody').innerHTML = items.length ?
            `<table class="data-table"><tr><th>ID</th><th>Template</th><th>Stack</th><th>Location</th></tr>${items.map(i=>`<tr><td>${i.id}</td><td><code>${i.template}</code></td><td>${i.stack}</td><td>${L[i.inv_type]||'T'+i.inv_type}</td></tr>`).join('')}</table>` :
            '<p class="text-muted">No items</p>';
    }
};