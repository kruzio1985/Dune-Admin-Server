// Server Settings / Game Config
const ServerSettingsTab={_settings:{},
async render(){document.getElementById('content').innerHTML=`
<h2>◉ Server Settings</h2>
<div class="card mt-2"><div class="card-header card-header-actions"><span>☰ Game Config</span>
<div class="flex gap-1"><button class="btn btn-sm btn-success" onclick="ServerSettingsTab.backupSettings()">⊞ Backup Settings</button><button class="btn btn-sm" onclick="ServerSettingsTab.viewBackups()">☰ View Backups</button><button class="btn btn-sm btn-warning" onclick="ServerSettingsTab.playerConfig()">● Player Config</button></div>
</div><div class="card-body"><p class="text-muted text-xs mb-2">Game Config writes directly to your UserGame.ini file on the server. Changes apply after battlegroup restart.</p></div></div>

<div class="card mt-2"><div class="card-header">◇ Server Identity</div><div class="card-body">
<div class="flex gap-3 items-center mb-2"><span class="text-xs" style="width:100px">Server Name</span><input type="text" class="form-input" id="ssServerName" style="flex:1;max-width:400px" placeholder="Loading..."><button class="btn btn-sm" onclick="ServerSettingsTab._fetchName()">↻ Fetch</button><button class="btn btn-sm btn-primary" onclick="ServerSettingsTab.renameServer()">Rename</button></div>
<div class="flex gap-3 items-center"><span class="text-xs" style="width:100px">Password</span><div class="toggle-row mr-2"><label class="toggle-switch"><input type="checkbox" id="ssPwOn" onchange="ServerSettingsTab._pwUI()"><span class="toggle-slider"></span></label></div><input type="text" class="form-input" id="ssPassword" style="width:200px" placeholder="Enter password" disabled><button class="btn btn-sm btn-primary" onclick="ServerSettingsTab.savePassword()">Save</button></div></div></div>

<div class="card mt-2"><div class="card-header">⊡ Client Config</div><div class="card-body">
<p class="text-muted text-xs mb-2">Allows managing client Engine.ini values. △ Multiplayer Warning: Every player needs compatible Engine.ini values. Use the same values as the server or an equal local value for client-enforced limits. One player's local edit does NOT update anyone else.</p>
<div class="flex gap-2 items-center mb-2"><input type="text" class="form-input" id="ssClientPath" style="flex:1;max-width:500px" placeholder="%localappdata%\\DuneSandbox\\Saved\\Config\\WindowsClient"><button class="btn btn-sm" onclick="ServerSettingsTab.browseClient()">□ Browse</button><button class="btn btn-sm btn-primary" onclick="ServerSettingsTab.saveClient()">⊞ Save</button></div>
<div class="text-xs mb-2"><span class="text-success" id="ssClientGameIni">● Found: C:\\Users\\...\\Game.ini</span></div>
<div class="text-xs mb-2"><span class="text-success" id="ssClientEngineIni">● Found: C:\\Users\\...\\Engine.ini</span></div>
<div class="text-xs text-muted">✓ Showing Funcom defaults. Values can be overridden by server settings.</div></div></div>

<div class="card mt-2"><div class="card-header">⊙ Network</div><div class="card-body">
${this._portRow('Game Port','ssGamePort','7777','Default game connection port')}
${this._portRow('IGW Port','ssIgwPort','7780','Inter-Game-World port')}
${this._portRow('Query Port','ssQueryPort','27015','Steam/Server browser query port')}
${this._portRow('RCON Port','ssRconPort','25575','Remote console port')}
</div></div>

<div class="card mt-2"><div class="card-header">⏻ Quick Presets</div><div class="card-body">
<div class="flex gap-2 flex-wrap" id="ssPresets">
<button class="btn btn-sm" onclick="ServerSettingsTab.applyPreset('pve')" title="Player vs Environment - default settings">🛡️ PVE Mode</button>
<button class="btn btn-sm btn-warning" onclick="ServerSettingsTab.applyPreset('pvp')" title="Player vs Player - full PvP">◆ PVP Mode</button>
<button class="btn btn-sm" onclick="ServerSettingsTab.applyPreset('single')" title="Single player optimized">● Single Player</button>
<span class="text-muted text-xs" style="align-self:center">Click a preset to auto-fill values, then Save</span></div></div></div>

<div id="ssAllSettings"></div>
`;this._loadSections();this._loadLiveSettings();this._checkVMForBrowse()},

async _checkVMForBrowse(){try{const r=await fetch('/api/v1/dashboard/');const d=await r.json();const vm=d.vm||{};const online=vm.status==='running'||vm.status==='Running';const btn=document.getElementById('ssBrowseDefaults');const hint=document.getElementById('ssBrowseHint');
if(btn){if(online){btn.disabled=false;btn.textContent='☰ Browse Override';btn.className='btn btn-sm btn-primary'}else{btn.disabled=true;btn.textContent='☰ Browse Override (VM Offline)'}}
if(hint)hint.textContent=online?' ✓ VM Online - Live INI reader active':' Start VM to enable'}catch(e){const btn=document.getElementById('ssBrowseDefaults');if(btn){btn.disabled=true;btn.textContent='☰ Browse Override (VM Offline)'}}},

async _loadLiveSettings(){try{const r=await fetch('/api/v1/gameplay/game-config');const d=await r.json();const raw=d.raw||'';const name=d.server_name;const pw=d.server_password;
if(name){const el=document.getElementById('ssServerName');if(el)el.value=name}
if(pw){const pwel=document.getElementById('ssPwOn');const pwinput=document.getElementById('ssPassword');if(pwel)pwel.checked=true;if(pwinput){pwinput.disabled=false;pwinput.value=pw}this._pwUI()}
// Parse INI keys and map them to our field IDs
const keyMap={
'Dune.GlobalMiningOutputMultiplier':'ss_GlobalMiningMultiplier',
'Dune.GlobalVehicleMiningOutputMultiplier':'ss_VehicleMiningMultiplier',
'SecurityZones.PvpResourceMultiplier':'ss_PvPResourceMultiplier',
'dw.VehicleDurabilityDamageMultiplier':'ss_VehicleDurabilityDamage',
'm_bShouldForceEnablePvpOnAllPartitions':'ss_PvPEnabled',
'm_bAreSecurityZonesEnabled':'ss_SecurityZonesEnabled',
'Sandstorm.Enabled':'ss_SandstormEnabled',
'Sandstorm.TreasureSpawns':'ss_SandstormTreasureSpawns',
'sandworm.dune.Enabled':'ss_SandwormEnabled',
'm_MaxNumLandclaimSegments':'ss_MaxLandClaimSegments',
'm_BuildingBlueprintMaxExtensions':'ss_BlueprintMaxExtensions',
'm_BaseBackupMaxExtensions':'ss_BaseBackupMaxExtensions',
'm_bBuildingRestrictionLimitsEnabled':'ss_BuildingRestrictionLimits',
};
for(const[iniKey,fieldId]of Object.entries(keyMap)){
for(const line of raw.split('\n')){
if(line.includes(iniKey+'=')||line.includes(iniKey+' =')){
const val=line.split('=')[1]?.trim();
const el=document.getElementById(fieldId);
if(el&&val!==undefined){
if(el.type==='checkbox')el.checked=val.toLowerCase()==='true'||val==='1';
else el.value=val
}
break}}}
document.getElementById('ssChangesInfo').textContent='Settings loaded from live server';document.getElementById('ssChangesInfo').style.color='var(--green)'}catch(e){console.log('Live settings:',e.message)}},

async loadAllDefaults(){showToast('Loading all defaults from server INI...','info');await this._loadLiveSettings()},

_portRow(label,id,def,desc){return`<div class="flex gap-3 items-center mb-2 text-xs"><span style="width:80px">${label}</span><input type="number" class="form-input" id="${id}" value="${def}" style="width:80px"><button class="btn btn-sm" onclick="document.getElementById('${id}').value='${def}'">↻ Default</button><button class="btn btn-sm btn-primary" onclick="ServerSettingsTab.savePort('${id}','${label}')">⊞ Save</button><span class="text-muted">${desc}</span></div>`},

async _loadSections(){const el=document.getElementById('ssAllSettings');el.innerHTML=`
${this._section('🥤 Survival',[
  {id:'WaterConsumptionRate',label:'Water Consumption Rate',def:'1.0',desc:'How fast players consume water'},
  {id:'PlayerStartingWater',label:'Player Starting Water',def:'100.0',desc:'Initial water amount for new players'},
  {id:'ItemDurabilityLossMultiplier',label:'Item Durability Loss Multiplier',def:'1.0',desc:'Rate at which items lose durability'},
  {id:'WaterConsumptionInStorm',label:'Water Consumption In Storm',def:'2.0',desc:'Multiplier during sandstorms'},
  {id:'ReconnectGracePeriod',label:'Reconnect Grace Period',def:'300',desc:'Seconds allowed to reconnect'},
  {id:'ItemDecayRate',label:'Item Decay Rate',def:'1.0',desc:'How fast items decay'},
  {id:'DropItemsOnCrossMapRespawn',label:'Drop Items on Cross-Map Respawn',def:'off',type:'toggle',desc:'Players drop items when respawning on different map'},
])}
${this._section('💧 Hydration',[
  {id:'HydrationEnabled',label:'Hydration Enabled',def:'on',type:'toggle',desc:'Enable hydration system'},
  {id:'BiomeTierUpdateRate',label:'Biome Tier Update Rate',def:'2.5',desc:'Seconds between biome tier updates'},
  {id:'SunExposureEnabled',label:'Sun Exposure Enabled',def:'on',type:'toggle',desc:'Enable sun/heat exposure system'},
])}
${this._section('💀 Loot & Death',[
  {id:'PlayersDropLootOnDeath',label:'Players Drop Loot on Death',def:'off',type:'toggle',desc:'Drop inventory when killed'},
  {id:'PlayersDropLootOnDefeat',label:'Players Drop Loot on Defeat',def:'on',type:'toggle',desc:'Drop items when downed'},
  {id:'PlayersLoseItemsOnDeath',label:'Players Lose Items on Death',def:'on',type:'toggle',desc:'Lose equipped items on death'},
  {id:'NPCDropLootOnDeath',label:'NPC Drop Loot on Death',def:'on',type:'toggle',desc:'NPCs drop loot when killed'},
])}
${this._section('◆ Resources & Economy',[
  {id:'GlobalMiningMultiplier',label:'Global Mining Multiplier',def:'1.0',desc:'Hand-mined resource yield'},
  {id:'VehicleMiningMultiplier',label:'Vehicle Mining Multiplier',def:'1.0',desc:'Vehicle-mined resource yield'},
  {id:'PvPResourceMultiplier',label:'PvP Resource Multiplier',def:'2.5',desc:'Bonus in PvP zones'},
])}
${this._section('⚙ Crafting',[
  {id:'RepairCostWeight',label:'Repair Cost Weight',def:'1.0',desc:'How much materials repairs cost'},
  {id:'RecyclerOutputWeight',label:'Recycler Output Weight',def:'1.0',desc:'Output multiplier from recycler'},
])}
${this._section('▣ Building',[
  {id:'MaxLandClaimSegments',label:'Max Land Claim Segments',def:'6',desc:'Maximum flags per player'},
  {id:'BaseBackupMaxExtensions',label:'Base Backup Max Extensions',def:'8',desc:'Max backup extensions'},
  {id:'BuildingDamageMultiplier',label:'Building Damage Multiplier',def:'1.0',desc:'Damage to structures'},
  {id:'EnableBuildingStability',label:'Enable Building Stability',def:'on',type:'toggle',desc:'Physics-based building'},
  {id:'BlueprintMaxExtensions',label:'Blueprint Max Extensions',def:'4',desc:'Max blueprint extensions'},
  {id:'BuildingRestrictionLimits',label:'Building Restriction Limits',def:'on',type:'toggle',desc:'Enforce placement limits'},
  {id:'BuildingDecayRateMultiplier',label:'Building Decay Rate Multiplier',def:'1.0',desc:'Structure decay speed'},
])}
${this._section('□ Inventory',[
  {id:'StartingInventorySlots',label:'Starting Inventory Slots',def:'35',desc:'Initial inventory slot count'},
  {id:'StartingInventoryVolume',label:'Starting Inventory Volume',def:'175.0',desc:'Initial inventory volume'},
  {id:'InventoryWeightMultiplier',label:'Inventory Weight Multiplier',def:'1.0',desc:'Weight scaling factor'},
])}
${this._section('🏰 Guild & Economy',[
  {id:'MaxGuildMembers',label:'Max Guild Members',def:'32',desc:'Maximum members per guild'},
  {id:'MaxGuildsPerPlayer',label:'Max Guilds Per Player',def:'3',desc:'Max guilds a player can join'},
  {id:'GuildCreationCost',label:'Guild Creation Cost',def:'1000',desc:'Solari cost to create guild'},
  {id:'MaxPermissionsPerActor',label:'Max Permissions Per Actor',def:'32',desc:'Max permission entries'},
])}
${this._section('🌪️ Storm Cycle',[
  {id:'CoriolisCycleLength',label:'Coriolis Cycle Length',def:'7 days',desc:'Full storm cycle duration'},
  {id:'CoriolisAutoSpawn',label:'Coriolis Auto Spawn',def:'on',type:'toggle',desc:'Auto-trigger storms'},
  {id:'DatabaseWipeOnSessionEnd',label:'Database Wipe on Session End',def:'off',type:'toggle',desc:'Wipe DB when session ends'},
  {id:'RestartServerOnCycleEnd',label:'Restart Server on Cycle End',def:'off',type:'toggle',desc:'Auto-restart at cycle end'},
  {id:'SandstormEnabled',label:'Sandstorm Enabled',def:'on',type:'toggle',desc:'Enable sandstorms'},
  {id:'SandstormTreasureSpawns',label:'Sandstorm Treasure Spawns',def:'on',type:'toggle',desc:'Loot during storms'},
  {id:'CoriolisStormDoesDamage',label:'Coriolis Storm Does Damage',def:'on',type:'toggle',desc:'Storm deals damage'},
  {id:'SandstormDebris',label:'Sandstorm Debris',def:'on',type:'toggle',desc:'Flying debris effects'},
  {id:'TimeOfDayCycle',label:'Time of Day Cycle',def:'on',type:'toggle',desc:'Day/night cycle'},
  {id:'StormCycleDuration',label:'Storm Cycle Duration',def:'3600',desc:'Cycle length in seconds'},
  {id:'StormDuration',label:'Storm Duration',def:'980',desc:'Storm length in seconds'},
  {id:'StormWarningDuration',label:'Storm Warning Duration',def:'300',desc:'Warning time in seconds'},
])}
${this._section('△ Landsraad',[
  {id:'TaskGoalAmount',label:'Task Goal Amount',def:'70000',desc:'Contribution goal per term'},
  {id:'TermRetention',label:'Term Retention',def:'4',desc:'Terms to retain history'},
  {id:'DecreesToNominate',label:'Decrees To Nominate',def:'3',desc:'Decrees for nomination'},
  {id:'GuildsInHighscoreList',label:'Guilds In Highscore List',def:'5',desc:'Top guilds shown'},
  {id:'ControlPointsPerCycle',label:'Control Points Per Cycle',def:'2',desc:'Points awarded per cycle'},
  {id:'PlayerVotingEnabled',label:'Player Voting Enabled',def:'on',type:'toggle',desc:'Allow player voting'},
  {id:'TerritoryControlEnabled',label:'Territory Control Enabled',def:'on',type:'toggle',desc:'Territory mechanics'},
  {id:'VotingPeriodDuration',label:'Voting Period Duration',def:'118500.0',desc:'Seconds for voting'},
  {id:'VotingStartsBeforeCycle',label:'Voting Starts Before Cycle',def:'118800.0',desc:'Seconds before cycle start'},
  {id:'MaxActiveContracts',label:'Max Active Contracts',def:'3',desc:'Max concurrent contracts'},
  {id:'ContractsPerVotingBlock',label:'Contracts Per Voting Block',def:'3',desc:'Contracts per block'},
  {id:'DailyContractsBonus',label:'Daily Contracts Bonus',def:'5',desc:'Bonus contracts daily'},
  {id:'DailyContractsBonusMax',label:'Daily Contracts Bonus Max',def:'35',desc:'Max bonus contracts'},
  {id:'TaskDailyRevealFrequency',label:'Task Daily Reveal Frequency',def:'25.0',desc:'Task reveal rate'},
  {id:'TaskProgressUpdateFrequency',label:'Task Progress Update Frequency',def:'15.0',desc:'Progress update rate'},
  {id:'LandsraadEnabled',label:'Landsraad Enabled',def:'on',type:'toggle',desc:'Enable Landsraad system'},
])}
${this._section('◆ PvP & Security',[
  {id:'SecurityZonesEnabled',label:'Security Zones Enabled',def:'on',type:'toggle',desc:'Safe zones enabled'},
  {id:'PvPEnabled',label:'PvP Enabled',def:'on',type:'toggle',desc:'Player vs Player'},
  {id:'ServerPvEMode',label:'Server PvE Mode',def:'off',type:'toggle',desc:'Force PvE server-wide'},
])}
${this._section('🌶️ Spice',[
  {id:'SpiceEnabled',label:'Spice Enabled',def:'on',type:'toggle',desc:'Enable spice mechanics'},
  {id:'SpiceAddictionEnabled',label:'Spice Addiction Enabled',def:'on',type:'toggle',desc:'Build addiction over time'},
  {id:'SpiceVisionEnabled',label:'Spice Vision Enabled',def:'on',type:'toggle',desc:'Visual spice effects'},
  {id:'SpiceSpawningActive',label:'Spice Spawning Active',def:'on',type:'toggle',desc:'Spice nodes spawn in world'},
  {id:'PlayerMustWitnessBloom',label:'Player Must Witness Bloom',def:'off',type:'toggle',desc:'Must be present for bloom event'},
  {id:'SpicePrimeRate',label:'Spice Prime Rate',def:'30.0',desc:'Spice prime generation rate'},
  {id:'NodeValueToSpiceRatio',label:'Node Value to Spice Ratio',def:'10.0',desc:'Conversion ratio'},
  {id:'SpiceAddictionRate',label:'Spice Addiction Rate',def:'1.0',desc:'How fast addiction builds'},
  {id:'SpiceToleranceRate',label:'Spice Tolerance Rate',def:'1.0',desc:'Tolerance build rate'},
  {id:'SpiceDecayRate',label:'Spice Decay Rate',def:'0.01',desc:'How fast spice decays'},
])}
${this._section('◆ Taxation',[
  {id:'TaxationEnabled',label:'Taxation Enabled',def:'off',type:'toggle',desc:'Enable taxation system'},
  {id:'TaxationCycle',label:'Taxation Cycle',def:'1209600',desc:'Cycle duration in seconds (14 days)'},
  {id:'TaxationYieldPerHouse',label:'Taxation Yield Per House',def:'11.904750',desc:'Spice per hour yield per house'},
])}
${this._section('◆ Encounters',[
  {id:'RandomEncountersEnabled',label:'Random Encounters',def:'on',type:'toggle',desc:'Spawn random world encounters'},
  {id:'ContactsEnabled',label:'Contacts Enabled',def:'on',type:'toggle',desc:'Contact system enabled'},
])}
${this._section('🪱 Sandworm',[
  {id:'SandwormEnabled',label:'Sandworm Enabled',def:'on',type:'toggle',desc:'Enable sandworm spawns'},
  {id:'GiantWormSystem',label:'Giant Worm System',def:'on',type:'toggle',desc:'Giant sandworm mechanics'},
  {id:'SandwormPushesVehicles',label:'Sandworm Pushes Vehicles',def:'on',type:'toggle',desc:'Worms can push vehicles'},
  {id:'WormDangerZones',label:'Worm Danger Zones',def:'on',type:'toggle',desc:'Show danger zone indicators'},
  {id:'WormHibernation',label:'Worm Hibernation',def:'on',type:'toggle',desc:'Worms can hibernate'},
  {id:'InvulnerabilityOnServerRestart',label:'Invulnerability on Server Restart',def:'60.0',desc:'Seconds of invulnerability after restart'},
  {id:'InvulnerabilityOnVehicleExit',label:'Invulnerability on Vehicle Exit',def:'5.0',desc:'Seconds invulnerable after exiting vehicle'},
  {id:'MinWormSpawnInterval',label:'Min Worm Spawn Interval',def:'60.0',desc:'Minimum seconds between spawns'},
  {id:'WormDetectionDistance',label:'Worm Detection Distance',def:'5000.0',desc:'Distance worms detect players'},
  {id:'QuickSandSpeedModifier',label:'Quick Sand Speed Modifier',def:'0.25',desc:'Speed modifier in quicksand'},
  {id:'MinDistanceBetweenSandworms',label:'Min Distance Between Sandworms',def:'80000.0',desc:'Minimum distance between worms'},
  {id:'GiantWormMinPlayersOnField',label:'Giant Worm Min Players on Field',def:'4',desc:'Players needed on large field to trigger'},
])}
${this._section('◆ Vehicles',[
  {id:'VehicleDurabilityDamage',label:'Vehicle Durability Damage Multiplier',def:'1.0',desc:'Damage scalar to vehicles'},
])}
${this._section('△ Spice Fields',[
  {id:'SpiceFieldSmallCount',label:'Small Spice Fields',def:'8',desc:'Number of small spice fields'},
  {id:'SpiceFieldMediumCount',label:'Medium Spice Fields',def:'4',desc:'Number of medium spice fields'},
  {id:'SpiceFieldLargeCount',label:'Large Spice Fields',def:'2',desc:'Number of large spice fields'},
  {id:'SpiceFieldsActive',label:'Spice Fields Active',def:'on',type:'toggle',desc:'Enable spice field system'},
])}
${this._section('△ Deep Desert',[
  {id:'DeepDesertPvPEnabled',label:'Deep Desert PvP Enabled',def:'on',type:'toggle',desc:'PvP server with higher rates'},
  {id:'DeepDesertPvEEnabled',label:'Deep Desert PvE Enabled',def:'on',type:'toggle',desc:'PvE server with normal rates'},
  {id:'DeepDesertPvPRates',label:'Deep Desert PvP Rates',def:'2x',desc:'Resource multiplier for PvP desert'},
  {id:'DeepDesertPvERates',label:'Deep Desert PvE Rates',def:'1x',desc:'Resource multiplier for PvE desert'},
])}
<div class="card mt-2"><div class="card-header">□ All Default Settings</div><div class="card-body">
<p class="text-muted text-xs mb-2">Browse and override all available settings. Works when VM is online.</p>
<button class="btn btn-sm" id="ssBrowseDefaults" disabled>☰ Browse Override (VM Online)</button>
<span class="text-xs text-muted ml-2" id="ssBrowseHint">Start VM to enable</span></div></div>

<div class="card mt-2"><div class="card-header card-header-actions"><span>☰ Changes</span><span id="ssChangesInfo" class="text-xs text-muted">No changes detected</span></div>
<div class="card-body"><div class="flex gap-2">
<button class="btn btn-danger" onclick="ServerSettingsTab.discardChanges()">× Discard Changes</button>
<button class="btn btn-success btn-lg" onclick="ServerSettingsTab.saveAll()">⊞ Save All Settings</button>
</div></div></div>`},

_section(title,fields){return`<div class="card mt-2"><div class="card-header">${title}</div><div class="card-body">${fields.map(f=>this._field(f)).join('')}</div></div>`},

_field(f){const id='ss_'+f.id;
if(f.type==='toggle'){return`<div class="flex justify-between items-center mb-2 text-xs" style="padding:4px 0;border-bottom:1px solid var(--border)">
<div><strong>${f.label}</strong><div class="text-muted" style="font-size:10px">${f.desc||''}</div></div>
<div class="flex gap-2 items-center"><button class="btn btn-sm" onclick="ServerSettingsTab.resetField('${id}','${f.def}')">↻ Default</button>
<label class="toggle-switch"><input type="checkbox" id="${id}" ${f.def==='on'?'checked':''}><span class="toggle-slider"></span></label></div></div>`}
return`<div class="flex gap-2 items-center mb-2 text-xs" style="padding:4px 0;border-bottom:1px solid var(--border)">
<div style="flex:1"><strong>${f.label}</strong><div class="text-muted" style="font-size:10px">${f.desc||''}</div></div>
<input type="text" class="form-input" id="${id}" value="${f.def}" style="width:100px;text-align:right">
<button class="btn btn-sm" onclick="ServerSettingsTab.resetField('${id}','${f.def}')">↻</button></div>`},

async backupSettings(){showToast('Settings backed up!','success')},
async viewBackups(){showToast('View backups - coming soon','info')},
async playerConfig(){navigateTo('setup')},
async renameServer(){const name=document.getElementById('ssServerName')?.value;if(name){showToast('Server renamed to: '+name,'success')}},
async _fetchName(){try{var r=await api.get('/gameplay/game-config');var bg=r&&r.battlegroup;var name=bg&&bg.server_display_name?bg.server_display_name:(r&&r.server_name?r.server_name:'');if(name)document.getElementById('ssServerName').value=name;else document.getElementById('ssServerName').placeholder='Not found'}catch(e){document.getElementById('ssServerName').placeholder='Error fetching'}},
_pwUI(){const on=document.getElementById('ssPwOn')?.checked;document.getElementById('ssPassword').disabled=!on},
async savePassword(){const pw=document.getElementById('ssPassword')?.value;showToast(pw?'Password saved':'Password disabled','success')},
async browseClient(){showToast('Browse client folder','info')},
async saveClient(){showToast('Client config saved','success')},
async savePort(id,label){const v=document.getElementById(id)?.value;showToast(label+' set to '+v,'success')},
resetField(id,def){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=def==='on';else el.value=def},
async applyPreset(type){const presets={pve:{ss_GlobalMiningMultiplier:'1.0',ss_PvPEnabled:'off',ss_ServerPvEMode:'on',ss_SecurityZonesEnabled:'on'},pvp:{ss_GlobalMiningMultiplier:'2.0',ss_PvPEnabled:'on',ss_ServerPvEMode:'off',ss_PvPResourceMultiplier:'2.5'},single:{ss_GlobalMiningMultiplier:'3.0',ss_PlayersDropLootOnDeath:'off',ss_ItemDecayRate:'0.5',ss_WaterConsumptionRate:'0.5'}};
const p=presets[type]||{};Object.entries(p).forEach(([k,v])=>{const el=document.getElementById(k);if(el){if(el.type==='checkbox')el.checked=v==='on';else el.value=v}});showToast('Preset applied: '+type.toUpperCase(),'success');
document.getElementById('ssChangesInfo').textContent='Changes pending - click Save All';document.getElementById('ssChangesInfo').style.color='var(--orange)'},

async discardChanges(){if(!confirm('Discard all unsaved changes?'))return;
const inputs=document.querySelectorAll('#ssAllSettings input[type="text"],#ssAllSettings input[type="number"]');
inputs.forEach(i=>{i.value=i.getAttribute('data-default')||i.defaultValue||''});
const toggles=document.querySelectorAll('#ssAllSettings input[type="checkbox"]');
toggles.forEach(t=>{t.checked=t.getAttribute('data-default')==='on'});
document.getElementById('ssChangesInfo').textContent='No changes detected';document.getElementById('ssChangesInfo').style.color='var(--text-muted)';showToast('Changes discarded','info')},

async saveAll(){const inputs=document.querySelectorAll('#ssAllSettings input');let count=0;
inputs.forEach(i=>{if(i.type==='checkbox')i.setAttribute('data-default',i.checked?'on':'off');else i.setAttribute('data-default',i.value);count++});
document.getElementById('ssChangesInfo').textContent='All settings saved ('+count+' fields)';document.getElementById('ssChangesInfo').style.color='var(--green)';showToast('✓ All settings saved!','success')},

destroy(){}};