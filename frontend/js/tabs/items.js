/** Items Catalog Tab - Full Dune Awakening item database with pagination */
const ItemsTab = {
    _catalog: null,
    _allItems: [],
    _filtered: [],
    _filter: '',
    _category: '',
    _page: 1,
    _perPage: 50,

    async render() {
        document.getElementById('content').innerHTML = `
            <h2>⊞ Items Catalog</h2>
            <div class="card mb-3"><div class="card-body">
                <div class="flex gap-2 items-center flex-wrap">
                    <input type="text" class="form-input" id="itemSearch" placeholder="Search by name or template ID..." 
                        oninput="ItemsTab.filter()" style="flex:1;min-width:200px">
                    <select class="form-select" id="itemCategory" onchange="ItemsTab.filter()" style="width:200px">
                        <option value="">All Categories</option>
                    </select>
                    <select class="form-select" id="itemPerPage" onchange="ItemsTab._changePerPage(this.value)" style="width:80px">
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                    </select>
                </div>
                <div class="flex-between mt-2">
                    <div id="itemCount" class="text-muted" style="font-size:12px"></div>
                    <div id="itemPagination" class="text-sm"></div>
                </div>
            </div></div>
            <div class="card"><div class="card-body" id="itemList" style="max-height:70vh;overflow:auto">
                <div class="spinner"></div><p>Loading item catalog...</p>
            </div></div>`;
        await this.load();
    },

    async load() {
        try {
            const data = await api.get('/items/catalog');
            this._catalog = data;
            this._categories = data.categories || {};
            this._stats = data.stats || {};

            // Flatten all items
            this._allItems = [];
            Object.entries(this._categories).forEach(([cat, items]) => {
                items.forEach(item => this._allItems.push({...item, _cat: cat}));
            });

            const sel = document.getElementById('itemCategory');
            const cats = Object.keys(this._categories);
            sel.innerHTML = '<option value="">All (' + data.total + ')</option>' +
                cats.map(c => '<option value="' + c + '">' + this.catLabel(c) + ' (' + (this._stats[c]||0) + ')</option>').join('');

            this.filter();
        } catch(e) {
            document.getElementById('itemList').innerHTML = '<p class="text-danger">Failed to load: ' + e.message + '</p>';
        }
    },

    catLabel(cat) {
        const labels = {
            weapons: '◆ Weapons', weapon_recipes: '◻ Weapon Recipes',
            armor: '🛡️ Armor', armor_recipes: '◻ Armor Recipes',
            resources: '◆ Resources', consumables: '⊕ Consumables',
            tools: '⚙ Tools', ammo: '◇ Ammo',
            schematics: '□ Schematics', vehicles: '◆ Vehicles',
            other: '⊞ Other'
        };
        return labels[cat] || cat;
    },

    filter() {
        this._filter = (document.getElementById('itemSearch')?.value || '').toLowerCase();
        this._category = document.getElementById('itemCategory')?.value || '';
        this._page = 1;
        this._applyFilter();
    },

    _changePerPage(val) {
        this._perPage = parseInt(val) || 50;
        this._page = 1;
        this._applyFilter();
    },

    _applyFilter() {
        let items = this._allItems;
        if (this._category) {
            items = items.filter(i => i._cat === this._category);
        }
        if (this._filter) {
            items = items.filter(item =>
                item.id.toLowerCase().includes(this._filter) ||
                item.name.toLowerCase().includes(this._filter)
            );
        }
        this._filtered = items;
        this._renderPage();
    },

    _renderPage() {
        const total = this._filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / this._perPage));
        if (this._page > totalPages) this._page = totalPages;
        const start = (this._page - 1) * this._perPage;
        const page = this._filtered.slice(start, start + this._perPage);

        document.getElementById('itemCount').textContent = 
            'Showing ' + (start + 1) + '–' + Math.min(start + this._perPage, total) + ' of ' + total + ' items';

        // Pagination
        let phtml = '';
        if (totalPages > 1) {
            phtml = '<div style="display:flex;gap:4px;align-items:center">' +
                '<button class="btn btn-sm" ' + (this._page <= 1 ? 'disabled' : 'onclick="ItemsTab._goPage(' + (this._page - 1) + ')"') + '>◀</button>' +
                '<span class="text-xs text-muted">Page ' + this._page + ' of ' + totalPages + '</span>' +
                '<button class="btn btn-sm" ' + (this._page >= totalPages ? 'disabled' : 'onclick="ItemsTab._goPage(' + (this._page + 1) + ')"') + '>▶</button>' +
                '</div>';
        }
        document.getElementById('itemPagination').innerHTML = phtml;

        // Item list
        const html = page.map(item => {
            const copyFn = 'navigator.clipboard.writeText(\'' + item.id.replace(/'/g, "\\'") + '\').then(function(){showToast(\'Copied: ' + item.id + '\',\'success\')})';
            return '<div class="flex justify-between" style="padding:4px 8px;border-bottom:1px solid var(--border);font-size:13px">' +
                '<span><strong style="color:#4fc3f7;cursor:pointer;font-family:monospace;font-size:12px" onclick="' + copyFn + '" title="Click to copy template ID">' + item.id + '</strong></span>' +
                '<span style="color:var(--text-muted)">' + item.name + '</span></div>';
        }).join('');

        document.getElementById('itemList').innerHTML = '<div class="card-body">' + (html || '<p class="text-muted">No items found</p>') + '</div>';
    },

    _goPage(p) {
        this._page = Math.max(1, p);
        this._renderPage();
        document.getElementById('itemList').scrollTop = 0;
    }
};
