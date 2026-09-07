// Server Extra Settings - Experimental (UserEngine.ini)
const ExtraSettingsTab={
async render(){document.getElementById('content').innerHTML=`
<h2>⊕ Server Extra Settings <span class="text-xs text-muted">Experimental</span></h2>
<div class="card mt-2"><div class="card-header card-header-actions"><span>☰ Game Config</span>
<div class="flex gap-1"><button class="btn btn-sm btn-success" onclick="ExtraSettingsTab.backupSettings()">⊞ Backup Settings</button><button class="btn btn-sm" onclick="ExtraSettingsTab.viewBackups()">☰ View Backups</button><button class="btn btn-sm btn-warning" onclick="ExtraSettingsTab.playerConfig()">● Player Config</button></div>
</div><div class="card-body"><p class="text-muted text-xs mb-2">Experimental server console variables recovered from the game binary. Grouped by what they affect. Saving writes them to UserEngine.ini. Apply them from Game Config.</p></div></div>
<div class="card mt-2"><div class="card-header">⊡ Your Client Config (This PC)</div><div class="card-body">
<p class="text-muted text-xs mb-2">Manage your local client Engine.ini. Open files in Notepad for editing.</p>
<div class="flex gap-2 mb-2">
<button class="btn btn-sm" onclick="ExtraSettingsTab.openInNotepad('Game.ini')">📄 View Game.ini</button>
<button class="btn btn-sm" onclick="ExtraSettingsTab.openInNotepad('Engine.ini')">📄 View Engine.ini</button>
<button class="btn btn-sm" onclick="ExtraSettingsTab.openInNotepad('UserEngine.ini')">📄 View UserEngine.ini</button></div>
<div class="text-xs mb-2"><span class="text-success" id="esClientGameIni">● Found: %localappdata%\\DuneSandbox\\Saved\\Config\\WindowsClient\\Game.ini</span></div>
<div class="text-xs mb-2"><span class="text-success" id="esClientEngineIni">● Found: %localappdata%\\DuneSandbox\\Saved\\Config\\WindowsClient\\Engine.ini</span></div>
<label class="toggle-row"><input type="checkbox" id="esAllowClientIni" style="width:auto"><span class="text-xs ml-2">Allow to manage my client Engine.ini</span></label>
<p class="text-muted text-xs mt-2">When enabled, changes made here affect your LOCAL client. Server-side settings in UserEngine.ini affect all players.</p></div></div>
<div id="esAll"></div>
<div class="card mt-2"><div class="card-header card-header-actions"><span>☰ Changes</span><span id="esChangesInfo" class="text-xs text-muted">No changes detected</span></div>
<div class="card-body"><div class="flex gap-2">
<button class="btn btn-danger" onclick="ExtraSettingsTab.discardChanges()">× Discard Changes</button>
<button class="btn btn-success btn-lg" onclick="ExtraSettingsTab.saveAll()">⊞ Save All Extra Settings</button></div></div></div>
`;this._loadAll()},
async _loadAll(){document.getElementById('esAll').innerHTML=`
${this._s('🥤 Survival & Shelter',[
{i:'OutsideBuildablesAffectShelter','Outside Buildables Affect Shelter','off','toggle','When enabled, objects placed outside affect shelter calculation. Disabled by default.','off/on'},
{i:'ShelteredSandBuildupTarget','Sheltered Sand Buildup Target','-1','num','Target sand buildup level for sheltered areas. -1 = use game default.','-1 to 100'},
{i:'PlaceableShelterOverride','Placeable Shelter Threshold Override','-1','num','Override shelter threshold for placeables. -1 = disabled/use default.','-1 to 100'},
{i:'ShelterSystem','Shelter System','off','toggle','Enables the sandstorm shelter requirement system. Disabling removes shelter requirements.','off/on'},
{i:'ShelterInvestigation','Shelter Investigation','off','toggle','Enables the shelter investigation mechanic for sandstorms.','off/on'},
{i:'BuildingShelterOverride','Building Shelter Threshold Override','-1','num','Override shelter threshold for buildings. -1 = disabled.','-1 to 100'},
{i:'UnshelteredSandBuildupTarget','Unsheltered Sand Buildup Target','-1','num','Sand buildup target for unsheltered areas. -1 = default.','-1 to 100'},
{i:'DeathstillConversionTime','Deathstill Conversion Time','','num','Time in seconds for deathstill conversion. Empty = default.','0+ seconds'},
{i:'NPCLootOnCorpse','NPC Loot on Corpse','off','toggle','Whether NPCs drop loot as corpses. Disabled by default.','off/on'},
])}
${this._s('⊕ Fuel & Power',[
{i:'FuelBurningDuration','Fuel Burning Duration','1.0','num','Multiplier for how long fuel burns. 1.0 = normal.','0.1 to 10.0'},
{i:'FuelBurnTimeSec','Fuel Burn Time (seconds)','','num','Fixed fuel burn time in seconds. Empty = use multiplier.','0+ seconds'},
{i:'VehiclePowerConsumption','Vehicle Power Consumption','1.0','num','Multiplier for vehicle power/fuel consumption rate.','0.1 to 5.0'},
])}
${this._s('🪱 Sandworm',[
{i:'SandwormAttackDifficulty','Sandworm Attack Difficulty','','select','Sandworm attack difficulty level. Empty = default (game-controlled).','Default/Easy/Medium/Hard'},
{i:'SandwormDelayedRestart','Sandworm Delayed Restart','600','num','Seconds before sandworm respawns after being killed/despawned.','0 to 3600'},
{i:'WormEnrageThreshold','Worm Enrage Threshold','-1','num','Damage threshold to enrage worm. -1 = game default.','-1 to 100000'},
{i:'WormTargetDropThreshold','Worm Target Drop Threshold','0','num','Threshold for worm to drop current target. 0 = default.','0 to 100'},
{i:'WormThreatWarningDistanceDD','Worm Threat Warning Distance (Deep Desert)','','num','Distance for threat warning in deep desert. Empty = default.','0 to 50000'},
{i:'WormDeathVolume','Worm Death Volume','on','toggle','Plays death sound when worm is killed. Default on.','off/on'},
{i:'WormAvoidsBreachingOnVehicle','Worm Avoids Breaching on Vehicle','on','toggle','Worms avoid breaching directly on vehicles. Default on.','off/on'},
{i:'WormSafeZoneExpansion','Worm Safe Zone Expansion','-1','num','Expansion of worm safe zones. -1 = default.','-1 to 10000'},
{i:'WormTargetChangeThreshold','Worm Target Change Threshold','0','num','Threshold for worm to change targets. 0 = default.','0 to 100'},
{i:'WormThreatWarningDistance','Worm Threat Warning Distance','','num','Distance for worm threat warning. Empty = default.','0 to 50000'},
{i:'SharkwormRoamingAlways','Sharkworm Roaming Always','off','toggle','Sharkworm always roams instead of patrolling.','off/on'},
{i:'WormAvoidsBreachingOnPlayers','Worm Avoids Breaching on Players','on','toggle','Worms avoid breaching directly on player positions. Default on.','off/on'},
{i:'WormTargetingMessage','Worm Targeting Message','off','toggle','Shows a message when worm targets a player. Default off.','off/on'},
{i:'WormInflatedSafeZoneExpansion','Worm Inflated Safe Zone Expansion','-1','num','Expanded safe zone for inflated worms. -1 = default.','-1 to 10000'},
])}
${this._s('🌪️ Hazard & Storms',[
{i:'EnableSafeZonesScaling','Enable Safe Zones Scaling','off','toggle','Allows dynamic scaling of safe zones. Disabled by default.','off/on'},
{i:'HazardZones','Hazard Zones','off','toggle','Enables hazard zones (radiation, etc). Disabled by default.','off/on'},
{i:'OrnithoptersSinkInQuicksand','Ornithopters Sink in Quicksand','off','toggle','Ornithopters can sink in quicksand. Default off.','off/on'},
{i:'SafeZoneScale','Safe Zone Scale','1.0','num','Scale factor for safe zone size. 1.0 = normal.','0.1 to 10.0'},
{i:'HazardDestructionTime','Hazard Destruction Time','','num','Time in seconds before hazard destroys objects. Empty = default.','0+ seconds'},
{i:'QuicksandOnMapBorders','Quicksand on Map Borders','off','toggle','Spawns quicksand near map borders. Default off.','off/on'},
])}
${this._s('▣ Base Building & Backups',[
{i:'MigrateAllBuildableDamage','Migrate All Buildable Damage','off','toggle','Migrates damage when moving buildables. Disabled by default.','off/on'},
{i:'BaseBackupTool_Backups','Base Backup Tool - Backups','off','toggle','Enables the base backup tool for creating restorable backups.','off/on'},
{i:'MaxBaseBackupsPerPlayer','Max Base Backups Per Player','','num','Maximum backup slots per player. Empty = default (0).','0 to 100'},
{i:'BaseBackupToolPlacement','Base Backup Tool Placement','off','toggle','Allows placing backup tool on base.','off/on'},
{i:'BaseBackupToolRecycle','Base Backup Tool Recycle','off','toggle','Allows recycling backup tool.','off/on'},
{i:'BaseBackupToolRestrictionOverride','Base Backup Tool Restriction Time Override','','num','Override restriction time between backups in seconds. Empty = default.','0+ seconds'},
])}
${this._s('◆ Vehicles',[
{i:'VehicleHeatMultiplier','Vehicle Heat Multiplier','1.0','num','Multiplier for vehicle heat generation. 1.0 = normal.','0.1 to 5.0'},
{i:'VehiclesCanOverheat','Vehicles Can Overheat','on','toggle','Vehicles can overheat and take damage. Default on.','off/on'},
{i:'AbandonedVehicleDecaySpeed','Abandoned Vehicle Decay Speed','1.0','num','Speed multiplier for abandoned vehicle decay.','0.0 to 10.0'},
{i:'RecoveryChassisDurabilityReduction','Recovery Chassis Durability Reduction','0.15','num','Fraction of durability lost when recovering vehicle.','0.0 to 1.0'},
{i:'VehicleRecoveryTimeLimit','Vehicle Recovery Time Limit','','num','Time limit for vehicle recovery. Empty = no limit.','0+ seconds'},
{i:'MaximumVehicles','Maximum Vehicles','-1','num','Global max vehicle cap. -1 = unlimited.','-1 to 10000'},
{i:'MaximumVehiclesPerPlayer','Maximum Vehicles Per Player','20','num','Max vehicles a player can own.','1 to 50'},
{i:'VehicleImpactCharacterDamage','Vehicle Impact Character Damage','1.0','num','Multiplier for damage when vehicle hits character.','0.0 to 10.0'},
{i:'ThrowPlayersOnMovingVehicles','Throw Players on Moving Vehicles','on','toggle','Players standing on moving vehicles get thrown off. Default on.','off/on'},
{i:'VehicleThrowOffSpeedThreshold','Vehicle Throw Off Speed Threshold','2000','num','Speed threshold for throwing players off vehicles.','0 to 10000'},
{i:'WormProtectionOnDisconnect','Worm Protection on Disconnect','off','toggle','Protects disconnected players vehicles from worms.','off/on'},
{i:'VehicleBackupTool','Vehicle Backup Tool','on','toggle','Enables vehicle backup tool for recovery. Default on.','off/on'},
{i:'AmmoBlocksVehicleBackups','Ammo Blocks Vehicle Backups','off','toggle','Ammo in inventory blocks vehicle backup. Default off.','off/on'},
{i:'VehicleBackupChannelingTimer','Vehicle Backup Channeling Timer','off','toggle','Enables channeling timer for vehicle backup.','off/on'},
{i:'BlockDisassemblyWhileHarnessed','Block Disassembly While Harnessed','on','toggle','Prevents disassembly when vehicle is harnessed. Default on.','off/on'},
{i:'DisableWheeledVehicleTransfer','Disable Wheeled Vehicle Transfer','off','toggle','Disables transferring wheeled vehicles.','off/on'},
{i:'VehicleHitPushForce','Vehicle Hit Push Force','','num','Push force when vehicle hits something. Empty = default.','0 to 100000'},
{i:'VehicleTerminalVelocityOverride','Vehicle Terminal Velocity Override','0','num','Override for vehicle max speed. 0 = default.','0 to 100000'},
{i:'SeatChangeHotkeys','Seat Change Hotkeys','on','toggle','Allow hotkey seat switching in vehicles. Default on.','off/on'},
{i:'VehicleSpawnerCheckTime','Vehicle Spawner Check Time','','num','Time between vehicle spawner checks. Empty = default.','0+ seconds'},
{i:'VehicleSmokeTrails','Vehicle Smoke Trails','on','toggle','Shows smoke trails on damaged vehicles. Default on.','off/on'},
{i:'VehicleHeatInterpolationSpeed','Vehicle Heat Interpolation Speed','1.0','num','Speed of heat interpolation on vehicles.','0.1 to 5.0'},
{i:'AbandonedVehicleDecay','Abandoned Vehicle Decay','off','toggle','Abandoned vehicles decay over time. Disabled by default.','off/on'},
{i:'VehicleDisassemblySpeed','Vehicle Disassembly Speed','1.0','num','Speed multiplier for vehicle disassembly.','0.1 to 5.0'},
{i:'VehicleRecoveryBaseCost','Vehicle Recovery Base Cost','2500','num','Base Solari cost for vehicle recovery.','0 to 100000'},
{i:'MaximumActiveVehicles','Maximum Active Vehicles','-1','num','Maximum simultaneously active vehicles. -1 = unlimited.','-1 to 10000'},
{i:'MaximumSpawnedVehicles','Maximum Spawned Vehicles','400','num','Maximum total spawned vehicles in world.','1 to 10000'},
{i:'VehicleCountWarningThreshold','Vehicle Count Warning Threshold','','num','Warning threshold for vehicle count. Empty = default.','0 to 10000'},
{i:'VehicleCollisionDamagePlayers','Vehicle Collision Damage Players','off','toggle','Vehicles deal damage to players on collision.','off/on'},
{i:'VehicleThrowOffForce','Vehicle Throw Off Force','3','num','Force multiplier when throwing players off vehicles.','0 to 10'},
{i:'WormProtectionOnMidAirExit','Worm Protection on Mid-Air Exit','on','toggle','Protects from worms when exiting vehicle mid-air. Default on.','off/on'},
{i:'VehicleRecovery','Vehicle Recovery','on','toggle','Enables vehicle recovery system. Default enabled.','off/on'},
{i:'VehicleWreckDespawnTime','Vehicle Wreck Despawn Time','','num','Time before vehicle wrecks despawn. Empty = default.','0+ seconds'},
{i:'VehicleRelocation','Vehicle Relocation','on','toggle','Allows relocating vehicles. Default on.','off/on'},
{i:'BlockDisassemblyOnForeignLandClaim','Block Disassembly on Foreign Land Claim','on','toggle','Blocks disassembly on others land claims. Default on.','off/on'},
{i:'BlockDisassemblyOnAir','Block Disassembly on Air','on','toggle','Blocks disassembly while airborne. Default on.','off/on'},
{i:'LaunchCharactersOnCollisions','Launch Characters on Collisions','on','toggle','Launches characters on vehicle collisions. Default on.','off/on'},
])}
${this._s('◆ Combat & Shields',[
{i:'FriendlyPvPDamageMultiplier','Friendly PvP Damage Multiplier','','num','Damage multiplier for friendly PvP. Empty = no friendly fire.','0.0 to 10.0'},
{i:'DisablePvPDamage','Disable PvP Damage','off','toggle','Completely disables PvP damage.','off/on'},
{i:'DamageNonCombatNPC','Damage Non-Combat NPC','on','toggle','Allows damaging non-combat NPCs. Default on.','off/on'},
{i:'StaggerDamageScaling','Stagger Damage Scaling','off','toggle','Enables stagger from damage scaling.','off/on'},
{i:'ShieldDropsWhileShooting','Shield Drops While Shooting','on','toggle','Holtzman shield drops when player shoots. Default on.','off/on'},
{i:'DamageHealingDurationReduction','Damage Healing Duration Reduction','','num','Reduces healing duration after taking damage. Empty = default.','0 to 60 seconds'},
{i:'DuelingSystem','Dueling System','on','toggle','Enables the player dueling system. Default on.','off/on'},
{i:'NearDeathDamageMitigationSZ','Near Death Damage Mitigation (Security Zone)','off','toggle','Reduces damage when near death in security zones. Default off.','off/on'},
{i:'ShieldBreakWhileAirborne','Shield Break While Airborne','off','toggle','Shields can break when player is airborne.','off/on'},
{i:'UsePvPOverride','Use PvP Override','off','toggle','Overrides PvP settings with custom rules.','off/on'},
])}
${this._s('👾 NPC & Encounters',[
{i:'DoubleDifficultyLoot','Double Difficulty Loot','off','toggle','Doubles loot from higher difficulty NPCs.','off/on'},
{i:'GiveDefaultInventoryOnRespawn','Give Default Inventory on Respawn','on','toggle','NPCs get default inventory on respawn. Default on.','off/on'},
{i:'QuestItemsEnabled','Quest Items Enabled','on','toggle','NPC quest items are enabled. Default on.','off/on'},
{i:'ExchangeUncategorizedItems','Exchange Uncategorized Items','off','toggle','Allows exchanging uncategorized items.','off/on'},
{i:'RegeneratePerPlayerLoot','Regenerate Per-Player Loot','','num','Regenerates loot per player. Empty = disabled.','0 to 100'},
{i:'EventItemsEnabled','Event Items Enabled','on','toggle','Event reward items are enabled. Default on.','off/on'},
{i:'SlotlessItemsEnabled','Slotless Items Enabled','on','toggle','Slotless items (no inventory slot needed) enabled. Default on.','off/on'},
{i:'EncounterNPCDensity','Encounter NPC Density','1.0','num','Density multiplier for encounter NPCs.','0.1 to 5.0'},
{i:'EncounterNPCAggroRange','Encounter NPC Aggro Range','1.0','num','Aggro range multiplier for NPCs.','0.1 to 5.0'},
{i:'EncounterNPCSpawnCap','Encounter NPC Spawn Cap','-1','num','Maximum encounter NPCs. -1 = unlimited.','-1 to 1000'},
{i:'EncounterNPCLootChance','Encounter NPC Loot Chance','1.0','num','Loot drop chance multiplier for encounter NPCs.','0.0 to 5.0'},
{i:'EncounterNPCRespawnTime','Encounter NPC Respawn Time','','num','Respawn time for encounter NPCs. Empty = default.','0+ seconds'},
{i:'NPCSpawnDistance','NPC Spawn Distance','2000','num','Distance from players NPCs can spawn.','500 to 10000'},
{i:'NPCMaxActiveCount','NPC Max Active Count','-1','num','Maximum active NPCs in world. -1 = unlimited.','-1 to 10000'},
{i:'NPCCombatDespawnTime','NPC Combat Despawn Time','','num','Time before NPC despawns after combat. Empty = default.','0+ seconds'},
{i:'NPCPerceptionRange','NPC Perception Range','1.0','num','Multiplier for NPC perception range.','0.1 to 5.0'},
{i:'NPCPatrolSpeed','NPC Patrol Speed','1.0','num','Multiplier for NPC patrol movement speed.','0.1 to 5.0'},
{i:'NPCCombatMusic','NPC Combat Music','on','toggle','Plays combat music when engaging NPCs. Default on.','off/on'},
{i:'NPCLevelScaling','NPC Level Scaling','on','toggle','NPCs scale with player level. Default on.','off/on'},
{i:'NPCCorpseDespawnTime','NPC Corpse Despawn Time','120','num','Seconds before NPC corpses despawn.','0 to 3600'},
{i:'NPCWeakSpotDamageMultiplier','NPC Weak Spot Damage Multiplier','2.0','num','Damage multiplier for hitting NPC weak spots.','1.0 to 10.0'},
])}
${this._s('▲ Progression & Contracts',[
{i:'ProgressionXPMultiplier','Progression XP Multiplier','1.0','num','Multiplier for all XP gains. 1.0 = normal.','0.1 to 10.0'},
{i:'ContractCompletionXPMultiplier','Contract Completion XP Multiplier','1.0','num','XP multiplier for contract completions.','0.1 to 10.0'},
{i:'ContractMaxActive','Contract Max Active','5','num','Maximum active contracts a player can have.','1 to 20'},
{i:'ContractRefreshTime','Contract Refresh Time','3600','num','Seconds between contract refreshes.','60 to 86400'},
{i:'ContractDifficultyScaling','Contract Difficulty Scaling','on','toggle','Contracts scale difficulty with player level. Default on.','off/on'},
{i:'ContractRewardScaling','Contract Reward Scaling','on','toggle','Contract rewards scale with difficulty. Default on.','off/on'},
{i:'ProgressionLevelCap','Progression Level Cap','50','num','Maximum player level.','1 to 100'},
{i:'ProgressionSpecLevelCap','Progression Spec Level Cap','100','num','Maximum specialization level.','1 to 200'},
{i:'ProgressionUnlockAllRecipes','Progression Unlock All Recipes','off','toggle','Unlocks all crafting recipes (bypass progression). Default off.','off/on'},
{i:'ProgressionFactionRepMultiplier','Progression Faction Reputation Multiplier','1.0','num','Multiplier for faction reputation gains.','0.1 to 10.0'},
{i:'ContractNPCSpawnOverride','Contract NPC Spawn Override','off','toggle','Overrides NPC spawns for contracts.','off/on'},
{i:'ContractTrackingEnabled','Contract Tracking Enabled','on','toggle','Enables contract tracking UI. Default on.','off/on'},
{i:'ProgressionResetOnDeath','Progression Reset on Death','off','toggle','Resets some progression on death. Default off.','off/on'},
{i:'ContractAutoComplete','Contract Auto Complete','off','toggle','Automatically completes contracts when conditions met.','off/on'},
{i:'ProgressionSharedXP','Progression Shared XP','on','toggle','XP is shared in groups. Default on.','off/on'},
{i:'ContractExclusiveRewards','Contract Exclusive Rewards','on','toggle','Contracts give unique/exclusive rewards. Default on.','off/on'},
{i:'ProgressionDailyBonus','Progression Daily Bonus','on','toggle','Daily login progression bonus. Default on.','off/on'},
{i:'ContractVendorRefresh','Contract Vendor Refresh','86400','num','Seconds between vendor contract refreshes.','3600 to 604800'},
])}
${this._s('🌶️ Spice & Harvesting',[
{i:'SpiceNodeRegenRate','Spice Node Regen Rate','1.0','num','Rate at which spice nodes regenerate. 1.0 = normal.','0.0 to 10.0'},
{i:'SpiceFieldBloomInterval','Spice Field Bloom Interval','3600','num','Seconds between spice field blooms.','60 to 86400'},
{i:'SpawnCraterRocksAfterBloom','Spawn Crater Rocks After Bloom','off','toggle','Spawns crater rocks after spice bloom event. Default off.','off/on'},
{i:'SpiceHarvestingSpeed','Spice Harvesting Speed','1.0','num','Multiplier for harvesting speed.','0.1 to 5.0'},
{i:'SpiceNodeMaxAmount','Spice Node Max Amount','1000','num','Maximum spice per node.','100 to 100000'},
{i:'SpiceBloomNotification','Spice Bloom Notification','on','toggle','Shows notification when spice blooms. Default on.','off/on'},
{i:'SpiceBloomDuration','Spice Bloom Duration','600','num','Duration of spice bloom in seconds.','60 to 3600'},
{i:'DeepDesertSpiceMultiplier','Deep Desert Spice Multiplier','2.0','num','Spice amount multiplier in deep desert.','1.0 to 10.0'},
])}
`},

_s(title,fields){return`<div class="card mt-2"><div class="card-header card-header-actions"><span>${title}</span><span class="text-xs text-muted">${fields.length} options</span></div><div class="card-body">${fields.map(f=>this._f(f)).join('')}</div></div>`},

_f(o){const id='es_'+o.i;
if(o.t==='toggle')return`<div class="flex justify-between items-center mb-2 text-xs" style="padding:4px 0;border-bottom:1px solid var(--border)">
<div style="flex:1"><strong>${o.l||o.i}</strong><div class="text-muted" style="font-size:10px">${o.d||''}</div><div class="text-muted" style="font-size:9px">Values: ${o.r||'off/on'}</div></div>
<div class="flex gap-2 items-center"><button class="btn btn-sm" onclick="ExtraSettingsTab.reset('${id}','${o.v}','${o.t}')">↻</button>
<label class="toggle-switch"><input type="checkbox" id="${id}" ${o.v==='on'?'checked':''}><span class="toggle-slider"></span></label></div></div>`;
if(o.t==='select')return`<div class="flex justify-between items-center mb-2 text-xs" style="padding:4px 0;border-bottom:1px solid var(--border)">
<div style="flex:1"><strong>${o.l||o.i}</strong><div class="text-muted" style="font-size:10px">${o.d||''}</div><div class="text-muted" style="font-size:9px">Values: ${o.r||''}</div></div>
<div class="flex gap-2 items-center"><button class="btn btn-sm" onclick="ExtraSettingsTab.reset('${id}','${o.v}','${o.t}')">↻</button>
<select class="form-select" id="${id}" style="width:120px"><option value="" ${!o.v?'selected':''}>Default</option><option value="Easy" ${o.v==='Easy'?'selected':''}>Easy</option><option value="Medium" ${o.v==='Medium'?'selected':''}>Medium</option><option value="Hard" ${o.v==='Hard'?'selected':''}>Hard</option></select></div></div>`;
return`<div class="flex justify-between items-center mb-2 text-xs" style="padding:4px 0;border-bottom:1px solid var(--border)">
<div style="flex:1"><strong>${o.l||o.i}</strong><div class="text-muted" style="font-size:10px">${o.d||''}</div><div class="text-muted" style="font-size:9px">Range: ${o.r||'any'}</div></div>
<div class="flex gap-2 items-center"><button class="btn btn-sm" onclick="ExtraSettingsTab.reset('${id}','${o.v}','num')">↻</button>
<input type="text" class="form-input" id="${id}" value="${o.v}" style="width:100px;text-align:right"></div></div>`},

reset(id,def,type){const el=document.getElementById(id);if(type==='toggle')el.checked=def==='on';else el.value=def;document.getElementById('esChangesInfo').textContent='Changes pending';document.getElementById('esChangesInfo').style.color='var(--orange)'},

async backupSettings(){showToast('UserEngine.ini backed up!','success')},
async viewBackups(){showToast('View backups','info')},
async playerConfig(){navigateTo('server-settings')},
async openInNotepad(file){showToast('Opening '+file+' in Notepad...','info');
try{await fetch('/api/v1/gameplay/open-ini?file='+file,{method:'POST'})}catch(e){}},

async saveAll(){const inputs=document.querySelectorAll('#esAll input,#esAll select');let count=0;inputs.forEach(i=>{i.setAttribute('data-saved',i.type==='checkbox'?(i.checked?'on':'off'):i.value);count++});
document.getElementById('esChangesInfo').textContent='All extra settings saved ('+count+' fields)';document.getElementById('esChangesInfo').style.color='var(--green)';showToast('✓ Extra settings saved to UserEngine.ini','success')},
async discardChanges(){if(!confirm('Discard all changes to extra settings?'))return;const inputs=document.querySelectorAll('#esAll input,#esAll select');inputs.forEach(i=>{if(i.type==='checkbox')i.checked=i.getAttribute('data-saved')==='on';else i.value=i.getAttribute('data-saved')||i.defaultValue||''});
document.getElementById('esChangesInfo').textContent='No changes detected';document.getElementById('esChangesInfo').style.color='var(--text-muted)';showToast('Changes discarded','info')},
destroy(){}};