/**
 * Market Bot Tab — Muaddib: Buy/List/Pricing sub-tabs.
 */
const MarketBotTab = {
    _status: null,
    _config: null,
    _draft: null,
    _sub: 'buy',
    _loading: true,
    _saving: false,
    _tickResult: null,
    _ticking: false,
    _listTickResult: null,
    _listTicking: false,
    _balanceBusy: false,
    _snapshot: null,
    _snapshotLoading: false,
    _clearing: false,
    _seeding: false,

    async render() {
        const self = this;
        document.getElementById('content').innerHTML = `
<h2>⊗ Market Bot — Muaddib</h2>
<p class="text-muted text-sm">Native VM bot — buy/sell ticks, sane pricing, dice-roll buys</p>

<!-- Info banner -->
<div class="card p-3 mt-2 text-xs text-muted" style="border-left:2px solid var(--accent)">
    <strong>Muaddib</strong> — autonomiczny bot kupna/sprzedaży. Na każdym <strong>buy ticku</strong> rzuca <span class="font-mono text-accent">d<span id="mbDieSize">12</span></span>; tylko wynik <span class="font-mono text-accent" id="mbDieTarget">5</span> kupuje item.
    <br>💡 <strong>Instalacja autonomicznego bota na VM:</strong>
    <code style="cursor:pointer;color:var(--accent)" onclick="navigator.clipboard.writeText('scp scripts/install-bot.sh dune@192.168.1.100:/tmp/ && ssh dune@192.168.1.100 \"bash /tmp/install-bot.sh\"');showToast('☰ Skopiowane! Wklej w PowerShell (Admin)','success')">☰ scp scripts/install-bot.sh dune@192.168.1.100:/tmp/ && ssh dune@192.168.1.100 "bash /tmp/install-bot.sh"</code>
</div>

<!-- Status cards -->
<div class="grid-4 mt-2" id="mbStats">
    <div class="card p-3" id="mbStateCard">
        <div class="flex-between"><span class="text-xs text-muted">Bot state</span><span>🤖</span></div>
        <div class="text-xl font-semibold mt-1" id="mbState">—</div>
        <div class="text-xs text-muted" id="mbProvisioned"></div>
    </div>
    <div class="card p-3" id="mbListingsCard">
        <div class="flex-between"><span class="text-xs text-muted">Muaddib listings</span><span>☰</span></div>
        <div class="text-xl font-semibold mt-1" id="mbListings">—</div>
    </div>
    <div class="card p-3" id="mbBalanceCard">
        <div class="flex-between"><span class="text-xs text-muted">Balance</span><span>◆</span></div>
        <div class="text-xl font-semibold mt-1" id="mbBalance">—</div>
    </div>
    <div class="card p-3" id="mbPricingCard">
        <div class="flex-between"><span class="text-xs text-muted">Pricing mode</span><span>🛡️</span></div>
        <div class="text-xl font-semibold mt-1" id="mbPricing">—</div>
        <div class="text-xs text-muted" id="mbPricingDesc"></div>
    </div>
</div>

<!-- Sub-tab nav -->
<div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin:12px 0" id="mbSubNav">
    <button class="mb-subtab active" data-sub="buy" onclick="MarketBotTab._setSub('buy')">🎲 Buy side</button>
    <button class="mb-subtab" data-sub="list" onclick="MarketBotTab._setSub('list')">☰ List side</button>
    <button class="mb-subtab" data-sub="pricing" onclick="MarketBotTab._setSub('pricing')">◇ Pricing rules</button>
    <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
        <button class="btn btn-sm" onclick="MarketBotTab.load()">↻ Refresh</button>
    </div>
</div>

<!-- Sub-tab content -->
<div id="mbContent"><div class="spinner"></div></div>

<!-- Save bar (fixed at bottom) -->
<div id="mbSaveBar" style="display:none;position:sticky;bottom:0;background:var(--bg);padding:8px 0;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px">
    <button class="btn btn-primary" id="mbSaveBtn" onclick="MarketBotTab._save()">⊞ Save config</button>
    <button class="btn btn-sm" onclick="MarketBotTab._revert()">↩ Revert</button>
    <button class="btn btn-sm" onclick="MarketBotTab._resetDefaults()">↻ Reset to defaults</button>
    <span id="mbSaveMsg" class="text-xs text-success"></span>
    <span id="mbSaveErr" class="text-xs text-danger"></span>
    <span id="mbDirty" class="text-xs text-warning" style="margin-left:auto;display:none">Unsaved changes</span>
</div>`;
        await this.load();
    },

    // ─── Data loading ───────────────────────────────────────────

    async load() {
        this._loading = true;
        try {
            const [status, config] = await Promise.all([
                api.get('/gameplay/market-bot/status'),
                api.get('/gameplay/market-bot/config')
            ]);
            this._status = status;
            this._config = config;
            this._draft = JSON.parse(JSON.stringify(config));  // deep clone
            this._renderStats();
            this._renderSub();
        } catch (e) {
            document.getElementById('mbContent').innerHTML = '<p class="text-danger">' + e.message + '</p>';
        } finally {
            this._loading = false;
        }
    },

    // ─── Stats ──────────────────────────────────────────────────

    _renderStats() {
        const s = this._status || {};
        const fmt = n => (n || 0).toLocaleString();
        const fmtSol = n => {
            if (!n) return '—';
            if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
            if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
            if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
            return fmt(n);
        };

        const stateEl = document.getElementById('mbState');
        stateEl.textContent = s.running ? 'Running' : 'Stopped';
        stateEl.style.color = s.running ? 'var(--accent-green)' : 'var(--text-muted)';
        document.getElementById('mbProvisioned').textContent = s.provisioned ? 'provisioned' : 'not provisioned';
        document.getElementById('mbListings').textContent = fmt(s.listing_count);
        document.getElementById('mbBalance').textContent = s.balance != null ? fmtSol(s.balance) + ' ◆' : '—';

        const cfg = this._config || {};
        const up = cfg.upstream_pricing;
        document.getElementById('mbPricing').textContent = up ? 'Upstream' : 'Sane';
        document.getElementById('mbPricing').style.color = up ? 'var(--accent-orange)' : 'var(--accent-green)';
        document.getElementById('mbPricingDesc').textContent = up ? 'vendor × rarity, uncapped' : '100k Solari cap';

        document.getElementById('mbDieSize').textContent = cfg.die_size || 12;
        document.getElementById('mbDieTarget').textContent = cfg.die_target || 5;
    },

    // ─── Sub-tabs ───────────────────────────────────────────────

    _setSub(sub) {
        this._sub = sub;
        document.querySelectorAll('.mb-subtab').forEach(b => {
            b.classList.toggle('active', b.dataset.sub === sub);
        });
        this._renderSub();
    },

    _renderSub() {
        const ct = document.getElementById('mbContent');
        switch (this._sub) {
            case 'buy': this._renderBuy(ct); break;
            case 'list': this._renderList(ct); break;
            case 'pricing': this._renderPricing(ct); break;
        }
        this._updateSaveBar();
    },

    // ═══════════ BUY SIDE ═══════════

    _renderBuy(ct) {
        const d = this._draft || {};
        const tick = this._tickResult;
        ct.innerHTML = `
<!-- Run Buy Tick -->
<div class="card p-3 mb-2">
    <div class="flex-between mb-2">
        <span class="text-xs text-muted">🎲 Run a buy tick</span>
        <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="MarketBotTab._doTick(true)" ${this._ticking ? 'disabled' : ''}>⊕ Dry run</button>
            <button class="btn btn-sm btn-primary" onclick="MarketBotTab._doTick(false)" ${this._ticking ? 'disabled' : ''}>▶ Run now</button>
        </div>
    </div>
    <p class="text-xs text-muted">Dry run rolls the dice and reports what it <em>would</em> buy without touching the database.</p>
    ${tick ? this._tickResultHtml(tick) : ''}
</div>

<!-- Bot enabled + intervals -->
<div class="card p-3 mb-2 grid-3">
    ${this._toggle('Bot enabled', d.enabled, 'enabled')}
    ${this._num('Buy tick (s)', d.buy_tick_interval || 300, 'buy_tick_interval')}
    ${this._num('Max buys / tick', d.max_buys_per_tick || 25, 'max_buys_per_tick')}
</div>

<!-- Dice roll -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">🎲 Dice roll buy</h4>
    <p class="text-xs text-muted mb-2">Each candidate rolls 1–<span class="font-mono">${d.die_size || 12}</span>; only the winning number buys.</p>
    <div class="grid-2">
        ${this._num('Die size', d.die_size || 12, 'die_size')}
        ${this._num('Winning number', d.die_target || 5, 'die_target')}
    </div>
</div>

<!-- Over-market guard -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">🛡️ Over-market guard</h4>
    <div class="grid-3">
        ${this._toggle('Over-market guard', d.over_market_guard, 'over_market_guard')}
        ${this._num('Max over market %', d.over_market_pct || 5, 'over_market_pct', !d.over_market_guard)}
        ${this._num('No-price baseline', d.over_market_baseline || 100, 'over_market_baseline', !d.over_market_guard || d.over_market_allow_unpriced)}
    </div>
    ${this._toggle('Allow items with no market price', d.over_market_allow_unpriced, 'over_market_allow_unpriced', !d.over_market_guard)}
    <p class="text-xs text-muted mt-2">When on, a winning roll only buys if seller price is within this % of Muaddib's reference price.</p>
</div>

<!-- Solari balance -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">◆ Solari balance</h4>
    <p class="text-xs text-muted mb-2">Current: <span class="font-mono">${this._fmtSol(this._status?.balance)}</span>. Auto-maintain tops up at tick start when below half.</p>
    <div class="grid-3">
        ${this._toggle('Auto-maintain', d.maintain_balance, 'maintain_balance')}
        ${this._num('Target balance', d.target_balance || 450000000000, 'target_balance')}
        <div><label class="form-label">&nbsp;</label>
        <button class="btn btn-sm" onclick="MarketBotTab._setBalance()" ${this._balanceBusy ? 'disabled' : ''}>Set to target</button></div>
    </div>
</div>

<!-- Disabled items -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-1">🚫 Disabled items</h4>
    <p class="text-xs text-muted mb-2">Template IDs Muaddib will never buy <em>or</em> list. One per line.</p>
    <textarea rows="4" class="form-input font-mono" id="mbDisabledItems"
        onchange="MarketBotTab._updateDraftStr('disabled_items', this.value)">${(d.disabled_items || []).join('\n')}</textarea>
</div>`;
    },

    _tickResultHtml(tick) {
        return `<div class="text-sm mt-2 p-2" style="background:var(--bg-tertiary);border-radius:6px">
            <div style="display:flex;flex-wrap:wrap;gap:12px">
                <span class="text-muted">die: <span class="font-mono">${tick.die}</span></span>
                <span class="text-muted">candidates: <span class="font-mono">${tick.candidates}</span></span>
                <span class="text-muted">rolled: <span class="font-mono">${tick.rolled}</span></span>
                <span class="text-muted">won: <span class="font-mono">${tick.won}</span></span>
                <span class="${tick.dryRun ? 'text-accent' : 'text-success'}">${tick.dryRun ? 'would buy' : 'purchased'}: <span class="font-mono">${tick.purchased}</span></span>
                ${(tick.blocked || 0) > 0 ? `<span class="text-warning">over-market: <span class="font-mono">${tick.blocked}</span></span>` : ''}
                ${tick.errors > 0 ? `<span class="text-danger">errors: <span class="font-mono">${tick.errors}</span></span>` : ''}
            </div>
            ${tick.dryRun ? '<div class="text-xs text-accent mt-1">Dry run — nothing was written.</div>' : ''}
            ${tick.winners?.length ? `<div class="mt-2" style="max-height:150px;overflow:auto"><table class="data-table text-xs">
                <tr><th>Item</th><th>Price</th><th>Roll</th></tr>
                ${tick.winners.map(w => `<tr><td class="font-mono">${w.template_id}</td><td>${(w.price||0).toLocaleString()}</td><td class="font-mono text-accent">${w.roll}</td></tr>`).join('')}
            </table></div>` : ''}
        </div>`;
    },

    async _doTick(dry) {
        this._ticking = true;
        this._renderSub();
        try {
            const r = await api.post('/gameplay/market-bot/tick' + (dry ? '?dry=1' : ''));
            this._tickResult = r;
        } catch (e) {
            this._tickResult = { error: e.message, candidates: 0, rolled: 0, won: 0, purchased: 0, dryRun: dry };
        }
        this._ticking = false;
        this._renderSub();
    },

    async _setBalance() {
        this._balanceBusy = true;
        this._renderSub();
        try {
            const d = this._draft || {};
            await api.post('/gameplay/market-bot/balance', { target: d.target_balance });
            await this.load();
        } catch (e) { showToast(e.message, 'error'); }
        this._balanceBusy = false;
        this._renderSub();
    },

    // ═══════════ LIST SIDE ═══════════

    _renderList(ct) {
        const d = this._draft || {};
        const snap = this._snapshot;
        ct.innerHTML = `
<!-- Seed Market -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">🌱 Seed market</h4>
    <p class="text-xs text-muted mb-2">Immediate bulk list — inserts NPC orders per catalogued template. Recommended for fresh servers.</p>
    <div style="display:flex;gap:6px;align-items:center">
        <input type="number" class="form-input" id="mbSeedCount" value="100" style="width:100px" min="1" max="500">
        <button class="btn btn-sm btn-warning" onclick="MarketBotTab._doSeed()" ${this._seeding ? 'disabled' : ''}>🌱 Seed market</button>
    </div>
</div>

<!-- Run List Tick -->
<div class="card p-3 mb-2">
    <div class="flex-between mb-2">
        <span class="text-xs text-muted">☰ Run a list tick</span>
        <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-danger" onclick="MarketBotTab._doClear()" ${this._clearing ? 'disabled' : ''}>×️ Clear bot listings</button>
            <button class="btn btn-sm btn-primary" onclick="MarketBotTab._doListTick()" ${this._listTicking ? 'disabled' : ''}>▶ Run now</button>
        </div>
    </div>
    ${this._listTickResult ? `<div class="text-sm p-2" style="background:var(--bg-tertiary);border-radius:6px">${this._listTickResult.message || 'List tick completed'}</div>` : ''}
</div>

<!-- List tuning -->
<div class="card p-3 mb-2 grid-3">
    ${this._num('List tick (s)', d.list_tick_interval || 1800, 'list_tick_interval')}
    ${this._num('Listings / grade', d.listings_per_grade || 5, 'listings_per_grade')}
    ${this._toggle('Stackables only', d.stackables_only, 'stackables_only')}
</div>

<!-- Vendor snapshot -->
<div class="card p-3 mb-2">
    <div class="flex-between mb-2">
        <span class="text-xs text-muted">📸 Vendor snapshot preview</span>
        <button class="btn btn-sm" onclick="MarketBotTab._loadSnapshot()" ${this._snapshotLoading ? 'disabled' : ''}>Refresh snapshot</button>
    </div>
    ${snap ? `<div style="max-height:200px;overflow:auto"><table class="data-table text-xs">
        <tr><th>Item</th><th>Vendor ◆</th><th>Computed ◆</th><th>Tier</th></tr>
        ${snap.slice(0, 15).map(s => `<tr><td class="font-mono">${s.template_id}</td><td>${(s.vendor_price||0).toLocaleString()}</td><td class="text-accent">${(s.computed_price||0).toLocaleString()}</td><td>${s.tier||'—'}</td></tr>`).join('')}
    </table></div>` : '<p class="text-muted text-xs">Click Refresh snapshot to preview vendor items with computed prices.</p>'}
</div>`;
    },

    async _doSeed() {
        const count = parseInt(document.getElementById('mbSeedCount')?.value) || 100;
        if (!confirm(`Seed market with ${count} NPC listings?`)) return;
        this._seeding = true; this._renderSub();
        try {
            const r = await api.post('/gameplay/market-bot/seed', { count });
            showToast(r.message || 'Seeded!', 'success');
            await this.load();
        } catch (e) { showToast(e.message, 'error'); }
        this._seeding = false; this._renderSub();
    },

    async _doListTick() {
        this._listTicking = true; this._renderSub();
        try {
            const r = await api.post('/gameplay/market-bot/tick/list');
            this._listTickResult = r;
            showToast(r.message || 'Done!', 'success');
            await this.load();
        } catch (e) { showToast(e.message, 'error'); }
        this._listTicking = false; this._renderSub();
    },

    async _doClear() {
        if (!confirm('Delete ALL bot listings?')) return;
        this._clearing = true; this._renderSub();
        try {
            const r = await api.post('/gameplay/market-bot/clear-listings');
            showToast(r.message || 'Cleared!', 'success');
            await this.load();
        } catch (e) { showToast(e.message, 'error'); }
        this._clearing = false; this._renderSub();
    },

    async _loadSnapshot() {
        this._snapshotLoading = true; this._renderSub();
        try {
            const r = await api.get('/gameplay/market-bot/vendor-snapshot');
            this._snapshot = r.candidates || [];
        } catch (e) { showToast(e.message, 'error'); }
        this._snapshotLoading = false; this._renderSub();
    },

    // ═══════════ PRICING RULES ═══════════

    _renderPricing(ct) {
        const d = this._draft || {};
        const mf = d.market_follow_enabled;
        ct.innerHTML = `
<!-- Market-follow pricing -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">◇ Market-follow pricing</h4>
    <div class="grid-3 mb-2">
        ${this._toggle('Market-follow pricing', mf, 'market_follow_enabled')}
        ${this._num('Market markup %', d.market_follow_pct || 18, 'market_follow_pct', !mf)}
        ${this._num('Min competing orders', d.market_follow_min_samples || 1, 'market_follow_min_samples', !mf)}
    </div>
    <div class="mb-2">
        <label class="form-label">When nobody else selling an item</label>
        <select class="form-input" id="mbFollowNoMarket" onchange="MarketBotTab._updateDraft('market_follow_no_market', this.value)" ${!mf ? 'disabled' : ''}>
            <option value="formula" ${d.market_follow_no_market === 'formula' ? 'selected' : ''}>Formula (use tier prices)</option>
            <option value="skip" ${d.market_follow_no_market === 'skip' ? 'selected' : ''}>Skip (don't list)</option>
            <option value="baseline" ${d.market_follow_no_market === 'baseline' ? 'selected' : ''}>Baseline (fixed price)</option>
        </select>
    </div>
    ${this._num('Baseline price', d.market_follow_baseline || 0, 'market_follow_baseline', !mf || d.market_follow_no_market !== 'baseline')}
    ${this._toggle('Force buy guard in this mode', d.market_follow_force_guard, 'market_follow_force_guard', !mf)}
    <p class="text-xs text-muted mt-2">Prices items at the median of other players' sell orders plus markup.</p>
</div>

<!-- Sane pricing -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">◆ Sane pricing defaults</h4>
    <div class="grid-3 mb-2">
        ${this._num('Price cap (Solari)', d.price_cap || 100000, 'price_cap')}
        ${this._num('Price floor', d.price_floor || 50, 'price_floor')}
        ${this._num('Default unit price', d.default_unit_price || 100, 'default_unit_price')}
    </div>
    ${this._num('Cap displayed price', d.cap_displayed_price || 0, 'cap_displayed_price')}

    <!-- Tier base prices table -->
    <h5 class="text-xs text-muted mt-3 mb-1">Tier base prices</h5>
    <div class="grid-7" style="grid-template-columns:repeat(7,1fr);gap:4px">
        ${[0,1,2,3,4,5,6].map(t => `<div class="tac"><label class="text-xs text-muted">T${t}</label>
            <input type="number" class="form-input tac" id="mbTierBase${t}" value="${(d.tier_base_prices||{})[String(t)] || 0}"
            onchange="MarketBotTab._updateDictNum('tier_base_prices','${t}',this.value)"></div>`).join('')}
    </div>

    <h5 class="text-xs text-muted mt-3 mb-1">Schematic tier prices</h5>
    <div class="grid-7" style="grid-template-columns:repeat(7,1fr);gap:4px">
        ${[0,1,2,3,4,5,6].map(t => `<div class="tac"><label class="text-xs text-muted">T${t}</label>
            <input type="number" class="form-input tac" id="mbSchemTier${t}" value="${(d.schematic_tier_prices||{})[String(t)] || 0}"
            onchange="MarketBotTab._updateDictNum('schematic_tier_prices','${t}',this.value)"></div>`).join('')}
    </div>

    <h5 class="text-xs text-muted mt-3 mb-1">Stack unit prices</h5>
    <div class="grid-7" style="grid-template-columns:repeat(7,1fr);gap:4px">
        ${[0,1,2,3,4,5,6].map(t => `<div class="tac"><label class="text-xs text-muted">T${t}</label>
            <input type="number" class="form-input tac" id="mbStackTier${t}" value="${(d.stack_unit_prices||{})[String(t)] || 0}"
            onchange="MarketBotTab._updateDictNum('stack_unit_prices','${t}',this.value)"></div>`).join('')}
    </div>

    <!-- Factors -->
    <h5 class="text-xs text-muted mt-3 mb-1">Factors</h5>
    <div class="grid-3">
        ${this._numFloat('Augment factor', d.augment_factor || 0.6, 'augment_factor')}
        ${this._numFloat('Schematic factor', d.schematic_factor || 1.0, 'schematic_factor')}
        ${this._numFloat('Gear factor', d.gear_factor || 0.8, 'gear_factor')}
    </div>
</div>

<!-- Rarity multipliers -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">⭐ Rarity multipliers</h4>
    <div class="grid-4">
        ${['common','rare','unique','memento'].map(r => this._numFloat(r.charAt(0).toUpperCase()+r.slice(1),
            (d.rarity_multipliers||{})[r] || 1.0, 'rarity_mult_'+r, false, 'rarity_multipliers', r))}
    </div>
    <div class="grid-2 mt-2">
        ${this._numFloat('Vendor multiplier (all)', d.vendor_multiplier || 0.95, 'vendor_multiplier')}
    </div>
</div>

<!-- Grade multipliers -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">▲ Grade multipliers</h4>
    <div class="grid-6" style="grid-template-columns:repeat(6,1fr);gap:4px">
        ${[0,1,2,3,4,5].map(g => `<div class="tac"><label class="text-xs text-muted">G${g}</label>
            <input type="number" class="form-input tac" step="0.01" id="mbGrade${g}" value="${(d.grade_multipliers||{})[String(g)] || 1.0}"
            onchange="MarketBotTab._updateDictNum('grade_multipliers','${g}',this.value)"></div>`).join('')}
    </div>
</div>

<!-- Per-template overrides -->
<div class="card p-3 mb-2">
    <h4 class="text-xs text-muted mb-2">☰ Per-template price overrides</h4>
    <p class="text-xs text-muted mb-2">Manual prices for specific template IDs. Overrides all formula pricing.</p>
    <div id="mbOverrides">
        ${Object.entries(d.per_template_overrides || {}).map(([tid, price]) => `
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
                <input type="text" class="form-input" value="${tid}" style="width:auto;flex:1" onchange="MarketBotTab._updateOverride(this, 'tid')">
                <input type="number" class="form-input" value="${price}" style="width:120px" onchange="MarketBotTab._updateOverride(this, 'price')">
                <button class="btn btn-sm btn-danger" onclick="MarketBotTab._removeOverride('${tid}')">×</button>
            </div>`).join('')}
    </div>
    <button class="btn btn-sm mt-1" onclick="MarketBotTab._addOverride()">+ Add override</button>
</div>`;
    },

    // ═══════════ SAVE / REVERT / RESET ═══════════

    async _save() {
        this._saving = true; this._updateSaveBar();
        try {
            const r = await api.post('/gameplay/market-bot/config', this._draft);
            this._config = JSON.parse(JSON.stringify(this._draft));
            document.getElementById('mbSaveMsg').textContent = 'Saved ✓';
            document.getElementById('mbDirty').style.display = 'none';
            setTimeout(() => { document.getElementById('mbSaveMsg').textContent = ''; }, 3000);
        } catch (e) {
            document.getElementById('mbSaveErr').textContent = e.message;
        }
        this._saving = false; this._updateSaveBar();
    },

    _revert() {
        this._draft = JSON.parse(JSON.stringify(this._config));
        this._renderSub();
        document.getElementById('mbDirty').style.display = 'none';
    },

    async _resetDefaults() {
        if (!confirm('Reset ALL Market Bot settings to factory defaults?\n\nThis restores every buy, list, and pricing value. Muaddib\'s on/off state is kept. This cannot be undone.')) return;
        try {
            const r = await api.post('/gameplay/market-bot/config/reset');
            this._config = r;
            this._draft = JSON.parse(JSON.stringify(r));
            this._renderSub();
            showToast('Reset to defaults ✓', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    },

    _updateSaveBar() {
        const dirty = JSON.stringify(this._config) !== JSON.stringify(this._draft);
        const dirtyEl = document.getElementById('mbDirty');
        const saveBtn = document.getElementById('mbSaveBtn');
        if (dirtyEl) dirtyEl.style.display = dirty ? 'inline' : 'none';
        if (saveBtn) saveBtn.disabled = !dirty || this._saving;
    },

    async _toggleEnabled(v) {
        try {
            await api.post('/gameplay/market-bot/exec', {action: v ? 'start' : 'stop'});
            if (this._draft) this._draft.enabled = v;
            if (this._status) this._status.running = v;
            this._renderStats();
            showToast('Bot ' + (v ? 'enabled' : 'disabled'), 'success');
        } catch(e) { showToast(e.message, 'error'); }
    },

    // ═══════════ FIELD HELPERS ═══════════

    _toggle(label, value, key, disabled) {
        if (key === 'enabled') {
            return `<div><label class="form-label">${label}</label>
                <div><input type="checkbox" ${value ? 'checked' : ''} ${disabled ? 'disabled' : ''}
                    onchange="MarketBotTab._toggleEnabled(this.checked)" style="width:auto"> ${value ? 'ON' : 'OFF'}</div></div>`;
        }
        return `<div><label class="form-label">${label}</label>
            <div><input type="checkbox" ${value ? 'checked' : ''} ${disabled ? 'disabled' : ''}
                onchange="MarketBotTab._updateDraftBool('${key}', this.checked)" style="width:auto"> ${value ? 'ON' : 'OFF'}</div></div>`;
    },

    _num(label, value, key, disabled) {
        return `<div><label class="form-label">${label}</label>
            <input type="number" class="form-input" value="${value || 0}" ${disabled ? 'disabled' : ''}
            onchange="MarketBotTab._updateDraftNum('${key}', this.value)"></div>`;
    },

    _numFloat(label, value, key, disabled, dictKey, subKey) {
        const id = dictKey ? ('mb_' + dictKey + '_' + subKey) : ('mb_' + key);
        return `<div><label class="form-label">${label}</label>
            <input type="number" class="form-input" id="${id}" value="${value || 0}" step="0.01" ${disabled ? 'disabled' : ''}
            onchange="${dictKey ? `MarketBotTab._updateDictNum('${dictKey}','${subKey}',this.value)` : `MarketBotTab._updateDraftFloat('${key}', this.value)`}"></div>`;
    },

    // ── Draft mutators ──

    _updateDraft(key, val) { if (this._draft) { this._draft[key] = val; this._updateSaveBar(); } },
    _updateDraftNum(key, val) { this._updateDraft(key, parseInt(val) || 0); },
    _updateDraftFloat(key, val) { this._updateDraft(key, parseFloat(val) || 0); },
    _updateDraftBool(key, val) { this._updateDraft(key, val === true || val === 'true'); },
    _updateDraftStr(key, val) { this._updateDraft(key, (val || '').split('\n').map(s => s.trim()).filter(Boolean)); },

    _updateDictNum(dictKey, subKey, val) {
        if (!this._draft) return;
        if (!this._draft[dictKey]) this._draft[dictKey] = {};
        this._draft[dictKey][subKey] = parseFloat(val) || 0;
        this._updateSaveBar();
    },

    _addOverride() {
        if (!this._draft) return;
        if (!this._draft.per_template_overrides) this._draft.per_template_overrides = {};
        this._draft.per_template_overrides[''] = 0;
        this._renderSub();
    },

    _removeOverride(tid) {
        if (!this._draft?.per_template_overrides) return;
        delete this._draft.per_template_overrides[tid];
        this._renderSub();
        this._updateSaveBar();
    },

    _updateOverride(el, field) {
        const row = el.parentElement;
        const tidInput = row.querySelector('input[type="text"]');
        const priceInput = row.querySelectorAll('input[type="number"]')[0];
        const oldTid = Object.keys(this._draft.per_template_overrides || {}).find(k =>
            this._draft.per_template_overrides[k] === parseFloat(priceInput?.value || 0) || k === el.defaultValue
        );
        const newTid = tidInput?.value?.trim() || '';
        const price = parseFloat(priceInput?.value) || 0;
        if (oldTid && oldTid !== newTid) {
            delete this._draft.per_template_overrides[oldTid];
        }
        if (newTid) {
            this._draft.per_template_overrides[newTid] = price;
        }
        this._updateSaveBar();
    },

    _fmtSol(n) {
        if (!n) return '—';
        if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        return (n || 0).toLocaleString();
    }
};
