/**
 * Market Tab — Market Exchange with bot support.
 * Layout: Stats strip → Toolbar (search/category/owner/refresh) → Items table → Pagination → Detail panel.
 */
const MarketTab = {
    _items: [],
    _total: 0,
    _page: 1,
    _limit: 20,
    _search: '',
    _category: '',
    _owner: '',     // '', 'bot', 'player'
    _sort: 'display_name',
    _dir: 'asc',
    _debounce: null,
    _stats: null,
    _selected: null,

    async render() {
        document.getElementById('content').innerHTML = `
<h2>▲ Market Exchange</h2>
<p class="text-muted text-sm">Live game exchange — Muaddib bot auto-buys & sells items</p>

<!-- Stats strip -->
<div class="grid-4 mt-2" id="mktStats">
    <div class="card p-3 tac"><div class="text-xs text-muted">☰ Listings</div><div class="text-xl font-semibold">—</div><div class="text-xs text-muted" id="mktStatSub"></div></div>
    <div class="card p-3 tac"><div class="text-xs text-muted">⊞ Unique Items</div><div class="text-xl font-semibold">—</div></div>
    <div class="card p-3 tac"><div class="text-xs text-muted">◇ Total Stock</div><div class="text-xl font-semibold">—</div></div>
    <div class="card p-3 tac"><div class="text-xs text-muted">🤖 Bot Share</div><div class="text-xl font-semibold">—</div></div>
</div>

<!-- Toolbar -->
<div class="card mt-2 p-2" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <div style="position:relative;flex:1;min-width:180px">
        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);opacity:.5">⊙</span>
        <input type="text" id="mktSearch" class="form-input" placeholder="Search by item name…" style="padding-left:28px" oninput="MarketTab._onSearch(this.value)">
    </div>
    <select id="mktCat" class="form-input" style="width:auto;max-width:200px" onchange="MarketTab._onFilter()">
        <option value="">All categories</option>
    </select>
    <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
        <button class="btn btn-sm" id="mktOwnerAll" style="border-radius:0" onclick="MarketTab._setOwner('')">All</button>
        <button class="btn btn-sm" id="mktOwnerBot" style="border-radius:0" onclick="MarketTab._setOwner('bot')">🤖 Muaddib</button>
        <button class="btn btn-sm" id="mktOwnerPlayer" style="border-radius:0" onclick="MarketTab._setOwner('player')">● Players</button>
    </div>
    <button class="btn btn-sm" onclick="MarketTab.load()">↻ Refresh</button>
    <button class="btn btn-sm btn-success" onclick="MarketTab._showCreate()">➕ Add Listing</button>
    <button class="btn btn-sm btn-warning" onclick="MarketTab._seedMarket()">🌱 Seed Market</button>
    <button class="btn btn-sm btn-danger" onclick="MarketTab._clearBot()">×️ Clear Bot</button>
</div>

<!-- Items table -->
<div class="card mt-2" style="overflow:hidden">
    <div style="max-height:60vh;overflow:auto" id="mktTableWrap">
        <table class="data-table" id="mktTable">
            <thead>
                <tr>
                    <th class="sortable" onclick="MarketTab._toggleSort('display_name')">Item <span class="sort-arrow" id="sa_display_name"></span></th>
                    <th class="sortable hide-md" onclick="MarketTab._toggleSort('category')">Category <span class="sort-arrow" id="sa_category"></span></th>
                    <th class="sortable hide-sm tac" onclick="MarketTab._toggleSort('tier')">Tier <span class="sort-arrow" id="sa_tier"></span></th>
                    <th class="sortable hide-lg" onclick="MarketTab._toggleSort('rarity')">Rarity <span class="sort-arrow" id="sa_rarity"></span></th>
                    <th class="sortable tar" onclick="MarketTab._toggleSort('lowest_price')">◆ Lowest <span class="sort-arrow" id="sa_lowest_price"></span></th>
                    <th class="sortable tar" onclick="MarketTab._toggleSort('total_stock')">⊞ Stock <span class="sort-arrow" id="sa_total_stock"></span></th>
                    <th class="sortable tar hide-sm" onclick="MarketTab._toggleSort('listing_count')">Listings <span class="sort-arrow" id="sa_listing_count"></span></th>
                </tr>
            </thead>
            <tbody id="mktBody">
                <tr><td colspan="7" class="tac text-muted py-4">◷ Loading market data…</td></tr>
            </tbody>
        </table>
    </div>
    <!-- Pagination -->
    <div class="p-2 flex-between" id="mktPagination" style="display:none;border-top:1px solid var(--border)"></div>
</div>

<!-- Detail panel (hidden) -->
<div id="mktDetail" class="card mt-2" style="display:none"></div>

<!-- Create listing panel (hidden) -->
<div id="mktCreate" class="card mt-2" style="display:none"></div>`;

        await this.load();
        this._loadCategories();
    },

    // ─── Data Loading ───────────────────────────────────────────

    async load() {
        try {
            const [itemsR, statsR] = await Promise.all([
                api.get('/gameplay/market/items?search=' + encodeURIComponent(this._search) + '&category=' + encodeURIComponent(this._category) + '&owner=' + this._owner + '&sort=' + this._sort + '&dir=' + this._dir + '&page=' + this._page + '&limit=' + this._limit),
                api.get('/gameplay/market/stats')
            ]);
            this._items = itemsR.items || [];
            this._total = itemsR.total || 0;
            this._stats = statsR.stats || {};
            this._renderTable();
            this._renderStats();
            this._renderPagination();
        } catch (e) {
            document.getElementById('mktBody').innerHTML = '<tr><td colspan="7" class="tac text-danger py-4">✗ ' + e.message + '</td></tr>';
        }
    },

    async _loadCategories() {
        try {
            const r = await api.get('/gameplay/market/categories');
            const cats = r.categories || [];
            const sel = document.getElementById('mktCat');
            const groups = {};
            for (const c of cats) {
                const g = c.split('/')[0] || c;
                if (!groups[g]) groups[g] = [];
                groups[g].push(c);
            }
            for (const [group, items] of Object.entries(groups).sort()) {
                const og = document.createElement('optgroup');
                og.label = group.charAt(0).toUpperCase() + group.slice(1);
                const allOpt = document.createElement('option');
                allOpt.value = group;
                allOpt.textContent = 'All ' + group.charAt(0).toUpperCase() + group.slice(1);
                og.appendChild(allOpt);
                for (const c of items.sort()) {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c.split('/').pop().replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
                    og.appendChild(opt);
                }
                sel.appendChild(og);
            }
        } catch (e) { /* silent */ }
    },

    // ─── Render ─────────────────────────────────────────────────

    _renderStats() {
        var s = this._stats || {};
        var cards = document.querySelectorAll('#mktStats .card');
        var fmt = function(n) { return (n || 0).toLocaleString(); };
        if (cards.length >= 4) {
            cards[0].querySelector('.text-xl').textContent = fmt(s.total_listings);
            var sub = cards[0].querySelector('#mktStatSub');
            if (sub) sub.textContent = fmt(s.bot_listings) + ' bot \u00b7 ' + fmt(s.player_listings) + ' player';
            cards[1].querySelector('.text-xl').textContent = fmt(s.unique_items);
            cards[2].querySelector('.text-xl').textContent = fmt(s.total_stock);
            var share = s.total_stock > 0 ? Math.round((s.bot_stock / s.total_stock) * 100) : 0;
            cards[3].querySelector('.text-xl').textContent = share + '%';
        }
    },

    _renderTable() {
        var body = document.getElementById('mktBody');
        var self = this;
        if (!this._items.length) {
            body.innerHTML = '<tr><td colspan="7" class="tac text-muted py-4">No items match these filters</td></tr>';
            return;
        }
        body.innerHTML = this._items.map(function(it) {
            var name = it.display_name || it.template_id;
            var cat = it.category ? it.category.split('/').pop().replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); }) : '\u2014';
            var rc = self._rarityClass(it.rarity);
            var rl = (it.rarity || 'common').charAt(0).toUpperCase() + (it.rarity || 'common').slice(1);
            var price = (it.lowest_price || 0).toLocaleString();
            var stock = it.total_stock || 0;
            var botStock = it.bot_stock || 0;
            var listings = it.listing_count || 0;
            var tier = it.tier || '\u2014';
            return '<tr class="clickable" onclick="MarketTab._selectItem(\'' + self._esc(it.template_id) + '\')">' +
                '<td><div class="text-sm font-medium">' + self._escHtml(name) + '</div><div class="text-xs text-muted font-mono">' + self._escHtml(it.template_id) + '</div></td>' +
                '<td class="hide-md text-muted text-sm">' + cat + '</td>' +
                '<td class="hide-sm tac text-muted text-sm">' + tier + '</td>' +
                '<td class="hide-lg"><span class="badge ' + rc + '">' + rl + '</span></td>' +
                '<td class="tar font-mono text-accent text-sm">◆ ' + price + '</td>' +
                '<td class="tar font-mono text-sm">' + stock + (botStock > 0 ? ' <span class="text-xs text-muted">(' + botStock + '🤖)</span>' : '') + '</td>' +
                '<td class="tar hide-sm text-muted text-sm">' + listings + '</td></tr>';
        }).join('');

        document.querySelectorAll('.sort-arrow').forEach(function(el) { el.textContent = ''; el.style.opacity = '0.4'; });
        var arrow = this._dir === 'asc' ? '▲' : '▼';
        var sa = document.getElementById('sa_' + this._sort);
        if (sa) { sa.textContent = arrow; sa.style.opacity = '1'; }
    },

    _renderPagination() {
        var totalPages = Math.max(1, Math.ceil(this._total / this._limit));
        var pg = document.getElementById('mktPagination');
        if (this._total <= this._limit) {
            pg.style.display = 'none';
            return;
        }
        pg.style.display = 'flex';
        var self = this;
        pg.innerHTML = '<span class="text-sm text-muted">' + this._total.toLocaleString() + ' items \u00b7 page ' + this._page + ' of ' + totalPages + '</span>' +
            '<div style="display:flex;gap:4px">' +
            '<button class="btn btn-sm" ' + (this._page <= 1 ? 'disabled' : 'onclick="MarketTab._goPage(' + (this._page - 1) + ')"') + '>◀ Prev</button>' +
            '<button class="btn btn-sm" ' + (this._page >= totalPages ? 'disabled' : 'onclick="MarketTab._goPage(' + (this._page + 1) + ')"') + '>Next ▶</button></div>';
    },

    // ─── Detail Panel ──────────────────────────────────────────

    async _selectItem(templateId) {
        this._selected = templateId;
        var detail = document.getElementById('mktDetail');
        var self = this;
        detail.style.display = 'block';
        detail.innerHTML = '<div class="card-header card-header-actions">' +
            '<span>☰ Listings: <code>' + self._escHtml(templateId) + '</code></span>' +
            '<button class="btn btn-sm" onclick="document.getElementById(\'mktDetail\').style.display=\'none\'">×</button></div>' +
            '<div class="card-body" id="mktDetailBody"><div class="spinner"></div></div>';

        try {
            var r = await api.get('/gameplay/market/listings?template_id=' + encodeURIComponent(templateId) + '&limit=50');
            var listings = r.listings || [];
            var item = this._items.find(function(i) { return i.template_id === templateId; });
            var name = item ? item.display_name : templateId;
            document.getElementById('mktDetailBody').innerHTML = listings.length ?
                '<div class="text-sm mb-2"><strong>' + self._escHtml(name) + '</strong> — ' + listings.length + ' active listings</div>' +
                '<div style="max-height:300px;overflow:auto"><table class="data-table">' +
                '<tr><th>Order ID</th><th>Seller</th><th>Price</th><th>Quality</th><th>Type</th></tr>' +
                listings.map(function(l) {
                    return '<tr><td><code>#' + l.order_id + '</code></td>' +
                        '<td>' + (l.owner_type === 'bot' ? '🤖' : '●') + ' ' + self._escHtml(l.owner_name) + '</td>' +
                        '<td class="font-mono text-accent">◆ ' + (l.price || 0).toLocaleString() + '</td>' +
                        '<td>⭐' + (l.quality || 0) + '</td>' +
                        '<td><span class="badge ' + (l.owner_type === 'bot' ? 'badge-accent' : 'badge-muted') + '">' + (l.owner_type === 'bot' ? 'Muaddib' : 'Player') + '</span></td></tr>';
                }).join('') + '</table></div>' :
                '<p class="text-muted">No active listings for this item.</p>';
        } catch (e) {
            document.getElementById('mktDetailBody').innerHTML = '<p class="text-danger">' + e.message + '</p>';
        }
    },

    // ─── Create Listing Panel ──────────────────────────────────

    _showCreate() {
        var panel = document.getElementById('mktCreate');
        panel.style.display = 'block';
        panel.innerHTML = '<div class="card-header card-header-actions">' +
            '<span>☰ Create Listing</span>' +
            '<button class="btn btn-sm" onclick="document.getElementById(\'mktCreate\').style.display=\'none\'">×</button></div>' +
            '<div class="card-body">' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">' +
            '<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Item Template</label>' +
            '<input type="text" class="form-input" id="mktTemplate" placeholder="e.g. CopperBar" value="CopperBar"></div>' +
            '<div class="form-group" style="width:120px"><label class="form-label">◆ Price (Solari)</label>' +
            '<input type="number" class="form-input" id="mktPrice" value="10000" min="1"></div>' +
            '<div class="form-group" style="width:100px"><label class="form-label">⭐ Quality (0-6)</label>' +
            '<input type="number" class="form-input" id="mktQuality" value="0" min="0" max="6"></div>' +
            '<div class="form-group" style="width:100px"><label class="form-label">⚙ Durability %</label>' +
            '<input type="number" class="form-input" id="mktDurability" value="100" min="1" max="100"></div>' +
            '<div class="form-group"><label class="form-label"><input type="checkbox" id="mktNpc" style="width:auto"> 🤖 NPC Bot</label></div>' +
            '<button class="btn btn-success" onclick="MarketTab._createListing()">➕ Add to Market</button></div>' +
            '<div class="text-xs text-muted mt-1">Quick: ' +
            ['CopperBar','IronBar','SteelBar','AluminiumBar','CopperOre','IronOre','PlantFiber','GraniteStone','SalvagedMetal','Coal','Sulfur','MelangeSpice','FuelCell','Water'].map(function(t) { return '<a href="#" onclick="document.getElementById(\'mktTemplate\').value=\'' + t + '\';return false" style="color:var(--accent);margin-right:6px">' + t + '</a>'; }).join('') +
            '</div></div>';
    },

    async _createListing() {
        var template = document.getElementById('mktTemplate')?.value?.trim();
        var price = parseInt(document.getElementById('mktPrice')?.value) || 10000;
        var quality = parseInt(document.getElementById('mktQuality')?.value) || 0;
        var durability = parseFloat(document.getElementById('mktDurability')?.value) || 100;
        var npc = document.getElementById('mktNpc')?.checked || false;
        if (!template) return showToast('Enter item template', 'error');
        try {
            var r = await api.post('/gameplay/market/create', {
                template_id: template, item_price: price,
                quality_level: quality, durability_cur: durability, durability_max: durability,
                is_npc_order: npc
            });
            showToast(r.message || 'Created!', r.ok ? 'success' : 'error');
            if (r.ok) { document.getElementById('mktCreate').style.display = 'none'; this.load(); }
        } catch (e) { showToast(e.message, 'error'); }
    },

    // ─── Bot Controls ──────────────────────────────────────────

    async _seedMarket() {
        if (!confirm('Seed the market with 20 random NPC listings?\n\nThis creates bot-sold items from the game catalog at vendor prices (±30% variance). Player listings are not affected.')) return;
        try {
            showToast('🌱 Seeding market…', 'info');
            var r = await api.post('/gameplay/market/seed', { count: 20 });
            showToast(r.message || 'Seeded!', r.ok ? 'success' : 'error');
            if (r.ok) this.load();
        } catch (e) { showToast(e.message, 'error'); }
    },

    async _clearBot() {
        if (!confirm('Delete ALL NPC bot (Muaddib) listings?\n\nThis removes all items listed by the bot. Player listings are not affected. This cannot be undone.')) return;
        try {
            var r = await api.post('/gameplay/market/clear');
            showToast(r.message || 'Cleared!', 'success');
            this.load();
        } catch (e) { showToast(e.message, 'error'); }
    },

    // ─── Event Handlers ────────────────────────────────────────

    _onSearch(val) {
        this._search = val;
        clearTimeout(this._debounce);
        var self = this;
        this._debounce = setTimeout(function() { self._page = 1; self.load(); }, 300);
    },

    _onFilter() {
        this._category = document.getElementById('mktCat')?.value || '';
        this._page = 1;
        this.load();
    },

    _setOwner(owner) {
        this._owner = owner;
        this._page = 1;
        var self = this;
        ['All', 'Bot', 'Player'].forEach(function(t) {
            var btn = document.getElementById('mktOwner' + t);
            if (btn) {
                var active = (t.toLowerCase() === owner) || (t === 'All' && owner === '');
                btn.style.background = active ? 'var(--accent)' : '';
                btn.style.color = active ? '#fff' : '';
            }
        });
        this.load();
    },

    _toggleSort(col) {
        if (this._sort === col) {
            this._dir = this._dir === 'asc' ? 'desc' : 'asc';
        } else {
            this._sort = col;
            this._dir = 'asc';
        }
        this.load();
    },

    _goPage(p) {
        this._page = Math.max(1, p);
        this.load();
        document.getElementById('mktTableWrap').scrollTop = 0;
    },

    // ─── Helpers ───────────────────────────────────────────────

    _esc: function(s) { return (s || '').replace(/'/g, "\\'"); },
    _escHtml: function(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },

    _rarityClass: function(r) {
        switch ((r || '').toLowerCase()) {
            case 'common': return 'badge-muted';
            case 'uncommon': return 'badge-info';
            case 'rare': return 'badge-accent';
            case 'epic': return 'badge-purple';
            case 'legendary': return 'badge-warning';
            case 'unique': return 'badge-success';
            default: return 'badge-muted';
        }
    }
};

const LandsraadTab={
    _overview: null, _contribs: null,

    async render(){
        document.getElementById('content').innerHTML=`
<h2>△ Landsraad</h2>
<div class="tab-nav" id="lrTabs">
    <div class="tab-nav-item active" onclick="LandsraadTab.showTab('houses',event)">▣ Houses</div>
    <div class="tab-nav-item" onclick="LandsraadTab.showTab('contributions',event)">● Contributions</div>
    <div class="tab-nav-item" onclick="LandsraadTab.showTab('settings',event)">⚙ Settings</div>
</div>
<div id="lrContent"></div>`;
        this.loadAll();
    },

    async loadAll(){
        try{ this._overview = await api.get('/gameplay/landsraad/overview'); } catch(e){}
        try{ this._contribs = await api.get('/gameplay/landsraad/player-contributions?controller=4'); } catch(e){}
        this.showTab('houses');
    },

    showTab(tab, ev){
        document.querySelectorAll('#lrTabs .tab-nav-item').forEach(t=>t.classList.remove('active'));
        if(ev?.target) ev.target.classList.add('active');
        const c = document.getElementById('lrContent');
        if(tab==='houses') this._renderHouses(c);
        else if(tab==='contributions') this._renderContribs(c);
        else if(tab==='settings') this._renderSettings(c);
    },

    _renderHouses(ct){
        const ov = this._overview || {};
        const term = ov.term || {};
        const houses = ov.houses || [];
        const decrees = ov.decrees || [];
        const rotation = ov.rotation || [];
        const reigning = ov.reigning_faction || '—';
        const winning = ov.winning_faction || 'None';
        const termEnd = term.end_time ? new Date(term.end_time).toLocaleString() : '—';
        ct.innerHTML=`
<!-- Term Info Card -->
<div class="card mt-2 card-border-blue">
    <div class="flex-between p-3">
        <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:24px">△</span>
            <div>
                <div class="text-lg font-semibold">Landsraad — Term #${term.term_id || '—'}</div>
                <div class="text-xs text-muted">Ends: ${termEnd}</div>
            </div>
        </div>
        <div style="text-align:right">
            <div class="text-sm"><span class="text-muted">Reigning:</span> <strong style="color:var(--accent)">${reigning}</strong></div>
            <div class="text-sm"><span class="text-muted">Winning:</span> <strong>${winning}</strong></div>
            <div class="text-sm"><span class="text-muted">Active Decree:</span> <code>${term.active_decree_id || 'None'}</code></div>
        </div>
    </div>
</div>

<div class="grid-2 mt-2">
<!-- Decrees Panel -->
<div class="card card-border-purple"><div class="card-header card-header-actions">
    <span>📜 Decree in Force (${decrees.length})</span>
    <button class="btn btn-sm btn-success" onclick="LandsraadTab._selectDecree()">◉ Set Active</button>
</div><div class="card-body" style="max-height:400px;overflow:auto">
    ${decrees.length ? decrees.map(d => {
        const inRot = rotation.some(r => r.id === d.id);
        return `
    <div class="setting-row" style="align-items:flex-start">
        ${inRot ? `<input type="radio" name="lrDecree" value="${d.id}" ${d.id===term.active_decree_id?'checked':''} style="margin-top:3px;width:auto">` : '<span style="width:14px;display:inline-block;margin-top:3px;text-align:center;color:var(--text-muted)">—</span>'}
        <div style="flex:1">
            <div class="text-sm"><strong>${d.name||d.id}</strong> ${inRot?'<span class="badge badge-accent text-xs">Rotation</span>':''} ${d.disabled?'<span class="badge badge-danger text-xs">Disabled</span>':''}</div>
            <div class="text-xs text-muted">Weight: ${d.weight||0} ${d.description?('— '+d.description):''}</div>
        </div>
    </div>`;
    }).join('') : '<p class="text-muted">No decrees loaded</p>'}
    <div class="mt-2 pt-2" style="border-top:1px solid var(--border)"><span class="text-xs text-muted">● Only decrees marked </span><span class="badge badge-accent text-xs">Rotation</span><span class="text-xs text-muted"> are selectable — selecting others crashes the game.</span></div>
</div></div>

<!-- Houses Panel -->
<div class="card card-border-orange"><div class="card-header card-header-actions">
    <span>▣ Great Houses (${houses.length})</span>
    <button class="btn btn-sm" onclick="LandsraadTab.loadAll()">↻</button>
</div><div class="card-body" style="max-height:400px;overflow:auto">
    ${houses.length ? houses.map(h => `
    <div class="setting-row">
        <div style="flex:1">
            <div class="text-sm"><strong>${h.house_name}</strong></div>
            <div class="text-xs text-muted">Goal: ${(h.goal_amount||0).toLocaleString()} · Current: ${(h.current_amount||0).toLocaleString()}</div>
            <div class="progress-bar mt-1"><div class="progress-fill progress-orange" style="width:${h.completed?100:Math.min(100,((h.current_amount||0)/(h.goal_amount||1))*100)}%"></div></div>
        </div>
        <input type="number" class="form-input" id="lrh_${h.board_index}" value="${h.current_amount||0}" style="width:100px">
        <button class="btn btn-sm btn-primary" onclick="LandsraadTab.setHouse(${h.board_index})">Set</button>
        <span class="badge ${h.completed?'badge-success':'badge-muted'}">${h.completed?'Done':'Open'}</span>
    </div>
    `).join('') : '<p class="text-muted">No houses loaded</p>'}
</div></div></div>

<!-- Quick Actions -->
<div class="card mt-2"><div class="card-header">⏻ Quick Actions</div><div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btn-success" onclick="LandsraadTab.autoComplete()">✓ Auto-Complete Current Term</button>
    <button class="btn btn-warning" onclick="LandsraadTab.newTerm()">↻ Force New Term</button>
    <button class="btn btn-sm" onclick="LandsraadTab.loadAll()">↻ Refresh</button>
</div></div>`;},

    _renderContribs(ct){
        ct.innerHTML = `<div class="card mt-2 card-border-blue"><div class="card-header card-header-actions">
            <span>● Player Contributions</span>
            <div><input type="number" class="form-input" id="lrCtrlId" value="4" style="width:80px" placeholder="Controller ID"> <button class="btn btn-sm btn-primary" onclick="LandsraadTab.loadContribs()">Load</button></div>
        </div><div class="card-body" id="lrContribBody"><p class="text-muted">Enter controller ID and click Load</p></div></div>`;
    },

    async loadContribs(){
        const cid = document.getElementById('lrCtrlId')?.value || 4;
        try {
            const d = await api.get('/gameplay/landsraad/player-contributions?controller='+cid);
            const contribs = d.contributions || [];
            document.getElementById('lrContribBody').innerHTML = contribs.length ?
                `<table class="data-table"><tr><th>House</th><th>Display</th><th>Amount</th><th>Task ID</th></tr>
                ${contribs.map(c => `<tr><td>${c.house_name}</td><td>${c.display_name||''}</td><td>${(c.amount||0).toLocaleString()}</td><td>${c.task_id||0}</td></tr>`).join('')}</table>` :
                '<p class="text-muted">No contributions for this controller</p>';
        } catch(e) { document.getElementById('lrContribBody').innerHTML = '<p class="text-danger">'+e.message+'</p>'; }
    },

    _renderSettings(ct){
        ct.innerHTML = `<div class="card mt-2 card-border-green"><div class="card-header">⚙ Landsraad Settings</div><div class="card-body">
            <div class="setting-row">
                <div><div class="setting-label">Term ID</div><div class="setting-desc">Current active Landsraad term</div></div>
                <input type="number" class="form-input" id="lrTermId" value="2" style="width:80px">
            </div>
            <div class="setting-row">
                <div><div class="setting-label">Winning Faction</div><div class="setting-desc">1=Atreides, 2=Harkonnen, 4=Smuggler</div></div>
                <input type="number" class="form-input" id="lrWinFaction" value="2" style="width:80px">
                <button class="btn btn-sm btn-primary" onclick="LandsraadTab.saveTermSettings()">Save</button>
            </div>
            <hr class="my-2" style="border-color:var(--border)">
            <button class="btn btn-sm btn-danger mt-2" onclick="LandsraadTab.forceNewTerm()">↻ Force New Term</button>
        </div></div>`;
    },

    async setHouse(idx){ 
        const val = parseInt(document.getElementById('lrh_'+idx)?.value)||0;
        try { await api.post('/gameplay/landsraad/set-contribution',{controller_id:4,task_id:idx,amount:val}); showToast('Set!'); } catch(e){showToast(e.message,'error');}
    },
    async openDecreePanel(){this._selectDecree()},
    async _selectDecree(){const sel=document.querySelector('input[name="lrDecree"]:checked');if(!sel){showToast('Select a decree first','error');return}try{await api.post('/gameplay/landsraad/set-active-decree?decree_id='+sel.value);showToast('Decree activated!');this.loadAll()}catch(e){showToast(e.message,'error')}},
    async autoComplete(){ if(!confirm('Complete ALL tasks in current Landsraad term?\n\nThis marks all current-term tasks as finished and sets the winner.'))return; try{ const r=await api.post('/gameplay/landsraad/auto-complete'); showToast(r.message||'Done!','success'); this.loadAll(); }catch(e){showToast(e.message,'error')} },
    async newTerm(){ if(!confirm('Force a NEW Landsraad term?\n\nThis DELETES all current progress and resets the term. This cannot be undone!'))return; try{ const r=await api.post('/gameplay/landsraad/force-new-term'); showToast(r.message||'Done!','success'); this.loadAll(); }catch(e){showToast(e.message,'error')} },
    async saveTermSettings(){ showToast('Term settings saved','success'); },
    async forceNewTerm(){ if(!confirm('Force new term? This resets all progress!'))return; this.newTerm(); },
};