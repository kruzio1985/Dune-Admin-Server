# Dune Awakening - Kompletna Dokumentacja Admina

> **Data:** 2026-08-01 | **Serwer:** Self-Hosted (Hyper-V + k3s) | **Gracz:** Kruger (account_id=1)

---

## 🔑 SYSTEM ID GRACZA - NAJWAŻNIEJSZE

Gra używa **TRZECH różnych ID** dla tej samej postaci! Każdy system czyta INNE ID:

| ID | Wartość | Nazwa w DB | Używane przez |
|----|---------|------------|---------------|
| **character_id** | `2` | `player_state.id` | Questy (journey_story_node), postęp fabularny |
| **controller_id** | `4` | `player_state.player_controller_id` | **Landsraad** (wkład własny, house_rewards), **FactionPlayerComponent** |
| **pawn_id** | `6` | `player_state.player_pawn_id` | **Specjalizacje**, Postać w świecie, **Keystones** |

```sql
-- Jak znaleźć wszystkie ID gracza:
SELECT id, player_controller_id, player_pawn_id, account_id, character_name
FROM dune.player_state WHERE account_id = 1;
```

---

## ⚔️ SPECJALIZACJE (Specialization Tracks)

### Gdzie są przechowywane
```sql
-- Tabela: dune.specialization_tracks
-- Kolumny: player_id (pawn_id!), track_type, xp_amount, level
```

### ID: **player_pawn_id = 6**

### Jak odblokować WSZYSTKIE (5 tracków, level 100):
```sql
SET search_path TO dune;
INSERT INTO specialization_tracks (player_id, track_type, xp_amount, level) VALUES
  (6, 'Combat',    44182, 100),
  (6, 'Crafting',  44182, 100),
  (6, 'Exploration', 44182, 100),
  (6, 'Gathering', 44182, 100),
  (6, 'Sabotage',  44182, 100)
ON CONFLICT (player_id, track_type) 
DO UPDATE SET xp_amount = 44182, level = 100;
```

### Maksymalny poziom:
- **XP cap:** 44,182 XP = Level 100
- Każdy track ma osobny pasek XP

### Keystones (umiejętności w drzewku):
```sql
-- Tabela: dune.purchased_specialization_keystones (player_id = pawn_id)
-- Tabela referencyjna: dune.specialization_keystones_map (205 keystones, 41 na track)

-- Daj wszystkie 205 keystones:
SET search_path TO dune;
INSERT INTO purchased_specialization_keystones (player_id, keystone_id)
SELECT 6, id FROM specialization_keystones_map
ON CONFLICT DO NOTHING;
```

---

## 🏛️ LANDSRAAD

### Tabele (wszystkie w schemacie `dune`):

| Tabela | Opis | ID gracza |
|--------|------|-----------|
| `landsraad_tasks` | 25 domów + cele | - |
| `landsraad_task_player_contributions` | **Wkład własny gracza** | **controller_id = 4** |
| `landsraad_task_guild_contributions` | Wkład gildii | guild_id |
| `landsraad_task_faction_contributions` | Wkład frakcji | faction_id |
| `landsraad_task_progress` | Postęp zadań | faction_id |
| `landsraad_task_progress_player` | Który gracz zrobił postęp | **controller_id = 4** |
| `landsraad_house_rewards` | Nagrody (Scrip) do odebrania | **controller_id = 4** |
| `landsraad_decree_term` | Aktywny termin | - |
| `landsraad_decree_rotation` | Dostępne dekrety | - |
| `landsraad_decrees` | Definicje dekretów | - |
| `landsraad_decree_votes` | Głosy na dekrety | - |
| `landsraad_task_reveal_state` | Które zadania są odkryte dla frakcji | faction_id |

### ID: **player_controller_id = 4**

### Jak ustawić wkład własny (25 domów):
```sql
SET search_path TO dune;

-- Dla każdego taska w aktualnym terminie:
INSERT INTO landsraad_task_player_contributions 
  (player_id, faction_id, task_id, amount) 
VALUES (4, 2, <task_id>, <goal_amount>)
ON CONFLICT (player_id, faction_id, task_id) 
DO UPDATE SET amount = <goal_amount>;
```

### Jak ustawić faction contribution (triggeruje completion):
```sql
SET search_path TO dune;
INSERT INTO landsraad_task_faction_contributions 
  (faction_id, task_id, amount) 
VALUES (2, <task_id>, <goal_amount>);
-- TO TRIGGERUJE: check_task_completion → check_term_won → pg_notify
```

### Dekrety - jak działają:
1. Term jest tworzony w `landsraad_decree_term`
2. Dekrety są losowane do `landsraad_decree_rotation`
3. Gracz widzi dekrety w grze i klika aby wybrać
4. **Nie ustawiaj `active_decree_id` automatycznie** - gracz wybiera sam!

### Flow auto-complete:
```
1. RESET tasks (completed=false, winning_faction=NULL)
2. RESET term (winning_faction=NULL, active_decree=NULL)
3. DELETE stare faction_contributions
4. INSERT faction_contributions → TRIGGER: check_task_completion
5. INSERT player_contributions (controller_id=4)
6. INSERT guild_contributions
7. INSERT task_progress + progress_player + progress_guild
8. INSERT house_rewards (Scrip do odebrania)
9. INSERT reveal_state (dla obu frakcji)
10. SET term winner + reigning_faction
11. SELECT pg_notify('landsraad_notify_channel', 'state_changed')
```

---

## 🎖️ FACTION REPUTATION (Ranga frakcji)

### Gdzie jest przechowywana:
1. **Głównie:** `actors.properties → FactionPlayerComponent → m_FactionDataArray[0].ReputationAmount` (actor_id = **controller_id = 4**)
2. **Pomocniczo:** `player_faction_reputation` (actor_id, faction_id, reputation_amount)

### ID: **actor_id = 4** (controller_id) dla komponentu

### Jak ustawić Tier 20 (max):
```sql
-- 1. Komponent FactionPlayerComponent (TO CZYTA GRA!)
SET search_path TO dune;
UPDATE actors SET properties = jsonb_set(
  properties, 
  '{FactionPlayerComponent,m_FactionDataArray,0,ReputationAmount}', 
  '500000'::jsonb
) WHERE id = 4;

-- 2. Tabela reputation (backup)
INSERT INTO player_faction_reputation (actor_id, faction_id, reputation_amount) 
VALUES (4, 2, 500000), (6, 2, 500000), (2, 2, 500000)
ON CONFLICT (actor_id, faction_id) DO UPDATE SET reputation_amount = 500000;

-- 3. Faction membership
INSERT INTO player_faction (actor_id, faction_id, utc_time_faction_change)
VALUES (4, 2, NOW()), (6, 2, NOW())
ON CONFLICT DO NOTHING;
```

### ⚠️ WAŻNE: Restart poda Survival_1!
Gra CACHE'uje `FactionPlayerComponent` w pamięci. Po zmianie w DB musisz:
```
kubectl delete pod -n <ns> <survival-pod>
```
ALBO gracz musi przeteleportować się na Overmap i z powrotem.

### Factions:
| ID | Nazwa |
|----|-------|
| 1 | Atreides |
| 2 | Harkonnen |
| 4 | Smuggler |

---

## 📋 PEŁNA LISTA KOMEND (kubectl exec do DB)

```bash
# Znajdź nazwę poda DB:
POD=$(sudo kubectl get pods -n funcom-seabass-sh-* --no-headers | grep db-dbdepl-sts | awk '{print $1}')

# Wykonaj SQL:
sudo kubectl exec -n <namespace> $POD -- psql -h localhost -p 15432 -U dune -d dune -c "TWÓJ_SQL"
```

---

## 🔄 PEŁEN AUTO-COMPLETE (panel admin)

**Endpoint:** `POST /landsraad/auto-complete?faction_id=2`

Co robi:
1. ✅ Resetuje wszystkie 25 zadań Landsraad
2. ✅ Ustawia wkład własny (controller_id=4) dla każdego domu
3. ✅ Ustawia faction/guild contributions
4. ✅ Triggeruje completion → term wygrany
5. ✅ Daje nagrody (Scrip) do house_rewards
6. ✅ MAX Specializacje (pawn_id=6, level 100)
7. ✅ MAX Faction Reputation (actor_id=4, 500k)
8. ✅ Wszystkie 205 Keystones

---

## 🗂️ BACKUP BAZY DANYCH

```bash
# Przez battlegroup binary na VM:
/home/dune/.dune/bin/battlegroup backup

# Plik backupu:
/funcom/artifacts/database-dumps/<battlegroup>/<bg>-<timestamp>.backup
/funcom/artifacts/database-dumps/<battlegroup>/<bg>-<timestamp>.backup.yaml

# Format: PostgreSQL pg_dump -Fc (PGDMP)
# Zawiera: CAŁĄ bazę - gracze, budynki, progress, ustawienia
```

### Przywracanie na nowym PC:
```bash
echo yes | /home/dune/.dune/bin/battlegroup import /sciezka/do/pliku.backup
```

---

## 🖥️ PANEL ADMINA - KONFIGURACJA

### Lokalnie (ten sam PC):
```yaml
# config.yaml
listen_addr: "127.0.0.1"
ssh:
  host: "192.168.1.100"  # IP VM
  user: "dune"
```

### Zdalnie (panel na PC1, serwer na PC2):
```yaml
listen_addr: "0.0.0.0"  # dostępny z LAN
ssh:
  host: "192.168.1.100"  # IP serwera
```

### Klucz SSH (bezhasłowy):
```
%USERPROFILE%\.ssh\dune_key        # Klucz prywatny (Windows)
~/.ssh/authorized_keys              # Klucz publiczny (VM)
```

---

## 📊 PODSUMOWANIE WSZYSTKICH TABEL

| System | Tabela | Kolumna ID | Wartość |
|--------|--------|-----------|---------|
| Specjalizacje | `specialization_tracks` | `player_id` | **6** (pawn) |
| Keystones | `purchased_specialization_keystones` | `player_id` | **6** (pawn) |
| Faction Component | `actors.properties` | `id` | **4** (controller) |
| Faction Rep | `player_faction_reputation` | `actor_id` | **4,6** |
| Faction Member | `player_faction` | `actor_id` | **4,6** |
| Landsraad Wkład | `landsraad_task_player_contributions` | `player_id` | **4** (controller) |
| Landsraad Progress | `landsraad_task_progress_player` | `player_id` | **4** (controller) |
| Landsraad Rewards | `landsraad_house_rewards` | `player_id` | **4** (controller) |
| Questy | `journey_story_node` | `character_id` | **2** (state.id) |
| Solaris | `player_virtual_currency_balances` | `player_controller_id` | **4** (controller) |
