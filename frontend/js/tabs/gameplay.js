/**
 * Gameplay Tab - All admin functions with player selector
 */
const GameplayTab = {
    fls_id: '',

    async render() {
        document.getElementById('content').innerHTML = `
            <h2>◇ Gameplay Admin</h2>
            <div class="card"><div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
                <div class="form-group" style="flex:1;min-width:200px">
                    <label class="form-label">● Player</label>
                    <select class="form-select" id="gpPlayerSelect" onchange="GameplayTab.selectPlayer()">
                        <option value="">-- Select player --</option>
                    </select>
                </div>
                <div class="form-group" style="width:180px">
                    <label class="form-label">FLS ID</label>
                    <input type="text" class="form-input" id="gpFls" value="${this.fls_id}" placeholder="FC4D3B70DB35663">
                </div>
                <div><button class="btn btn-sm" onclick="GameplayTab.loadPlayers()">↻ Refresh</button></div>
            </div></div>

            <div class="grid-2 mt-2">
                <!-- LIVE ACTIONS -->
                <div class="card"><div class="card-header">⏻ Live Actions</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-danger btn-sm" onclick="GameplayTab.kickPlayer()">● Kick</button>
                    <button class="btn btn-sm" onclick="GameplayTab.whisper()">⊙ Whisper</button>
                    <button class="btn btn-sm" onclick="GameplayTab.broadcast()">⊙ Broadcast</button>
                    <button class="btn btn-sm" onclick="GameplayTab.teleportToPlayer()">⊙ TeleportTo</button>
                </div></div>

                <!-- CHEAT SCRIPTS -->
                <div class="card"><div class="card-header">◇ Cheat Scripts</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-sm" style="background:#238636;color:#fff" onclick="GameplayTab.cheatScript('PlaytestSetup')">⚙ Playtest Setup</button>
                    <button class="btn btn-sm" style="background:#238636;color:#fff" onclick="GameplayTab.cheatScript('PlaytestSetupAdmin')">⚙ Setup Admin</button>
                    <button class="btn btn-sm" style="background:#1f6feb;color:#fff" onclick="GameplayTab.awardXP('General',100000)">⭐ Award XP</button>
                    <button class="btn btn-sm" style="background:#1f6feb;color:#fff" onclick="GameplayTab.cheatScript('UnlockAllSkills')">◇ All Skills</button>
                    <button class="btn btn-sm" style="background:#1f6feb;color:#fff" onclick="GameplayTab.cheatScript('UnlockAllAbilities')">◇ Abilities</button>
                    <button class="btn btn-sm" style="background:#d29922;color:#000" onclick="GameplayTab.cheatScript('LeaveMeAlone')">⊙ Leave Me Alone</button>
                </div></div>

                <!-- CURRENCY -->
                <div class="card"><div class="card-header">◆ Currency</div><div class="card-body" style="display:flex;flex-direction:column;gap:6px">
                    <div class="flex gap-2" style="align-items:center"><span style="width:80px;font-size:11px">● Monety</span><input type="number" id="gpMonety" value="100000000" style="width:100px" class="form-input"><button class="btn btn-success btn-sm" onclick="GameplayTab.giveSolaris(0)">Give</button></div>
                    <div class="flex gap-2" style="align-items:center"><span style="width:80px;font-size:11px">◇ Kredyty</span><input type="number" id="gpKredyty" value="100000000" style="width:100px" class="form-input"><button class="btn btn-success btn-sm" onclick="GameplayTab.giveSolaris(1)">Give</button></div>
                    <div class="flex gap-2" style="align-items:center"><span style="width:80px;font-size:11px">△ Scrip</span><input type="number" id="gpRodowa" value="100000000" style="width:100px" class="form-input"><button class="btn btn-primary btn-sm" onclick="GameplayTab.giveScrip()">Give</button></div>
                </div></div>

                <!-- IDENTITY -->
                <div class="card"><div class="card-header">🆔 Identity</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-sm" onclick="GameplayTab.renameChar()">✏️ Rename</button>
                    <button class="btn btn-sm" onclick="GameplayTab.updateTags()">◇ Tags</button>
                    <button class="btn btn-sm" onclick="GameplayTab.clearTutorial()">□ Clear Tutorial</button>
                    <button class="btn btn-sm" onclick="GameplayTab.wipeCodex()">⊞ Wipe Codex</button>
                    <button class="btn btn-sm" onclick="GameplayTab.returningPlayer()">☆ Returning Award</button>
                    <button class="btn btn-danger btn-sm" onclick="GameplayTab.deleteAccount()">💀 Delete</button>
                </div></div>

                <!-- SPECIALIZATIONS -->
                <div class="card"><div class="card-header">⏻ Specializations</div><div class="card-body">
                    <div id="gpSpecsPanel"><p class="text-xs text-muted">Click Check to load specializations</p></div>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        <button class="btn btn-sm" onclick="GameplayTab.checkSpecsFull()">⊙ Check All</button>
                        <button class="btn btn-sm btn-success" onclick="GameplayTab.maxSpecsSafe()">▲ Max Safe</button>
                        <button class="btn btn-sm btn-danger" onclick="GameplayTab.maxSpecsForce()">💀 Max Force</button>
                    </div>
                </div></div>

                <!-- STATS -->
                <div class="card"><div class="card-header">◇ Stats</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-sm" onclick="GameplayTab.awardIntel(50000)">+50k Intel</button>
                    <button class="btn btn-sm" onclick="GameplayTab.grantAllTech()">⚙ All Tech</button>
                    <button class="btn btn-sm" onclick="GameplayTab.grantKeystones()">⭐ Keystones</button>
                    <button class="btn btn-sm" onclick="GameplayTab.maxFaction()">△ Max Faction</button>
                </div></div>

                <!-- JOURNEY -->
                <div class="card"><div class="card-header">□ Journey</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-sm" onclick="GameplayTab.checkJourney()">⊙ Check</button>
                    <button class="btn btn-sm btn-success" onclick="GameplayTab.completeAllJourney()">✓ Complete All</button>
                    <button class="btn btn-sm btn-danger" onclick="GameplayTab.resetJourney()">×️ Reset</button>
                    <div id="gpJourneyResult" style="font-size:11px;width:100%"></div>
                </div></div>

                <!-- FACTION -->
                <div class="card"><div class="card-header">△ Faction Rep</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-sm" onclick="GameplayTab.checkFaction()">⊙ Check</button>
                    <input type="text" id="gpFaction" value="Fremen" style="width:80px" class="form-input" placeholder="Fremen">
                    <input type="number" id="gpFactionRep" value="1000" style="width:80px" class="form-input">
                    <button class="btn btn-sm btn-primary" onclick="GameplayTab.setFaction()">Set Rep</button>
                    <div id="gpFactionResult" style="font-size:11px;width:100%"></div>
                </div></div>

                <!-- TRAINERS -->
                <div class="card"><div class="card-header">👨‍🏫 Trainers</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <button class="btn btn-sm" onclick="GameplayTab.unlockAllTrainers()">◇ Unlock All</button>
                    <button class="btn btn-sm btn-danger" onclick="GameplayTab.resetTrainers()">×️ Reset</button>
                </div></div>

                <!-- VEHICLE -->
                <div class="card"><div class="card-header">🏍️ Vehicle Repair</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <input type="number" id="gpVehicleId" value="0" style="width:60px" class="form-input" placeholder="Vehicle ID">
                    <button class="btn btn-sm" onclick="GameplayTab.refuelVehicle()">⊕ Refuel by ID</button>
                    <button class="btn btn-sm" onclick="GameplayTab.repairVehicle()">⚙ Repair by ID</button>
                    <p class="text-xs text-muted" style="width:100%">Enter vehicle actor ID from inventory list. For spawning new vehicles, use <b>◆ Give Vehicle Kit</b> below.</p>
                </div></div>

                <!-- MUTATIONS (inventory) -->
                <div class="card"><div class="card-header">⚙ Inventory Mutations</div><div class="card-body" style="display:flex;flex-wrap:wrap;gap:6px">
                    <input type="number" id="gpMutItemId" value="0" style="width:70px" class="form-input" placeholder="Item ID">
                    <input type="number" id="gpMutVal" value="100" style="width:70px" class="form-input" placeholder="Value">
                    <button class="btn btn-sm" onclick="GameplayTab.setDurability()">🛡️ Set Dur</button>
                    <button class="btn btn-sm" onclick="GameplayTab.setWater()">💧 Set Water</button>
                    <button class="btn btn-sm" onclick="GameplayTab.setStack()">⊞ Set Stack</button>
                    <button class="btn btn-sm btn-success" onclick="GameplayTab.repairItem()">⚙ Fix Item</button>
                    <button class="btn btn-sm btn-danger" onclick="GameplayTab.deleteItem()">×️ Delete</button>
                    <p class="text-xs text-muted" style="width:100%">Enter item ID from inventory list. Set Dur = max durability, Fix = restore to 100%. Set Water = fill water container. Set Stack = change quantity.</p>
                </div></div>
            </div>
            <div class="card mt-3"><div class="card-header">⊞ Give Items</div><div class="card-body" style="text-align:center;padding:20px">
                <p class="text-muted mb-3">Item giving has been moved to a dedicated tab.</p>
                <a href="#" onclick="navigateTo('give-items');return false" class="btn btn-primary btn-lg">⊞ Open Give Items Tab</a>
                <div class="flex gap-2 mt-3" style="justify-content:center">
                    <button class="btn btn-success" onclick="GameplayTab.giveWelcomePack('starter')">☆ Welcome</button>
                    <button class="btn btn-sm" onclick="GameplayTab.giveWelcomePack('t1')">T1</button>
                    <button class="btn btn-sm" onclick="GameplayTab.giveWelcomePack('t2')">T2</button>
                    <button class="btn btn-sm" onclick="GameplayTab.giveWelcomePack('t3')">T3</button>
                </div>
            </div></div>
            <div class="grid-2 mt-3">
                <div class="card"><div class="card-header">⚙ Quick Actions</div><div class="card-body">
                    <div class="flex gap-2 flex-wrap">
                        <button class="btn btn-success" onclick="GameplayTab.grantAllTech()">◻ All Tech</button><option value="BloodSack_Medium">Medium Blood Sack (T2)</option>
                        <option value="BloodSack_Large">Large Blood Sack (T4)</option><option value="BloodSack_Massive">Massive Blood Sack (T6)</option>
                        <option value="Literjon">Literjon</option><option value="Decaliterjon">Decaliterjon (T4)</option>
                    </optgroup>
                    <optgroup label="⚙ Tools & Deployables">
                        <option value="ConstructionTool">Construction Tool</option><option value="SolidoReplicator">Solido Replicator</option>
                        <option value="StakingKit">Staking Kit (T3)</option><option value="VerticalStakingKit">Vertical Staking Kit (T3)</option>
                        <option value="Binoculars">Binoculars</option><option value="RespawnBeacon">Respawn Beacon</option>
                        <option value="SurveyProbe">Survey Probe (T1)</option><option value="SurveyProbeLauncher">Survey Probe Launcher (T1)</option>
                        <option value="HandheldScanner">Handheld Resource Scanner (T2)</option><option value="LongRangeScanner">Long Range Scanner (T5)</option>
                        <option value="VehicleBackupTool">Vehicle Backup Tool</option>
                        <option value="Glowtube">Glowtube</option><option value="PersonalLight">Personal Light (T3)</option>
                        <option value="Thumper">Thumper (T3)</option><option value="Clapper_MK4">Clapper MK4 (T4)</option>
                        <option value="Stilltent">Stilltent (T5)</option>
                        <option value="RadiationSuit_MK4">Radiation Suit MK4</option><option value="RadiationSuit_MK5">Radiation Suit MK5</option>
                        <option value="RadiationSuit_MK6">Radiation Suit MK6</option>
                    </optgroup>
                    <optgroup label="⚙ Gathering Tools">
                        <option value="Cutteray_MK1">Cutteray MK1</option><option value="Cutteray_MK2">Cutteray MK2</option>
                        <option value="Cutteray_MK3">Cutteray MK3</option><option value="Cutteray_MK4">Industrial Cutteray MK4</option>
                        <option value="Cutteray_MK5">Cutteray MK5</option><option value="Cutteray_MK6">Cutteray MK6</option>
                        <option value="BloodExtractor_MK2">Blood Extractor MK2</option><option value="BloodExtractor_MK4">Blood Extractor MK4</option>
                        <option value="BloodExtractor_MK6">Blood Extractor MK6</option>
                        <option value="DewReaper_MK2">Dew Reaper MK2</option><option value="DewReaper_MK4">Dew Reaper MK4</option>
                        <option value="DewReaper_MK6">Dew Reaper MK6</option><option value="DewScythe_MK6">Dew Scythe MK6</option>
                        <option value="StaticCompactor">Static Compactor</option><option value="OmniStaticCompactor">Omni Static Compactor (T6)</option>
                    </optgroup>
                    <optgroup label="💊 Consumables">
                        <option value="HealthPack_Channeled">Healkit (T1)</option><option value="HealthPack_Channeled_2">Healkit MK2</option>
                        <option value="HealthPack_Channeled_3">Healkit MK4</option><option value="HealthPack_Channeled_4">Healkit MK6</option>
                        <option value="SpicedFood">Melange Spiced Food (T2)</option><option value="SpicedBeer">Melange Spiced Beer (T3)</option>
                        <option value="SpicedCoffee">Melange Spiced Coffee (T4)</option><option value="SpicedWine">Melange Spiced Wine (T5)</option>
                        <option value="SpicedLiquor">Melange Spiced Liquor (T6)</option>
                        <option value="IodinePill">Iodine Pill (T5)</option><option value="SaphoJuice">Sapho Juice</option>
                    </optgroup>
                    <optgroup label="◆ Vehicle Parts">
                        <option value="SandbikeChassis_6">Sandbike Chassis T6</option><option value="SandbikeEngine_Unique_Speed_6">Sandbike Engine T6</option>
                        <option value="SandbikeGenerator_6">Sandbike Generator T6</option><option value="SandbikeHull_6">Sandbike Hull T6</option>
                        <option value="SandbikeLocomotion_6">Sandbike Locomotion T6</option><option value="SandbikeBoost_Unique_LessHeat_6">Sandbike Boost T6</option>
                    </optgroup>
                    <optgroup label="⚙ Welding & Repair">
                        <option value="WeldingMaterial">Welding Wire</option><option value="RepairTool">Welding Torch Mk1</option>
                        <option value="RepairTool3">Welding Torch Mk3</option><option value="RepairTool5">Welding Torch Mk5</option>
                    </optgroup>
                    <optgroup label="💎 Augments - Universal Ranged (T6)">
                        <option value="T6_Augment_Damage1">Heavy Caliber Upgrade (+Dmg)</option>
                        <option value="T6_Augment_Headshotdamage1">Tactical Enhancer (+Headshot)</option>
                        <option value="T6_Augment_Magazinecapacity1">Capacity Expander (+Clip)</option>
                        <option value="T6_Augment_Shielddamage1">Disruptive Coating (+Shield Dmg)</option>
                        <option value="T6_Augment_Range1">Barrel Extender (+Range)</option>
                        <option value="T6_Augment_Rateoffire1">Quick-release Trigger (+RoF)</option>
                        <option value="T6_Augment_Recoil1">Recoil Adjuster (-Recoil)</option>
                        <option value="T6_Augment_ReloadSpeed1">Quickloader (-Reload)</option>
                        <option value="T6_Augment_Acuracy1">Precision Barrel (-Spread)</option>
                    </optgroup>
                    <optgroup label="💎 Augments - Melee (T6)">
                        <option value="T6_Augment_Melee1">Blade Sharpener (+Dmg)</option>
                        <option value="T6_Augment_Melee2">Blade Grip (-Atk Stam)</option>
                        <option value="T6_Augment_Melee3">Blade Flexi-Coating (-Block Stam)</option>
                        <option value="T6_Augment_Melee4">Aggressive Grip (-Atk/+Block)</option>
                        <option value="T6_Augment_Melee5">Lightweight Adjuster (-Stam/-Vol)</option>
                        <option value="T6_Augment_Melee6">Heavy Blade (+Dmg/+Block)</option>
                        <option value="T6_Augment_Melee7">Defensive Grip (-Block/+Atk)</option>
                        <option value="T6_Augment_Melee8">Blade Optimizer (-Both Stam)</option>
                        <option value="T6_Augment_Melee9">Edge Optimizer (+Dmg/+Atk)</option>
                    </optgroup>
                    <optgroup label="💎 Augments - Armor (T6)">
                        <option value="T6_Augment_Armor1">Concussive Dampening (+C/-E)</option>
                        <option value="T6_Augment_Armor2">Concussive Redirection (+C/-Dart)</option>
                        <option value="T6_Augment_Armor3">Woven Reinforcement (+Blade/-Fire)</option>
                        <option value="T6_Augment_Armor4">Penetrative Reinf. (+Dart/-Blade)</option>
                        <option value="T6_Augment_Armor5">Energy Dispersing (+E/-C)</option>
                        <option value="T6_Augment_Armor6">Garment Reinforcement (+Armor%)</option>
                        <option value="T6_Augment_Armor8">Desert-tested Weave (+Heat/+Vol)</option>
                        <option value="T6_Augment_Armor9">Curative Padding (+Poison/-Fire)</option>
                        <option value="T6_Augment_Armor10">Energy Resistant (+E/-Poison)</option>
                        <option value="T6_Augment_Armor12">Dart-proof Latticing (+Dart)</option>
                        <option value="T6_Augment_Armor14">Blade-warding Weave (+Blade)</option>
                    </optgroup>
                    <optgroup label="💎 Augments - Utility (T6)">
                        <option value="T6_Augment_DeathDurabilityOff">Protective Coating (No Death Dur.Loss)</option>
                    </optgroup>
                    <optgroup label="👗 Cosmetics & Skins (Landsraad/Shop/NPC)">
                        <option value="Social_Atre_Casual03_Top">Atreides Casual Tunic</option>
                        <option value="Social_Atre_Casual03_Bottom">Atreides Casual Trousers</option>
                        <option value="Social_Atre_Casual03_Shoes">Atreides Casual Boots</option>
                        <option value="Social_Hark_GiediCasual03_Top">Harkonnen Giedi Shirt</option>
                        <option value="Social_Hark_GiediCasual03_Bottom">Harkonnen Giedi Pants</option>
                        <option value="Social_Hark_GiediCasual03_Boots">Harkonnen Giedi Shoes</option>
                        <option value="Social_Smug_EntrepreneurCasual03_Top">Smuggler Entrepreneur Shirt</option>
                        <option value="Social_Smug_EntrepreneurCasual03_Bottom">Smuggler Entrepreneur Pants</option>
                        <option value="Social_Smug_EntrepreneurCasual03_Boots">Smuggler Entrepreneur Boots</option>
                        <option value="Social_Smug_EntrepreneurCasual03_Gloves">Smuggler Entrepreneur Gloves</option>
                        <option value="Social_Choam_MaulaCastOffs01_Top">CHOAM Maula Tunic</option>
                        <option value="Social_Choam_MaulaCastOffs01_Bottom">CHOAM Maula Breeches</option>
                        <option value="Social_Choam_MaulaCastOffs01_Shoes">CHOAM Maula Boots</option>
                        <option value="Social_Choam_MaulaCastOffs01_Gloves">CHOAM Maula Bracers</option>
                        <option value="Social_Choam_MaulaCastOffs01_Top_Fremkit">CHOAM Maula Vest</option>
                        <option value="CrewChiefsStillsuitGarment">Crew Chief Stillsuit</option>
                        <option value="DesertGarb">Desert Garb (Cosmetic)</option>
                        <option value="AcceleratorPowerPack">Accelerator Power Pack (Skin)</option>
                        <option value="TacticalRadiationSuit">Tactical Radiation Suit (Skin)</option>
                    </optgroup>
                <div class="text-xs text-muted mt-1">Use <a href="#" onclick="navigateTo('give-items');return false" style="color:var(--sand-gold)">⊞ Give Items tab</a> for full item catalog — this is just quick shortcuts.</div>
            </div></div>
            <div class="grid-2 mt-3">
                <div class="card"><div class="card-header">⚙ Quick Actions</div><div class="card-body">
                    <div class="flex gap-2 flex-wrap">
                        <button class="btn btn-success" onclick="GameplayTab.grantAllTech()">◻ All Tech</button>
                        <button class="btn btn-danger" onclick="GameplayTab.playtestSetup()">◆ Full Gear</button>
                        <button class="btn btn-primary" onclick="GameplayTab.fillWater()">💧 Fill Water</button>
                        <button class="btn btn-primary" onclick="GameplayTab.repairGear()">⚙ Repair</button>
                        <button class="btn btn-danger" onclick="GameplayTab.cleanInventory()">×️ Clean Inv</button>
                    </div>
                </div></div>
                <div class="card"><div class="card-header">◆ Give Vehicle Kit <span style="font-size:11px;color:var(--text-muted)">Quality 5 = 💜 fioletowe</span></div><div class="card-body">
                    <select class="form-select mb-2" id="gpVehicle" style="width:100%" onchange="GameplayTab.updateVehiclePreview()">
                        <option value="sandbike">🏍️ Sandbike T6</option><option value="buggy">🚙 Buggy T6</option>
                        <option value="scout">🚁 Scout Ornithopter T6</option><option value="assault">🛩️ Assault Ornithopter T6</option>
                        <option value="carrier">🛫 Carryall T6</option><option value="treadwheel">🛞 Treadwheel T6</option>
                    </select>
                    <div class="flex gap-2 mb-2">
                        <select class="form-input" id="gpVehQuality" style="width:100px">
                            <option value="0">Grade 0</option><option value="1">Grade +1</option>
                            <option value="2">Grade +2</option><option value="3">Grade +3</option>
                            <option value="4">Grade +4</option><option value="5" selected>💜 Grade +5</option>
                        </select>
                        <label style="font-size:11px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="gpVehOverflow" checked style="width:auto"> Allow overflow</label>
                    </div>
                    <div id="gpVehPreview" style="font-size:11px;color:var(--text-muted);margin-bottom:8px"></div>
                    <div class="flex gap-2 flex-wrap">
                        <button class="btn btn-success" onclick="GameplayTab.giveFullKit()">⚙ Give Full Kit</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('chassis')">Chassis</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('engine')">Engine</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('generator')">PSU</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('hull')">Hull</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('treads')">Treads</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('boost')">Boost</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('fuel')">⊕ Fuel</button>
                        <button class="btn btn-sm" onclick="GameplayTab.giveSinglePart('torch')">⚙ Torch</button>
                    </div>
                </div></div>
            </div>
            <div class="card mt-2"><div class="card-header">⊞ Player Inventory <button class="btn btn-sm" onclick="GameplayTab.loadInventory()">↻ Load</button></div>
                <div class="card-body" id="gpInventory" style="max-height:500px;overflow:auto">
                    <p class="text-muted">Click Load to fetch inventory with durability/water info</p>
                </div>
            </div>
        `;
        this.fls_id = document.getElementById('gpFls')?.value || '';
        this.loadPlayers();
        this.updateVehiclePreview();
    },

    async loadInventory() {
        const div = document.getElementById('gpInventory');
        div.innerHTML = '<div class="spinner"></div> Loading inventory...';
        try {
            const r = await api.get('/gameplay/players/1/inventory');
            if (!r.items || !r.items.length) { div.innerHTML = '<p class="text-muted">No items or player offline</p>'; return; }
            let html = `<p class="text-sm mb-2"><strong>${r.name}</strong> · ${r.total} items · Pawn #${r.pawn_id}</p>
            <table class="data-table"><tr><th>ID</th><th>Template</th><th>Qty</th><th>Q</th><th>Durability</th><th>Water</th></tr>`;
            for (const item of r.items) {
                const dur = item.durability !== 'N/A' ? `${item.durability}/${item.max_durability}` : '-';
                const durColor = item.durability !== 'N/A' && parseFloat(item.durability) < parseFloat(item.max_durability)*0.3 ? 'color:#f85149' : '';
                const water = item.water ? `${item.water} ${item.water_type}` : '-';
                html += `<tr>
                    <td class="font-mono">${item.id}</td>
                    <td><code>${item.template}</code></td>
                    <td>${item.stack}</td>
                    <td>${item.quality ? '+' + item.quality : '0'}</td>
                    <td style="${durColor}">${dur}</td>
                    <td>${water}</td></tr>`;
            }
            html += '</table>';
            div.innerHTML = html;
        } catch(e) { div.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`; }
    },

    async loadPlayers() {
        try {
            const data = await api.get('/players?limit=20');
            const sel = document.getElementById('gpPlayerSelect');
            if (!sel) return;
            // Clear old options (keep first "-- Select --")
            while (sel.options.length > 1) sel.remove(1);
            (data.players||[]).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.fls_id || '';
                opt.setAttribute('data-accid', p.account_id || '');
                opt.textContent = (p.character_name||'?') + ' (' + (p.fls_id||'?') + ')';
                sel.appendChild(opt);
            });
        } catch(e) {}
    },

    selectPlayer() {
        const v = document.getElementById('gpPlayerSelect')?.value;
        const f = document.getElementById('gpFls');
        if (v && f) f.value = v;
    },

    getFls() { return document.getElementById('gpFls')?.value || 'FC4D3B70DB35663'; },
    getSelectedAccountId() {
        const sel = document.getElementById('gpPlayerSelect');
        if (!sel || !sel.value) return 1;
        // Extract account_id from option data or from stored players
        const opt = sel.options[sel.selectedIndex];
        return parseInt(opt?.getAttribute('data-accid')) || 1;
    },

    async giveSolaris(currencyType) {
        // currencyType: 0 = Monety, 1 = Kredyty
        const inputId = currencyType === 0 ? 'gpMonety' : 'gpKredyty';
        const amount = parseInt(document.getElementById(inputId)?.value) || 100000000;
        try {
            const r = await fetch('/api/v1/gameplay/give-solari', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fls_id:this.getFls(),amount,currency_type:currencyType})});
            const j = await r.json();
            showToast(j.message||'+'+amount.toLocaleString(), j.ok?'success':'error');
        } catch(e) { showToast('Error: '+e.message,'error'); }
    },
    async giveScrip() {
        const amount = parseInt(document.getElementById('gpRodowa')?.value) || 100000000;
        try {
            const r = await fetch('/api/v1/gameplay/give-scrip', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fls_id:this.getFls(),amount})});
            const j = await r.json();
            showToast(j.message||'+'+amount.toLocaleString(), j.ok?'success':'error');
        } catch(e) { showToast('Error: '+e.message,'error'); }
    },
    async giveItemLive() {
        const t = document.getElementById('gpItem')?.value, q = parseInt(document.getElementById('gpQty')?.value||'1');
        const grade = parseInt(document.getElementById('gpGrade')?.value||'0');
        if(!t) return showToast('Select item','error');
        
        // Currency shortcuts
        if (t === '__SOLARI_MONETY__') return this.giveSolaris(0, q);
        if (t === '__SOLARI_KREDYTY__') return this.giveSolaris(1, q);
        if (t === '__SCRIP__') return this.giveScrip(q);
        
        try {
            const r = await fetch('/api/v1/gameplay/give-item-live', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fls_id:this.getFls(),template:t,qty:q,durability:1.0,quality:grade})});
            showToast((await r.json()).message||'Sent!','success');
        } catch(e) { showToast('Error: '+e.message,'error'); }
    },
    async giveItemNoGrade() {
        const t = document.getElementById('gpItem')?.value, q = parseInt(document.getElementById('gpQty')?.value||'1');
        const accId = this.getSelectedAccountId();
        if(!t) return showToast('Select item','error');
        if (t.startsWith('__')) return this.giveItemLive(); // currency shortcuts
        // Use SQL-based give-item (works for ammo, resources, consumables)
        try {
            const r = await fetch('/api/v1/players/give-item', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account_id:accId,template:t,qty:q,quality:0})});
            const j = await r.json();
            showToast(j.ok||'Sent (SQL, grade 0)!','success');
        } catch(e) { showToast('Error: '+e.message,'error'); }
    },
    _filterItems() {
        const search = (document.getElementById('gpItemSearch')?.value||'').toLowerCase();
        const sel = document.getElementById('gpItem');
        if(!sel) return;
        const opts = sel.options;
        for(let i=0; i<opts.length; i++) {
            const opt = opts[i];
            if(!opt.parentNode || opt.parentNode.tagName !== 'OPTGROUP') continue;
            const text = (opt.textContent||'').toLowerCase();
            const val = (opt.value||'').toLowerCase();
            opt.style.display = (!search || text.includes(search) || val.includes(search)) ? '' : 'none';
            // Hide empty optgroups
            const group = opt.parentNode;
            let visible = false;
            for(let j=0; j<group.children.length; j++) {
                if(group.children[j].style.display !== 'none') { visible = true; break; }
            }
            group.style.display = visible ? '' : 'none';
        }
    },
    async giveWelcomePack(k) {
        k = k||'starter';
        try {
            const r = await fetch('/api/v1/gameplay/welcome/give-starter-kit?fls_id='+this.getFls()+'&kit='+k, {method:'POST'});
            showToast((await r.json()).message||'Kit sent!','success');
        } catch(e) { showToast('Error: '+e.message,'error'); }
    },
    async spawnVehicleParts() {
        const v = document.getElementById('gpVehicle')?.value; if(!v) return;
        try {
            const r = await api.post('/gameplay/vehicles/spawn-parts', {fls_id:this.getFls(),vehicle_type:v});
            showToast(r.message||'Sent!',r.ok?'success':'error');
        } catch(e) { showToast('Error: '+e.message,'error'); }
    },

    // ── Give Vehicle Kit v2 (upgraded parts, individual, quality selection) ──
    _vehiclePartMap: {
        sandbike: {chassis:'SandbikeChassis_6',engine:'SandbikeEngine_Unique_Speed_6',generator:'SandbikeGenerator_6',hull:'SandbikeHull_6',treads:'SandbikeLocomotion_6:3',boost:'SandbikeBoost_Unique_LessHeat_6',fuel:'FuelCanister_Large:2',torch:'RepairTool5',wire:'WeldingMaterial:500'},
        buggy: {chassis:'BuggyChassis_6',engine:'BuggyEngine_Unique_Accelerate_06',generator:'BuggyGenerator_6',hull:'BuggyHullBack_6:1,BuggyHullFront_6:1',treads:'BuggyLocomotion_6:4',boost:'BuggyBoost_Unique_LessHeat_6',fuel:'FuelCanister_Large:3',torch:'RepairTool5',wire:'WeldingMaterial:500'},
        scout: {chassis:'OrnithopterLightChassis_6',engine:'OrnithopterLightEngine_6',generator:'OrnithopterLightGenerator_6',hull:'OrnithopterLightHullBack_6:1,OrnithopterLightHullFront_6:1',treads:'OrnithopterLightLocomotion_Unique_Speed_6:4',boost:'OrnithopterLightBoost_Unique_LessHeat_6',fuel:'FuelCanister_Large:3',torch:'RepairTool5',wire:'WeldingMaterial:500'},
        assault: {chassis:'OrnithopterMediumChassis_6',engine:'OrnithopterMediumEngine_6',generator:'OrnithopterMediumGenerator_6',hull:'OrnithopterMediumHull_6:1,OrnithopterMediumHullBack_6:1,OrnithopterMediumHullFront_6:1',treads:'OrnithopterMediumLocomotion_Unique_Strafe_6:4',boost:'OrnithopterMediumBoost_Unique_LessHeat_6',fuel:'FuelCanister_Large:4',torch:'RepairTool5',wire:'WeldingMaterial:500'},
        carrier: {chassis:'OrnithopterTransportChassis_6',engine:'OrnithopterTransportEngine_6',generator:'OrnithopterTransportGenerator_6',hull:'OrnithopterTransportHull_6:1,OrnithopterTransportHullBack_6:1,OrnithopterTransportHullFront_6:1',treads:'OrnithopterTransportLocomotion_Unique_Speed_6:4',boost:'OrnithopterTransportBoost_Unique_LessHeat_06',fuel:'FuelCanister_Large:5',torch:'RepairTool5',wire:'WeldingMaterial:500'},
        treadwheel: {chassis:'TreadwheelChassis_6',engine:'TreadwheelEngine_Unique_Speed_6',generator:'TreadwheelGenerator_6',hull:'',treads:'TreadwheelLocomotion_6:2',boost:'TreadwheelBoost_Unique_LessHeat_6',fuel:'FuelCanister_Large:2',torch:'RepairTool5',wire:'WeldingMaterial:500'},
    },

    updateVehiclePreview() {
        const v = document.getElementById('gpVehicle')?.value;
        const parts = this._vehiclePartMap[v];
        if (!parts) return;
        const preview = Object.entries(parts).filter(([k,v]) => v).map(([k,v]) => {
            const [tid, qty] = v.includes(':') ? v.split(':') : [v, '1'];
            return `${tid}${qty!='1'?' x'+qty:''}`;
        });
        document.getElementById('gpVehPreview').innerHTML = 'Parts: ' + preview.join(', ');
    },

    _getQuality() { return parseInt(document.getElementById('gpVehQuality')?.value) || 5; },
    _getOverflow() { return document.getElementById('gpVehOverflow')?.checked !== false; },

    async _sendPart(template, qty) {
        const q = this._getQuality();
        const fls = this.getFls();
        try {
            const r = await fetch('/api/v1/gameplay/give-item-live', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify({fls_id:fls, template, qty, durability:1.0, quality:q})
            });
            return (await r.json()).ok;
        } catch(e) { return false; }
    },

    async giveFullKit() {
        const v = document.getElementById('gpVehicle')?.value;
        const parts = this._vehiclePartMap[v];
        if (!parts) return;
        const q = this._getQuality();
        if (!confirm(`Give FULL ${v} kit at Grade +${q}?`)) return;
        let ok = 0, total = 0;
        for (const [key, val] of Object.entries(parts)) {
            if (!val) continue;
            const entries = val.includes(',') ? val.split(',') : [val];
            for (const entry of entries) {
                const [tid, qty] = entry.includes(':') ? entry.split(':') : [entry, '1'];
                total++;
                if (await this._sendPart(tid, parseInt(qty))) ok++;
            }
        }
        showToast(`${v}: ${ok}/${total} parts sent (Grade +${q})`, ok===total?'success':ok>0?'warning':'error');
    },

    async giveSinglePart(part) {
        const v = document.getElementById('gpVehicle')?.value;
        const parts = this._vehiclePartMap[v];
        if (!parts || !parts[part]) return;
        const q = this._getQuality();
        const entry = parts[part];
        const entries = entry.includes(',') ? entry.split(',') : [entry];
        let ok = 0;
        for (const e of entries) {
            const [tid, qty] = e.includes(':') ? e.split(':',2) : [e, '1'];
            if (await this._sendPart(tid, parseInt(qty))) ok++;
        }
        showToast(`${part}: ${ok}/${entries.length} sent (Grade +${q})`, ok?'success':'error');
    },
    async fillWater() { try { await api.post('/gameplay/inventory/fill-water?account_id=1'); showToast('Water filled!'); } catch(e){} },
    async repairGear() { 
        const accId = this.getSelectedAccountId();
        const fls = this.getFls();
        try { 
            // 1. SQL repair (updates database to 100%)
            await api.post('/gameplay/inventory/repair-all?account_id='+accId); 
            // 2. RMQ repair (tells game server to reload)
            await api.post('/gameplay/players/repair-all-gear?fls_id='+encodeURIComponent(fls));
            showToast('Gear repaired! SQL 100% + RMQ sent'); 
        } catch(e){ showToast('Error: '+e.message,'error'); }
    },
    async cleanInventory() { try { await api.post('/gameplay/inventory/restore-destroyed',{account_id:1}); showToast('Destroyed items removed!'); } catch(e){} },
    async awardIntel(a) { try { await api.post('/gameplay/intel/award',{account_id:1,amount:a}); showToast('+'+a+' Intel!'); } catch(e){} },
    async awardXP(c,x) { try { await api.post('/gameplay/award-xp',{fls_id:this.getFls(),category:c,experience:x}); showToast('+'+x+' XP!'); } catch(e){} },
    async grantAllTech() { try { await api.post('/gameplay/grant-all-tech',{account_id:1}); showToast('All tech!'); } catch(e){} },
    async playtestSetup() { try { await api.post('/players/cheat-script',{fls_id:this.getFls(),script_name:'PlaytestSetupAdmin'}); showToast('Full gear!'); } catch(e){} },

    // ── Live Actions ───────────────────────────────────────────
    async kickPlayer() {
        if(!confirm('Kick '+this.getFls()+'?')) return;
        try { await api.post('/gameplay/chat/kick',{fls_id:this.getFls()}); showToast('Kicked!'); } catch(e){}
    },
    async whisper() {
        const msg = prompt('Whisper message:'); if(!msg) return;
        try { await api.post('/gameplay/chat/whisper',{target_fls_id:this.getFls(),message:msg}); showToast('Sent!'); } catch(e){}
    },
    async broadcast() {
        const msg = prompt('Broadcast message:'); if(!msg) return;
        try { await api.post('/gameplay/chat/broadcast',{title:'Server',body:msg,duration_sec:30}); showToast('Broadcast sent!'); } catch(e){}
    },
    async teleportToPlayer() {
        const target = prompt('Target FLS ID:'); if(!target) return;
        try { await api.post('/gameplay/teleport/to-player',{source_fls_id:this.getFls(),target_fls_id:target}); showToast('Teleported!'); } catch(e){}
    },

    // ── Cheat Scripts ──────────────────────────────────────────
    async cheatScript(name) {
        if(!confirm('Run cheat script: '+name+'?')) return;
        try { await api.post('/gameplay/cheat-script',{fls_id:this.getFls(),script_name:name}); showToast(name+' done!'); } catch(e){}
    },

    // ── Identity ───────────────────────────────────────────────
    async renameChar() {
        const name = prompt('New character name:'); if(!name) return;
        try { await api.post('/gameplay/players/rename',{account_id:1,name}); showToast('Renamed to '+name); } catch(e){}
    },
    async updateTags() {
        const tag = prompt('Tag to add (e.g. Journey.RewardsUnblocked):'); if(!tag) return;
        try { await api.post('/gameplay/players/tags',{account_id:1,tags:[tag]}); showToast('Tag added!'); } catch(e){}
    },
    async clearTutorial() { try { await api.post('/gameplay/players/clear-tutorial',{account_id:1}); showToast('Tutorial cleared!'); } catch(e){} },
    async wipeCodex() { 
        if(!safeConfirm('Wipe codex for account 1? This cannot be undone!', 'DELETE')) return;
        try { await api.post('/gameplay/players/wipe-codex',{account_id:1}); showToast('Codex wiped!'); } catch(e){}
    },
    async returningPlayer() { try { await api.post('/gameplay/players/returning-award',{account_id:1}); showToast('Award granted!'); } catch(e){} },
    async deleteAccount() {
        if(!safeConfirm('PERMANENTLY DELETE account 1? This cannot be undone!', 'DELETE')) return;
        try { await api.post('/gameplay/players/delete-account',{account_id:1}); showToast('Deleted!'); } catch(e){}
    },

    // ── Stats extras ────────────────────────────────────────────
    async grantKeystones() { try { await api.post('/gameplay/keystones/grant-all'); showToast('205 keystones!'); } catch(e){} },
    async maxFaction() { try { await api.post('/gameplay/faction/max-reputation',null); showToast('Faction maxed!'); } catch(e){} },

    // ── Specializations ──────────────────────────────────────────────
    async checkSpecs() {
        const div = document.getElementById('gpSpecsResult');
        div.innerHTML = '◷ Checking quests...';
        try {
            const r = await api.post('/gameplay/specializations/max-safe', {account_id: 1});
            if (r.status === 'validation_failed') {
                div.innerHTML = `<div style="color:#ff7675">✗ ${r.message}<br><small>${(r.warnings||[]).join('<br>')}</small><br><small>Quests done: ${(r.details?.quest_roots_completed||[]).join(', ')}</small></div>`;
            } else {
                div.innerHTML = `<div style="color:#00b894">✓ Wszystkie questy OK!<br><small>${r.details?.quest_roots_completed?.join(', ')||''}</small><br><small>Rewards: ${r.details?.has_rewards_unblocked?'✓':'✗'}</small></div>`;
            }
        } catch(e) { div.innerHTML = `<span style="color:red">Error: ${e.message}</span>`; }
    },
    async checkSpecsFull() {
        var div = document.getElementById('gpSpecsPanel');
        div.innerHTML = '<span class="text-xs text-muted">◷ Loading specializations...</span>';
        try {
            var r = await api.get('/gameplay/players/1/specs');
            var specs = r.specializations || [];
            var maxXp = 44182;
            var tracks = ['Combat','Crafting','Exploration','Gathering','Sabotage'];
            var html = '<table class="data-table text-xs"><tr><th>Track</th><th>XP</th><th>Level</th><th>%</th><th>Award XP</th></tr>';
            tracks.forEach(function(track) {
                var spec = specs.find(function(s) { return s.track === track; }) || {xp: '0', level: '0'};
                var xp = parseInt(spec.xp) || 0;
                var lvl = parseFloat(spec.level) || 0;
                var pct = Math.min(100, Math.round((xp / maxXp) * 100));
                html += '<tr><td><strong>' + track + '</strong></td>' +
                    '<td>' + xp.toLocaleString() + ' / ' + maxXp.toLocaleString() + '</td>' +
                    '<td>' + lvl.toFixed(1) + '</td>' +
                    '<td><div class="progress-bar" style="width:60px;height:4px"><div class="progress-fill" style="width:' + pct + '%;background:var(--accent-green)"></div></div> ' + pct + '%</td>' +
                    '<td style="display:flex;gap:4px"><input type="number" class="form-input" id="gpSpecXp_' + track + '" value="1000" style="width:60px;font-size:10px;padding:2px 4px"><button class="btn btn-sm" style="font-size:10px;padding:2px 6px" onclick="GameplayTab.awardSpecXp(\'' + track + '\')">+XP</button></td></tr>';
            });
            html += '</table>';
            html += '<p class="text-xs text-muted mt-1">💡 XP cap: 44,182 = level 100. Default award: 1,000 XP per click.</p>';
            div.innerHTML = html;
        } catch(e) { div.innerHTML = '<span class="text-danger text-xs">Error: ' + e.message + '</span>'; }
    },
    async awardSpecXp(track) {
        var amount = parseInt(document.getElementById('gpSpecXp_' + track)?.value) || 1000;
        try {
            var r = await api.post('/gameplay/specializations/award-xp', {account_id: 1, track: track, amount: amount});
            showToast(track + ' +' + amount + ' XP', 'success');
            this.checkSpecsFull();
        } catch(e) { showToast(e.message, 'error'); }
    },
    async maxSpecsSafe() {
        if (!confirm('Max all 5 specialization tracks (level 100) + 205 keystones?\n\nVALIDACJA: Sprawdzi czy questy sa ukonczone.')) return;
        const div = document.getElementById('gpSpecsResult');
        div.innerHTML = '◷ Validating...';
        try {
            const r = await api.post('/gameplay/specializations/max-safe', {account_id: 1});
            if (r.status === 'validation_failed') {
                div.innerHTML = `<div style="color:#ff7675">✗ NIE zmaksowano!<br>${r.warnings?.join('<br>')||''}<br><small>Uzyj Force aby pominac</small></div>`;
            } else {
                div.innerHTML = `<div style="color:#00b894">✓ ${r.message}</div>`;
            }
        } catch(e) { div.innerHTML = `<span style="color:red">Error: ${e.message}</span>`; }
    },
    async maxSpecsForce() {
        if(!safeConfirm('FORCE max all 5 specialization tracks (level 100)?\n\nNO QUEST VALIDATION — use only if you know what you are doing.', 'FORCE')) return;
        const div = document.getElementById('gpSpecsResult');
        div.innerHTML = '◷ Maxing (force)...';
        try {
            const r = await api.post('/gameplay/specializations/max-safe', {account_id: 1, force: true});
            div.innerHTML = `<div style="color:${r.ok?'#00b894':'#ff7675'}">${r.ok?'✓':'✗'} ${r.message}</div>`;
        } catch(e) { div.innerHTML = `<span style="color:red">Error: ${e.message}</span>`; }
    },

    // ── Journey ─────────────────────────────────────────────────
    async checkJourney() {
        const div = document.getElementById('gpJourneyResult');
        div.innerHTML = '◷ Loading...';
        try {
            const r = await api.get('/gameplay/players/1/journey');
            div.innerHTML = `<span style="color:#00b894">✓ ${r.completed}/${r.total} nodes completed</span>`;
        } catch(e) { div.innerHTML = `<span style="color:red">${e.message}</span>`; }
    },
    async completeAllJourney() {
        if(!safeConfirm('Complete ALL journey nodes? This may take a while.', 'COMPLETE')) return;
        try { await api.post('/gameplay/journey/complete-all',{account_id:1}); showToast('Journey completed!'); } catch(e) {}
    },
    async resetJourney() {
        if(!safeConfirm('Reset all journey progress? This cannot be undone!', 'RESET')) return;
        try { await api.post('/gameplay/journey/reset',{account_id:1}); showToast('Journey reset!'); } catch(e) {}
    },

    // ── Faction ─────────────────────────────────────────────────
    async checkFaction() {
        const div = document.getElementById('gpFactionResult');
        try {
            const r = await api.get('/gameplay/players/1/faction');
            div.innerHTML = (r.reputation||[]).map(f=>`${f.faction}: ${f.rep}`).join('<br>') || 'No data';
        } catch(e) { div.innerHTML = `<span style="color:red">${e.message}</span>`; }
    },
    async setFaction() {
        const faction = document.getElementById('gpFaction')?.value || 'Fremen';
        const rep = parseFloat(document.getElementById('gpFactionRep')?.value) || 1000;
        try { await api.post('/gameplay/faction/set',{fls_id:this.getFls(),faction,reputation:rep}); showToast(`${faction}=${rep}`); } catch(e) {}
    },

    // ── Trainers ────────────────────────────────────────────────
    async unlockAllTrainers() { try { await api.post('/gameplay/trainers/unlock-all',{account_id:1}); showToast('Trainers unlocked!'); } catch(e) {} },
    async resetTrainers() { 
        if(!confirm('Reset all trainers?')) return;
        try { await api.post('/gameplay/trainers/reset',{account_id:1}); showToast('Trainers reset!'); } catch(e) {}
    },

    // ── Vehicle ─────────────────────────────────────────────────
    async spawnVehicle() { try { await api.post('/gameplay/vehicles/spawn',{fls_id:this.getFls()}); showToast('Sandbike spawned!'); } catch(e) {} },
    async refuelVehicle() {
        const id = parseInt(document.getElementById('gpVehicleId')?.value) || 0;
        if(!id) return showToast('Enter vehicle ID','error');
        try { await api.post('/gameplay/vehicles/refuel',{vehicle_id:id}); showToast('Refueled!'); } catch(e) {}
    },
    async repairVehicle() {
        const id = parseInt(document.getElementById('gpVehicleId')?.value) || 0;
        if(!id) return showToast('Enter vehicle ID','error');
        try { await api.post('/gameplay/vehicles/repair',{vehicle_id:id}); showToast('Repaired!'); } catch(e) {}
    },

    // ── Inventory Mutations ─────────────────────────────────────
    async setDurability() {
        const id = parseInt(document.getElementById('gpMutItemId')?.value) || 0;
        const val = parseFloat(document.getElementById('gpMutVal')?.value) || 100;
        if(!id) return showToast('Enter Item ID','error');
        try { await api.post('/gameplay/inventory/set-durability',{item_id:id,durability:val}); showToast(`Durability=${val}!`); } catch(e) {}
    },
    async setWater() {
        const id = parseInt(document.getElementById('gpMutItemId')?.value) || 0;
        const val = parseFloat(document.getElementById('gpMutVal')?.value) || 100;
        if(!id) return showToast('Enter Item ID','error');
        try { await api.post('/gameplay/inventory/set-water',{item_id:id,water:val}); showToast(`Water=${val}!`); } catch(e) {}
    },
    async setStack() {
        const id = parseInt(document.getElementById('gpMutItemId')?.value) || 0;
        const val = parseInt(document.getElementById('gpMutVal')?.value) || 1;
        if(!id) return showToast('Enter Item ID','error');
        try { await api.post('/gameplay/inventory/set-stack',{item_id:id,stack:val}); showToast(`Stack=${val}!`); } catch(e) {}
    },
    async deleteItem() {
        const id = parseInt(document.getElementById('gpMutItemId')?.value) || 0;
        if(!id) return showToast('Enter Item ID','error');
        if(!safeConfirm(`Delete item ${id}? This action cannot be undone!`, 'DELETE')) return;
        try { await api.post('/gameplay/inventory/delete-item',{item_id:id}); showToast('Deleted!'); } catch(e) {}
    },
    async repairItem() {
        const id = parseInt(document.getElementById('gpMutItemId')?.value) || 0;
        if(!id) return showToast('Enter Item ID','error');
        try { await api.post('/gameplay/inventory/set-durability',{item_id:id,durability:100}); showToast('Item repaired to 100%!','success'); } catch(e) { showToast(e.message,'error'); }
    }
};
