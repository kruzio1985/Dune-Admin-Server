/**
 * Dune Admin Manager - Dashboard Tab
 */

const DashboardTab = {
    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2 style="margin-bottom: 16px;">◇ Dashboard</h2>
            
            <div class="grid-4" id="quickStats">
                <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">VM Status</div></div>
                <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">CPU</div></div>
                <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">RAM</div></div>
                <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Servers</div></div>
            </div>

            <div class="grid-2 mt-3">
                <div class="card">
                    <div class="card-header">◇ VM Info</div>
                    <div class="card-body" id="vmInfo">Loading...</div>
                </div>
                <div class="card">
                    <div class="card-header">◆ Battlegroup Status</div>
                    <div class="card-body" id="bgInfo">Loading...</div>
                </div>
            </div>

            <div class="grid-2 mt-3">
                <div class="card">
                    <div class="card-header">⏻ Quick Actions</div>
                    <div class="card-body">
                        <div class="flex gap-2">
                            <button class="btn btn-primary" onclick="DashboardTab.startVM()">◇ Start VM</button>
                            <button class="btn btn-success" onclick="DashboardTab.startBG()">▶ Start BG</button>
                            <button class="btn btn-danger" onclick="DashboardTab.stopBG()">⏹ Stop BG</button>
                            <button class="btn btn-warning" onclick="DashboardTab.restartBG()">↻ Restart BG</button>
                            <button class="btn" style="background:#555;color:#fff;" onclick="DashboardTab.openConsole()" title="Open battlegroup.bat in PowerShell window">⊡ BG Console</button>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">→ Quick Links</div>
                    <div class="card-body" id="quickLinks">Loading...</div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">⊞ Pods</div>
                <div class="card-body">
                    <table class="data-table" id="podsTable">
                        <thead><tr>
                            <th>Namespace</th><th>Name</th><th>Ready</th><th>Status</th><th>Restarts</th><th>Age</th>
                        </tr></thead>
                        <tbody id="podsBody"><tr><td colspan="6" class="text-center text-muted">Loading...</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;

        await this.refresh();
        // Auto-refresh co 10s
        this._interval = setInterval(() => this.refresh(), 10000);
    },

    async refresh() {
        try {
            const data = await api.dashboard.get();

            // Quick stats
            const vm = data.vm;
            const bg = data.battlegroup;
            const stats = document.getElementById('quickStats').children;
            stats[0].querySelector('.stat-value').textContent = (vm.status || 'OFFLINE').toUpperCase();
            stats[1].querySelector('.stat-value').textContent = ((vm.cpu_percent||0)).toFixed(1) + '%';
            stats[2].querySelector('.stat-value').textContent = ((vm.memory_used_gb||0)).toFixed(1) + '/' + (vm.memory_total_gb||'?') + ' GB';
            stats[3].querySelector('.stat-value').textContent = (bg.healthy_servers||0) + '/' + (bg.server_count||0);

            // VM Info
            document.getElementById('vmInfo').innerHTML = `
                <p><strong>Name:</strong> ${vm.name||'dune-awakening'}</p>
                <p><strong>IP:</strong> ${vm.ip_address || 'N/A'}</p>
                <p><strong>Uptime:</strong> ${formatUptime(vm.uptime_seconds||0)}</p>
                <p><strong>Memory:</strong> ${(vm.memory_used_gb||0).toFixed(1)} / ${vm.memory_total_gb||'?'} GB</p>
            `;

            // BG Info
            document.getElementById('bgInfo').innerHTML = `
                <p><strong>Status:</strong> <span class="badge badge-${bg.status === 'healthy' ? 'success' : bg.status === 'down' ? 'danger' : 'warning'}">${bg.status||'unknown'}</span></p>
                <p><strong>Servers:</strong> ${bg.healthy_servers||0} / ${bg.server_count||0} healthy</p>
                <p><strong>Total Pods:</strong> ${(bg.pods||[]).length}</p>
            `;

            // Quick Links
            const links = data.quick_links;
            document.getElementById('quickLinks').innerHTML = `
                ${links.director_url ? `<p>→ <a href="${links.director_url}" target="_blank" style="color: var(--accent-blue)">Director</a></p>` : '<p class="text-muted">Director: N/A</p>'}
                ${links.file_browser_url ? `<p>→ <a href="${links.file_browser_url}" target="_blank" style="color: var(--accent-blue)">File Browser</a></p>` : '<p class="text-muted">File Browser: N/A</p>'}
            `;

            // Pods table
            const tbody = document.getElementById('podsBody');
            if (bg.pods.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No pods found</td></tr>';
            } else {
                tbody.innerHTML = bg.pods.map(p => `
                    <tr>
                        <td>${p.namespace}</td>
                        <td>${p.name}</td>
                        <td>${p.ready}</td>
                        <td><span class="badge badge-${p.status === 'Running' ? 'success' : 'warning'}">${p.status}</span></td>
                        <td>${p.restarts}</td>
                        <td>${p.age}</td>
                    </tr>
                `).join('');
            }

        } catch (e) {
            console.error('Dashboard refresh error:', e);
        }
    },

    async startVM() {
        const btn = event?.target; if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try { 
            const r = await api.post('/battlegroup/start-vm');
            showToast(r.ok || 'VM starting...', 'success');
        } catch (e) { showToast('VM start failed: ' + (e.message || 'Error'), 'error'); }
        if (btn) { btn.disabled = false; btn.textContent = '◇ Start VM'; }
        setTimeout(() => this.refresh(), 5000);
    },
    async startBG() {
        const btn = event?.target; if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try { await api.battlegroup.start(); showToast('BG starting...', 'success'); } 
        catch (e) { showToast('Start failed: ' + (e.message || 'Server offline'), 'error'); }
        if (btn) { btn.disabled = false; btn.textContent = '▶ Start BG'; }
        setTimeout(() => this.refresh(), 3000);
    },
    async stopBG() {
        const btn = event?.target; if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try { await api.battlegroup.stop(); showToast('BG stopping...', 'success'); } 
        catch (e) { showToast('Stop failed: ' + (e.message || 'Server offline'), 'error'); }
        if (btn) { btn.disabled = false; btn.textContent = '⏹ Stop BG'; }
        setTimeout(() => this.refresh(), 3000);
    },
    async restartBG() {
        const btn = event?.target; if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try { await api.battlegroup.restart(); showToast('BG restarting...', 'success'); } 
        catch (e) { showToast('Restart failed: ' + (e.message || 'Server offline'), 'error'); }
        if (btn) { btn.disabled = false; btn.textContent = '↻ Restart BG'; }
        setTimeout(() => this.refresh(), 5000);
    },
    async openConsole() {
        try {
            const r = await api.post('/battlegroup/open-console');
            showToast(r.ok || 'Console opened!', 'success');
        } catch (e) {
            showToast('Failed: ' + (e.message || 'Error'), 'error');
        }
    },

    destroy() {
        if (this._interval) { clearInterval(this._interval); this._interval = null; }
    }
};

function formatUptime(seconds) {
    if (!seconds || seconds <= 0) return 'N/A';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m`;
}
