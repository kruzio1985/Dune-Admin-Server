/**
 * Dune Admin Manager - Battlegroup Tab
 */

const BattlegroupTab = {
    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2 style="margin-bottom: 16px;">◆ Battlegroup Controls</h2>

            <div class="card">
                <div class="card-header">Lifecycle Controls</div>
                <div class="card-body">
                    <div class="flex gap-2">
                        <button class="btn btn-success btn-lg" onclick="BattlegroupTab.start()">▶ Start Battlegroup</button>
                        <button class="btn btn-danger btn-lg" onclick="BattlegroupTab.stop()">⏹ Stop Battlegroup</button>
                        <button class="btn btn-warning btn-lg" onclick="BattlegroupTab.restart()">↻ Restart</button>
                        <button class="btn btn-info btn-lg" onclick="BattlegroupTab.update()">⬆ Update</button>
                    </div>
                    <div id="bgActionResult" class="mt-2"></div>
                </div>
            </div>

            <div class="grid-2 mt-3">
                <div class="card">
                    <div class="card-header">⊡ Swap Memory</div>
                    <div class="card-body">
                        <p class="text-muted mb-2">Reduce memory requirements by half. Each game server can use swap on disk.</p>
                        <button class="btn btn-primary" onclick="BattlegroupTab.enableSwap()">Enable Swap</button>
                        <button class="btn btn-ghost" onclick="BattlegroupTab.disableSwap()">Disable Swap</button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">▣ Multi-Sietch</div>
                    <div class="card-body">
                        <p class="text-muted mb-2">Add additional Hagga Basin instances. Each sietch ≈ 12 GB RAM.</p>
                        <button class="btn btn-primary" onclick="BattlegroupTab.addSietch()">Add Sietch</button>
                        <button class="btn btn-ghost" onclick="BattlegroupTab.removeSietch()">Remove Sietch</button>
                    </div>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">☰ Pod Status</div>
                <div class="card-body" id="bgPodStatus">Loading...</div>
            </div>
        `;

        await this.refresh();
    },

    async refresh() {
        try {
            const data = await api.battlegroup.status();
            const statusClass = data.status === 'healthy' ? 'success' : data.status === 'down' ? 'danger' : 'warning';

            let podHtml = `<p>Status: <span class="badge badge-${statusClass}">${data.status}</span> | Servers: ${data.healthy_servers}/${data.server_count}</p>`;
            podHtml += '<table class="data-table mt-2"><thead><tr><th>Namespace</th><th>Name</th><th>Ready</th><th>Status</th><th>Restarts</th><th>Age</th></tr></thead><tbody>';

            if (data.pods.length > 0) {
                podHtml += data.pods.map(p => `
                    <tr>
                        <td>${p.namespace}</td><td>${p.name}</td><td>${p.ready}</td>
                        <td><span class="badge badge-${p.status==='Running'?'success':'warning'}">${p.status}</span></td>
                        <td>${p.restarts}</td><td>${p.age}</td>
                    </tr>
                `).join('');
            } else {
                podHtml += '<tr><td colspan="6" class="text-center text-muted">No pods</td></tr>';
            }
            podHtml += '</tbody></table>';

            const el = document.getElementById('bgPodStatus');
            if (el) el.innerHTML = podHtml;
        } catch (e) {
            console.error(e);
        }
    },

    async start() {
        try { await api.battlegroup.start(); showToast('Battlegroup started', 'success'); await this.refresh(); } catch (e) { showToast(e.message, 'error'); }
    },
    async stop() {
        try { await api.battlegroup.stop(); showToast('Battlegroup stopped', 'success'); await this.refresh(); } catch (e) { showToast(e.message, 'error'); }
    },
    async restart() {
        try { await api.battlegroup.restart(); showToast('Battlegroup restarted', 'success'); await this.refresh(); } catch (e) { showToast(e.message, 'error'); }
    },
    async update() {
        try { await api.battlegroup.update(); showToast('Battlegroup updated', 'success'); } catch (e) { showToast(e.message, 'error'); }
    },
    async enableSwap() {
        try { await api.battlegroup.enableSwap(); showToast('Swap enabled', 'success'); } catch (e) { showToast(e.message, 'error'); }
    },
    async disableSwap() {
        try { await api.battlegroup.disableSwap(); showToast('Swap disabled', 'success'); } catch (e) { showToast(e.message, 'error'); }
    },
    async addSietch() {
        try { await api.battlegroup.addSietch(); showToast('Sietch added', 'success'); } catch (e) { showToast(e.message, 'error'); }
    },
    async removeSietch() {
        try { await api.battlegroup.removeSietch(); showToast('Sietch removed', 'success'); } catch (e) { showToast(e.message, 'error'); }
    },
};
