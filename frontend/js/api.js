/**
 * Dune Admin Manager - API Client
 * 
 * Komunikacja z backendem REST API.
 */

const API_BASE = window.location.origin + '/api/v1';

const api = {
    async request(method, path, body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
        };
        if (body && method !== 'GET') {
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(API_BASE + path, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); },

    // ── Auth ────────────────────────────────────────────────────────────
    auth: {
        login: (username, password) => api.post('/auth/login', { username, password }),
        logout: () => api.post('/auth/logout'),
        session: () => api.get('/auth/session'),
        setPassword: (password) => api.post('/auth/set-password', { password }),
    },

    // ── Dashboard ──────────────────────────────────────────────────────
    dashboard: {
        get: () => api.get('/dashboard/'),
        vmStatus: () => api.get('/dashboard/vm-status'),
        bgStatus: () => api.get('/dashboard/battlegroup-status'),
    },

    // ── Battlegroup ────────────────────────────────────────────────────
    battlegroup: {
        start: () => api.post('/battlegroup/start'),
        stop: () => api.post('/battlegroup/stop'),
        restart: () => api.post('/battlegroup/restart'),
        update: () => api.post('/battlegroup/update'),
        status: () => api.get('/battlegroup/status'),
        enableSwap: () => api.post('/battlegroup/swap/enable'),
        disableSwap: () => api.post('/battlegroup/swap/disable'),
        addSietch: () => api.post('/battlegroup/sietch/add'),
        removeSietch: () => api.post('/battlegroup/sietch/remove'),
    },

    // ── Players ────────────────────────────────────────────────────────
    players: {
        list: (search = '', limit = 50, offset = 0) =>
            api.get(`/players?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`),
        get: (id) => api.get(`/players/${id}`),
        giveItem: (account_id, template, qty = 1, quality = 0) =>
            api.post('/players/give-item', { account_id, template, qty, quality }),
        giveCurrency: (account_id, currency_type, delta) =>
            api.post('/players/give-currency', { account_id, currency_type, delta }),
        giveFactionRep: (account_id, faction, delta) =>
            api.post('/players/give-faction-rep', { account_id, faction, delta }),
        cheatScript: (fls_id, script_name) =>
            api.post('/players/cheat-script', { fls_id, script_name }),
        awardXP: (player_id, track_type, delta) =>
            api.post('/players/award-xp', { player_id, track_type, delta }),
        updateTags: (account_id, add = [], remove = []) =>
            api.post('/players/update-tags', { account_id, add, remove }),
        deleteAccount: (account_id, reason = '') =>
            api.post('/players/delete-account', { account_id, reason }),
        backupCharacter: (account_id, character_name, reason = '') =>
            api.post(`/players/${account_id}/backup`, { account_id, character_name, reason }),
        teleport: (fls_id, x, y, z, map_name = '') =>
            api.post('/players/teleport', { fls_id, x, y, z, map_name }),
        fillWater: (fls_id, amount = 1000000) =>
            api.post('/players/fill-water?fls_id=' + fls_id + '&water_amount=' + amount),
        setSkillPoints: (fls_id, points) =>
            api.post('/players/set-skill-points?fls_id=' + fls_id + '&skill_points=' + points),
    },

    // ── Characters ─────────────────────────────────────────────────────
    characters: {
        getStats: (account_id) => api.get(`/characters/${account_id}/stats`),
        updateStats: (data) => api.post('/characters/stats/update', data),
        unlockTechTree: (account_id) =>
            api.post('/characters/tech-tree/unlock-all', { account_id, unlock_all: true }),
        setEconomy: (account_id, solari = null, scrip = null) =>
            api.post('/characters/economy/set', { account_id, solari, scrip }),
        setFactionRep: (account_id, faction, reputation) =>
            api.post('/characters/faction-reputation/set', { account_id, faction, reputation }),
        keystones: (player_id) => api.get(`/characters/${player_id}/keystones`),
        grantAllKeystones: (player_id) =>
            api.post('/characters/keystones/grant-all', { player_id, track_type: 'all' }),
        resetAllKeystones: (player_id) =>
            api.post('/characters/keystones/reset-all?player_id=' + player_id),
        setStarterClass: (account_id, job) =>
            api.post('/characters/set-starter-class', { account_id, job }),
        grantJobSkills: (account_id, job) =>
            api.post('/characters/grant-job-skills?account_id=' + account_id + '&job=' + job),
        resetJobSkills: (account_id, job) =>
            api.post('/characters/reset-job-skills?account_id=' + account_id + '&job=' + job),
    },

    // ── Inventory ──────────────────────────────────────────────────────
    inventory: {
        get: (account_id) => api.get(`/inventory/${account_id}`),
        add: (account_id, template_id, count = 1, quality = 0) =>
            api.post('/inventory/add', { account_id, template_id, count, quality }),
        delete: (item_id) => api.post('/inventory/delete', { item_id }),
        move: (item_id, target_inventory_id) =>
            api.post('/inventory/move', { item_id, target_inventory_id }),
        searchCatalog: (query = '', category = '', limit = 50) =>
            api.get(`/inventory/catalog/search?query=${encodeURIComponent(query)}&category=${category}&limit=${limit}`),
        categories: () => api.get('/inventory/catalog/categories'),
        repair: (item_id) => api.post('/inventory/repair?item_id=' + item_id),
    },

    // ── Server Settings ────────────────────────────────────────────────
    serverSettings: {
        get: () => api.get('/server-settings'),
        update: (data) => api.post('/server-settings', data),
        readINI: (path) => api.get(`/server-settings/ini?path=${encodeURIComponent(path)}`),
        writeINI: (path, data) => api.post('/server-settings/ini', { path, data }),
        listINIFiles: () => api.get('/server-settings/ini/files'),
        sections: () => api.get('/server-settings/sections'),
    },

    // ── Database ───────────────────────────────────────────────────────
    database: {
        query: (sql, readonly = true) => api.post('/database/query', { query: sql, readonly }),
        backup: (name = '') => api.post('/database/backup', { name }),
        restore: (filename) => api.post('/database/restore', { backup_filename: filename }),
        listBackups: () => api.get('/database/backups'),
        listTables: () => api.get('/database/tables'),
        browseTable: (table, limit = 50, offset = 0) =>
            api.get(`/database/tables/${table}?limit=${limit}&offset=${offset}`),
        schemaVersion: () => api.get('/database/schema-version'),
    },

    // ── Database Editor ─────────────────────────────────────────────────
    databaseEditor: {
        searchPlayers: (q, limit = 20) => api.get(`/database-editor/players/search?q=${encodeURIComponent(q)}&limit=${limit}`),
        playerInfo: (id) => api.get(`/database-editor/player/${id}/info`),
        godMode: (player_id) => api.post('/database-editor/player/god-mode', { player_id }),
        grantKeystones: (player_id) => api.post('/database-editor/player/grant-keystones', { player_id }),
        resetKeystones: (player_id) => api.post('/database-editor/player/reset-keystones', { player_id }),
        unlockRecipes: (player_id) => api.post('/database-editor/player/unlock-recipes', { player_id }),
        maxSpecs: (player_id) => api.post('/database-editor/player/max-specs', { player_id }),
        setLevel: (player_id, level) => api.post(`/database-editor/player/set-level?level=${level}`, { player_id }),
        maxCurrency: (player_id) => api.post('/database-editor/player/max-currency', { player_id }),
        grantJobSkills: (player_id) => api.post('/database-editor/player/grant-job-skills', { player_id }),
    },

    // ── Logs ───────────────────────────────────────────────────────────
    logs: {
        get: (component = '', lines = 100) =>
            api.get(`/logs?component=${component}&lines=${lines}`),
        cheatEvents: (limit = 50) => api.get(`/logs/cheat-events?limit=${limit}`),
        playerEvents: (account_id, limit = 100) =>
            api.get(`/logs/player-events/${account_id}?limit=${limit}`),
        components: () => api.get('/logs/components'),
        export: (component = '', format = 'text') =>
            api.get(`/logs/export?component=${component}&format=${format}`),
    },

    // ── Market ─────────────────────────────────────────────────────────
    market: {
        listings: (limit = 100) => api.get(`/market/listings?limit=${limit}`),
        botStatus: () => api.get('/market/bot/status'),
        botStart: () => api.post('/market/bot/start'),
        botStop: () => api.post('/market/bot/stop'),
        botRestart: () => api.post('/market/bot/restart'),
    },

    // ── Welcome Kits / MOTD ────────────────────────────────────────────
    welcome: {
        get: () => api.get('/welcome'),
        update: (data) => api.post('/welcome', data),
        updateMOTD: (data) => api.post('/welcome/motd', data),
    },

    // ── Setup Wizard ────────────────────────────────────────────────────
    setup: {
        status: () => api.get('/setup/status'),
        saveConfig: (server_token, server_name, memory_gb) =>
            api.post('/setup/save-config', { server_token, server_name, memory_gb }),
        testSSH: () => api.post('/setup/test-ssh'),
        keyStatus: () => api.get('/setup/key-status'),
    },

    // ── Server Control (Auto-Setup) ─────────────────────────────────────
    serverControl: {
        status: () => api.get('/server-control/status'),
        startVM: () => api.post('/server-control/vm/start'),
        stopVM: () => api.post('/server-control/vm/stop'),
        restartVM: () => api.post('/server-control/vm/restart'),
        generateSSHKey: () => api.post('/server-control/ssh-key/generate'),
        startBG: () => api.post('/server-control/battlegroup/start'),
        stopBG: () => api.post('/server-control/battlegroup/stop'),
        autoSetup: () => api.post('/server-control/auto-setup'),
    },

    // ── Progression ────────────────────────────────────────────────────
    progression: {
        presets: () => api.get('/progression/presets'),
        journey: (account_id) => api.get(`/progression/journey/${account_id}`),
        completeNode: (account_id, node_id) =>
            api.post('/progression/journey/complete', { account_id, node_id }),
    },

    // ── Scheduler ──────────────────────────────────────────────────────
    scheduler: {
        get: () => api.get('/scheduler'),
        update: (data) => api.post('/scheduler', data),
    },
};

// Helper: pokaż toast notification
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
