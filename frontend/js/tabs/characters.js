/**
 * Characters Tab - Full Character Editor
 * (ported from dune-awakening-server-manager)
 * Uses pawn_id (actor_id) for everything — no 3-ID confusion!
 */
const CharactersTab = {
    _char: null,
    _actorId: 0,

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
            <div class="form-group"><label class="form-label">Eyes of Ibad <span class="text-sm text-muted">0.0–1.0</span></label><input type="number" class="form-input" id="csEyesIbad" step="0.05" min="0" max="1"></div>
        </div></div>

        <div class="card"><div class="card-header">⏻ Specializations</div>
        <div class="card-body" id="charSpecs"><div class="spinner"></div></div></div>
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
            (d.characters || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} (ID: ${c.id})`;
                sel.appendChild(opt);
            });
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
            document.getElementById('csMaxHealth').value = this._readObj(props, 'DamageableActorComponent', 'm_TotalMaxHealth') || 500;
            document.getElementById('csTechPts').value = this._readObj(props, 'TechKnowledgePlayerComponent', 'm_TechKnowledgePoints') || 50;
            document.getElementById('csHydration').value = this._readObj(gas, 'DuneHydrationAttributeSet', 'CurrentHydration') || 100;
            document.getElementById('csHeat').value = this._readObj(gas, 'DuneHydrationAttributeSet', 'HeatExhaustion') || 0;
            document.getElementById('csSpice').value = this._readObj(gas, 'DuneSpiceAddictionAttributeSet', 'CurrentSpice') || 5000;
            document.getElementById('csAddiction').value = this._readObj(gas, 'DuneSpiceAddictionAttributeSet', 'SpiceAddictionLevel') || 0;
            document.getElementById('csTolerance').value = this._readObj(gas, 'DuneSpiceAddictionAttributeSet', 'SpiceTolerance') || 0;
            document.getElementById('csEyesIbad').value = this._readObj(props, 'BP_DunePlayerCharacter_C', 'm_EyesOfIbadValue') || 0;
            this.loadSpecs(); this.loadEconomy(); this.renderInventory();
        } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    },

    _readObj(obj, key1, key2) {
        const v = obj?.[key1];
        if (!v) return null;
        if (typeof v === 'object' && !Array.isArray(v)) {
            if (v[key2] && typeof v[key2] === 'object' && 'BaseValue' in v[key2]) return v[key2].BaseValue;
            return v[key2];
        }
        return null;
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
        for (const [elId, field, path] of fields) {
            const val = parseFloat(document.getElementById(elId)?.value);
            if (!isNaN(val)) {
                updates.push({field, path, value: val});
                if (field === 'gas_attributes') {
                    updates.push({field, path: [path[0], path[1], 'BaseValue'], value: val});
                    updates.push({field, path: [path[0], path[1], 'CurrentValue'], value: val});
                }
                if (path[0] === 'DamageableActorComponent') {
                    updates.push({field, path: ['DamageableActorComponent','m_CurrentMaxHealth'], value: val});
                }
            }
        }
        try {
            const r = await api.post('/gameplay/characters/' + this._actorId + '/stats', {updates});
            showToast(r.message || 'Saved!', r.ok ? 'success' : 'error');
        } catch (e) { showToast(e.message, 'error'); }
    },

    async loadSpecs() {
        const div = document.getElementById('charSpecs');
        try {
            const d = await api.get('/gameplay/characters/' + this._actorId + '/specializations');
            const labels = {Combat:'◆ Combat', Crafting:'⚙ Crafting', Exploration:'△ Exploration', Gathering:'◆ Gathering', Sabotage:'◇ Sabotage'};
            div.innerHTML = (d.tracks || []).map(t => {
                const lv = Math.floor(t.level || 0);
                return `<div class="flex gap-2 mb-1" style="align-items:center">
                    <span style="width:100px;font-size:12px">${labels[t.track_type]||t.track_type}</span>
                    <span style="font-size:10px;color:var(--text-muted);width:80px">Lv${lv}</span>
                    <input type="number" class="form-input" id="specLvl_${t.track_type}" value="${lv}" style="width:50px" min="0" max="100">
                    <input type="number" class="form-input" id="specXp_${t.track_type}" value="${t.xp_amount||0}" style="width:70px">
                    <button class="btn btn-sm btn-primary" onclick="CharactersTab.setSpec('${t.track_type}')">Set</button>
                    <button class="btn btn-sm" onclick="CharactersTab.unlockKeys('${t.track_type}_')">⭐</button>
                </div>`;
            }).join('') + `<p class="text-sm text-muted mt-1">Keystones: ${d.purchasedKeystones||0}/${d.maxKeystones||205}</p>
            <button class="btn btn-sm btn-success mt-1" onclick="CharactersTab.unlockAllKeys()">⭐ Unlock ALL 205</button>`;
        } catch (e) { div.innerHTML = '<p class="text-danger">' + e.message + '</p>'; }
    },

    async setSpec(track) {
        const lv = parseInt(document.getElementById('specLvl_'+track)?.value) || 0;
        const xp = parseInt(document.getElementById('specXp_'+track)?.value) || 44182;
        try {
            await api.post('/gameplay/characters/' + this._actorId + '/specializations/track?track_type=' + track + '&xp=' + xp + '&level=' + lv);
            showToast(track + ' = Lv' + lv); this.loadSpecs();
        } catch (e) { showToast(e.message, 'error'); }
    },

    async unlockKeys(prefix) {
        try {
            await api.post('/gameplay/characters/' + this._actorId + '/specializations/unlock-keystones?track_prefix=' + prefix);
            showToast(prefix + 'keys unlocked!'); this.loadSpecs();
        } catch (e) { showToast(e.message, 'error'); }
    },

    async unlockAllKeys() {
        for (const p of ['Combat_','Crafting_','Exploration_','Gathering_','Sabotage_']) {
            await api.post('/gameplay/characters/' + this._actorId + '/specializations/unlock-keystones?track_prefix=' + p);
        }
        showToast('All 205 keystones!'); this.loadSpecs();
    },

    async loadEconomy() {
        try {
            const d = await api.get('/gameplay/characters/' + this._actorId + '/economy');
            const curr = d.currency || [];
            document.getElementById('csSolari').value = (curr.find(c => c.currency_id === 0) || {}).balance || 0;
            document.getElementById('csScrip').value = (curr.find(c => c.currency_id === 1) || {}).balance || 0;
            const rep = d.factionRep || [];
            document.getElementById('charFactionRep').innerHTML = rep.map(r =>
                `<div class="flex gap-2 mb-1" style="align-items:center">
                    <span style="width:80px;font-size:12px">${r.faction_name}</span>
                    <input type="number" class="form-input" id="csFaction_${r.faction_id}" value="${r.reputation}" style="width:100px">
                    <button class="btn btn-sm btn-primary" onclick="CharactersTab.setFaction(${r.faction_id})">Set</button>
                </div>`
            ).join('') || '<p class="text-muted">No faction data</p>';
        } catch (e) { /* silent */ }
    },

    async setCurrency(cid) {
        const el = cid === 0 ? document.getElementById('csSolari') : document.getElementById('csScrip');
        try {
            await api.post('/gameplay/characters/' + this._actorId + '/economy/currency?currency_id=' + cid + '&balance=' + (parseInt(el?.value) || 0));
            showToast('Set!');
        } catch (e) { showToast(e.message, 'error'); }
    },

    async setFaction(fid) {
        const el = document.getElementById('csFaction_'+fid);
        try {
            await api.post('/gameplay/characters/' + this._actorId + '/economy/reputation?faction_id=' + fid + '&amount=' + (parseInt(el?.value) || 0));
            showToast('Set!');
        } catch (e) { showToast(e.message, 'error'); }
    },

    renderInventory() {
        const items = this._char?.items || [];
        document.getElementById('charInvCount').textContent = items.length;
        const labels = {0:'□ Backpack', 14:'◇ Social', 15:'⏻ Hotbar', 27:'◆ Equipped'};
        document.getElementById('charInvBody').innerHTML = items.length ?
            `<table class="data-table"><tr><th>ID</th><th>Template</th><th>Stack</th><th>Location</th></tr>
            ${items.map(i => `<tr><td>${i.id}</td><td><code>${i.template}</code></td><td>${i.stack}</td><td>${labels[i.inv_type]||'T'+i.inv_type}</td></tr>`).join('')}</table>` :
            '<p class="text-muted">No items</p>';
    }
};<div class="tab-nav-item" onclick="CharactersTab.showTab('inventory',event)">Inventory (${inv.length})</div><div class="tab-nav-item" onclick="CharactersTab.showTab('specs',event)">Specs</div><div class="tab-nav-item" onclick="CharactersTab.showTab('economy',event)">Economy</div><div class="tab-nav-item" onclick="CharactersTab.showTab('actions',event)">Actions</div></div><div id="charTabContent"></div></div></div>`;this.playerId=id;this.playerData=d;this.showTab('stats')}catch(e){showToast(e.message,'error')}},};('.tab-nav-item').forEach(t=>t.classList.remove('active'));if(ev&&ev.target)ev.target.classList.add('active');const ct=document.getElementById('charTabContent');const p=this._player;const d=this.playerData;if(tab==='stats'){ct.innerHTML=`<div class="grid-2 mt-2"><div><strong>Name:</strong> ${p.character_name||'?'}</div><div><strong>FLS ID:</strong> <code>${p.fls_id||'N/A'}</code></div><div><strong>Level:</strong> ${p.level||0}</div><div><strong>Online:</strong> <span class="badge badge-${p.online_status?'success':'muted'}">${p.online_status?'Online':'Offline'}</span></div><div><strong>Faction:</strong> ${p.faction_id||'N/A'}</div><div><strong>Controller:</strong> ${p.player_controller_id||'N/A'}</div></div>`}else if(tab==='inventory'){const inv=d.inventory||[];ct.innerHTML=inv.length?`<table class="data-table"><thead><tr><th>ID</th><th>Template</th><th>Count</th><th>Quality</th></tr></thead><tbody>${inv.slice(0,100).map(i=>`<tr><td>${i.id}</td><td><code>${i.template_id}</code></td><td>${i.count}</td><td>${i.quality}</td></tr>`).join('')}</tbody></table>`:'<p class="text-muted">Empty inventory</p>'}else if(tab==='specs'){const specs=d.specializations||[];ct.innerHTML=specs.length?`<table class="data-table"><thead><tr><th>Track</th><th>Level</th><th>XP</th></tr></thead><tbody>${specs.map(s=>`<tr><td>${s.track_type}</td><td>${s.level}</td><td>${s.xp}</td></tr>`).join('')}</tbody></table>`:'<p class="text-muted">No specializations</p>'}else if(tab==='economy'){const curr=d.currencies||[];ct.innerHTML=`<div class="grid-2 mt-2">${curr.map(c=>`<div class="card"><div class="card-body text-center"><div class="stat-value">${c.balance}</div><div class="stat-label">${c.currency_id}</div></div></div>`).join('')}${!curr.length?'<p class="text-muted">No data</p>':''}<div class="mt-2 flex gap-2"><button class="btn btn-primary btn-sm" onclick="CharactersTab.giveItem()">Give Item</button><button class="btn btn-primary btn-sm" onclick="CharactersTab.giveCurrency()">Give Currency</button></div></div>`}else if(tab==='actions'){ct.innerHTML=`<div class="grid-2 mt-2"><button class="btn btn-warning" onclick="CharactersTab.unlockTech()">Unlock All Tech Tree</button><button class="btn btn-warning" onclick="CharactersTab.wipeCodex()">Wipe Codex</button><button class="btn btn-danger" onclick="CharactersTab.deleteAccount()">Delete Account</button></div>`}},async giveItem(){const t=prompt('Template ID:');const q=parseInt(prompt('Quantity:','1'))||1;if(t){try{await api.players.giveItem(this.playerId,t,q);showToast('Done','success')}catch(e){showToast(e.message,'error')}}},async giveCurrency(){const c=prompt('Currency (Solaris/Scrip):','Solaris');const a=parseInt(prompt('Amount:','1000'))||0;if(c){try{await api.players.giveCurrency(this.playerId,c,a);showToast('Done','success')}catch(e){showToast(e.message,'error')}}},async unlockTech(){try{await api.characters.unlockTechTree(this.playerId);showToast('Unlocked','success')}catch(e){showToast(e.message,'error')}},async wipeCodex(){try{await api.post('/characters/wipe-codex?account_id='+this.playerId);showToast('Wiped','success')}catch(e){showToast(e.message,'error')}},async deleteAccount(){if(confirm('DELETE? Cannot undo!')){try{await api.players.deleteAccount(this.playerId);showToast('Deleted','success');document.getElementById('charEditor').style.display='none'}catch(e){showToast(e.message,'error')}}}};
