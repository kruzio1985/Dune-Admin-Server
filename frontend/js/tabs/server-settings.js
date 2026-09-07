// Server Settings - full game config editor
const ServerSettingsTab = {
    _settings: {},
    _original: {},

    async render() {
        document.getElementById('content').innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h2>Server Settings</h2>
                <div class="flex gap-2">
                    <button class="btn btn-success btn-lg" onclick="ServerSettingsTab.saveAll()">⊞ Save All Settings</button>
                </div>
            </div>
            <div class="card mb-3"><div class="card-header">Quick Presets</div><div class="card-body">
                <div class="flex gap-2" id="presetButtons">Loading presets...</div>
            </div></div>
            <div id="settingsContent"><div class="spinner"></div><p>Loading game configuration...</p></div>`;
        await this.load();
    },

    async load() {
        try {
            const d = await api.serverSettings.sections();
            const s = d.sections || [];
            this._settings = {};
            s.forEach(sec => {
                sec.fields.forEach(f => {
                    this._settings[f.name] = { value: f.default || '', type: f.type, section: f.section, category: sec.category, description: f.desc || this.descriptions()[f.name] || '' };
                });
            });
            this._original = JSON.parse(JSON.stringify(this._settings));

            // Try to load current values from INI
            try {
                const ini = await api.serverSettings.get();
                const data = ini.ini || {};
                Object.keys(this._settings).forEach(k => {
                    for (const [section, values] of Object.entries(data)) {
                        if (k in values) { this._settings[k].value = values[k]; this._settings[k].section = section; }
                    }
                });
            } catch(e) {}

            // Load presets
            try {
                const presets = d.presets || {};
                document.getElementById('presetButtons').innerHTML = Object.entries(presets).map(([id, p]) =>
                    '<button class="btn btn-sm" onclick="ServerSettingsTab.applyPreset(\''+id+'\')" title="'+p.desc+'">'+p.name+'</button>'
                ).join('') + '<span class="text-muted" style="align-self:center;font-size:11px">Click a preset to auto-fill all fields, then Save</span>';
            } catch(e) {}

            this.renderForm();
        } catch(e) {
            document.getElementById('settingsContent').innerHTML = '<p class="text-danger">Failed: '+e.message+'</p>';
        }
    },

    descriptions() {
        return {
            'Dune.GlobalMiningOutputMultiplier': 'Hand-mined resource yield scalar. 1.0 = normal, 2.0 = double.',
            'Dune.GlobalVehicleMiningOutputMultiplier': 'Vehicle-mining resource yield scalar.',
            'SecurityZones.PvpResourceMultiplier': 'Bonus resource scalar applied inside PvP-enabled zones (default: 2.5).',
            'dw.VehicleDurabilityDamageMultiplier': 'Damage scalar to vehicle durability. 0 = no damage, 10 = max.',
            'Vehicle.SandwormInvulnerabilitySecondsOnExit': 'Vehicle invulnerability seconds after exiting a vehicle (900s = 15min).',
            'Vehicle.SandwormInvulnerabilitySecondsOnServerRestart': 'Vehicle invulnerability seconds after server restart (7200s = 2h).',
            'm_bShouldForceEnablePvpOnAllPartitions': 'If enabled, EVERY map partition allows PvP regardless of zone setting.',
            'm_bAreSecurityZonesEnabled': 'Disable to allow PvP and abilities everywhere on the map (no safe zones).',
            'Vehicle.SandwormCollisionInteraction': 'Sandworms can push and damage vehicles on collision.',
            'Sandstorm.Enabled': 'Enable sandstorm weather events globally.',
            'Sandstorm.Treasure.Enabled': 'Spawn special loot/treasure drops during sandstorms.',
            'sandworm.dune.Enabled': 'Enable sandworm spawns. DISABLE to remove ALL sandworms.',
            'Sandworm.SandwormDangerZonesEnabled': 'Show visible danger zone indicators where sandworms can attack.',
            'm_bCoriolisAutoSpawnEnabled': 'Coriolis storms spawn automatically on timer.',
            'UpdateRateInSeconds': 'Item deterioration tick interval in seconds. 0 = no decay, 10 = fastest.',
            'm_MaxNumLandclaimSegments': 'Maximum number of land-claim flags a player may own (default: 6).',
            'm_BuildingBlueprintMaxExtensions': 'How many times a blueprinted building can be extended (default: 4).',
            'm_BaseBackupMaxExtensions': 'How many times a base backup can be extended (default: 8).',
            'm_bBuildingRestrictionLimitsEnabled': 'Enforce limits on what can be built (e.g. inside dungeons).',
            'Bgd.ServerDisplayName': 'Server name shown to players in the in-game server browser.',
            'Bgd.ServerLoginPassword': 'Optional password. Players must enter this to join. Empty = no password.',
        };
    },

    renderForm() {
        const cats = {};
        Object.entries(this._settings).forEach(([name, info]) => {
            if (!cats[info.category]) cats[info.category] = [];
            // Use default value if no current value
            const val = info.value || info.default || '';
            cats[info.category].push({ name, value: val, ...info });
        });

        let html = '<div class="card mb-3"><div class="card-body"><p class="text-muted">Configure your Dune Awakening server. Hover over field names for descriptions. <strong>Save</strong> writes to UserGame.ini on the VM. <strong>Restart battlegroup</strong> required for changes to take effect.</p></div></div>';
        Object.entries(cats).forEach(([cat, fields]) => {
            html += '<div class="card mb-3"><div class="card-header">'+cat+'</div><div class="card-body">';
            fields.forEach(f => {
                const desc = f.description || '';
                const hint = this.hints()[f.name] || '';
                html += '<div class="form-group mb-3">'+
                    '<label class="form-label" title="'+desc+'"><strong>'+f.name+'</strong> <span class="text-muted">('+f.type+')</span></label>'+
                    (desc ? '<div class="text-muted" style="font-size:11px;margin-bottom:4px">'+desc+'</div>' : '')+
                    '<div class="flex gap-2">';
                if (f.type === 'bool') {
                    html += '<select class="form-select" id="cfg_'+f.name+'" onchange="ServerSettingsTab.changeField(\''+f.name+'\')" style="width:180px">'+
                        '<option value="True" '+(f.value==='True'||f.value==='true'||f.value===true?'selected':'')+'>✓ Enabled (True)</option>'+
                        '<option value="False" '+(f.value==='False'||f.value==='false'||f.value===false?'selected':'')+'>✗ Disabled (False)</option></select>';
                } else if (f.type === 'int') {
                    html += '<input type="number" class="form-input" id="cfg_'+f.name+'" value="'+(f.value||f.default||'')+'" onchange="ServerSettingsTab.changeField(\''+f.name+'\')" style="width:150px" placeholder="'+f.default+'">';
                    if (hint) html += '<span class="text-muted" style="align-self:center;font-size:11px">'+hint+'</span>';
                } else if (f.type === 'float') {
                    html += '<input type="number" step="0.1" class="form-input" id="cfg_'+f.name+'" value="'+(f.value||f.default||'')+'" onchange="ServerSettingsTab.changeField(\''+f.name+'\')" style="width:150px" placeholder="'+f.default+'">';
                    if (hint) html += '<span class="text-muted" style="align-self:center;font-size:11px">'+hint+'</span>';
                } else {
                    html += '<input type="text" class="form-input" id="cfg_'+f.name+'" value="'+(f.value||f.default||'')+'" onchange="ServerSettingsTab.changeField(\''+f.name+'\')" style="width:300px" placeholder="'+f.default+'">';
                    if (hint) html += '<span class="text-muted" style="align-self:center;font-size:11px">'+hint+'</span>';
                }
                html += '<span class="text-muted" style="align-self:center;font-size:10px">['+f.section+']</span></div></div>';
            });
            html += '</div></div>';
        });

        html += '<div class="card mt-3"><div class="card-body"><strong>After saving:</strong> restart battlegroup for changes to take effect. '+
            '<br><span class="text-muted">INI file path: /home/dune/battlegroup/UserSettings/UserGame.ini</span></div></div>'+
            '<div class="card mt-3"><div class="card-header">INI Files on VM</div><div class="card-body">'+
            '<button class="btn btn-sm" onclick="ServerSettingsTab.loadINIFiles()">Browse INI Files</button>'+
            '<div id="iniFileList" class="mt-2"></div></div></div>';

        document.getElementById('settingsContent').innerHTML = html;
    },

    hints() {
        return {
            'Dune.GlobalMiningOutputMultiplier': '1.0=normal 2.0=double 5.0=5x',
            'Dune.GlobalVehicleMiningOutputMultiplier': '1.0=normal 2.0=double',
            'SecurityZones.PvpResourceMultiplier': 'Default: 2.5',
            'dw.VehicleDurabilityDamageMultiplier': '0.1=almost no damage 1.0=normal',
            'Vehicle.SandwormInvulnerabilitySecondsOnExit': '900s=15min',
            'Vehicle.SandwormInvulnerabilitySecondsOnServerRestart': '7200s=2hours',
            'UpdateRateInSeconds': '0=no decay 1=normal 10=fast',
            'm_MaxNumLandclaimSegments': 'Default: 20 (community)',
            'm_BuildingBlueprintMaxExtensions': 'Default: 4',
            'm_BaseBackupMaxExtensions': 'Default: 8',
            'Bgd.ServerDisplayName': 'e.g. My Private Arrakis',
            'Bgd.ServerLoginPassword': 'Empty = no password required',
            'CLIENT_m_MaxNumLandclaimSegments': 'Must match server value',
        };
    },

    changeField(name) {
        const el = document.getElementById('cfg_'+name);
        if (el) {
            const type = this._settings[name]?.type;
            if (type === 'bool') {
                this._settings[name].value = el.value;
            } else {
                this._settings[name].value = el.value;
            }
        }
    },

    async saveAll() {
        // Collect all current values from form
        Object.keys(this._settings).forEach(name => {
            const el = document.getElementById('cfg_'+name);
            if (el) {
                if (this._settings[name].type === 'bool') {
                    this._settings[name].value = el.value;
                } else {
                    this._settings[name].value = el.value;
                }
            }
        });

        // Build INI sections from settings
        const iniData = {};
        Object.entries(this._settings).forEach(([name, info]) => {
            if (info.value === undefined || info.value === '') return;
            const sec = info.section || 'ConsoleVariables';
            if (!iniData[sec]) iniData[sec] = {};
            iniData[sec][name] = String(info.value);
        });

        try {
            await api.serverSettings.writeINI('/home/dune/battlegroup/UserSettings/UserGame.ini', iniData);
            this._original = JSON.parse(JSON.stringify(this._settings));
            showToast('Settings saved! Restart battlegroup to apply.', 'success');
        } catch(e) {
            showToast('Save failed: '+e.message, 'error');
        }
    },

    async loadINIFiles() {
        try {
            const d = await api.serverSettings.listINIFiles();
            document.getElementById('iniFileList').innerHTML = (d.files||[]).map(f =>
                '<div class="flex justify-between mb-1"><span>'+(f.is_dir?'□':'📄')+' '+f.name+'</span><span class="text-muted">'+f.size+'B</span></div>'
            ).join('') || '<p class="text-muted">VM not accessible</p>';
        } catch(e) {
            document.getElementById('iniFileList').innerHTML = '<p class="text-danger">VM offline</p>';
        }
    },

    async applyPreset(presetId) {
        try {
            const d = await api.serverSettings.sections();
            const presets = d.presets || {};
            const preset = presets[presetId];
            if (!preset) return;

            const settings = preset.settings || {};
            Object.keys(settings).forEach(name => {
                if (this._settings[name]) {
                    this._settings[name].value = settings[name];
                }
            });

            this.renderForm();
            showToast('Preset applied: '+preset.name+' — click Save to write to INI', 'info');
        } catch(e) {
            showToast('Failed: '+e.message, 'error');
        }
    }
};
