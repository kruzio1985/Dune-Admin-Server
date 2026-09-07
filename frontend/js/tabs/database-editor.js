// Database Editor tab — direct player save editing
const DatabaseEditorTab = {
    _selectedPlayer: null,

    _escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
    _escAttr(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },

    async render() {
        document.getElementById('content').innerHTML = `
            <h2>⚙ Database Editor</h2>
            <p class="text-muted mb-3">Direct player save editing — unlock recipes, grant keystones, set levels, and more.
            <strong class="text-warning">△ Player must be OFFLINE for most operations.</strong></p>

            <div class="card mb-3"><div class="card-header">⊙ Select Player</div><div class="card-body">
                <div class="flex gap-2">
                    <input type="text" class="form-input" id="dbEditorSearch" placeholder="Search by name or FLS ID..."
                        oninput="DatabaseEditorTab.searchPlayers()" style="width:350px">
                    <button class="btn btn-ghost btn-sm" onclick="DatabaseEditorTab.searchPlayers()">⊙ Search</button>
                </div>
                <div id="dbEditorPlayerList" class="mt-2" style="max-height:200px;overflow:auto"></div>
            </div></div>

            <div id="dbEditorActions" style="display:none">
                <div class="card mb-3"><div class="card-header">☰ Player Info</div>
                <div class="card-body" id="dbEditorPlayerInfo"></div></div>

                <div class="card mb-3"><div class="card-header">⏻ Quick Actions</div><div class="card-body">
                    <div class="flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-success btn-lg" onclick="DatabaseEditorTab.godMode()">🔥 GOD MODE — Unlock Everything</button>
                        <span class="text-xs text-muted" style="align-self:center">(requires typing: GODMODE)</span>
                    </div>
                    <div class="grid-3">
                        <button class="btn btn-primary" onclick="DatabaseEditorTab.grantKeystones()">⭐ Grant All Keystones (205)</button>
                        <button class="btn btn-primary" onclick="DatabaseEditorTab.unlockRecipes()">◻ Unlock All Recipes</button>
                        <button class="btn btn-primary" onclick="DatabaseEditorTab.maxSpecs()">◇ Max All Specs (Lv100)</button>
                        <button class="btn btn-warning" onclick="DatabaseEditorTab.setLevel()">◇ Set Level</button>
                        <button class="btn btn-warning" onclick="DatabaseEditorTab.maxCurrency()">◆ Max Currency</button>
                        <button class="btn btn-warning" onclick="DatabaseEditorTab.grantJobSkills()">⚙ Grant All Job Skills</button>
                        <button class="btn btn-danger" onclick="DatabaseEditorTab.resetKeystones()">×️ Reset Keystones</button>
                    </div>
                </div></div>

                <div class="card"><div class="card-header">☰ Operation Log</div>
                <div class="card-body" id="dbEditorLog" style="font-family:var(--font-mono);font-size:12px;max-height:200px;overflow:auto">
                    <span class="text-muted">No operations yet</span>
                </div></div>
            </div>
        `;
    },

    async searchPlayers() {
        const q = document.getElementById('dbEditorSearch').value.trim();
        if (!q) return;
        try {
            const r = await api.get('/database-editor/players/search?q=' + encodeURIComponent(q) + '&limit=15');
            const list = document.getElementById('dbEditorPlayerList');
            if (!r.players || !r.players.length) {
                list.innerHTML = '<p class="text-muted">No players found</p>';
                return;
            }
            list.innerHTML = '<table class="data-table"><tr><th>Name</th><th>FLS ID</th><th>Level</th><th>Status</th><th></th></tr>' +
                r.players.map(p => `<tr>
                    <td>${this._escHtml(p.character_name||'Unknown')}</td>
                    <td>${p.fls_id||'-'}</td>
                    <td>${p.level||0}</td>
                    <td><span class="badge badge-${p.online_status?'success':'secondary'}">${p.online_status?'Online':'Offline'}</span></td>
                    <td><button class="btn btn-sm btn-primary db-editor-select" data-pid="${p.player_controller_id}" data-pname="${this._escAttr(p.character_name||'Unknown')}">Select</button></td>
                </tr>`).join('') + '</table>';
            // Attach click handlers safely (avoids XSS via inline onclick)
            list.querySelectorAll('.db-editor-select').forEach(btn => {
                btn.onclick = () => this.selectPlayer(btn.dataset.pid, btn.dataset.pname);
            });
        } catch(e) { showToast(e.message, 'error'); }
    },

    async selectPlayer(id, name) {
        this._selectedPlayer = { id, name };
        document.getElementById('dbEditorActions').style.display = 'block';
        this.log(`Selected: ${name} (ID: ${id})`);

        try {
            const r = await api.get('/database-editor/player/' + id + '/info');
            const p = r.player || {};
            const specs = (p.specs||[]).map(s => `${s.track}: Lv${s.level||0}`).join(', ') || 'None';
            document.getElementById('dbEditorPlayerInfo').innerHTML = `
                <p><strong>Name:</strong> ${p.character_name||'?'} &nbsp;|&nbsp;
                <strong>FLS:</strong> ${p.fls_id||'-'} &nbsp;|&nbsp;
                <strong>Level:</strong> ${p.level||0}</p>
                <p><strong>Keystones:</strong> ${p.keystone_count||0}/205 &nbsp;|&nbsp;
                <strong>Specs:</strong> ${specs}</p>
                <p><strong>Online:</strong> <span class="badge badge-${p.online_status?'warning':'success'}">${p.online_status?'△ ONLINE — stop game first!':'✓ Offline'}</span></p>
            `;
        } catch(e) {
            document.getElementById('dbEditorPlayerInfo').innerHTML = `<p><strong>Name:</strong> ${name} (ID: ${id})</p><p class="text-muted">Detail fetch failed — edit actions still available</p>`;
        }
    },

    async godMode() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        if (!safeConfirm(`GOD MODE: Unlock EVERYTHING for ${this._selectedPlayer.name}?\n\nThis will:\n- Grant all 205 keystones\n- Unlock all recipes\n- Max all 5 specs (Lv100)\n- Set level 60\n- Max currency (9,999,999)\n- Grant all job skills`, 'GODMODE')) return;
        try {
            const r = await api.post('/database-editor/player/god-mode', { player_id: this._selectedPlayer.id });
            this.log('🔥 GOD MODE: ' + r.ok);
            if (r.details) r.details.forEach(d => this.log(d));
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async grantKeystones() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        try {
            const r = await api.post('/database-editor/player/grant-keystones', { player_id: this._selectedPlayer.id });
            this.log('⭐ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async resetKeystones() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        if (!safeConfirm(`Delete ALL keystones from ${this._selectedPlayer.name}?`, 'DELETE')) return;
        try {
            const r = await api.post('/database-editor/player/reset-keystones', { player_id: this._selectedPlayer.id });
            this.log('×️ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async unlockRecipes() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        try {
            const r = await api.post('/database-editor/player/unlock-recipes', { player_id: this._selectedPlayer.id });
            this.log('◻ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async maxSpecs() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        try {
            const r = await api.post('/database-editor/player/max-specs', { player_id: this._selectedPlayer.id });
            this.log('◇ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async setLevel() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        const level = prompt('Set level (1-60):', '60');
        if (!level) return;
        try {
            const r = await api.post('/database-editor/player/set-level?level=' + level, { player_id: this._selectedPlayer.id });
            this.log('◇ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async maxCurrency() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        try {
            const r = await api.post('/database-editor/player/max-currency', { player_id: this._selectedPlayer.id });
            this.log('◆ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async grantJobSkills() {
        if (!this._selectedPlayer) return showToast('Select a player first', 'error');
        try {
            const r = await api.post('/database-editor/player/grant-job-skills', { player_id: this._selectedPlayer.id });
            this.log('⚙ ' + r.ok);
            showToast(r.ok, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    log(msg) {
        const el = document.getElementById('dbEditorLog');
        if (!el) return;
        const time = new Date().toLocaleTimeString();
        if (el.querySelector('.text-muted')) el.innerHTML = '';
        el.innerHTML += `<div>[${time}] ${msg}</div>`;
        el.scrollTop = el.scrollHeight;
    }
};
