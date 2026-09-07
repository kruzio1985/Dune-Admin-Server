# DUNE AWAKENING — Pełny raport z analizy kodu gry
> Wygenerowano: 2026-08-05
> Źródła: Item Catalog (1664 itemów), Baza PostgreSQL (dune), Backend API

---

## 📊 STATYSTYKI ITEMÓW

| Tier | Liczba | % |
|------|--------|---|
| T0 | 46 | 2.8% |
| T1 | 73 | 4.4% |
| T2 | 115 | 6.9% |
| T3 | 163 | 9.8% |
| T4 | 214 | 12.9% |
| T5 | 307 | 18.4% |
| T6 | 641 | 38.5% |
| T? | 105 | 6.3% |

---

## 🚁 POJAZDY

### DOSTĘPNE W GRZE:
- **Sandbike** — 12 części (chassis, engine x14, hull, locomotion, PSU, utility x20)

### W KATALOGU, NIEDOSTĘPNE:
- **Buggy** — 16 części (chassis x6, engine x10, hull x6, locomotion x6, PSU x6, rear x12, utility x33)
- **Light Ornithopter** — 12 części (chassis x4, cockpit x4, engine x4, hull x3, locomotion x7, PSU x5, utility x10)
- **Medium Ornithopter** — 8 części (cabin x2, chassis x2, cockpit x2, engine x2, locomotion x4, PSU x3, tail x2, utility x7)
- **Transport Ornithopter** — 3 części (chassis, engine, hull x3, locomotion x2, PSU x2, utility x3)
- **Sandcrawler (Czerwiopędzny!)** — 9 części (cabin, chassis x8, engine x12, locomotion x9, PSU x9, utility x31)

---

## ⚔️ BRONIE

### DOSTĘPNE:
- Battle Rifle, SMG, Shotgun, Heavy Pistol, Pistol, Long Blades, Short Blades

### W KATALOGU, NIEDOSTĘPNE:
- **Lasgun** (4 itemy) — w tym "Black Market K-28 Lasgun" (Smuggler)
- **Flamethrower** (9 itemów)
- **Missile Launcher** (5 itemów)
- **Fireballer** (5 itemów) — w tym "Sardaukar Intimidator"
- **Spitdart** (21 itemów) — dmuchawka
- **Heavy Rifle** (15 itemów)
- **Heavy Shotgun** (15 itemów)

---

## 🦅 FRAKCJE

### FRAKCJE Z ITEMAMI W KATALOGU:

**ATREIDES:**
- WEAPON_ATREIDES_LMG_MK_III_NAME
- Mendek's Boots, Pants, Gauntlets, Helmet, Chestplate (ciężka zbroja)
- Frakcyjny storyline: "FactionStory_Interrogate_TrippYates_Atreides"
- System: AtreidesFactionUnlocked, AtreidesRecruitmentCompleted
- Rangi: Fac_Atre_Rank00_02_FacFunnel

**HARKONNEN:**
- HarkAr3, HarkAr4 (karabiny)
- HarkHeavyPistol2
- Combat_Hark_MedUnique02 (pełen set zbroi średniej)
- Frakcyjny storyline: "FactionStory_Interrogate_TrippYates_Harkonnen"

**CHOAM:**
- ChoamCom2 (Combat Rifle), ChoamSda1, ChoamSda5
- CHOAM Heavy set (Boots, Greaves, Gauntlets, Helmet, Chestplate)
- CHOAM Scout set (T6)
- CHOAM Stillsuit
- Executor's set (Boots, Pants, Gauntlets, Helmet, Chestpiece)
- Miner's Blessing (lekka zbroja)

**SARDAUKAR (Imperialni):**
- Sardaukar Intimidator (fireballer)
- Sardaukar Dagger
- XX_Sardaukar Blade
- Emperor's Wings Mk1-Mk6 (suspensory)

**FREMEN (przez itemy, nie jako grywalna frakcja):**
- Crysknife, Unfixed Crysknife, Sleepers Crysknife, Zantara's Crysknife
- The Baron's Bloodbag, Improvised Blood Extractor
- Static Compactor
- Softstep Boots, Ta'lab Softstep Boots, Tabr Softstep Boots
- Decaliterjon, Dew Reaper Mk2/Mk4/Mk6, Dew Scythe Mk4/Mk6
- EMF Generator, Micro-sandwich Fabric

**SMUGGLER (Przemytnicy):**
- Black Market K-28 Lasgun
- Syndicate set (Boots, Pants, Gauntlets, Helmet, Chestplate) — T6 zbroja!

**GREAT HOUSE (ogólne):**
- Standard/Artisan/House/Adept/Regis — Sword, Dirk, Disruptor M11
- Duneman Heavy set, Kirab Heavy set, Slaver Heavy set, Mercenary Heavy set

---

## 👤 POSTACIE Z KSIĄŻEK (unikalne itemy)

| Postać | Item |
|--------|------|
| **Duncan Idaho** | Idaho's Charge (zbroja), Idaho Softstep Boots |
| **Leto Atreides** | Combat Exoskeleton Chestpiece |
| **Feyd-Rautha** | Feyd's Spare Blades |
| **Dr. Wellington Yueh** | Yueh's Reaper Gloves |
| **Thufir Hawat** | Buoyant Reaper Mk2-Mk6 (Mentat!) |
| **Baron Vladimir Harkonnen** | The Baron's Bloodbag, Elohim-Class Suspensor Belt |
| **Imperator** | The Emperor's Wings Mk1-Mk5 |
| **Mendek** (Atreides) | Pełen set ciężkiej zbroi |
| **Karak** (Mission NPC) | Pełen set ciężkiej zbroi |
| **Mendia** (Story NPC) | Pełen set lekkiej zbroi (Boots, Pants, Gauntlets, Wrap, Jacket) |
| **Scipio** | Scipio's Bloodbag |
| **Zantara** | Zantara's Crysknife |

---

## 🗺️ MAPY / STREFY (z bazy danych `dune.map_names`)

| ID | Nazwa | Status |
|----|-------|--------|
| 1 | **Hephaestus** | ✅ Startowa |
| 5 | Lost Harvest_Ecolab A | ✅ Quest |
| 6 | Lost Harvest_Ecolab B | ✅ Quest |
| 7 | **Deep Desert** (Głęboka Pustynia) | ✅ PvP / Endgame |
| 8 | Editor_Default | 🔧 Deweloperska |
| 9 | **Harko Village** (Osada Harkonnenów) | ✅ |
| 10 | Lost Harvest_Forgotten Lab | ✅ Dungeon |
| 11 | **Hagga Basin** (Basen Hagga) | ✅ Strefa otwarta |
| 12 | **Art Of Kanly** (Sztuka Kanly) | ✅ PvP / Arena |
| 13 | Erythrite Cave Island | ✅ Wyspa |
| 14 | Ground Vehicle Time Trial Island | ✅ Wyścigi |
| 15 | **Radioactive Shipwreck** (Radioaktywny Wrak) | ✅ |
| 16 | Sandflies Fortress | ✅ Forteca |
| 17 | ⚡ Electricity Dungeon | ✅ Dungeon |
| 18 | 🔥 Fire Dungeon | ✅ Dungeon |
| 19 | 🏛️ Old Carthag Dungeon (Stara Kartagina) | ✅ Dungeon |
| 20 | ☠️ Poison Dungeon | ✅ Dungeon |

---

## 🥶 STREFA POLARNA / ZIMNO (w katalogu, niedostępne)

**49 "cold" itemów, 11 "polar", 10 "cryo":**

**Cold Survival Exploration Suit (Unique T6):**
- Boots, Gloves, Mask, Top

**Cold Survival Heavy Combat Set (Unique T6):**
- Shoes, Bottom, Gloves, Helmet, Top

**Cold Survival Light Combat Set (Unique T6):**
- Shoes, Bottom, Gloves, Helmet, Top

**Cryo Defense Armor Heavy (Unique T6):**
- Boots, Bottom, Gloves, Helmet, Top

**Cryo Defense Armor Light (Unique T6):**
- Boots, Bottom, Gloves, Helmet, Top

**PH_Stillsuit_Unique_ThermalSuit_06:**
- Boots, Gloves, Mask, Top

**Radiation Suity:**
- MK4, MK5, MK6

---

## 📜 QUESTY / FABUŁA (z bazy `dune.player_tags`)

### SYSTEM KONTRAKTÓW:
Gra używa systemu tagów `Contract.Target.*` i `Contract.Tracking.*` do śledzenia postępów.

### ROZDZIAŁ 1:
```
Contract.Target.Interaction.MTX.Ch1.Journey 4.Elara Called
```
→ **Elara** dzwoni do gracza — początek fabuły

### QUESTY PLANETOLOGA:
```
Contract.Target.Dialogue.Planetologist 1.Contract 1.Delivery
```
→ Planetolog (Dr. Kynes / Liet-Kynes?) — zadanie dostawy

### QUESTY EKOLABU:
```
Ecolab002_Delivery_Vials      — Dostarcz fiolki
Ecolab076_PlantBook            — Książka o roślinach
Ecolab_010_kill_boss           — Zabij bossa
Eco Lab Tutorial               — Samouczek
```

### QUESTY SLAVERS (Handlarze niewolników):
```
Contract.Target.Item.Slavers 1.Picked Up Contract 2
Contract.Target.Lore.Slavers 1.Contract 4.Note Found
Contract.Target.Lore.Slavers 1.Contract 5.Sehm Resolution
Contract.Target.Lore.Slavers 1.Contract 5.Slaver Records
```
→ Linia fabularna z postacią **Sehm** i handlarzami niewolników!

### FRAKCYJNE STORY QUESTY:
```
Contract.Tracking.Active.FactionStory_Interrogate_TrippYates_Atreides.Interrogated NPC
Contract.Tracking.Active.FactionStory_Interrogate_TrippYates_Harkonnen.Interrogated NPC
Contract.Tracking.AtreidesFactionUnlocked
Contract.Tracking.AtreidesRecruitmentCompleted
Contract.Tracking.Completed.Fac_Atre_Rank00_02_FacFunnel
```
→ Przesłuchanie **Tripp Yates** dla obu frakcji!

### QUESTY LORE (KIRAB):
```
Contract.Target.Lore.Kirab 1.Contract 3.Lore 1
Contract.Target.Lore.Kirab 1.Contract 3.Lore 2
```
→ **Kirab** — frakcja/postacie z własną linią fabularną

### QUESTY RANK:
```
Contract.Target.Lore.Rank 4.Contract 3
Contract.Target.Lore.Rank 4.Contract 4
```
→ Questy odblokowywane przez rangę

### TRENERZY:
```
Contract.Tracking.Active.TrainerMentat 1_Delivered Items
```
→ **Mentat** jako trainer — dostarczasz mu itemy!

---

## 🎓 TUTORIALE (z bazy `dune.tutorials`)

| # | Nazwa |
|---|-------|
| 1 | Crafting |
| 2 | Radial Wheel |
| 3 | Vehicle Inventory Tutorial |
| 4 | Mining Analysis Simple |
| 5 | **Sandworm Threat** (Zagrożenie Czerwiem) |
| 6 | **NPE Fremkit Pickup Reminder** (Przypomnienie o Fremkicie!) |
| 7 | **Prescient** (Presciencja — mechanika!) |
| 8 | Event Log Tutorial |
| 9 | Radial Wheel_KBM |
| 10 | **Deep Desert Entering PvP** |
| 11 | Mining Analysis Door |
| 12 | Tech Tree |
| 13 | Mining Analysis |
| 14 | Exchange Nearby Tutorial |
| 15 | Survey Probe Tutorial |
| 16 | Eco Lab Tutorial |
| 17 | Unclaimed Landsraad Contracts Reward Tutorial |
| 18 | **Coriolis Death Tutorial** (Śmierć przez Burzę Coriolisa!) |
| 19 | Construction Menu Tutorial |
| 20 | Looting |
| 21 | Status UI Tutorial |
| 22 | NPE Pentashield |
| 23 | Moisture Sealed Cave Tutorial |
| 24 | Heat Pack Consumable Tutorial |
| 25 | Catchpockets Tutorial |
| 26 | NPE Healkit Tutorial |
| 27 | NPE Holster Unholster |
| 28 | Fade Inactive HUD Tutorial |
| 29 | Sand Hazard Tutorial |
| 30+ | Stamina (i więcej...) |

---

## 🔮 PODSUMOWANIE — CO JEST NIEDOSTĘPNE

### Pojazdy:
- ❌ Buggy
- ❌ Light/Medium/Transport Ornithopter (3 typy!)
- ❌ Sandcrawler

### Bronie:
- ❌ Lasgun
- ❌ Flamethrower
- ❌ Missile Launcher
- ❌ Fireballer (Sardaukar)
- ❌ Spitdart (dmuchawka)

### Strefy/Biomy:
- ❌ Strefa Polarna (Cold/Cryo armor)
- ❌ Radioaktywny Wrak (Radiation suits)
- ❌ Stare Carthag Dungeon?

### Frakcje (niegrywalne jako pełna frakcja):
- ❌ Sardaukar (tylko itemy)
- ❌ Fremen (tylko itemy + lore)
- ❌ Smuggler (tylko itemy)
- ❌ Bene Gesserit (brak)
- ❌ Spacing Guild (tylko 5 wzmianek "navigator/spacing/heighliner")

### Mechaniki:
- ❌ Presciencja (jest tutorial "Prescient"!)
- ❌ Burze Coriolisa (jest tutorial "Coriolis Death")
- ❌ Jazda na Czerwiu? (20 itemów "sandworm")
- ❌ Ghola/klony (3 itemy)

### Systemy:
- ✅ Frakcyjny system rang (Atreides już działa)
- ✅ Mentat jako trainer
- ✅ Kontrakty/questy (system tagów)
- ✅ Landsraad (dekree, głosowania)
- ✅ Ekolaby
- ✅ Shifting Sands (tabela `shifting_sands_data` w bazie)

---

## 🗄️ PEŁNA LISTA TABEL W BAZIE `dune`

```
accounts, actor_faction_deterministic, actor_types, active_events,
ban_list, battlepass, base_parts, bases, battlegroup_access, bg_matchmaking,
blueprints, buildable_health, buildables, character_creation_data,
claim_data, client_installed_mods, codex, codex_unlocks,
command_log, connections, cooldowns, currencies,
daily_login_rewards, echo_locations, ecolabs, event_log,
exchange_listings, faction_deterministic_seeds, faction_events,
game_sessions, guild_applications, guild_members, guilds,
hagal_loot_tables, image_storage, instances, inventory_stacks,
items, item_affixes, item_instances, item_skins,
journey_data, keystones, landsraad_decrees, landsraad_votes,
login_history, lore_pickups_temporary, map_areas, map_names,
markers, mnemonic_recall, overmap_players, parties,
party_invites, party_members, permission_actor, permission_actor_rank,
placeables, platform_parties_mapping, player_access_codes,
player_faction, player_faction_reputation, player_markers,
player_respawn_locations, player_state, player_tags,
player_travel_state, player_virtual_currency_balances,
purchased_specialization_keystones, recovered_vehicles,
removed_items, removed_recipes, resourcefield_state,
shifting_sands_data, sinkcharts, specialization_keystones_map,
specialization_refund_id, specialization_tracks,
spicefield_server_availability, spicefield_types,
tax_invoice, temp_contract_tags_backup, totems,
travel_actor_parent, travel_return_info,
tutorial_per_player, tutorials,
vehicle_module_inventories, vehicle_modules, vehicles,
vendor_stock_cycle, vendor_stock_state,
world_farm_reset_seed, world_map_reset_seed, world_partition, world_partition_reset_seed
```

---

*Koniec raportu — dane wyciągnięte z item-catalog.json (1664 itemy), bazy PostgreSQL dune (70+ tabel), oraz backend API Dune Admin Manager v0.1.0*
