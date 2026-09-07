// Give Items Tab — Player selector + Weapons/Armor (Grade) + Ammo/Resources + Consumables
const GiveItemsTab = {
    _players: [],

async render() {
    document.getElementById('content').innerHTML = `
<h2>⊞ Give Items</h2>

<!-- PLAYER SELECTOR -->
<div class="card mb-2"><div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div class="form-group" style="flex:1;min-width:200px">
        <label class="form-label">● Target Player</label>
        <select class="form-select" id="giPlayerSelect" onchange="GiveItemsTab._onPlayerChange()">
            <option value="">-- Select player --</option>
        </select>
    </div>
    <div class="form-group" style="width:220px">
        <label class="form-label">FLS ID (manual)</label>
        <input type="text" class="form-input" id="giFlsId" value="FC4D3B70DB35663" placeholder="FC4D3B70DB35663">
    </div>
    <div><button class="btn btn-sm" onclick="GiveItemsTab._loadPlayers()">↻ Refresh</button></div>
</div></div>

<div class="tab-nav" id="giTabs">
    <div class="tab-nav-item active" onclick="GiveItemsTab.showTab('weapons',event)">◆ Weapons & Armor (Grade)</div>
    <div class="tab-nav-item" onclick="GiveItemsTab.showTab('ammo',event)">◇ Ammo & Resources</div>
    <div class="tab-nav-item" onclick="GiveItemsTab.showTab('consumables',event)">⊕ Consumables & Tools</div>
</div>
<div id="giContent"></div>`;
    this.showTab('weapons');
    this._loadPlayers();
},

_getFlsId() { return document.getElementById('giFlsId')?.value?.trim() || 'FC4D3B70DB35663'; },

async _loadPlayers() {
    try {
        const r = await fetch('/api/v1/players?limit=50');
        const data = await r.json();
        this._players = data.players || [];
        const sel = document.getElementById('giPlayerSelect');
        if (!sel) return;
        while (sel.options.length > 1) sel.remove(1);
        this._players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.fls_id || '';
            opt.setAttribute('data-accid', p.account_id || '');
            opt.textContent = (p.character_name||'?') + ' [' + (p.fls_id||'?') + ']';
            sel.appendChild(opt);
        });
    } catch(e) { console.error('loadPlayers:', e); }
},

_onPlayerChange() {
    const sel = document.getElementById('giPlayerSelect');
    const fls = document.getElementById('giFlsId');
    if (sel?.value && fls) fls.value = sel.value;
},

showTab(tab, ev) {
    document.querySelectorAll('#giTabs .tab-nav-item').forEach(t => t.classList.remove('active'));
    if (ev?.target) ev.target.classList.add('active');
    const c = document.getElementById('giContent');
    if (tab === 'weapons') this._renderWeapons(c);
    else if (tab === 'ammo') this._renderAmmo(c);
    else if (tab === 'consumables') this._renderConsumables(c);
},

// ═══ WEAPONS & ARMOR (RMQ, with Grade) ═══
_renderWeapons(ct) {
    ct.innerHTML = `
<div class="card mt-2 card-border-gold"><div class="card-header">◆ Weapons & Armor — WITH Grade <span class="text-xs text-muted">RMQ live, player ONLINE</span></div><div class="card-body">
    <input type="text" class="form-input mb-2" id="giWeaponSearch" placeholder="🔍 Filter weapons/armor..." oninput="GiveItemsTab._filter('giWeaponSelect','giWeaponSearch')" style="width:100%">
    <div class="flex gap-2 mb-2">
        <select class="form-select" id="giWeaponSelect" style="flex:1">
            <optgroup label="◆ Ranged Weapons">
                <option value="HarkAr3">Harkonnen AR-3</option><option value="HarkAr4">Harkonnen AR-4</option>
                <option value="AtreSmg2">Atreides SMG-2</option><option value="AtreSmg3">Atreides SMG-3</option>
                <option value="ChoamCom2">CHOAM Combat Rifle</option><option value="ChoamSda1">CHOAM SDA-1</option>
                <option value="ChoamSda5">CHOAM SDA-5</option>
                <option value="HarkHeavyPistol2">Harkonnen Heavy Pistol</option>
                <option value="Scattergun_Prototype">Scattergun Prototype</option>
                <option value="LongRifle_Unique_Poison_06">Long Rifle (Poison)</option>
                <option value="UniqueAr4">Unique AR-4</option><option value="UniqueSmg3">Unique SMG-3</option>
                <option value="UniqueSda_Story_Ari">Ari's Unique SDA</option>
            </optgroup>
            <optgroup label="◆ Melee Weapons">
                <option value="Kindjal">Kindjal (Basic)</option><option value="Kindjal_1">Kindjal MK1</option>
                <option value="Kindjal_2">Kindjal MK2</option>
                <option value="ScrapMetalKnife">Scrap Metal Knife</option>
            </optgroup>
            <optgroup label="🛡 Armor — Harkonnen">
                <option value="Combat_Hark_MedUnique02_Boots">Harkonnen Med Boots</option>
                <option value="Combat_Hark_MedUnique02_Bottom">Harkonnen Med Pants</option>
                <option value="Combat_Hark_MedUnique02_Gloves">Harkonnen Med Gloves</option>
                <option value="Combat_Hark_MedUnique02_Helmet">Harkonnen Med Helmet</option>
                <option value="Combat_Hark_MedUnique02_Top">Harkonnen Med Chest</option>
            </optgroup>
            <optgroup label="🛡 Armor — Scout Sets">
                <option value="Makeshift_Boots">Makeshift Shoes</option><option value="Makeshift_Pants">Makeshift Pants</option>
                <option value="Makeshift_Gloves">Makeshift Gloves</option><option value="Makeshift_Helmet">Makeshift Hood</option><option value="Makeshift_Top">Makeshift Jacket</option>
                <option value="ScavengerScout_Boots">Scavenger Boots (T1)</option><option value="ScavengerScout_Pants">Scavenger Pants</option>
                <option value="ScavengerScout_Gloves">Scavenger Gloves</option><option value="ScavengerScout_Helmet">Scavenger Hood</option><option value="ScavengerScout_Top">Scavenger Chestpiece</option>
                <option value="KirabScout_Boots">Kirab Scout Boots (T2)</option><option value="KirabScout_Pants">Kirab Scout Pants</option>
                <option value="KirabScout_Gloves">Kirab Scout Gloves</option><option value="KirabScout_Helmet">Kirab Scout Helmet</option><option value="KirabScout_Top">Kirab Scout Jacket</option>
                <option value="SlaverScout_Boots">Slaver Scout Boots (T3)</option><option value="SlaverScout_Pants">Slaver Scout Pants</option>
                <option value="SlaverScout_Gloves">Slaver Scout Gloves</option><option value="SlaverScout_Helmet">Slaver Scout Mask</option><option value="SlaverScout_Top">Slaver Scout Jacket</option>
                <option value="DunemanScout_Boots">Duneman Scout Boots (T4)</option><option value="DunemanScout_Pants">Duneman Scout Pants</option>
                <option value="DunemanScout_Gloves">Duneman Scout Gloves</option><option value="DunemanScout_Helmet">Duneman Scout Helmet</option><option value="DunemanScout_Top">Duneman Scout Jacket</option>
                <option value="MercenaryScout_Boots">Mercenary Scout Boots (T5)</option><option value="MercenaryScout_Pants">Mercenary Scout Leggings</option>
                <option value="MercenaryScout_Gloves">Mercenary Scout Gloves</option><option value="MercenaryScout_Helmet">Mercenary Scout Helmet</option><option value="MercenaryScout_Top">Mercenary Scout Top</option>
                <option value="CHOAMScout_Boots">CHOAM Scout Boots (T6)</option><option value="CHOAMScout_Pants">CHOAM Scout Pants</option>
                <option value="CHOAMScout_Gloves">CHOAM Scout Gloves</option><option value="CHOAMScout_Helmet">CHOAM Scout Helmet</option><option value="CHOAMScout_Top">CHOAM Scout Chestplate</option>
            </optgroup>
            <optgroup label="🛡 Armor — Stillsuits">
                <option value="ScavengerStillsuit_Body">Scavenger Stillsuit (T1)</option>
                <option value="KirabStillsuit_Body">Kirab Stillsuit (T2)</option>
                <option value="SlaverStillsuit_Body">Slaver Stillsuit (T3)</option>
                <option value="NativeStillsuit_Body">Native Stillsuit (T4)</option>
                <option value="MercenaryStillsuit_Body">Mercenary Stillsuit (T5)</option>
                <option value="CHOAMStillsuit_Body">CHOAM Stillsuit (T6)</option>
            </optgroup>
            <optgroup label="🛡 Shields & Belts">
                <option value="HoltzmanShield">Holtzman Shield (Basic)</option>
                <option value="HoltzmanShieldActiveDrain">Holtzman Shield MK2</option>
                <option value="HoltzmanShieldActiveDrain2">Holtzman Shield MK3</option>
                <option value="HoltzmanShieldActiveDrain3">Holtzman Shield MK5</option>
                <option value="HoltzmanShield_Adaptive">Adaptive Holtzman Shield (T6)</option>
                <option value="SuspensorBelt_Passive">Passive Suspensor Belt (T1)</option>
                <option value="SuspensorBelt_Leap">Leap Suspensor Belt (T2)</option>
                <option value="SuspensorBelt_Planar">Planar Suspensor Belt (T3)</option>
                <option value="SuspensorBelt_Full">Full Suspensor Belt (T4)</option>
                <option value="SuspensorBelt_Responsive">Responsive Planar Belt (T5)</option>
                <option value="SuspensorBelt_Sentinel">Sentinel Belt (T6)</option>
            </optgroup>
        </select>
        <select class="form-input" id="giGrade" style="width:100px">
            <option value="0">Grade 0</option><option value="1">Grade +1</option>
            <option value="2">Grade +2</option><option value="3">Grade +3</option>
            <option value="4">Grade +4</option><option value="5" selected>Grade +5</option>
        </select>
        <button class="btn btn-success" onclick="GiveItemsTab._giveWeapon()">⊞ Give</button>
    </div>
    <div class="text-xs text-muted mt-1">Weapons & armor via RMQ. Player must be ONLINE.</div>
</div></div>`;
},

async _giveWeapon() {
    const fls = this._getFlsId();
    const t = document.getElementById('giWeaponSelect')?.value;
    const grade = parseInt(document.getElementById('giGrade')?.value||'5');
    if(!t) return showToast('Select weapon/armor','error');
    if(!fls) return showToast('Select a player first!','error');
    try {
        const r = await fetch('/api/v1/gameplay/give-item-live', {method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({fls_id:fls,template:t,qty:1,durability:1.0,quality:grade})});
        const j = await r.json();
        showToast(j.message||('Sent '+t+' Grade +'+grade+' to '+fls), j.ok!==false?'success':'error');
    } catch(e) { showToast('Error: '+e.message,'error'); }
},

// ═══ AMMO & RESOURCES (RMQ, no grade) ═══
_renderAmmo(ct) {
    ct.innerHTML = `
<div class="card mt-2 card-border-green"><div class="card-header">◇ Ammo, Resources & Materials <span class="text-xs text-muted">RMQ delivery, player ONLINE</span></div><div class="card-body">
    <input type="text" class="form-input mb-2" id="giAmmoSearch" placeholder="🔍 Filter ammo/resources..." oninput="GiveItemsTab._filter('giAmmoSelect','giAmmoSearch')" style="width:100%">
    <div class="flex gap-2 mb-2">
        <select class="form-select" id="giAmmoSelect" style="flex:1">
            <optgroup label="◆ Ammo">
                <option value="Ammo">Light Ammo</option><option value="HeavyAmmo">Heavy Ammo</option>
            </optgroup>
            <optgroup label="🪨 Raw Resources">
                <option value="Stone">Granite Stone</option><option value="Basalt">Basalt Stone</option><option value="Plastone">Plastone</option>
                <option value="PlantFiber">Plant Fiber</option><option value="ScrapMetal">Salvaged Metal</option>
                <option value="AzuriteOre">Copper Ore</option><option value="MagnetiteOre">Iron Ore</option>
                <option value="DolomiteRock">Carbon Ore</option><option value="BauxiteOre">Aluminum Ore</option>
                <option value="T6ResourceA">Titanium Ore</option><option value="FlourSand">Flour Sand</option>
                <option value="SpiceSand">Spice Sand</option><option value="SpiceResidue">Spice Residue</option>
                <option value="JasmiumCrystal">Jasmium Crystal</option><option value="ErythriteCrystal">Erythrite Crystal</option>
                <option value="T6ResourceB">Stravidium Mass</option><option value="Coal">Coal</option><option value="Sulfur">Sulfur</option>
            </optgroup>
            <optgroup label="🔩 Refined Materials">
                <option value="CopperBar">Copper Ingot</option><option value="IronBar">Iron Ingot</option>
                <option value="SteelBar">Steel Ingot</option><option value="AluminiumBar">Aluminum Ingot</option>
                <option value="DuraluminumRod">Duraluminum Ingot</option><option value="T6RefinedResourceA">Plastanium Ingot</option>
                <option value="Silicone">Silicone Block</option><option value="CobaltBar">Cobalt Paste</option>
                <option value="T6RefinedResourceB">Stravidium Fiber</option><option value="T6PlasteelComponent">Plasteel Plate</option>
                <option value="T6ArmorPlating">Plasteel Armor Plating</option>
            </optgroup>
            <optgroup label="🌶 Spice & Fuel">
                <option value="MelangeSpice">Spice Melange</option><option value="RefinedSpice">Refined Spice</option>
                <option value="SpicedFuelCell">Spiced Fuel Cell</option><option value="Oil">Fuel Cell</option>
                <option value="FuelCanister">Small Vehicle Fuel Cell</option><option value="Water">Water</option>
            </optgroup>
        </select>
        <input type="number" class="form-input" id="giAmmoQty" value="1000" style="width:100px" onkeydown="return numOnly(event)" title="Quantity">
        <button class="btn btn-success" onclick="GiveItemsTab._giveAmmo()">⊞ Give</button>
    </div>
    <div class="text-xs text-muted mt-1">RMQ delivery — player must be ONLINE.</div>
</div></div>`;
},

async _giveAmmo() {
    const fls = this._getFlsId();
    const t = document.getElementById('giAmmoSelect')?.value;
    const q = parseInt(document.getElementById('giAmmoQty')?.value||'1000');
    if(!t) return showToast('Select item','error');
    if(!fls) return showToast('Select a player first!','error');
    try {
        const r = await fetch('/api/v1/gameplay/players/give-item', {method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({fls_id:fls,template:t,qty:q,quality:0})});
        const j = await r.json();
        showToast(j.message||('Sent '+t+' x'+q+' to '+fls), j.ok!==false?'success':'error');
    } catch(e) { showToast('Error: '+e.message,'error'); }
},

// ═══ CONSUMABLES & TOOLS (RMQ, no grade) ═══
_renderConsumables(ct) {
    ct.innerHTML = `
<div class="card mt-2 card-border-blue"><div class="card-header">⊕ Consumables & Tools <span class="text-xs text-muted">RMQ delivery, player ONLINE</span></div><div class="card-body">
    <input type="text" class="form-input mb-2" id="giConsSearch" placeholder="🔍 Filter consumables..." oninput="GiveItemsTab._filter('giConsSelect','giConsSearch')" style="width:100%">
    <div class="flex gap-2 mb-2">
        <select class="form-select" id="giConsSelect" style="flex:1">
            <optgroup label="💊 Healkits">
                <option value="HealthPack_Channeled">Healkit (T1)</option><option value="HealthPack_Channeled_2">Healkit MK2</option>
                <option value="HealthPack_Channeled_3">Healkit MK4</option><option value="HealthPack_Channeled_4">Healkit MK6</option>
            </optgroup>
            <optgroup label="🌶 Spiced Items">
                <option value="SpicedFood">Spiced Food (T2)</option><option value="SpicedBeer">Spiced Beer (T3)</option>
                <option value="SpicedCoffee">Spiced Coffee (T4)</option><option value="SpicedWine">Spiced Wine (T5)</option>
                <option value="SpicedLiquor">Spiced Liquor (T6)</option>
                <option value="IodinePill">Iodine Pill (T5)</option><option value="SaphoJuice">Sapho Juice</option>
            </optgroup>
            <optgroup label="⚙ Tools">
                <option value="Cutteray_MK1">Cutteray MK1</option><option value="Cutteray_MK2">Cutteray MK2</option>
                <option value="Cutteray_MK3">Cutteray MK3</option><option value="Cutteray_MK4">Industrial Cutteray MK4</option>
                <option value="Cutteray_MK5">Cutteray MK5</option><option value="Cutteray_MK6">Cutteray MK6</option>
                <option value="ConstructionTool">Construction Tool</option><option value="SolidoReplicator">Solido Replicator</option>
                <option value="StakingKit">Staking Kit (T3)</option><option value="Binoculars">Binoculars</option>
                <option value="RespawnBeacon">Respawn Beacon</option>
                <option value="RepairTool">Welding Torch Mk1</option><option value="RepairTool3">Welding Torch Mk3</option>
                <option value="RepairTool5">Welding Torch Mk5</option>
                <option value="Stilltent">Stilltent (T5)</option>
            </optgroup>
            <optgroup label="◆ Vehicle Parts (T6)">
                <option value="SandbikeChassis_6">Sandbike Chassis T6</option>
                <option value="SandbikeEngine_Unique_Speed_6">Sandbike Engine T6</option>
                <option value="SandbikeGenerator_6">Sandbike Generator T6</option>
                <option value="SandbikeHull_6">Sandbike Hull T6</option>
                <option value="SandbikeLocomotion_6">Sandbike Locomotion T6</option>
                <option value="SandbikeBoost_Unique_LessHeat_6">Sandbike Boost T6</option>
            </optgroup>
        </select>
        <input type="number" class="form-input" id="giConsQty" value="1" style="width:100px" onkeydown="return numOnly(event)">
        <button class="btn btn-success" onclick="GiveItemsTab._giveConsumable()">⊞ Give</button>
    </div>
    <div class="text-xs text-muted mt-1">RMQ delivery — player must be ONLINE.</div>
</div></div>`;
},

async _giveConsumable() {
    const fls = this._getFlsId();
    const t = document.getElementById('giConsSelect')?.value;
    const q = parseInt(document.getElementById('giConsQty')?.value||'1');
    if(!t) return showToast('Select item','error');
    if(!fls) return showToast('Select a player first!','error');
    try {
        const r = await fetch('/api/v1/gameplay/players/give-item', {method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({fls_id:fls,template:t,qty:q,quality:0})});
        const j = await r.json();
        showToast(j.message||('Sent '+t+' x'+q+' to '+fls), j.ok!==false?'success':'error');
    } catch(e) { showToast('Error: '+e.message,'error'); }
},

// ═══ FILTER ═══
_filter(selectId, searchId) {
    const search = (document.getElementById(searchId)?.value||'').toLowerCase();
    const sel = document.getElementById(selectId);
    if(!sel) return;
    for(let i=0; i<sel.options.length; i++) {
        const opt = sel.options[i];
        if(!opt.parentNode || opt.parentNode.tagName !== 'OPTGROUP') continue;
        const text = (opt.textContent||'').toLowerCase();
        const val = (opt.value||'').toLowerCase();
        opt.style.display = (!search || text.includes(search) || val.includes(search)) ? '' : 'none';
        const group = opt.parentNode;
        let vis = false;
        for(let j=0; j<group.children.length; j++) if(group.children[j].style.display !== 'none') { vis=true; break; }
        group.style.display = vis ? '' : 'none';
    }
},

};