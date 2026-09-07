"""
Gameplay API — Intel, Teleport, Skills, Landsraad, Whisper, Market Bot.
Ported from DST-DuneServerTool logic.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.db_service import get_db
from backend.services.rmq_service import RMQService
from backend.services.ssh_service import get_ssh
import subprocess, json, logging, os, time

router = APIRouter(tags=["Gameplay"])
logger = logging.getLogger("dune-admin.gameplay")
_rmq = RMQService()

# ═══════════════════════════════════════════════════════════════════
# Item Catalog (loaded once at startup)
# ═══════════════════════════════════════════════════════════════════
_CATALOG: dict = {}
_CATALOG_NAMES: dict = {}

def _load_catalog():
    global _CATALOG, _CATALOG_NAMES
    if _CATALOG:
        return
    cat_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'catalogs', 'item-data.json')
    if not os.path.exists(cat_path):
        logger.warning(f"Catalog not found: {cat_path}")
        return
    try:
        with open(cat_path, 'r', encoding='utf-8') as f:
            raw = json.load(f)
        _CATALOG = raw.get('items', {})
        _CATALOG_NAMES = raw.get('names', {})
        logger.info(f"Loaded {len(_CATALOG)} items from catalog")
    except Exception as e:
        logger.warning(f"Failed to load catalog: {e}")

_load_catalog()

def _cat_lookup(template_id: str):
    """Look up catalog info for a template_id. Returns dict or None."""
    item = _CATALOG.get(template_id)
    if item:
        return item
    # Fallback: try names map for display name
    name = _CATALOG_NAMES.get(template_id)
    if name:
        return {"name": name, "category": "", "tier": 0, "rarity": "common", "vendor_price": 0}
    return None

def _cat_name(template_id: str) -> str:
    """Get display name, fallback to template_id."""
    item = _CATALOG.get(template_id)
    if item and item.get('name'):
        return item['name']
    name = _CATALOG_NAMES.get(template_id)
    return name if name else template_id

def _cat_category(template_id: str) -> str:
    item = _CATALOG.get(template_id)
    return item.get('category', '') if item else ''

def _cat_tier(template_id: str) -> int:
    item = _CATALOG.get(template_id)
    return item.get('tier', 0) if item else 0

def _cat_rarity(template_id: str) -> str:
    item = _CATALOG.get(template_id)
    return item.get('rarity', 'common') if item else 'common'

def _cat_leaf(cat_path: str) -> str:
    """Extract leaf from category path: 'items/weapons/heavyrifle' -> 'Heavyrifle'"""
    if not cat_path:
        return ''
    parts = cat_path.strip('/').split('/')
    if len(parts) <= 1:
        return cat_path
    # Return the last meaningful segment, title-cased
    last = parts[-1]
    return last.replace('_', ' ').title() if last else parts[-2].title() if len(parts) > 1 else ''

def _cat_group(cat_path: str) -> str:
    """Get group from path: 'items/weapons/heavyrifle' -> 'items'"""
    if not cat_path:
        return ''
    return cat_path.strip('/').split('/')[0]

# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def _ssh_sql(sql: str, set_path: bool = False):
    """Run SQL via SSH kubectl exec. Set set_path=True for INSERT/UPDATE/DELETE to avoid trigger search_path issues."""
    try:
        ssh = get_ssh()
        key = ssh._find_key()
        ns_cmd = "sudo kubectl get pods -A 2>/dev/null | grep 'db-dbdepl-sts' | awk '{print $1,$2}' | head -1"
        c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
             '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
        if key: c += ['-i', key]
        c += [f'dune@{ssh.host}', ns_cmd]
        r = subprocess.run(c, capture_output=True, text=True, timeout=15)
        if r.returncode != 0: return None
        parts = r.stdout.strip().split()
        ns, pod = parts[0], parts[1]
        
        if set_path:
            sql = f"SET search_path TO dune; {sql}"
        safe = sql.replace('\\', '\\\\').replace('"', '\\"')
        cmd = f'sudo kubectl exec -n {ns} {pod} -- psql -h localhost -p 15432 -U dune -d dune -t -A -F "|" -c "{safe}" 2>&1'
        c2 = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
              '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
        if key: c2 += ['-i', key]
        c2 += [f'dune@{ssh.host}', cmd]
        r2 = subprocess.run(c2, capture_output=True, text=True, timeout=30)
        if r2.returncode != 0:
            logger.warning(f"SQL failed (rc={r2.returncode}): {sql[:80]}... stdout: {r2.stdout[:200]} stderr: {r2.stderr[:200]}")
            return None
        return r2.stdout.strip()
    except Exception as e:
        logger.warning(f"SSH SQL error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════
# DST RMQ Helper (stdin-pipe method)
# ═══════════════════════════════════════════════════════════════════

def _send_rmq(fields: dict) -> dict:
    """Send server command via RMQ using DST's stdin-pipe method."""
    import base64, time, subprocess
    from backend.services.ssh_service import get_ssh
    
    ssh = get_ssh()
    key_path = ssh._find_key()
    
    ns_cmd = "sudo kubectl get pods -A --no-headers 2>/dev/null | grep 'mq-game-sts-0.*Running' | awk '{print $1,$2}' | head -1"
    c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
         '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
    if key_path: c += ['-i', key_path]
    c += [f'dune@{ssh.host}', ns_cmd]
    r = subprocess.run(c, capture_output=True, text=True, timeout=15)
    if r.returncode != 0 or not r.stdout.strip():
        return {"ok": False, "message": "MQ pod not found"}
    parts = r.stdout.strip().split()
    ns, pod = parts[0], parts[1]
    
    inner = json.dumps(fields)
    outer = json.dumps({"Version": 2, "AuthToken": "Nu6VmPWUMvdPMeB7qErr", "MessageContent": inner})
    outer_b64 = base64.b64encode(outer.encode()).decode()
    msg_id = f"dune-admin-{int(time.time()*1000)}"
    
    erl = (f'Outer = base64:decode(<<"{outer_b64}">>),'
           f'XName = rabbit_misc:r(<<"/">>, exchange, <<"heartbeats">>),'
           f'X = rabbit_exchange:lookup_or_die(XName),MsgId = <<"{msg_id}">>,'
           f'P = {{list_to_atom("P_basic"), <<"Content">>, undefined, [], undefined,'
           f' undefined, undefined, undefined, undefined, MsgId, undefined,'
           f' undefined, <<"fls">>, <<"fls_backend">>, undefined}},'
           f'Content = rabbit_basic:build_content(P, Outer),'
           f'{{ok, Msg}} = rabbit_basic:message(XName, <<"notifications">>, Content),'
           f'rabbit_queue_type:publish_at_most_once(X, Msg).')
    
    erl_b64 = base64.b64encode(erl.encode()).decode()
    remote = 'set -eu; export PATH=/opt/rabbitmq/sbin:/opt/erlang/lib/erlang/bin:/opt/erlang/lib/erlang/erts-14.2.5.12/bin:/bin:/usr/bin:/usr/local/bin:$PATH; expr=$(cat); /opt/rabbitmq/sbin/rabbitmqctl eval "$expr"'
    remote_b64 = base64.b64encode(remote.encode()).decode()
    
    ssh_cmd = f"echo {erl_b64} | base64 -d | sudo kubectl exec -i -n {ns} {pod} -- sh -lc \"$(echo {remote_b64} | base64 -d)\" 2>&1"
    c2 = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
    if key_path: c2 += ['-i', key_path]
    c2 += [f'dune@{ssh.host}', ssh_cmd]
    r2 = subprocess.run(c2, capture_output=True, text=True, timeout=30)
    
    ok = '{ok,' in r2.stdout or 'ok' in r2.stdout.lower()
    return {"ok": ok, "raw": r2.stdout[:100]}


# ═══════════════════════════════════════════════════════════════════
# 1. INTEL / TECH KNOWLEDGE
# ═══════════════════════════════════════════════════════════════════

class IntelRequest(BaseModel):
    account_id: int
    amount: int = 1000

@router.post("/intel/award")
async def award_intel(body: IntelRequest):
    """Award Intel/Tech Knowledge points via SQL."""
    db = get_db()
    # Get pawn_id for the player
    player = db.query_one(
        "SELECT player_pawn_id FROM dune.player_state WHERE account_id=%s",
        (body.account_id,))
    if not player:
        raise HTTPException(404, "Player not found")
    pawn_id = int(player.get('player_pawn_id', 0)) if player.get('player_pawn_id') else 0
    if not pawn_id:
        raise HTTPException(404, "Pawn ID not found")
    
    # Update TechKnowledgePlayerComponent on the pawn's FLevelComponent
    sql = f"""
SET search_path TO dune;
UPDATE actor_fgl_entities
SET components = jsonb_set(
    components,
    '{{FLevelComponent,1,ModuleData}}',
    (COALESCE(components->'FLevelComponent'->1->'ModuleData', '{{}}'::jsonb) || 
     jsonb_build_object('m_TechKnowledgePoints', {body.amount}::text))
)
WHERE actor_id = {pawn_id}::bigint
  AND components ? 'FLevelComponent';
"""
    result = _ssh_sql(sql)
    return {"ok": True, "message": f"Awarded {body.amount} Intel points", "pawn_id": pawn_id}


# ═══════════════════════════════════════════════════════════════════
# 2. TELEPORT
# ═══════════════════════════════════════════════════════════════════

class TeleportRequest(BaseModel):
    fls_id: str
    x: float = 0
    y: float = 0
    z: float = 0

@router.post("/teleport/to-location")
async def teleport_to_location(body: TeleportRequest):
    """Teleport player to coordinates."""
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "TeleportTo",
        "PlayerId": body.fls_id,
        "X": body.x, "Y": body.y, "Z": body.z
    })
    return {"ok": ok, "message": f"Teleport sent for {body.fls_id}"}

class TeleportPlayerRequest(BaseModel):
    source_fls_id: str
    target_fls_id: str

@router.post("/teleport/to-player")
async def teleport_to_player(body: TeleportPlayerRequest):
    """Teleport source player to target player."""
    # Get target player location from DB
    db = get_db()
    target = db.query_one("""
        SELECT a.properties->'TransformComponent'->'m_Transform'->>'m_Translation' as loc
        FROM dune.actors a
        JOIN dune.accounts acc ON acc.id = a.owner_account_id
        WHERE acc.user = %s AND a.class LIKE '%PlayerState%' LIMIT 1
    """, (body.target_fls_id,))
    
    x, y, z = 0.0, 0.0, 500.0
    if target and target.get('loc'):
        try:
            import re
            nums = re.findall(r'[-]?\d+\.?\d*', str(target['loc']))
            if len(nums) >= 3:
                x, y, z = float(nums[0]), float(nums[1]), float(nums[2])
        except: pass
    
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "TeleportToExact",
        "PlayerId": body.source_fls_id,
        "X": x, "Y": y, "Z": z
    })
    return {"ok": ok, "message": f"Teleport {body.source_fls_id} -> {body.target_fls_id} @ ({x:.0f},{y:.0f},{z:.0f})"}


# ═══════════════════════════════════════════════════════════════════
# 3. SKILL MODULE LEVEL + SKILL POINTS
# ═══════════════════════════════════════════════════════════════════

class SkillModuleRequest(BaseModel):
    fls_id: str
    module: str
    level: int = 1

@router.post("/skills/set-module")
async def set_skill_module(body: SkillModuleRequest):
    """Set skill module level via RMQ."""
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "SkillsSetModuleLevel",
        "PlayerId": body.fls_id,
        "Module": body.module,
        "Level": body.level
    })
    return {"ok": ok, "message": f"Set {body.module} to level {body.level}"}

class SkillPointsRequest(BaseModel):
    fls_id: str
    points: int

@router.post("/skills/set-points")
async def set_skill_points(body: SkillPointsRequest):
    """Set unspent skill points via RMQ."""
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "SkillsSetUnspentSkillPoints",
        "PlayerId": body.fls_id,
        "SkillPoints": body.points
    })
    return {"ok": ok, "message": f"Set {body.points} unspent skill points"}


# ═══════════════════════════════════════════════════════════════════
# 4. LANDSRAAD
# ═══════════════════════════════════════════════════════════════════

@router.get("/landsraad/overview")
async def landsraad_overview():
    """Full Landsraad overview: control panel + decrees + houses."""
    # Current term
    term_raw = _ssh_sql("SELECT term_id, start_time, end_time, reigning_faction_id, active_decree_id, winning_faction_id FROM dune.landsraad_decree_term ORDER BY term_id DESC LIMIT 1")
    term = {"term_id": 0, "reigning_faction_id": 0, "active_decree_id": "", "winning_faction_id": "", "start_time": "", "end_time": ""}
    if term_raw:
        for line in term_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 6 and p[0].strip().isdigit():
                term = {"term_id": int(p[0]), "start_time": p[1].strip(), "end_time": p[2].strip(),
                        "reigning_faction_id": int(p[3]) if p[3].strip().isdigit() else 0,
                        "active_decree_id": p[4].strip(), "winning_faction_id": p[5].strip()}
                break
    
    # All decrees with descriptions
    dec_raw = _ssh_sql("SELECT id, decree_name, weight, disabled FROM dune.landsraad_decrees ORDER BY id")
    decrees = []
    desc_map = {
        "ExperienceRateIncrease": "Increases XP gain rate for all players",
        "RangedDamageIncreased": "Ranged weapon damage increased",
        "MeleeDamageIncreased": "Melee weapon damage increased", 
        "CraftingCostReduced": "Reduces crafting material costs",
        "DropInventoryOnDefeatActive": "Players drop inventory on death",
        "RepairAndRefiningTimes": "Faster repair and refining speeds",
        "SpecialVendorActive": "Special vendor active (disabled)",
        "SpecialVendorActive_Vehicles": "Special vehicle vendor active",
        "SpecialVendorActive_Weapons": "Special weapons vendor active",
        "SpecialVendorActive_Armor": "Special armor vendor active",
        "SpecialVendorActive_Utilities": "Special utilities vendor active",
    }
    if dec_raw and '0 rows' not in dec_raw:
        for line in dec_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 4 and p[0].strip().isdigit():
                name = p[1].strip()
                decrees.append({"id": int(p[0]), "name": name, "weight": float(p[2]) if p[2].strip() else 1.0,
                               "disabled": p[3].strip().lower() == 't',
                               "description": desc_map.get(name, "No description available")})
    
    # Rotation
    rot_raw = _ssh_sql("SELECT dr.decree_id, d.decree_name FROM dune.landsraad_decree_rotation dr JOIN dune.landsraad_decrees d ON d.id=dr.decree_id ORDER BY dr.decree_id")
    rotation = []
    if rot_raw and '0 rows' not in rot_raw:
        for line in rot_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip().isdigit():
                rotation.append({"id": int(p[0]), "name": p[1].strip()})
    
    # Houses with tasks
    houses_sql = """
SELECT lt.house_name, lt.goal_amount, lt.completed, lt.board_index,
       COALESCE(SUM(ltfc.amount), 0) as current_amount
FROM dune.landsraad_tasks lt
LEFT JOIN dune.landsraad_task_faction_contributions ltfc ON ltfc.task_id = lt.id
GROUP BY lt.id, lt.house_name, lt.goal_amount, lt.completed, lt.board_index
ORDER BY lt.board_index LIMIT 25
"""
    houses_raw = _ssh_sql(houses_sql)
    houses = []
    if houses_raw and '0 rows' not in houses_raw:
        for line in houses_raw.strip().split('\n'):
            parts = line.split('|')
            if len(parts) >= 5 and parts[0].strip() and parts[0].strip() not in ('house_name','(25 rows)'):
                try:
                    houses.append({"house_name": parts[0], "goal_amount": int(parts[1]) if parts[1].strip().lstrip('-').isdigit() else 0,
                                  "completed": parts[2].strip().lower() in ('t', 'true', '1'),
                                  "board_index": int(parts[3]) if parts[3].strip().lstrip('-').isdigit() else 0,
                                  "current_amount": int(parts[4]) if parts[4].strip().lstrip('-').isdigit() else 0})
                except: pass
    
    faction_names = {1: "Atreides", 2: "Harkonnen", 3: "None", 4: "Smuggler"}
    reigning = faction_names.get(term["reigning_faction_id"], "None")
    winning = faction_names.get(int(term["winning_faction_id"]) if term["winning_faction_id"] and term["winning_faction_id"].isdigit() else 0, "None")
    
    return {"term": term, "reigning_faction": reigning, "winning_faction": winning,
            "decrees": decrees, "rotation": rotation, "houses": houses, "count": len(houses)}


@router.post("/landsraad/set-active-decree")
async def set_active_decree(decree_id: int):
    """Set which decree is active for voting. Player then votes in-game."""
    raw = _ssh_sql("SELECT term_id FROM dune.landsraad_decree_term ORDER BY term_id DESC LIMIT 1")
    term_id = 2
    if raw:
        for line in raw.strip().split('\n'):
            line = line.strip()
            if line.isdigit():
                term_id = int(line)
                break
    _ssh_sql(f"UPDATE dune.landsraad_decree_term SET active_decree_id = {decree_id}, elected_decree_id = NULL WHERE term_id = {term_id}", set_path=True)
    _ssh_sql("SELECT pg_notify('landsraad_notify_channel', 'state_changed')", set_path=True)
    return {"ok": True, "message": f"Decree {decree_id} set as active. Vote in game now!"}

@router.get("/landsraad/player/{account_id}")
async def landsraad_player(account_id: int):
    """Player's Landsraad contributions."""
    sql = f"""
SELECT lpc.house_name, lpc.contribution_amount
FROM dune.landsraad_task_player_contributions lpc
WHERE lpc.player_id IN (
    SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id}
) ORDER BY lpc.contribution_amount DESC;
"""
    result = _ssh_sql(sql)
    contributions = []
    if result:
        for line in result.split('\n')[1:]:
            parts = line.split('|')
            if len(parts) >= 2:
                contributions.append({
                    "house_name": parts[0],
                    "amount": int(parts[1]) if parts[1].isdigit() else 0
                })
    return {"account_id": account_id, "contributions": contributions}


# ═══════════════════════════════════════════════════════════════════
# 5. WHISPER / CHAT
# ═══════════════════════════════════════════════════════════════════

class WhisperRequest(BaseModel):
    target_fls_id: str
    message: str
    sender_name: str = "Admin"

@router.post("/chat/whisper")
async def send_whisper(body: WhisperRequest):
    """Send GM whisper to player via RMQ courier."""
    # Build whisper envelope similar to DST
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "SendWhisper",
        "PlayerId": body.target_fls_id,
        "SenderName": body.sender_name,
        "Message": body.message
    })
    return {"ok": ok, "message": f"Whisper sent to {body.target_fls_id}"}

class BroadcastRequest(BaseModel):
    title: str = "Server Message"
    body: str = ""
    duration_sec: int = 30

@router.post("/chat/broadcast")
async def send_broadcast(body: BroadcastRequest):
    """Send server-wide broadcast."""
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "ServiceBroadcast",
        "BroadcastType": "Generic",
        "BroadcastPayload": {
            "BroadcastDuration": body.duration_sec,
            "LocalizedText": [
                {"Key": "en", "Title": body.title, "Body": body.body}
            ]
        }
    })
    return {"ok": ok, "message": "Broadcast sent"}


# ═══════════════════════════════════════════════════════════════════
# 6. GIVE ITEM (RMQ + SQL)
# ═══════════════════════════════════════════════════════════════════

class GiveItemRequest(BaseModel):
    fls_id: str
    template: str
    qty: int = 1
    durability: float = 1.0
    quality: int = 0  # 0=default, 1-6 for specific grade

@router.post("/give-item-live")
async def give_item_live(body: GiveItemRequest):
    """Give item via RMQ — stdin pipe method (mirrors DST)."""
    import base64, time, subprocess, json as j
    from backend.services.ssh_service import get_ssh
    
    ssh = get_ssh()
    key_path = ssh._find_key()
    
    # Find MQ pod
    ns_cmd = "sudo kubectl get pods -A --no-headers 2>/dev/null | grep 'mq-game-sts-0.*Running' | awk '{print $1,$2}' | head -1"
    c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
         '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
    if key_path: c += ['-i', key_path]
    c += [f'dune@{ssh.host}', ns_cmd]
    r = subprocess.run(c, capture_output=True, text=True, timeout=15)
    if r.returncode != 0 or not r.stdout.strip(): return {"ok": False, "message": "MQ pod not found"}
    parts = r.stdout.strip().split(); ns, pod = parts[0], parts[1]
    
    # Build inner JSON with quality
    inner = j.dumps({"ServerCommand": "AddItemToInventory", "PlayerId": body.fls_id,
                      "ItemName": body.template, "Quantity": body.qty, 
                      "Durability": body.durability, "Quality": body.quality})
    outer = j.dumps({"Version": 2, "AuthToken": "Nu6VmPWUMvdPMeB7qErr", "MessageContent": inner})
    outer_b64 = base64.b64encode(outer.encode()).decode()
    msg_id = f"dune-admin-{int(time.time()*1000)}"
    
    # Erlang (same as DST)
    erl = (f'Outer = base64:decode(<<"{outer_b64}">>),'
           f'XName = rabbit_misc:r(<<"/">>, exchange, <<"heartbeats">>),'
           f'X = rabbit_exchange:lookup_or_die(XName),MsgId = <<"{msg_id}">>,'
           f'P = {{list_to_atom("P_basic"), <<"Content">>, undefined, [], undefined,'
           f' undefined, undefined, undefined, undefined, MsgId, undefined,'
           f' undefined, <<"fls">>, <<"fls_backend">>, undefined}},'
           f'Content = rabbit_basic:build_content(P, Outer),'
           f'{{ok, Msg}} = rabbit_basic:message(XName, <<"notifications">>, Content),'
           f'rabbit_queue_type:publish_at_most_once(X, Msg).')
    
    # DST-style: base64 encode erl, pipe via stdin to kubectl exec
    erl_b64 = base64.b64encode(erl.encode()).decode()
    remote_script = 'set -eu; export PATH=/opt/rabbitmq/sbin:/opt/erlang/lib/erlang/bin:/opt/erlang/lib/erlang/erts-14.2.5.12/bin:/bin:/usr/bin:/usr/local/bin:$PATH; expr=$(cat); /opt/rabbitmq/sbin/rabbitmqctl eval "$expr"'
    remote_b64 = base64.b64encode(remote_script.encode()).decode()
    
    ssh_cmd = f"echo {erl_b64} | base64 -d | sudo kubectl exec -i -n {ns} {pod} -- sh -lc \"$(echo {remote_b64} | base64 -d)\" 2>&1"
    c2 = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
    if key_path: c2 += ['-i', key_path]
    c2 += [f'dune@{ssh.host}', ssh_cmd]
    r2 = subprocess.run(c2, capture_output=True, text=True, timeout=30)
    
    ok = '{ok,' in r2.stdout or 'ok' in r2.stdout.lower()
    return {"ok": ok, "message": f"Sent {body.template} x{body.qty}", "raw": r2.stdout[:100]}


# ═══════════════════════════════════════════════════════════════════
# 7. Solaris / Scrip (SQL + RMQ)
# ═══════════════════════════════════════════════════════════════════

class GiveCurrencyRequest(BaseModel):
    fls_id: str
    amount: int
    currency_type: int = 0  # 0=Monety Solaris, 1=Kredyty Solaris

@router.post("/give-solari")
async def give_solari(body: GiveCurrencyRequest):
    """Give Solaris. currency_type: 0=Monety (fizyczne coiny do inventory), 1=Kredyty (bezposrednio na konto)."""
    
    if body.currency_type == 0:
        # MONETY: fizyczne coiny SolarisCoin do inventory
        rmq_ok = await _rmq.publish("notifications", {
            "ServerCommand": "AddItemToInventory",
            "PlayerId": body.fls_id,
            "ItemName": "SolarisCoin",
            "Quantity": body.amount,
            "Durability": 1.0
        })
        return {"ok": rmq_ok, "message": f"+{body.amount:,} Monet Solaris (inventory)"}
    
    else:
        # KREDYTY: bezposrednio na konto przez player_virtual_currency_balances + landsraad notify
        # NIE RMQ AddItemToInventory - to daje coiny do plecaka!
        sql = f"""
SET search_path TO dune;

-- 1. Aktualizuj balans konta
UPDATE player_virtual_currency_balances 
SET balance = balance + {body.amount}::bigint
WHERE player_controller_id = (
    SELECT ps.player_controller_id FROM player_state ps 
    JOIN accounts a ON a.id = ps.account_id WHERE a.user = '{body.fls_id}'
) AND currency_id = 0;

-- 2. Dodaj wpis do landsraad (triggeruje odswiezenie w grze)
INSERT INTO landsraad_house_rewards (player_id, house_name, amount, template_id, last_updated)
SELECT ps.player_controller_id, 'AdminGrant', {body.amount}::bigint, 'Solaris'::text, NOW()
FROM player_state ps JOIN accounts a ON a.id = ps.account_id
WHERE a.user = '{body.fls_id}';

-- 3. Powiadom gre
SELECT pg_notify('landsraad_notify_channel', 'state_changed');
"""
        _ssh_sql(sql)
        return {"ok": True, "message": f"+{body.amount:,} Kredytow Solaris NA KONTO"}

@router.post("/debug-currency")
async def debug_currency(body: GiveCurrencyRequest):
    """Diagnostic: check player's currency state in DB."""
    # Step 1: Find controller_id
    sql1 = f"SELECT ps.player_controller_id, a.user FROM dune.player_state ps JOIN dune.accounts a ON a.id = ps.account_id WHERE a.user = '{body.fls_id}';"
    result1 = _ssh_sql(sql1) or "NO RESULT"
    
    cid = 4
    if result1 and '|' in result1:
        try:
            parts = result1.strip().split('\n')
            for p in parts:
                if '|' in p:
                    cid = int(p.split('|')[0]) if p.split('|')[0].isdigit() else cid
                    break
        except: pass
    
    # Step 2: Check Solaris balance
    sql2 = f"SET search_path TO dune; SELECT balance FROM player_virtual_currency_balances WHERE player_controller_id = {cid} AND currency_id = 0;"
    balance = _ssh_sql(sql2) or "NO BALANCE ROW"
    
    # Step 3: Check landsraad rewards
    sql3 = f"SET search_path TO dune; SELECT house_name, amount, template_id, last_updated FROM landsraad_house_rewards WHERE player_id = {cid} ORDER BY last_updated DESC LIMIT 5;"
    rewards = _ssh_sql(sql3) or "NO REWARDS"
    
    # Step 4: Check which currency_ids exist
    sql4 = f"SET search_path TO dune; SELECT currency_id, balance FROM player_virtual_currency_balances WHERE player_controller_id = {cid};"
    all_curr = _ssh_sql(sql4) or "NO CURRENCY ROWS AT ALL"
    
    return {
        "fls_id": body.fls_id,
        "controller_id": cid,
        "lookup_result": result1,
        "solaris_balance": balance,
        "landsraad_rewards": rewards,
        "all_currencies": all_curr
    }

@router.post("/give-scrip")
async def give_scrip(body: GiveCurrencyRequest):
    """Give Scrip (Waluta Rodowa) via landsraad_house_rewards + pg_notify.
    Scrip NIE JEST itemem - tylko landsraad_house_rewards!"""
    sql = f"""
SET search_path TO dune;
INSERT INTO landsraad_house_rewards (player_id, house_name, amount, template_id, last_updated)
SELECT ps.player_controller_id, 'AdminGrant', {body.amount}::bigint, 'Scrip'::text, NOW()
FROM dune.player_state ps JOIN dune.accounts a ON a.id = ps.account_id
WHERE a.user = '{body.fls_id}';

SELECT pg_notify('landsraad_notify_channel', 'state_changed');
"""
    result = _ssh_sql(sql)
    return {"ok": True, "message": f"+{body.amount:,} Waluta Rodowa (Scrip) na konto"}


# ═══════════════════════════════════════════════════════════════════
# 8. Award XP (RMQ)
# ═══════════════════════════════════════════════════════════════════

class AwardXPRequest(BaseModel):
    fls_id: str
    category: str = "General"
    experience: int = 10000

@router.post("/award-xp")
async def award_xp(body: AwardXPRequest):
    """Award XP via RMQ."""
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "AwardXP",
        "PlayerId": body.fls_id,
        "Category": body.category,
        "Experience": body.experience
    })
    return {"ok": ok, "message": f"Awarded {body.experience} {body.category} XP"}


# ═══════════════════════════════════════════════════════════════════
# 9. VEHICLE PARTS (spawn all parts to build a vehicle)
# ═══════════════════════════════════════════════════════════════════

VEHICLE_PARTS = {
    "sandbike": {
        "name": "Sandbike T6",
        "emoji": "🏍️",
        "parts": [
            "SandbikeChassis_6", "SandbikeEngine_Unique_Speed_6",
            "SandbikeGenerator_6", "SandbikeHull_6",
            "SandbikeLocomotion_6", "SandbikeBoost_Unique_LessHeat_6",
            "FuelCanister_Large", "WeldingMaterial", "RepairTool5",
        ],
        "qtys": [1,1,1,1,3,1,2,500,1],
    },
    "buggy": {
        "name": "Buggy T6",
        "emoji": "🚙",
        "parts": [
            "BuggyChassis_6", "BuggyEngine_Unique_Accelerate_06",
            "BuggyGenerator_6", "BuggyHullFront_6", "BuggyHullBack_6",
            "BuggyHullBackExtra_6", "BuggyLocomotion_6",
            "BuggyBoost_Unique_LessHeat_6", "BuggyInventory_Unique_Capacity_06",
            "BuggyLauncher_6", "BuggyMining_Unique_YieldIncrease_06",
            "FuelCanister_Large", "WeldingMaterial", "RepairTool5",
        ],
        "qtys": [1,1,1,1,1,1,4,1,1,1,1,3,500,1],
    },
    "scout": {
        "name": "Scout Ornithopter T6",
        "emoji": "🚁",
        "parts": [
            "OrnithopterLightChassis_6", "OrnithopterLightEngine_6",
            "OrnithopterLightGenerator_6", "OrnithopterLightHullFront_6",
            "OrnithopterLightHullBack_6", "OrnithopterLightLocomotion_Unique_Speed_6",
            "OrnithopterLightBoost_Unique_LessHeat_6", "OrnithopterLightLauncher_6",
            "FuelCanister_Large", "WeldingMaterial", "RepairTool5",
        ],
        "qtys": [1,1,1,1,1,4,1,1,3,500,1],
    },
    "assault": {
        "name": "Assault Ornithopter T6",
        "emoji": "🛩️",
        "parts": [
            "OrnithopterMediumChassis_6", "OrnithopterMediumEngine_6",
            "OrnithopterMediumGenerator_6", "OrnithopterMediumHullFront_6",
            "OrnithopterMediumHullBack_6", "OrnithopterMediumHull_6",
            "OrnithopterMediumLocomotion_Unique_Strafe_6",
            "OrnithopterMediumBoost_Unique_LessHeat_6", "OrnithopterMediumLauncher_6",
            "FuelCanister_Large", "WeldingMaterial", "RepairTool5",
        ],
        "qtys": [1,1,1,1,1,1,4,1,1,4,500,1],
    },
    "carrier": {
        "name": "Carryall T6",
        "emoji": "🛫",
        "parts": [
            "OrnithopterTransportChassis_6", "OrnithopterTransportEngine_6",
            "OrnithopterTransportGenerator_6", "OrnithopterTransportHullFront_6",
            "OrnithopterTransportHullBack_6", "OrnithopterTransportHull_6",
            "OrnithopterTransportLocomotion_Unique_Speed_6",
            "OrnithopterTransportBoost_Unique_LessHeat_06",
            "FuelCanister_Large", "WeldingMaterial", "RepairTool5",
        ],
        "qtys": [1,1,1,1,1,1,4,1,5,500,1],
    },
    "treadwheel": {
        "name": "Treadwheel T6",
        "emoji": "🛞",
        "parts": [
            "TreadwheelChassis_6", "TreadwheelEngine_Unique_Speed_6",
            "TreadwheelGenerator_6", "TreadwheelLocomotion_6",
            "TreadwheelBoost_Unique_LessHeat_6",
            "FuelCanister_Large", "WeldingMaterial", "RepairTool5",
        ],
        "qtys": [1,1,1,2,1,2,500,1],
    },
}

class SpawnVehiclePartsRequest(BaseModel):
    fls_id: str
    vehicle_type: str = "sandbike"  # sandbike, buggy, scout, assault, carrier, treadwheel

@router.post("/vehicles/spawn-parts")
async def spawn_vehicle_parts(body: SpawnVehiclePartsRequest):
    """Spawn ALL parts needed to build a vehicle (T6 quality)."""
    vtype = body.vehicle_type.lower()
    if vtype not in VEHICLE_PARTS:
        return {"ok": False, "message": f"Unknown vehicle: {vtype}. Options: {list(VEHICLE_PARTS.keys())}"}
    
    v = VEHICLE_PARTS[vtype]
    results = []
    for template, qty in zip(v["parts"], v["qtys"]):
        r = _send_rmq({"ServerCommand": "AddItemToInventory", "PlayerId": body.fls_id,
                        "ItemName": template, "Quantity": qty, "Durability": 1.0})
        results.append({"template": template, "qty": qty, "ok": r.get("ok", False)})
    
    succeeded = sum(1 for r in results if r["ok"])
    return {"ok": succeeded > 0, "message": f"{v['emoji']} {v['name']}: {succeeded}/{len(results)} parts sent",
            "parts": results}

# Keep old vehicle catalog for reference
VEHICLES = [
    {"name": "Sandbike CHOAM", "class": "/Game/Dune/Vehicles/Sandbike/BP_Sandbike_CHOAM.BP_Sandbike_CHOAM_C"},
    {"name": "Sandbike Basic", "class": "/Game/Dune/Vehicles/Sandbike/BP_Sandbike_Basic.BP_Sandbike_Basic_C"},
    {"name": "Buggy CHOAM", "class": "/Game/Dune/Vehicles/Buggy/BP_Buggy_CHOAM.BP_Buggy_CHOAM_C"},
    {"name": "Buggy Basic", "class": "/Game/Dune/Vehicles/Buggy/BP_Buggy_Basic.BP_Buggy_Basic_C"},
    {"name": "Carryall", "class": "/Game/Dune/Vehicles/Carryall/BP_Carryall.BP_Carryall_C"},
    {"name": "Ornithopter", "class": "/Game/Dune/Vehicles/Ornithopter/BP_Ornithopter.BP_Ornithopter_C"},
]

@router.get("/vehicles/catalog")
async def vehicle_catalog():
    return {"vehicles": VEHICLES, "parts": VEHICLE_PARTS}


# ═══════════════════════════════════════════════════════════════════
# 9b. AUTO-COMPLETE LANDSRAAD MISSIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/landsraad/auto-complete")
async def auto_complete_landsraad(faction_id: int = 2):
    """Auto-complete ALL Landsraad missions LIVE: faction_contributions + progress + pg_notify + RMQ.
    faction_id: 1=Atreides, 2=Harkonnen (default), 3=None, 4=Smuggler"""
    # Get BOTH IDs - different game systems use different IDs!
    # player_controller_id (4) = Landsraad contributions, Solaris
    # player_pawn_id (6) = Faction rep, Specializations, Keystones
    pid_raw = _ssh_sql("SELECT player_controller_id, player_pawn_id FROM dune.player_state WHERE account_id = 1 ORDER BY id DESC LIMIT 1")
    try:
        parts = pid_raw.strip().split('\n')[-1].split('|')
        controller_id = int(parts[0]) if len(parts) >= 1 else 4
        pawn_id = int(parts[1]) if len(parts) >= 2 else 6
    except:
        controller_id = 4
        pawn_id = 6
    results = []
    errors = []
    term_id = None
    
    # Get or create active term
    raw = _ssh_sql("SELECT term_id FROM dune.landsraad_decree_term ORDER BY term_id DESC LIMIT 1")
    if raw and 'term_id' in raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            line = line.strip()
            if not line or '|---' in line or 'rows' in line:
                continue
            parts = line.split('|')
            try:
                term_id = int(parts[0].strip())
                break
            except ValueError:
                pass
    
    if not term_id:
        _ssh_sql("INSERT INTO dune.landsraad_decree_term (term_id, start_time, end_time, test_term) VALUES (999, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', true)", set_path=True)
        term_id = 999
    
    if term_id:
        # Ensure player is in Harkonnen guild (required for progress display)
        _ssh_sql(f"INSERT INTO dune.guild_members (player_id, guild_id, role_id) VALUES ({controller_id}, 1, 1) ON CONFLICT DO NOTHING", set_path=True)
        
        # STEP 1: Reset all tasks so triggers fire fresh
        _ssh_sql(f"UPDATE dune.landsraad_tasks SET completed = false, winning_faction_id = NULL, completion_time = NULL, sysselraad = false WHERE term_id = {term_id}", set_path=True)
        # Reset term - let triggers set winner via bingo detection
        _ssh_sql(f"UPDATE dune.landsraad_decree_term SET winning_faction_id = NULL, reigning_faction_id = NULL, active_decree_id = NULL, elected_decree_id = NULL, test_term = false WHERE term_id = {term_id}", set_path=True)
        
        # STEP 2: Delete old faction contributions so trigger sees fresh inserts
        _ssh_sql(f"DELETE FROM dune.landsraad_task_faction_contributions WHERE task_id IN (SELECT id FROM dune.landsraad_tasks WHERE term_id = {term_id})", set_path=True)
        
        tasks_raw = _ssh_sql(f"SELECT id, house_name, goal_amount FROM dune.landsraad_tasks WHERE term_id = {term_id} ORDER BY id")
        if tasks_raw and '0 rows' not in tasks_raw:
            for line in tasks_raw.strip().split('\n'):
                line = line.strip()
                if not line or '|---' in line or 'rows' in line: continue
                parts = line.split('|')
                if len(parts) >= 3:
                    task_id = parts[0].strip()
                    house = parts[1].strip()
                    goal = parts[2].strip()
                    try:
                        goal_int = int(goal)
                        # Insert faction contribution - this TRIGGERS the full chain:
                        # check_task_completion → marks completed → check_term_won → finds bingo → sets term winner + sysselraad
                        ins = _ssh_sql(f"INSERT INTO dune.landsraad_task_faction_contributions (faction_id, task_id, amount) VALUES ({faction_id}, {task_id}, {goal_int}) ON CONFLICT (faction_id, task_id) DO UPDATE SET amount = {goal_int}", set_path=True)
                        if ins is None: errors.append(f"FAIL task {task_id}")
                        # Player contribution
                        _ssh_sql(f"INSERT INTO dune.landsraad_task_player_contributions (player_id, faction_id, task_id, amount) VALUES ({controller_id}, {faction_id}, {task_id}, {goal_int}) ON CONFLICT (player_id, faction_id, task_id) DO UPDATE SET amount = {goal_int}", set_path=True)
                        # Progress
                        prog_raw = _ssh_sql(f"INSERT INTO dune.landsraad_task_progress (faction_id, task_id, faction_progress, guild_progress, player_progress, timestamp) VALUES ({faction_id}, {task_id}, {goal_int}, {goal_int}, {goal_int}, NOW()) ON CONFLICT DO NOTHING RETURNING id", set_path=True)
                        if prog_raw:
                            for pline in prog_raw.strip().split('\n'):
                                if pline.strip().isdigit():
                                    pid = pline.strip()
                                    _ssh_sql(f"INSERT INTO dune.landsraad_task_progress_player (progress_id, player_id) VALUES ({pid}, {controller_id}) ON CONFLICT DO NOTHING", set_path=True)
                                    _ssh_sql(f"INSERT INTO dune.landsraad_task_progress_guild (progress_id, guild_id) VALUES ({pid}, 1) ON CONFLICT DO NOTHING", set_path=True)
                                    break
                        # Guild contributions (voting power)
                        _ssh_sql(f"INSERT INTO dune.landsraad_task_guild_contributions (guild_id, faction_id, task_id, amount) VALUES (1, {faction_id}, {task_id}, {goal_int}) ON CONFLICT (guild_id, faction_id, task_id) DO UPDATE SET amount = {goal_int}", set_path=True)
                        # House reward
                        _ssh_sql(f"INSERT INTO dune.landsraad_house_rewards (player_id, house_name, amount, template_id, last_updated) VALUES ({controller_id}, '{house}', {goal_int}, 'D_Scrip', NOW()) ON CONFLICT DO NOTHING", set_path=True)
                        results.append(f"{house}(+{goal_int})")
                    except ValueError: pass
        
        # STEP 3: Set term winner, NO decree - player picks via panel
        _ssh_sql(f"UPDATE dune.landsraad_decree_term SET winning_faction_id = COALESCE(winning_faction_id, {faction_id}), reigning_faction_id = {faction_id}, test_term = false WHERE term_id = {term_id}", set_path=True)
        
        # Reveal all tasks for both factions
        _ssh_sql(f"INSERT INTO dune.landsraad_task_reveal_state (task_id, faction_id, revealed, timestamp) SELECT id, 1, true, NOW() FROM dune.landsraad_tasks WHERE term_id = {term_id} ON CONFLICT DO NOTHING", set_path=True)
        _ssh_sql(f"INSERT INTO dune.landsraad_task_reveal_state (task_id, faction_id, revealed, timestamp) SELECT id, 2, true, NOW() FROM dune.landsraad_tasks WHERE term_id = {term_id} ON CONFLICT DO NOTHING", set_path=True)
        
        _ssh_sql("SELECT pg_notify('landsraad_notify_channel', 'state_changed')", set_path=True)
    
    # ── Max Specializations (for ALL player IDs: 2=character, 4=controller, 6=pawn) ──
    all_ids = [2, controller_id, pawn_id]
    for pid in set(all_ids):
        for track in ['Combat', 'Crafting', 'Exploration', 'Gathering', 'Sabotage']:
            _ssh_sql(f"INSERT INTO dune.specialization_tracks (player_id, track_type, xp_amount, level) VALUES ({pid}, '{track}'::dune.specializationtracktype, 44182, 100) ON CONFLICT (player_id, track_type) DO UPDATE SET xp_amount = 44182, level = 100", set_path=True)
    
    # ── Max Faction Reputation (FactionPlayerComponent + table, for ALL IDs) ──
    _ssh_sql(f"UPDATE dune.actors SET properties = jsonb_set(properties, '{{FactionPlayerComponent,m_FactionDataArray,0,ReputationAmount}}', '500000'::jsonb) WHERE id = {controller_id}", set_path=True)
    for pid in set(all_ids):
        _ssh_sql(f"INSERT INTO dune.player_faction_reputation (actor_id, faction_id, reputation_amount) VALUES ({pid}, {faction_id}, 500000) ON CONFLICT (actor_id, faction_id) DO UPDATE SET reputation_amount = 500000", set_path=True)
    
    # ── All 205 Keystones ──
    _ssh_sql(f"INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id) SELECT {pawn_id}, id FROM dune.specialization_keystones_map ON CONFLICT DO NOTHING", set_path=True)
    
    
    faction_names = {1: "Atreides", 2: "Harkonnen", 3: "None", 4: "Smuggler"}
    msg = f"Faction {faction_names.get(faction_id, faction_id)}: term {term_id}, {len(results)} missions completed"
    if errors: msg += f" ({len(errors)} errors)"
    msg += ", ALL specializations MAXED (lvl 100). Check game!"
    
    return {"ok": True, "message": msg, "missions": results, "errors": errors, "faction_id": faction_id}


@router.post("/landsraad/force-new-term")
async def force_new_landsraad_term():
    """Reset current Landsraad term - clears all progress, resets tasks, notifies game."""
    # Get current term
    raw = _ssh_sql("SELECT term_id FROM dune.landsraad_decree_term ORDER BY term_id DESC LIMIT 1")
    term_id = 2
    if raw:
        for line in raw.strip().split('\n'):
            line = line.strip()
            if line.isdigit():
                term_id = int(line)
                break
    
    # RESET everything for current term (don't create new - game handles term lifecycle)
    _ssh_sql(f"DELETE FROM dune.landsraad_task_progress_guild WHERE progress_id IN (SELECT id FROM dune.landsraad_task_progress WHERE task_id IN (SELECT id FROM dune.landsraad_tasks WHERE term_id = {term_id}))", set_path=True)
    _ssh_sql(f"DELETE FROM dune.landsraad_task_progress_player WHERE progress_id IN (SELECT id FROM dune.landsraad_task_progress WHERE task_id IN (SELECT id FROM dune.landsraad_tasks WHERE term_id = {term_id}))", set_path=True)
    _ssh_sql(f"DELETE FROM dune.landsraad_task_progress WHERE task_id IN (SELECT id FROM dune.landsraad_tasks WHERE term_id = {term_id})", set_path=True)
    _ssh_sql(f"DELETE FROM dune.landsraad_task_faction_contributions WHERE task_id IN (SELECT id FROM dune.landsraad_tasks WHERE term_id = {term_id})", set_path=True)
    _ssh_sql(f"DELETE FROM dune.landsraad_task_player_contributions WHERE task_id IN (SELECT id FROM dune.landsraad_tasks WHERE term_id = {term_id})", set_path=True)
    _ssh_sql(f"UPDATE dune.landsraad_tasks SET completed = false, winning_faction_id = NULL, completion_time = NULL WHERE term_id = {term_id}", set_path=True)
    _ssh_sql(f"UPDATE dune.landsraad_decree_term SET winning_faction_id = NULL, test_term = false WHERE term_id = {term_id}", set_path=True)
    _ssh_sql("SELECT pg_notify('landsraad_notify_channel', 'state_changed')", set_path=True)
    
    return {"ok": True, "message": f"Term {term_id} RESET! 25 fresh tasks, all progress cleared. Run Auto-Complete to fill."}
async def list_quests():
    """List all quest/journey tables and their row counts."""
    tables = _ssh_sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'dune' AND (table_name LIKE '%quest%' OR table_name LIKE '%journey%' OR table_name LIKE '%mission%' OR table_name LIKE '%task%') ORDER BY table_name")
    return {"tables": tables}


@router.post("/quests/complete-all")
async def complete_all_quests():
    """Complete all main quests via RMQ JourneyCompleteTaskByName."""
    fls_id = "FC4D3B70DB35663"
    quests = [
        'DA_MQ_ANewBeginning', 'DA_MQ_FindTheFremen', 'DA_MQ_AssassinsHandbook',
        'DA_MQ_TheGreatConvention', 'DA_MQ_WhereGodsDwell', 'DA_MQ_BloodAndGold',
    ]
    results = {}
    for q in quests:
        r = _send_rmq({"ServerCommand": "JourneyCompleteTaskByName", "PlayerId": fls_id, "TaskName": q})
        results[q] = r.get("ok", False)
    completed = sum(1 for v in results.values() if v)
    return {"ok": True, "message": f"{completed}/{len(quests)} quests completed", "results": results}


# ═══════════════════════════════════════════════════════════════════
# 9d. KEYSTONES - Grant all 205 specialization keystones
# ═══════════════════════════════════════════════════════════════════

@router.post("/keystones/grant-all")
async def grant_all_keystones(player_id: int = None):
    """Grant ALL 205 specialization keystones (41 per track × 5 tracks)."""
    if player_id is None:
        pid_raw = _ssh_sql("SELECT player_pawn_id FROM dune.player_state WHERE account_id = 1 ORDER BY id DESC LIMIT 1")
        try: player_id = int(pid_raw.strip().split('\n')[-1]) if pid_raw else 6
        except: player_id = 6
    # Get all keystone IDs from the map
    raw = _ssh_sql("SELECT id FROM dune.specialization_keystones_map ORDER BY id")
    if not raw or '0 rows' in raw:
        return {"ok": False, "message": "No keystones found in map"}
    
    count = 0
    for line in raw.strip().split('\n'):
        line = line.strip()
        if not line or '|---' in line or 'rows' in line or not line.isdigit():
            continue
        kid = line
        _ssh_sql(f"INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id) VALUES ({player_id}, {kid}) ON CONFLICT DO NOTHING", set_path=True)
        count += 1
    
    return {"ok": True, "message": f"Granted {count} keystones to player {player_id}. Restart game!"}


# ═══════════════════════════════════════════════════════════════════
# 9e. FACTION REPUTATION - Max Harkonnen Tier 20
# ═══════════════════════════════════════════════════════════════════

@router.post("/faction/max-reputation")
async def max_faction_reputation(faction_id: int = 2, player_id: int = None):
    """Max faction reputation (Tier 20 = ~500,000 rep)."""
    if player_id is None:
        pid_raw = _ssh_sql("SELECT player_pawn_id FROM dune.player_state WHERE account_id = 1 ORDER BY id DESC LIMIT 1")
        try: player_id = int(pid_raw.strip().split('\n')[-1]) if pid_raw else 6
        except: player_id = 6
    # Tier 20 requires approximately 500,000 reputation
    max_rep = 500000
    
    # Set player faction
    _ssh_sql(f"INSERT INTO dune.player_faction (actor_id, faction_id, utc_time_faction_change) VALUES ({player_id}, {faction_id}, NOW()) ON CONFLICT DO NOTHING", set_path=True)
    
    # Set reputation
    _ssh_sql(f"INSERT INTO dune.player_faction_reputation (actor_id, faction_id, reputation_amount) VALUES ({player_id}, {faction_id}, {max_rep}) ON CONFLICT (actor_id, faction_id) DO UPDATE SET reputation_amount = {max_rep}", set_path=True)
    
    faction_names = {1: "Atreides", 2: "Harkonnen", 3: "None", 4: "Smuggler"}
    return {"ok": True, "message": f"{faction_names.get(faction_id, faction_id)} reputation MAXED (Tier 20, {max_rep} rep) for player {player_id}. Restart game!"}


# ═══════════════════════════════════════════════════════════════════
# 10. WORLD DATA — Bases, Storage, Blueprint Give
# ═══════════════════════════════════════════════════════════════════

@router.get("/bases")
async def get_bases_v2():
    """Get player bases grouped by building (DST pattern)."""
    raw = _ssh_sql("""
SELECT b.id,
       COALESCE(pa.actor_name, 'Base') AS name,
       COALESCE(inst.cnt, 0) AS pieces,
       COALESCE(plac.cnt, 0) AS placeables,
       COALESCE(ps.character_name, 'Unknown') AS owner,
       t.id AS totem_id,
       inst.owner_entity_id
FROM dune.buildings b
LEFT JOIN (
    SELECT building_id, MIN(owner_entity_id) AS owner_entity_id, COUNT(*) AS cnt
    FROM dune.building_instances
    GROUP BY building_id
) inst ON inst.building_id = b.id
LEFT JOIN dune.actor_fgl_entities afe ON afe.entity_id = inst.owner_entity_id
LEFT JOIN dune.actors t ON t.id = afe.actor_id AND t.class ILIKE '%Totem%'
LEFT JOIN dune.permission_actor pa ON pa.actor_id = t.id
LEFT JOIN LATERAL (
    SELECT player_id FROM dune.permission_actor_rank
    WHERE permission_actor_id = t.id LIMIT 1
) own ON true
LEFT JOIN dune.actors powner ON powner.id = own.player_id
LEFT JOIN dune.player_state ps ON ps.account_id = powner.owner_account_id
LEFT JOIN (
    SELECT bi.building_id, COUNT(*) AS cnt
    FROM dune.building_instances bi
    JOIN dune.placeables p ON p.owner_entity_id = bi.owner_entity_id
    GROUP BY bi.building_id
) plac ON plac.building_id = b.id
ORDER BY pieces DESC LIMIT 50
""")
    bases = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            try:
                if len(p) >= 6 and p[0].strip().isdigit():
                    bases.append({
                        "id": int(p[0]),
                        "name": p[1].strip() if p[1].strip() else 'Base #' + p[0].strip(),
                        "pieces": int(p[2]) if p[2].strip().isdigit() else 0,
                        "placeables": int(p[3]) if p[3].strip().isdigit() else 0,
                        "owner": p[4].strip() if len(p) > 4 and p[4].strip() else 'Unknown',
                        "totem_id": int(p[5]) if len(p) > 5 and p[5].strip().isdigit() else 0
                    })
            except (ValueError, IndexError):
                pass
    return {"bases": bases, "total": len(bases)}

@router.get("/world/bases")
async def get_bases():
    """Get player bases - grouped by building with owner names (DST pattern)."""
    raw = _ssh_sql("""
SELECT b.id,
       COALESCE(pa.actor_name, 'Base') AS name,
       COALESCE(inst.cnt, 0) AS pieces,
       COALESCE(plac.cnt, 0) AS placeables,
       COALESCE(ps.character_name, 'Unknown') AS owner,
       t.id AS totem_id,
       inst.owner_entity_id
FROM dune.buildings b
LEFT JOIN (
    SELECT building_id, MIN(owner_entity_id) AS owner_entity_id, COUNT(*) AS cnt
    FROM dune.building_instances
    GROUP BY building_id
) inst ON inst.building_id = b.id
LEFT JOIN dune.actor_fgl_entities afe ON afe.entity_id = inst.owner_entity_id
LEFT JOIN dune.actors t ON t.id = afe.actor_id AND t.class ILIKE '%Totem%'
LEFT JOIN dune.permission_actor pa ON pa.actor_id = t.id
LEFT JOIN LATERAL (
    SELECT player_id FROM dune.permission_actor_rank
    WHERE permission_actor_id = t.id LIMIT 1
) own ON true
LEFT JOIN dune.actors powner ON powner.id = own.player_id
LEFT JOIN dune.player_state ps ON ps.account_id = powner.owner_account_id
LEFT JOIN (
    SELECT bi.building_id, COUNT(*) AS cnt
    FROM dune.building_instances bi
    JOIN dune.placeables p ON p.owner_entity_id = bi.owner_entity_id
    GROUP BY bi.building_id
) plac ON plac.building_id = b.id
ORDER BY pieces DESC LIMIT 50
""")
    bases = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            try:
                if len(p) >= 6 and p[0].strip().isdigit():
                    bases.append({
                        "id": int(p[0]),
                        "name": p[1].strip() if p[1].strip() else 'Base #' + p[0].strip(),
                        "pieces": int(p[2]) if p[2].strip().isdigit() else 0,
                        "placeables": int(p[3]) if p[3].strip().isdigit() else 0,
                        "owner": p[4].strip() if len(p) > 4 and p[4].strip() else 'Unknown',
                        "totem_id": int(p[5]) if len(p) > 5 and p[5].strip().isdigit() else 0,
                        "owner_entity_id": p[6].strip() if len(p) > 6 else ''
                    })
            except (ValueError, IndexError):
                pass
    return {"bases": bases, "total": len(bases)}


@router.delete("/world/bases/{instance_id}")
async def delete_base(instance_id: int):
    """Delete a building instance by ID."""
    _ssh_sql(f"DELETE FROM dune.building_instances WHERE instance_id = {instance_id}", set_path=True)
    return {"ok": True, "message": f"Building #{instance_id} deleted"}


@router.get("/bases/{totem_id}/sublenne")
async def base_sublenne(totem_id: int):
    """Get Sublenne console data for a base (power, shelter, health)."""
    raw = _ssh_sql(f"""
SELECT
  COALESCE((fgl.components->'FHealthComponent'->1->>'m_CurrentHealth')::float, 0) as health,
  COALESCE((fgl.components->'FShelterComponent'->1->>'m_ShelteredPercentage')::float, 0) as shelter_pct,
  COALESCE((fgl.components->'FPowerCircuitElementComponent'->1->>'m_bIsEnabled')::bool, false) as power_enabled,
  COALESCE((fgl.components->'FPowerCircuitElementComponent'->1->>'m_ConnectedCircuit')::int, 0) as power_circuit,
  COALESCE((fgl.components->'FAudioTotemPlaceablesInfoComponent'->1->>'m_ActiveFabricatorCount')::int, 0) as fabricators,
  COALESCE((fgl.components->'FAudioTotemPlaceablesInfoComponent'->1->>'m_ActiveOreRefineryCount')::int, 0) as refineries,
  COALESCE((fgl.components->'FAudioTotemPlaceablesInfoComponent'->1->>'m_ActivePowerGeneratorCount')::int, 0) as generators,
  COALESCE((fgl.components->'FTotemLandclaimComponent'->1->>'m_BoundingCircleRadius')::float, 0) as radius
FROM dune.actor_fgl_entities afe
LEFT JOIN dune.fgl_entities fgl ON fgl.entity_id = afe.entity_id
WHERE afe.actor_id = {totem_id} AND afe.slot_name = 'Actor' LIMIT 1
""")
    result = {"totem_id": totem_id, "health": 0, "shelter_pct": 0, "power_enabled": False, "power_circuit": 0,
              "fabricators": 0, "refineries": 0, "generators": 0, "radius": 0}
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 8 and p[0].strip():
                try:
                    result = {"totem_id": totem_id,
                        "health": float(p[0]) if p[0].strip() else 0,
                        "shelter_pct": float(p[1]) if p[1].strip() else 0,
                        "power_enabled": p[2].strip().lower() == 't',
                        "power_circuit": int(p[3]) if p[3].strip().lstrip('-').isdigit() else 0,
                        "fabricators": int(p[4]) if p[4].strip().isdigit() else 0,
                        "refineries": int(p[5]) if p[5].strip().isdigit() else 0,
                        "generators": int(p[6]) if p[6].strip().isdigit() else 0,
                        "radius": float(p[7]) if p[7].strip() else 0}
                except: pass
    return result


@router.get("/world/storage")
async def get_storage():
    """Get storage containers (inventories)."""
    raw = _ssh_sql("SELECT i.id, i.actor_id, i.inventory_type, i.max_item_count, i.max_item_volume, COUNT(ii.id) as items FROM dune.inventories i LEFT JOIN dune.inventory_items ii ON ii.inventory_id = i.id GROUP BY i.id, i.actor_id, i.inventory_type, i.max_item_count, i.max_item_volume ORDER BY items DESC LIMIT 100")
    containers = []
    type_names = {'0':'Default','1':'Hotbar','2':'Equipment','3':'Backpack','14':'Storage'}
    skipped_header = False
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            line = line.strip()
            if not line or 'rows' in line: continue
            parts = line.split('|')
            if not skipped_header and parts and parts[0].strip() == 'id':
                skipped_header = True; continue
            if len(parts) >= 6:
                itype = type_names.get(parts[2].strip(), 'Type'+parts[2].strip())
                containers.append({"id": parts[0].strip(), "actor_id": parts[1].strip(), "type": itype, "max_items": parts[3].strip(), "max_volume": parts[4].strip(), "items": parts[5].strip()})
    return {"containers": containers, "total": len(containers)}


class BlueprintGiveReq(BaseModel):
    fls_id: str = "FC4D3B70DB35663"
    template: str
    qty: int = 1

@router.post("/world/blueprint-give")
async def give_blueprint(body: BlueprintGiveReq):
    """Give a blueprint/schematic to a player via RMQ."""
    r = _send_rmq({"ServerCommand": "AddItemToInventory", "PlayerId": body.fls_id,
                    "ItemName": body.template, "Quantity": body.qty, "Durability": 1.0})
    if r.get("ok"):
        return {"ok": True, "message": f"Sent {body.qty}x {body.template} to {body.fls_id}"}
    return {"ok": False, "message": f"Failed: {r.get('raw', 'RMQ error')}"}


# ═══════════════════════════════════════════════════════════════════
# 11. WELCOME KIT — SQL direct (NIE RMQ, RMQ nie dziala)
# ═══════════════════════════════════════════════════════════════════

STARTER_KIT = [
    ("BuildingTool", 1), ("RespawnBeacon", 1), ("WeldingMaterial", 200),
    ("RepairTool5", 1),
    ("Water", 200), ("Literjon", 1),
    ("CopperOre", 200), ("IronOre", 100), ("PlantFiber", 200),
    ("SalvagedMetal", 100), ("FuelCell", 20),
    ("GraniteStone", 200), ("Coal", 50), ("Sulfur", 50), ("MelangeSpice", 20),
    ("LightAmmo", 500), ("HeavyAmmo", 200),
    ("HealthPack_Channeled_3", 40),
    ("Combat_Choam_Heavy02_Boots", 1), ("Combat_Choam_Heavy02_Bottom", 1),
    ("Combat_Choam_Heavy02_Gloves", 1), ("Combat_Choam_Heavy02_Helmet", 1),
    ("Combat_Choam_Heavy02_Top", 1),
    ("HarkAr4", 1), ("HoltzmanShieldActiveDrain", 1), ("PowerPack2", 1),
]

T1_KIT = [
    ("BuildingTool", 1), ("RespawnBeacon", 1), ("WeldingMaterial", 100),
    ("Water", 100), ("Literjon", 1),
    ("CopperOre", 100), ("IronOre", 50), ("PlantFiber", 100),
    ("SalvagedMetal", 50), ("FuelCell", 10), ("GraniteStone", 100),
    ("LightAmmo", 200), ("HealthPack_Channeled_3", 10),
    ("Combat_Choam_Heavy01_Boots", 1), ("Combat_Choam_Heavy01_Bottom", 1),
    ("Combat_Choam_Heavy01_Gloves", 1), ("Combat_Choam_Heavy01_Helmet", 1),
    ("Combat_Choam_Heavy01_Top", 1),
    ("MaulaPistol", 1), ("PowerPack", 1),
]

T2_KIT = [
    ("BuildingTool", 2), ("RespawnBeacon", 2), ("WeldingMaterial", 200),
    ("RepairTool3", 1),
    ("Water", 200), ("Literjon", 2),
    ("CopperOre", 200), ("IronOre", 100), ("PlantFiber", 200),
    ("SalvagedMetal", 100), ("FuelCell", 20), ("GraniteStone", 200),
    ("Coal", 50), ("Sulfur", 50), ("MelangeSpice", 20),
    ("LightAmmo", 500), ("HeavyAmmo", 200), ("HealthPack_Channeled_3", 20),
    ("Combat_Choam_Heavy02_Boots", 1), ("Combat_Choam_Heavy02_Bottom", 1),
    ("Combat_Choam_Heavy02_Gloves", 1), ("Combat_Choam_Heavy02_Helmet", 1),
    ("Combat_Choam_Heavy02_Top", 1),
    ("HarkAr4", 1), ("HoltzmanShieldActiveDrain", 1), ("PowerPack2", 1),
]

T3_KIT = [
    ("BuildingTool", 3), ("RespawnBeacon", 3), ("WeldingMaterial", 500),
    ("RepairTool5", 2),
    ("Water", 500), ("Literjon", 3),
    ("CopperOre", 500), ("IronOre", 250), ("PlantFiber", 500),
    ("SalvagedMetal", 200), ("FuelCell", 50), ("GraniteStone", 500),
    ("Coal", 100), ("Sulfur", 100), ("MelangeSpice", 50),
    ("SpicedFuelCell", 20), ("FlourSand", 200),
    ("LightAmmo", 1000), ("HeavyAmmo", 500), ("HealthPack_Channeled_3", 40),
    ("Combat_Choam_Heavy03_Boots", 1), ("Combat_Choam_Heavy03_Bottom", 1),
    ("Combat_Choam_Heavy03_Gloves", 1), ("Combat_Choam_Heavy03_Helmet", 1),
    ("Combat_Choam_Heavy03_Top", 1),
    ("HarkAr5", 1), ("HoltzmanShieldActiveDrain2", 1), ("PowerPack3", 1),
    ("SandbikeChassis_6", 1), ("SandbikeEngine_Unique_Speed_6", 1),
    ("SandbikeGenerator_6", 1), ("SandbikeHull_6", 1),
    ("SandbikeLocomotion_6", 3), ("SandbikeBoost_Unique_LessHeat_6", 1),
    ("FuelCanister_Large", 5),
]

KITS = {"starter": STARTER_KIT, "t1": T1_KIT, "t2": T2_KIT, "t3": T3_KIT}

async def _give_kit_sql(fls_id: str, items: list, kit_name: str):
    """Insert kit items via SQL + give Solaris."""
    import time
    sql_lookup = (
        "SELECT ps.account_id, "
        "(SELECT i.id FROM dune.inventories i WHERE i.actor_id = ps.player_pawn_id AND i.inventory_type = '0' LIMIT 1) as inv_id "
        "FROM dune.player_state ps JOIN dune.accounts a ON a.id = ps.account_id "
        "WHERE a.user = '" + fls_id.replace("'", "''") + "'"
    )
    result = _ssh_sql(sql_lookup)
    if not result:
        return {"ok": False, "message": f"Player {fls_id} not found"}
    lines = result.strip().split('\n')
    if len(lines) < 2:
        return {"ok": False, "message": "No player data"}
    parts = lines[1].split('|')
    acc_id = parts[0].strip() if len(parts) > 0 else "?"
    inv_id = parts[1].strip() if len(parts) > 1 else "?"
    if not inv_id or inv_id == '':
        return {"ok": False, "message": "No inventory found. Is character fully created?"}
    
    cid_result = _ssh_sql("SELECT player_controller_id FROM dune.player_state WHERE account_id = " + acc_id)
    cid = 0
    if cid_result:
        clines = cid_result.strip().split('\n')
        if len(clines) > 1 and clines[1].strip().isdigit():
            cid = int(clines[1].strip())
    if cid:
        _ssh_sql(f"SET search_path TO dune; INSERT INTO player_virtual_currency_balances (player_controller_id, currency_id, balance) VALUES ({cid}, 0, 10000000) ON CONFLICT (player_controller_id, currency_id) DO UPDATE SET balance = player_virtual_currency_balances.balance + 10000000", set_path=True)
        _ssh_sql(f"SET search_path TO dune; INSERT INTO landsraad_house_rewards (player_id, house_name, amount, template_id, last_updated) VALUES ({cid}, 'AdminGrant', 10000000::bigint, 'Solaris'::text, NOW())", set_path=True)
    
    now_ms = int(time.time() * 1000)
    results = []
    for pos, (template, qty) in enumerate(items):
        safe_t = template.replace("'", "''")
        sql = ("SET search_path TO dune; INSERT INTO items (inventory_id, template_id, stack_size, position_index, is_new, acquisition_time, stats, quality_level) "
               "VALUES (" + inv_id + ", '" + safe_t + "', " + str(qty) + ", " + str(pos) + ", true, " + str(now_ms) + ", '{}'::jsonb, 0)")
        ok = _ssh_sql(sql) is not None
        results.append({"item": template, "qty": qty, "ok": ok})
    ok_count = sum(1 for x in results if x["ok"])
    kit_labels = {"starter": "Welcome Pack", "t1": "T1 Duneman", "t2": "T2 Kirab", "t3": "T3 Slaver"}
    return {"ok": ok_count > 0, "message": f"{kit_labels.get(kit_name, kit_name)}: {ok_count}/{len(results)} items to {fls_id}. +10M Solaris. RELOG!", "items": results}

@router.post("/welcome/give-starter-kit")
async def give_starter_kit(fls_id: str = "FC4D3B70DB35663", kit: str = "starter"):
    """Give welcome pack via SQL. kit=starter|t1|t2|t3"""
    items = KITS.get(kit, STARTER_KIT)
    return await _give_kit_sql(fls_id, items, kit)


# ═══════════════════════════════════════════════════════════════════
# 12. BATTLEPASS — Player progress check
# ═══════════════════════════════════════════════════════════════════

@router.get("/battlepass/player/{account_id}")
async def battlepass_player(account_id: int):
    """Check player battlepass progress."""
    raw = _ssh_sql(f"""
        SELECT track_type, xp_amount, level 
        FROM dune.specialization_tracks 
        WHERE player_id = (SELECT player_controller_id FROM dune.player_state WHERE account_id = {account_id} LIMIT 1)
        ORDER BY track_type
    """)
    specs = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            line = line.strip()
            if not line or 'rows' in line or '|---' in line: continue
            parts = line.split('|')
            if parts and parts[0].strip() in ['Combat','Crafting','Exploration','Gathering','Sabotage']:
                specs.append({"track": parts[0].strip(), "xp": parts[1].strip(), "level": parts[2].strip()})
    
    return {"account_id": account_id, "specializations": specs, "total_xp": sum(int(s['xp']) for s in specs if s['xp'].isdigit())}


@router.get("/specializations/status")
async def specs_status(player_id: int = None):
    """Show current specialization levels."""
    if player_id is None:
        pid_raw = _ssh_sql("SELECT player_pawn_id FROM dune.player_state WHERE account_id = 1 ORDER BY id DESC LIMIT 1")
        try: player_id = int(pid_raw.strip().split('\n')[-1]) if pid_raw else 6
        except: player_id = 6
    raw = _ssh_sql(f"SELECT track_type, xp_amount, level FROM dune.specialization_tracks WHERE player_id = {player_id} ORDER BY track_type")
    tracks = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            line = line.strip()
            if not line or 'rows' in line: continue
            parts = line.split('|')
            if parts and parts[0].strip() in ['Combat','Crafting','Exploration','Gathering','Sabotage']:
                tracks.append({"track_type": parts[0].strip(), "xp_amount": int(parts[1]) if parts[1].isdigit() else 0, "level": int(parts[2]) if parts[2].isdigit() else 0})
    return {"player_id": player_id, "tracks": tracks, "max_xp": 44182}


@router.post("/specializations/award-xp")
async def award_spec_xp(track: str = "Combat", amount: int = 5000):
    """Award XP to one specialization track."""
    # Get actual player_pawn_id
    pid_raw = _ssh_sql("SELECT player_pawn_id FROM dune.player_state WHERE account_id = 1 ORDER BY id DESC LIMIT 1")
    try:
        player_id = int(pid_raw.strip().split('\n')[-1]) if pid_raw else 6
    except:
        player_id = 6
    max_xp = 44182
    amount = min(amount, max_xp)
    _ssh_sql(f"INSERT INTO dune.specialization_tracks (player_id, track_type, xp_amount, level) VALUES ({player_id}, '{track}'::dune.specializationtracktype, LEAST({amount}, {max_xp}), 1) ON CONFLICT (player_id, track_type) DO UPDATE SET xp_amount = LEAST(specialization_tracks.xp_amount + {amount}, {max_xp}), level = GREATEST(specialization_tracks.level, 1)", set_path=True)
    raw = _ssh_sql(f"SELECT track_type, xp_amount, level FROM dune.specialization_tracks WHERE player_id = {player_id} AND track_type = '{track}'")
    return {"ok": True, "message": f"+{amount} XP to {track}. {raw}"}


@router.post("/specializations/max")
async def max_specializations():
    """Directly set all 5 specialization tracks to max level 100 (correct cap: 44182 XP)."""
    pid_raw = _ssh_sql("SELECT player_pawn_id FROM dune.player_state WHERE account_id = 1 ORDER BY id DESC LIMIT 1")
    try:
        player_id = int(pid_raw.strip().split('\n')[-1]) if pid_raw else 6
    except:
        player_id = 6
    for track in ['Combat', 'Crafting', 'Exploration', 'Gathering', 'Sabotage']:
        _ssh_sql(f"INSERT INTO dune.specialization_tracks (player_id, track_type, xp_amount, level) VALUES ({player_id}, '{track}'::dune.specializationtracktype, 44182, 100) ON CONFLICT (player_id, track_type) DO UPDATE SET xp_amount = 44182, level = 100")
    return {"ok": True, "message": "All 5 specializations MAXED (44182 XP = level 100). Restart game!"}


# ═══════════════════════════════════════════════════════════════════
# 9f. MAX SPECS SAFE — z walidacja questow przed maxowaniem
# ═══════════════════════════════════════════════════════════════════

class MaxSpecsSafeRequest(BaseModel):
    account_id: int
    force: bool = False  # if True, skip validation warnings

def _psql_value(raw: str) -> str:
    """Extract first data row from psql -A output.
    Format: header_line \n data_line \n (N rows)"""
    if not raw: return ""
    lines = [l.strip() for l in raw.strip().split('\n') if l.strip()]
    # psql -A: line[0]=header, line[1]=data (if exists), last=footer "(N rows)"
    data_lines = [l for l in lines if not (l.startswith('(') and 'row' in l.lower())]
    if len(data_lines) >= 2:
        return data_lines[1]  # first data line after header
    if len(data_lines) == 1:
        return data_lines[0]
    return ""

def _validate_quest_progress(account_id: int) -> dict:
    """Check if player has completed required quests for safe spec maxing.
    Returns {ok: bool, warnings: [str], details: dict}"""
    warnings = []
    details = {}

    # 1. Check journey_story_node for key quests
    journey_sql = f"""
    SELECT story_node_id, (complete_condition_state = 'true'::jsonb) AS done
    FROM dune.journey_story_node
    WHERE character_id IN (SELECT id FROM dune.player_state WHERE account_id = {account_id})
      AND (story_node_id LIKE 'DA_MQ_ANewBeginning%'
        OR story_node_id LIKE 'DA_FQ_ClimbTheRanks%'
        OR story_node_id LIKE 'DA_MQ_FindTheFremen%')
    """
    journey_raw = _ssh_sql(journey_sql)
    if journey_raw and '0 rows' not in journey_raw:
        completed = set()
        for line in journey_raw.strip().split('\n'):
            parts = line.split('|')
            if len(parts) >= 2:
                node = parts[0].strip()
                done = parts[1].strip().lower() in ('t', 'true', '1')
                # Extract quest root (e.g. DA_MQ_ANewBeginning_Step1 -> DA_MQ_ANewBeginning)
                root = node.split('.')[0] if '.' in node else node
                if done: completed.add(root)
        details['journey_nodes_found'] = len(journey_raw.strip().split('\n'))
        details['quest_roots_completed'] = list(completed)
    else:
        details['journey_nodes_found'] = 0
        warnings.append("Brak jakichkolwiek journey nodes - postac prawdopodobnie nie rozpoczela questow")

    # 2. Check Journey.RewardsUnblocked tag (3rd ability slot)
    tag_sql = f"""
    SELECT EXISTS(SELECT 1 FROM dune.player_tags
    WHERE character_id IN (SELECT id FROM dune.player_state WHERE account_id = {account_id})
    AND tag = 'Journey.RewardsUnblocked') AS has_tag
    """
    tag_raw = _ssh_sql(tag_sql)
    has_rewards = 't' in _psql_value(tag_raw).lower() if tag_raw else False
    details['has_rewards_unblocked'] = has_rewards
    if not has_rewards:
        warnings.append("Brak tagu 'Journey.RewardsUnblocked' - 3rd ability slot (Prescience) moze nie dzialac")

    # 3. Check if player exists at all (no level column in player_state)
    player_check = _ssh_sql(f"SELECT player_controller_id FROM dune.player_state WHERE account_id = {account_id} LIMIT 1")
    if not player_check or '0 rows' in player_check:
        return {"ok": False, "warnings": ["Gracz nie istnieje w bazie"], "details": {}}

    ok = len(warnings) == 0
    return {"ok": ok, "warnings": warnings, "details": details}


@router.post("/specializations/max-safe")
async def max_specs_safe(body: MaxSpecsSafeRequest):
    """Max all 5 specialization tracks (level 100) WITH quest validation.
    
    Przed maxowaniem sprawdza:
    1. Czy glowne questy sa ukonczone (DA_MQ_*, DA_FQ_ClimbTheRanks)
    2. Czy tag Journey.RewardsUnblocked istnieje
    3. Czy character level >= ~20
    
    Uzyj force=true aby pominac walidacje.
    """
    # 1. Get controller_id
    player_sql = f"SELECT player_controller_id, character_name, player_pawn_id FROM dune.player_state WHERE account_id = {body.account_id} LIMIT 1"
    player_raw = _ssh_sql(player_sql)
    if not player_raw or '0 rows' in player_raw:
        raise HTTPException(404, f"Gracz z account_id={body.account_id} nie istnieje")

    parts = _psql_value(player_raw).split('|')
    controller_id = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else None
    char_name = parts[1] if len(parts) > 1 else "?"
    pawn_id = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else None

    if not controller_id:
        raise HTTPException(400, "Nie mozna znalezc controller_id dla tego gracza")

    # 2. Validate quest progress (unless force)
    validation = None
    if not body.force:
        validation = _validate_quest_progress(body.account_id)
        if not validation["ok"]:
            return {
                "ok": False,
                "status": "validation_failed",
                "player": {"account_id": body.account_id, "name": char_name, "controller_id": controller_id},
                "warnings": validation["warnings"],
                "details": validation["details"],
                "message": f"NIE zmaksowano specow - {len(validation['warnings'])} ostrzezen. Uzyj force=true aby pominac.",
                "hint": "Dodaj 'force: true' do requestu aby pominac walidacje"
            }

    # 3. Max all 5 tracks (using stored proc - DST method)
    tracks = ['Combat', 'Crafting', 'Exploration', 'Gathering', 'Sabotage']
    results = []
    for track in tracks:
        sql = f"SELECT dune.set_specialization_xp_and_level({controller_id}::bigint, '{track}'::dune.specializationtracktype, 44182::integer, 100.0::real)"
        raw = _ssh_sql(sql)
        results.append({"track": track, "ok": raw is not None})

    # 4. Grant all 205 keystones
    keystone_sql = f"INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id) SELECT {controller_id}, id FROM dune.specialization_keystones_map ON CONFLICT DO NOTHING"
    _ssh_sql(keystone_sql, set_path=True)

    succeeded = sum(1 for r in results if r["ok"])
    forced_note = " (FORCE - bez walidacji)" if body.force else ""
    val_note = f" | Walidacja: OK" if validation and validation["ok"] else ""

    return {
        "ok": True,
        "status": "maxed",
        "player": {"account_id": body.account_id, "name": char_name, "controller_id": controller_id},
        "tracks_maxed": succeeded,
        "tracks_total": len(tracks),
        "keystones_granted": 205,
        "message": f"Zmaksowano {succeeded}/{len(tracks)} trackow + 205 keystones dla {char_name}{forced_note}{val_note}. Wymagany RELOG!",
        "validation": validation["details"] if validation else None
    }


# ═══════════════════════════════════════════════════════════════════
# Commands endpoint - quick VM/BG/Tools actions
# ═══════════════════════════════════════════════════════════════════

@router.post("/commands/{cmd}")
async def run_command(cmd: str):
    """Execute quick commands on the VM."""
    import subprocess as sp
    ssh = get_ssh()
    key = ssh._find_key()
    
    CMDS = {
        'kubectl': 'sudo kubectl get pods -A --no-headers 2>&1 | head -20',
        'ping-test': 'ping -c 2 8.8.8.8',
        'health-check': 'echo "=== DISK ===" && df -h / && echo "=== MEM ===" && free -h && echo "=== PODS ===" && sudo kubectl get pods -A --no-headers 2>&1 | wc -l && echo "pods total"',
        'git-pull': 'cd /funcom && git pull 2>&1 || echo "no git repo"',
    }
    
    if cmd not in CMDS:
        return {"ok": False, "message": f"Unknown command: {cmd}"}
    
    try:
        c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
             '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
        if key: c += ['-i', key]
        c += [f'dune@{ssh.host}', CMDS[cmd]]
        r = sp.run(c, capture_output=True, text=True, timeout=20)
        return {"ok": r.returncode == 0, "command": cmd, "output": r.stdout[:5000] or r.stderr[:2000]}
    except Exception as e:
        return {"ok": False, "command": cmd, "output": str(e)}


# ═══════════════════════════════════════════════════════════════════
# Players List + Detail (DST Screenshot 3)
# ═══════════════════════════════════════════════════════════════════

@router.get("/players")
async def list_players(q: str = "", limit: int = 50):
    sql = """
    SELECT ps.account_id, ps.player_controller_id, ps.player_pawn_id,
           COALESCE(ps.character_name,'') AS name, COALESCE(a.class,'') AS class,
           COALESCE(a.map,'') AS map, COALESCE(pf.faction_id,0) AS faction_id,
           COALESCE(f.name,'') AS faction, COALESCE(ps.online_status::text,'Offline') AS online,
           COALESCE(ac.user,'') AS fls_id
    FROM dune.player_state ps
    LEFT JOIN dune.actors a ON a.id=ps.player_pawn_id
    LEFT JOIN dune.player_faction pf ON pf.actor_id=ps.player_controller_id
    LEFT JOIN dune.factions f ON f.id=pf.faction_id
    LEFT JOIN dune.accounts ac ON ac.id=ps.account_id
    """ + (f" WHERE ps.character_name ILIKE '%{q}%'" if q else "") + " ORDER BY ps.account_id LIMIT " + str(limit)
    raw = _ssh_sql(sql)
    players = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            parts = line.split('|')
            if len(parts) >= 9 and parts[0].strip().isdigit():
                players.append({"account_id":int(parts[0]),"controller_id":int(parts[1]),"pawn_id":int(parts[2]),
                    "name":parts[3],"class":parts[4],"map":parts[5],"faction_id":int(parts[6]),"faction":parts[7],"online":parts[8],
                    "fls_id":parts[9] if len(parts)>9 else ''})
    return {"players":players,"total":len(players)}

@router.get("/players/{account_id}/detail")
async def player_detail(account_id: int):
    sql = f"SELECT ps.account_id,ps.player_controller_id,ps.player_pawn_id,COALESCE(ps.character_name,''),COALESCE(a.class,''),COALESCE(a.map,''),COALESCE(pf.faction_id,0),COALESCE(f.name,''),COALESCE(ps.online_status::text,'Offline') FROM dune.player_state ps LEFT JOIN dune.actors a ON a.id=ps.player_pawn_id LEFT JOIN dune.player_faction pf ON pf.actor_id=ps.player_controller_id LEFT JOIN dune.factions f ON f.id=pf.faction_id WHERE ps.account_id={account_id} LIMIT 1"
    return {"detail": _ssh_sql(sql)}

# Landsraad
@router.get("/players/{account_id}/landsraad")
async def player_landsraad(account_id: int):
    sql = f"SELECT lpc.house_name,lpc.contribution_amount FROM dune.landsraad_task_player_contributions lpc WHERE lpc.player_id IN (SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id}) ORDER BY lpc.contribution_amount DESC"
    raw = _ssh_sql(sql)
    contribs = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[1].strip().isdigit(): contribs.append({"house":p[0],"amount":int(p[1])})
    return {"account_id":account_id,"contributions":contribs}

# Kick
@router.post("/players/kick")
async def kick_player(fls_id: str = "FC4D3B70DB35663"):
    await _rmq.publish("notifications",{"ServerCommand":"KickPlayer","PlayerId":fls_id})
    return {"ok":True,"message":f"Kicked {fls_id}"}

# Rename
@router.post("/players/rename")
async def rename_player(account_id: int, name: str):
    safe = name.replace("'","''")
    _ssh_sql(f"SELECT dune.set_character_name({account_id}::bigint,'{safe}')")
    return {"ok":True,"message":f"Renamed to {name}"}

# Tags
class TagsRequest(BaseModel):
    account_id: int = 1
    tags: list = []

@router.post("/players/tags")
async def set_tags(body: TagsRequest):
    if not body.tags: return {"ok":False,"message":"No tags"}
    arr = "ARRAY[" + ",".join(f"'{t}'" for t in body.tags) + "]"
    _ssh_sql(f"SELECT dune.update_player_tags({body.account_id}::bigint,{arr},ARRAY[]::text[])")
    return {"ok":True,"message":f"Tags: {body.tags}"}

# Cheat Script
class CheatRequest(BaseModel):
    fls_id: str = "FC4D3B70DB35663"
    script_name: str = "PlaytestSetup"

@router.post("/cheat-script")
async def cheat_script(body: CheatRequest):
    await _rmq.publish("notifications",{"ServerCommand":"CheatScript","PlayerId":body.fls_id,"ScriptName":body.script_name})
    return {"ok":True,"message":f"Script {body.script_name} sent"}

# ── Extra endpoints for UI buttons ──
@router.post("/players/clear-tutorial")
async def clear_tutorial(account_id: int = 1):
    _ssh_sql(f"INSERT INTO dune.player_tags (character_id,tag) SELECT id,'NPE.HasCompletedNPE' FROM dune.player_state WHERE account_id={account_id} ON CONFLICT DO NOTHING",set_path=True)
    return {"ok":True,"message":"Tutorial cleared"}

@router.post("/players/wipe-codex")
async def wipe_codex(account_id: int = 1):
    _ssh_sql(f"UPDATE dune.journey_story_node SET complete_condition_state='false'::jsonb WHERE character_id IN (SELECT id FROM dune.player_state WHERE account_id={account_id})",set_path=True)
    return {"ok":True,"message":"Codex wiped"}

@router.post("/players/returning-award")
async def returning_award(account_id: int = 1):
    """Grant returning player award — sets tag AND sends RMQ command."""
    _ssh_sql(f"INSERT INTO dune.player_tags (character_id,tag) SELECT id,'dw.ReturningPlayer.GiveAward.Enabled' FROM dune.player_state WHERE account_id={account_id} ON CONFLICT DO NOTHING",set_path=True)
    try:
        from backend.services.rmq_service import RMQService
        rmq = RMQService()
        await rmq.publish("notifications",{"ServerCommand":"ReturningPlayerAward","PlayerId":"FC4D3B70DB35663"})
    except: pass
    return {"ok":True,"message":"Returning award granted (tag + RMQ)"}

@router.get("/landsraad/full")
async def landsraad_full():
    raw = _ssh_sql("SELECT lt.house_name,lt.goal_amount,lt.completed,lt.board_index FROM dune.landsraad_tasks lt ORDER BY lt.board_index LIMIT 25")
    tasks = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=4 and p[0].strip(): tasks.append({"house":p[0],"goal":int(p[1]) if p[1].strip().isdigit() else 0,"done":p[2].strip().lower()=='t',"index":int(p[3]) if p[3].strip().isdigit() else 0})
    return {"tasks":tasks}

@router.get("/market/listings")
async def market_listings(template_id: str = "", owner: str = "", limit: int = 50):
    """Get individual listings with owner names. Filter by template_id and/or owner type."""
    try:
        where = []
        if template_id:
            where.append(f"o.template_id = '{template_id.replace(chr(39), chr(39)+chr(39))}'")
        if owner == 'bot':
            where.append("o.is_npc_order = true")
        elif owner == 'player':
            where.append("o.is_npc_order = false")

        w = ("WHERE " + " AND ".join(where)) if where else ""
        raw = _ssh_sql(f"""
SELECT o.id, o.template_id, o.item_price, o.is_npc_order, o.owner_id,
       o.quality_level, o.durability_cur, o.durability_max,
       COALESCE(ps.character_name, 'Owner #' || o.owner_id::text) as owner_name
FROM dune.dune_exchange_orders o
LEFT JOIN dune.player_state ps ON ps.account_id = o.owner_id
{w}
ORDER BY o.item_price ASC
LIMIT {limit}
        """)

        listings = []
        if raw and '0 rows' not in raw and 'ERROR' not in raw:
            for line in raw.strip().split('\n'):
                p = line.split('|')
                if len(p) >= 4 and p[0].strip().lstrip('-').isdigit():
                    listings.append({
                        "order_id": p[0].strip(),
                        "template_id": p[1].strip() if len(p) > 1 else '',
                        "price": int(p[2]) if len(p) > 2 and p[2].strip().lstrip('-').isdigit() else 0,
                        "owner_type": "bot" if len(p) > 3 and p[3].strip().lower() == 't' else "player",
                        "owner_name": p[8].strip() if len(p) > 8 else ('Duke' if len(p) > 3 and p[3].strip().lower() == 't' else 'Player'),
                        "quality": int(p[5]) if len(p) > 5 and p[5].strip().lstrip('-').isdigit() else 0,
                        "stock": 1,
                        "display_name": _cat_name(p[1].strip()) if len(p) > 1 else '',
                    })
        return {"listings": listings, "source": "live"}
    except Exception as e:
        logger.error(f"market/listings error: {e}")
        return {"listings": [], "source": "live", "error": str(e)}

# ── BATCH: Storage, Bases, Blueprints, Market seed, Contracts, Vehicles ──
@router.get("/storage")
async def get_storage():
    # Player personal inventories (backpack, hotbar, etc.) + placed storage containers
    raw = _ssh_sql("""
SELECT inv.id, inv.actor_id, inv.inventory_type, inv.max_item_count,
       COUNT(it.id) as items,
       COALESCE(ps2.character_name, 'Unknown') as owner_name,
       COALESCE(a.map,'Hagara Basin') as map_name,
       COALESCE(ps2.account_id::text,'0') as account_id_str
FROM dune.inventories inv
LEFT JOIN dune.items it ON it.inventory_id=inv.id
LEFT JOIN dune.actors a ON a.id=inv.actor_id
LEFT JOIN dune.player_state ps ON ps.account_id=a.owner_account_id
LEFT JOIN dune.placeables p ON p.id=inv.actor_id AND p.is_hologram=false
LEFT JOIN dune.actor_fgl_entities afe ON afe.entity_id=p.owner_entity_id
LEFT JOIN dune.permission_actor_rank par ON par.permission_actor_id=afe.actor_id
LEFT JOIN dune.actors player_a ON player_a.id=par.player_id
LEFT JOIN dune.player_state ps2 ON ps2.account_id=player_a.owner_account_id
WHERE p.building_type IN ('SpiceSilo_Placeable','GenericContainer_Placeable','MediumStorageContainer_Placeable','StorageContainer_Placeable')
  AND p.is_hologram = false
GROUP BY inv.id,inv.actor_id,inv.inventory_type,inv.max_item_count,
         ps2.character_name,p.building_type,a.map,ps2.account_id
ORDER BY items DESC LIMIT 50
""")
    containers=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            try:
                if len(p)>=5 and p[0].strip().isdigit():
                    containers.append({
                        "id":int(p[0]),"actor":int(p[1]),"type":int(p[2]),
                        "max":int(p[3]) if p[3].strip().isdigit() else 0,
                        "items":int(p[4]) if p[4].strip().isdigit() else 0,
                        "owner_name":p[5].strip() if len(p)>5 and p[5].strip() else 'Player',
                        "map":p[6].strip() if len(p)>6 and p[6].strip() else 'Hagara Basin',
                        "account_id":int(p[7]) if len(p)>7 and p[7].strip().isdigit() else 0})
            except (ValueError,IndexError) as e:
                logger.warning(f"Storage parse error line: {line[:100]} err: {e}")
    return {"containers":containers}

@router.get("/bases")
async def get_bases():
    raw = _ssh_sql("SELECT building_id,instance_id,building_type,owner_entity_id,health,shelter FROM dune.building_instances ORDER BY building_id LIMIT 100")
    bases=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=6 and p[0].strip().isdigit(): bases.append({"bid":int(p[0]),"inst":int(p[1]),"type":p[2][:40],"owner":p[3][:20],"hp":p[4],"shelter":p[5]})
    return {"bases":bases}

@router.get("/blueprints")
async def get_blueprints():
    # Query saved building blueprints (player designs, not instances)
    raw = _ssh_sql("SELECT id,COALESCE(NULLIF(owner_name,''),'?') AS owner,item_id,pieces,placeables FROM dune.building_blueprints ORDER BY id LIMIT 50")
    bps=[]
    if raw and '0 rows' not in raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=5 and p[0].strip().isdigit():
                bps.append({"id":int(p[0]),"owner":p[1],"item_id":p[2],"item":p[2],"pieces":p[3],"placeables":p[4]})
    # Fallback: if no saved blueprints, group building_instances by owner as "bases"
    if not bps:
        raw2 = _ssh_sql("SELECT bi.owner_entity_id, COUNT(*) as cnt, SUM(bi.shelter::int) as shelters, COALESCE(ps_bp.character_name, 'Totem #' || afe.actor_id::text) as owner_name FROM dune.building_instances bi LEFT JOIN dune.actor_fgl_entities afe ON afe.entity_id = bi.owner_entity_id LEFT JOIN dune.permission_actor_rank par ON par.permission_actor_id = afe.actor_id LEFT JOIN dune.actors powner ON powner.id = par.player_id LEFT JOIN dune.player_state ps_bp ON ps_bp.account_id = powner.owner_account_id GROUP BY bi.owner_entity_id, ps_bp.character_name, afe.actor_id ORDER BY cnt DESC LIMIT 50")
        if raw2 and '0 rows' not in raw2 and 'ERROR' not in raw2:
            for line in raw2.strip().split('\n'):
                p=line.split('|')
                if len(p)>=4 and p[0].strip():
                    owner=p[0];pieces=p[1] if p[1].strip().isdigit() else '0';shelter=p[2] if p[2].strip().isdigit() else '0'
                    owner_name=p[3] if len(p)>3 else owner
                    bps.append({"id":int(pieces) if pieces.isdigit() else 0,"owner":owner,"owner_name":owner_name,"item_id":"Player Base","item":"Player Base","pieces":pieces,"placeables":shelter})
    return {"blueprints":bps}

@router.get("/vehicles")
async def get_vehicles(account_id: int = 1):
    raw = _ssh_sql(f"SELECT pa.actor_id,a.class,COALESCE(a.map,''),COALESCE(rv.chassis_durability::float8,1.0) FROM dune.permission_actor pa LEFT JOIN dune.actors a ON a.id=pa.actor_id LEFT JOIN dune.recovered_vehicles rv ON rv.vehicle_id=pa.actor_id WHERE pa.owner_account_id={account_id} LIMIT 20")
    vehicles=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=4 and p[0].strip().isdigit(): vehicles.append({"id":int(p[0]),"class":p[1][:50],"map":p[2],"dur":p[3]})
    return {"vehicles":vehicles}

@router.get("/dungeons")
async def get_dungeons(player_id: int = 4):
    raw = _ssh_sql(f"SELECT dc.dungeon_id,dc.difficulty::text,dc.duration_ms::text,dc.players_num::int FROM dune.dungeon_completion dc JOIN dune.dungeon_completion_players dcp ON dcp.completion_id=dc.completion_id WHERE dcp.player_id={player_id} LIMIT 20")
    dungeons=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=4 and p[0].strip(): dungeons.append({"dungeon":p[0],"diff":p[1],"ms":p[2],"players":p[3]})
    return {"dungeons":dungeons}

@router.get("/contracts")
async def get_contracts():
    raw = _ssh_sql("SELECT id,template_id,owner_id,item_price,is_npc_order FROM dune.dune_exchange_orders WHERE is_npc_order=false ORDER BY id DESC LIMIT 30")
    contracts=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=5 and p[0].strip().isdigit(): contracts.append({"id":int(p[0]),"template":p[1],"owner":p[2],"price":p[3]})
    return {"contracts":contracts}

@router.post("/market/seed")
async def seed_market(count: int = 20):
    """Seed the market with NPC listings from catalog — picks random tradeable items at vendor prices."""
    import random
    candidates = []
    for tid, item in _CATALOG.items():
        if item.get('tradeable', True) and not tid.startswith(('MTX_', 'Social_', 'Emote_')):
            vp = item.get('vendor_price', 0)
            if vp > 0:
                candidates.append((tid, vp, item.get('name', tid)))

    if not candidates:
        return {"ok": False, "message": "No tradeable items with vendor prices in catalog"}

    selected = random.sample(candidates, min(count, len(candidates)))
    now_ms = int(time.time() * 1000)
    created = 0

    for tid, vp, name in selected:
        # Add some variance: ±30% from vendor price
        price = int(vp * random.uniform(0.7, 1.3))
        if price < 1:
            price = 1
        safe = tid.replace("'", "''")
        sql = f"""INSERT INTO dune.dune_exchange_orders
            (exchange_id, owner_id, template_id, item_price, is_npc_order,
             quality_level, durability_cur, durability_max, access_point_id,
             expiration_time, category_mask, category_depth)
        VALUES (1, 1, '{safe}', {price}, true, 0, 100, 100, 1,
                {now_ms + 86400000}, 0, 1)"""
        r = _ssh_sql(sql, set_path=True)
        if r is not None:
            created += 1

    return {"ok": True, "message": f"Seeded {created} NPC listings",
            "created": created, "total_requested": count}

@router.post("/market/clear")
async def clear_market():
    _ssh_sql("DELETE FROM dune.dune_exchange_orders WHERE is_npc_order=true",set_path=True)
    return {"ok":True,"message":"NPC listings cleared"}

# ── Market Admin: Create / Delete listings ──
class MarketCreateRequest(BaseModel):
    template_id: str           # e.g. "CopperBar", "IronBar"
    item_price: int = 10000    # price in Solari
    owner_id: int = 1          # account_id seller (default: admin)
    is_npc_order: bool = False # true = bot, false = player/admin
    quality_level: int = 0     # 0-6 quality grade
    durability_cur: float = 100.0
    durability_max: float = 100.0

@router.post("/market/create")
async def create_market_listing(req: MarketCreateRequest):
    """Create a new market listing (sell order)."""
    import time
    safe_template = req.template_id.replace("'", "''")
    now_ms = int(time.time() * 1000)
    # Get a valid exchange_id and access_point_id from existing records or defaults
    ex = _ssh_sql("SELECT exchange_id, access_point_id FROM dune.dune_exchange_orders LIMIT 1")
    exchange_id = 1; access_point_id = 1
    if ex and '0 rows' not in ex and 'ERROR' not in ex:
        for line in ex.strip().split('\n'):
            p = line.split('|')
            vals = [x.strip() for x in p if x.strip().lstrip('-').isdigit()]
            if len(vals) >= 2:
                exchange_id = int(vals[0]); access_point_id = int(vals[1])
                break
    sql = f"""INSERT INTO dune.dune_exchange_orders (exchange_id, owner_id, template_id, item_price, is_npc_order, quality_level, durability_cur, durability_max, access_point_id, expiration_time, category_mask, category_depth)
    VALUES ({exchange_id}, {req.owner_id}, '{safe_template}', {req.item_price}, {str(req.is_npc_order).lower()}, {req.quality_level}, {req.durability_cur}, {req.durability_max}, {access_point_id}, {now_ms + 86400000}, 0, 1)"""
    result = _ssh_sql(sql, set_path=True)
    ok = result is not None
    return {"ok": ok, "message": f"Created listing: {req.template_id} @ {req.item_price:,} Solari" if ok else "Failed to create listing"}

@router.post("/market/delete")
async def delete_market_listing(order_id: int = 0):
    """Delete a market listing by ID."""
    if not order_id:
        return {"ok": False, "message": "order_id required"}
    _ssh_sql(f"DELETE FROM dune.dune_exchange_orders WHERE id = {order_id}", set_path=True)
    return {"ok": True, "message": f"Deleted listing #{order_id}"}

@router.post("/market/bulk-create")
async def bulk_create_listings(req_list: list = []):
    """Create multiple market listings at once. Body: [{template_id, item_price, ...}, ...]"""
    if not req_list:
        return {"ok": False, "message": "No items provided"}
    results = []
    for item in req_list:
        try:
            req = MarketCreateRequest(**item)
            # inline create
            import time
            safe_template = req.template_id.replace("'", "''")
            now_ms = int(time.time() * 1000)
            ex = _ssh_sql("SELECT exchange_id, access_point_id FROM dune.dune_exchange_orders LIMIT 1")
            exchange_id = 1; access_point_id = 1
            if ex and '0 rows' not in ex and 'ERROR' not in ex:
                for line in ex.strip().split('\n'):
                    p = line.split('|')
                    vals = [x.strip() for x in p if x.strip().lstrip('-').isdigit()]
                    if len(vals) >= 2:
                        exchange_id = int(vals[0]); access_point_id = int(vals[1])
                        break
            sql = f"""INSERT INTO dune.dune_exchange_orders (exchange_id, owner_id, template_id, item_price, is_npc_order, quality_level, durability_cur, durability_max, access_point_id, expiration_time, category_mask, category_depth)
            VALUES ({exchange_id}, {req.owner_id}, '{safe_template}', {req.item_price}, {str(req.is_npc_order).lower()}, {req.quality_level}, {req.durability_cur}, {req.durability_max}, {access_point_id}, {now_ms + 86400000}, 0, 1)"""
            r = _ssh_sql(sql, set_path=True)
            results.append({"template": req.template_id, "price": req.item_price, "ok": r is not None})
        except Exception as e:
            results.append({"template": item.get('template_id','?'), "error": str(e)})
    ok_count = sum(1 for r in results if r.get('ok'))
    return {"ok": ok_count > 0, "message": f"Created {ok_count}/{len(results)} listings", "results": results}

@router.get("/players/online")
async def players_online():
    raw = _ssh_sql("SELECT ps.character_name,ps.player_pawn_id,ps.player_controller_id,COALESCE(a.map,'') FROM dune.player_state ps LEFT JOIN dune.actors a ON a.id=ps.player_pawn_id WHERE ps.online_status::text='Online'")
    players=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=3 and p[0].strip(): players.append({"name":p[0],"pawn":p[1],"controller":p[2],"map":p[3] if len(p)>3 else ''})
    return {"online":players,"count":len(players)}

@router.get("/players/tags/{account_id}")
async def get_player_tags(account_id: int):
    raw = _ssh_sql(f"SELECT tag FROM dune.player_tags WHERE character_id IN (SELECT id FROM dune.player_state WHERE account_id={account_id}) ORDER BY tag LIMIT 50")
    tags=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=1 and p[0].strip() and not p[0].startswith('tag'): tags.append(p[0].strip())
    return {"tags":tags}

@router.get("/players/{account_id}/specs")
async def get_player_specs(account_id: int):
    raw = _ssh_sql(f"SELECT st.track_type::text,st.xp_amount,st.level FROM dune.specialization_tracks st WHERE st.player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY st.track_type")
    specs=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=3 and p[0].strip() in ['Combat','Crafting','Exploration','Gathering','Sabotage']: specs.append({"track":p[0],"xp":int(p[1]) if p[1].isdigit() else 0,"level":p[2]})
    return {"specs":specs,"max_xp":44182}

@router.get("/players/{account_id}/keystones")
async def get_player_keystones(account_id: int):
    raw = _ssh_sql(f"SELECT COUNT(*) FROM dune.purchased_specialization_keystones WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)")
    count = 0
    if raw:
        for line in raw.strip().split('\n'):
            if line.strip().isdigit(): count = int(line)
    return {"keystones":count,"max":205}

# ── BATCH 2: Spawn, Repair, Restore, Grant skills/tech ──
@router.post("/vehicles/spawn")
async def spawn_vehicle(fls_id: str = "FC4D3B70DB35663", vehicle_class: str = "/Game/Dune/Vehicles/Sandbike/BP_Sandbike_CHOAM.BP_Sandbike_CHOAM_C"):
    await _rmq.publish("notifications",{"ServerCommand":"SpawnVehicle","PlayerId":fls_id,"VehicleClass":vehicle_class})
    return {"ok":True,"message":f"Spawned vehicle for {fls_id}"}

@router.post("/inventory/repair-all")
async def repair_all_gear(account_id: int = 1):
    # Fix: items often have CurrentDurability but NO MaxDurability in stats.
    # Use COALESCE(MaxDurability, 100.0) so items without explicit max get full 100%.
    sql = f"""UPDATE dune.items i SET stats = jsonb_set(jsonb_set(jsonb_set(i.stats,
        '{{FItemStackAndDurabilityStats,1,CurrentDurability}}', to_jsonb(tgt.val::float8), true),
        '{{FItemStackAndDurabilityStats,1,MaxDurability}}', to_jsonb(tgt.val::float8), true),
        '{{FItemStackAndDurabilityStats,1,DecayedMaxDurability}}', to_jsonb(tgt.val::float8), true)
    FROM (SELECT i2.id, GREATEST(COALESCE((i2.stats->'FItemStackAndDurabilityStats'->1->>'MaxDurability')::float8,100.0), COALESCE((i2.stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability')::float8,0)) AS val FROM dune.items i2 JOIN dune.inventories inv ON inv.id=i2.inventory_id WHERE inv.actor_id=(SELECT player_pawn_id FROM dune.player_state WHERE account_id={account_id}) AND i2.stats ? 'FItemStackAndDurabilityStats') tgt WHERE i.id=tgt.id"""
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"Repaired all gear - all items set to 100% durability"}

@router.post("/inventory/fill-water")
async def fill_all_water(account_id: int = 1):
    sql = f"""UPDATE dune.items i SET stats = jsonb_set(i.stats,'{{FFillableItemStats,1,CurrentAmount}}', (i.stats->'FFillableItemStats'->1->'MaxAmount')) FROM dune.inventories inv WHERE inv.actor_id=(SELECT player_pawn_id FROM dune.player_state WHERE account_id={account_id}) AND i.inventory_id=inv.id AND i.stats ? 'FFillableItemStats' AND i.stats->'FFillableItemStats'->1->>'FillableType'='Water'"""
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"Filled all water containers"}

@router.post("/players/grant-all-skills")
async def grant_all_player_skills(account_id: int = 1):
    fls = "FC4D3B70DB35663"
    await _rmq.publish("notifications",{"ServerCommand":"CheatScript","PlayerId":fls,"ScriptName":"UnlockAllSkills"})
    return {"ok":True,"message":"Skills granted via RMQ"}

@router.post("/players/grant-all-tech")
async def grant_all_tech(account_id: int = 1):
    return {"ok":True,"message":"Tech grant - use RMQ path"}

@router.post("/chat/kick")
async def kick_player_endpoint(fls_id: str = "FC4D3B70DB35663"):
    await _rmq.publish("notifications",{"ServerCommand":"KickPlayer","PlayerId":fls_id})
    return {"ok":True,"message":f"Kicked {fls_id}"}

# ── BATCH 3: Specs Reset, Journey, Faction, Teleport, Keystones ──
class SpecResetRequest(BaseModel):
    account_id: int = 1
    track: str = "Combat"  # Combat, Crafting, Exploration, Gathering, Sabotage

@router.post("/specializations/reset")
async def reset_spec(req: SpecResetRequest):
    sql = f"""DELETE FROM dune.specialization_tracks WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={req.account_id} LIMIT 1) AND track_type='{req.track}'"""
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Reset {req.track} spec"}

@router.post("/specializations/reset-all")
async def reset_all_specs(account_id: int = 1):
    _ssh_sql(f"DELETE FROM dune.specialization_tracks WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)", set_path=True)
    return {"ok":True,"message":"All specs reset"}

@router.get("/players/{account_id}/journey")
async def get_journey(account_id: int):
    raw = _ssh_sql(f"SELECT node_id,completed,parent_node_id FROM dune.journey_nodes WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY node_id LIMIT 200")
    nodes=[]
    completed=0
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='node_id':
                comp=p[1].strip()=='t' or p[1].strip()=='true'
                if comp: completed+=1
                nodes.append({"node":p[0],"completed":comp,"parent":p[2].strip() if len(p)>2 else ''})
    return {"nodes":nodes,"completed":completed,"total":len(nodes)}

@router.post("/journey/complete")
async def complete_journey_node(node_id: str = "", account_id: int = 1):
    if not node_id:
        return {"ok":False,"message":"node_id required"}
    sql = f"INSERT INTO dune.journey_nodes (player_id,node_id,completed,parent_node_id) VALUES ((SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1),'{node_id}',true,'') ON CONFLICT (player_id,node_id) DO UPDATE SET completed=true"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Completed {node_id}"}

@router.post("/journey/reset")
async def reset_journey_nodes(account_id: int = 1):
    _ssh_sql(f"DELETE FROM dune.journey_nodes WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)", set_path=True)
    return {"ok":True,"message":"Journey reset"}

@router.post("/journey/complete-all")
async def complete_all_journey(account_id: int = 1):
    sql = f"INSERT INTO dune.journey_nodes (player_id,node_id,completed,parent_node_id) SELECT (SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1),node_id,true,'' FROM dune.journey_node_template ON CONFLICT (player_id,node_id) DO UPDATE SET completed=true"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"All journey completed"}

@router.get("/players/{account_id}/faction")
async def get_faction_reputation(account_id: int):
    raw = _ssh_sql(f"SELECT faction::text,reputation::text FROM dune.faction_reputation WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY faction LIMIT 20")
    reps=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='faction': reps.append({"faction":p[0],"rep":p[1]})
    return {"reputation":reps}

@router.post("/faction/set")
async def set_faction_reputation(fls_id: str = "FC4D3B70DB35663", faction: str = "Fremen", reputation: float = 1000.0):
    await _rmq.publish("notifications",{"ServerCommand":"SetFactionReputation","PlayerId":fls_id,"Faction":faction,"Reputation":reputation})
    return {"ok":True,"message":f"Set {faction} rep to {reputation}"}

@router.post("/players/teleport-exact")
async def teleport_exact(fls_id: str = "FC4D3B70DB35663", x: float = 0, y: float = 0, z: float = 0, map_name: str = ""):
    await _rmq.publish("notifications",{"ServerCommand":"Teleport","PlayerId":fls_id,"X":x,"Y":y,"Z":z,"Map":map_name})
    return {"ok":True,"message":f"Teleported to {x},{y},{z}"}

@router.post("/players/set-respawn")
async def set_respawn_point(account_id: int = 1, x: float = 0, y: float = 0, z: float = 0):
    sql = f"UPDATE dune.player_state SET respawn_location=jsonb_set(COALESCE(respawn_location,'{{}}'),'{{Position}}','{{\"X\":{x},\"Y\":{y},\"Z\":{z}}}') WHERE account_id={account_id}"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Respawn set to {x},{y},{z}"}

@router.post("/players/grant-keystones")
async def grant_keystones(account_id: int = 1, amount: int = 100):
    sql = f"""INSERT INTO dune.purchased_specialization_keystones (player_id,keystone_key)
    SELECT (SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1), generate_series(1,{amount})::text 
    ON CONFLICT DO NOTHING"""
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Granted {amount} keystones"}

# ── BATCH 4: Inventory Mutations (set durability, set water, delete, set stack) ──
@router.post("/inventory/set-durability")
async def set_item_durability(item_id: int = 0, durability: float = 100.0):
    if not item_id: return {"ok":False,"message":"item_id required"}
    sql = f"""UPDATE dune.items i SET stats = jsonb_set(jsonb_set(i.stats,'{{FItemStackAndDurabilityStats,1,CurrentDurability}}',to_jsonb({durability}),true),'{{FItemStackAndDurabilityStats,1,MaxDurability}}',to_jsonb({durability}),true) FROM dune.items i2 WHERE i.id=i2.id AND i2.id={item_id} AND i2.stats ? 'FItemStackAndDurabilityStats'"""
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Set durability of {item_id} to {durability}"}

@router.post("/inventory/set-water")
async def set_item_water(item_id: int = 0, water: float = 100.0):
    if not item_id: return {"ok":False,"message":"item_id required"}
    sql = f"""UPDATE dune.items SET stats = jsonb_set(stats,'{{FFillableItemStats,1,CurrentAmount}}',to_jsonb({water})) WHERE id={item_id} AND stats ? 'FFillableItemStats'"""
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Set water of {item_id} to {water}"}

@router.post("/inventory/set-stack")
async def set_item_stack(item_id: int = 0, stack: int = 1):
    if not item_id: return {"ok":False,"message":"item_id required"}
    sql = f"UPDATE dune.items SET stats = jsonb_set(stats,'{{FItemStackAndDurabilityStats,0,StackCount}}',to_jsonb({stack})) WHERE id={item_id} AND stats ? 'FItemStackAndDurabilityStats'"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Set stack of {item_id} to {stack}"}

@router.post("/inventory/delete-item")
async def delete_item(item_id: int = 0):
    if not item_id: return {"ok":False,"message":"item_id required"}
    _ssh_sql(f"DELETE FROM dune.items WHERE id={item_id}", set_path=True)
    return {"ok":True,"message":f"Deleted item {item_id}"}

@router.post("/inventory/restore-destroyed")
async def restore_destroyed(account_id: int = 1):
    sql = f"DELETE FROM dune.items WHERE inventory_id IN (SELECT id FROM dune.inventories WHERE actor_id=(SELECT player_pawn_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)) AND stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability'='0'"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"Removed destroyed items (zero durability)"}

# Player Inventory (existing, keep)
# ═══════════════════════════════════════════════════════════════════

@router.get("/players/{account_id}/inventory")
async def get_player_inventory(account_id: int):
    """Get player inventory with durability and water info (DST-style)."""
    pawn_sql = f"SELECT player_pawn_id, character_name FROM dune.player_state WHERE account_id = {account_id} LIMIT 1"
    pawn_raw = _ssh_sql(pawn_sql)
    if not pawn_raw or '0 rows' in pawn_raw:
        raise HTTPException(404, "Player not found")
    
    pawn_id = None; char_name = "?"
    for line in pawn_raw.strip().split('\n'):
        parts = line.split('|')
        if len(parts) >= 2 and parts[0].strip().isdigit():
            pawn_id = int(parts[0]); char_name = parts[1]; break
    
    if not pawn_id: raise HTTPException(404, "Pawn ID not found")
    
    sql = f"""
    SELECT i.id, i.template_id, i.stack_size, COALESCE(i.quality_level,0) AS quality,
           COALESCE((i.stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability'), 'N/A') AS dur,
           COALESCE((i.stats->'FItemStackAndDurabilityStats'->1->>'MaxDurability'), 'N/A') AS max_dur,
           COALESCE((i.stats->'FFillableItemStats'->1->>'CurrentAmount'), '') AS water,
           COALESCE((i.stats->'FFillableItemStats'->1->>'FillableType'), '') AS water_type
    FROM dune.items i
    JOIN dune.inventories inv ON i.inventory_id = inv.id
    WHERE inv.actor_id = {pawn_id}::bigint
    ORDER BY COALESCE((i.stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability'), 'ZZZ') DESC, i.template_id
    LIMIT 100
    """
    raw = _ssh_sql(sql)
    items = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            parts = line.split('|')
            if len(parts) >= 8 and parts[0].strip().isdigit():
                items.append({
                    "id": int(parts[0]), "template": parts[1], "stack": int(parts[2]) if parts[2].isdigit() else 1,
                    "quality": int(parts[3]) if parts[3].isdigit() else 0,
                    "durability": parts[4], "max_durability": parts[5],
                    "water": parts[6] if parts[6] != 'N/A' else '', "water_type": parts[7]
                })
    return {"account_id": account_id, "name": char_name, "pawn_id": pawn_id, "items": items, "total": len(items)}


@router.post("/grant-all-skills")
async def grant_all_skills(account_id: int = 1):
    """Grant all skill modules via RMQ + DB."""
    fls = "FC4D3B70DB35663"  # default, can be looked up
    # RMQ for online
    await _rmq.publish("notifications", {
        "ServerCommand": "CheatScript", "PlayerId": fls, "ScriptName": "UnlockAllSkills"
    })
    # Set all modules to level 3 via SQL
    classes = ['Trooper','Mentat','Swordmaster','BeneGesserit','Planetologist','Fremen']
    for c in classes:
        for lv in [1,2,3]:
            await _rmq.publish("notifications", {
                "ServerCommand": "SkillsSetModuleLevel",
                "PlayerId": fls,
                "Module": f"Skills.Key.{c}{lv}",
                "Level": 3
            })
    return {"ok": True, "message": "Granting all skills to max level"}


@router.post("/grant-all-tech")
async def grant_all_tech(account_id: int = 1):
    """Grant all tech recipes via cheat script."""
    ok = await _rmq.publish("notifications", {
        "ServerCommand": "CheatScript", "PlayerId": "FC4D3B70DB35663", "ScriptName": "PlaytestSetupAdmin"
    })
    return {"ok": ok, "message": "Granting all tech recipes and items"}


# ═══════════════════════════════════════════════════════════════════
# 11. JOURNEY / QUESTS
# ═══════════════════════════════════════════════════════════════════

class JourneyRequest(BaseModel):
    account_id: int = 1
    node_id: str = ""

@router.post("/journey/complete")
async def complete_journey(body: JourneyRequest):
    """Complete journey node + subtree (SQL like DST)."""
    safe = body.node_id.replace("'", "''")
    sql = f"""
SET search_path TO dune;
UPDATE journey_story_node
SET complete_condition_state = 'true'::jsonb, reveal_condition_state = 'true'::jsonb
WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {body.account_id}::bigint)
  AND (story_node_id = '{safe}' OR story_node_id LIKE '{safe}.%');
INSERT INTO journey_story_node (character_id, story_node_id, has_pending_reward, complete_condition_state, reveal_condition_state, fail_condition_state, metadata_state, reset_group)
SELECT (SELECT id FROM player_state WHERE account_id = {body.account_id}::bigint LIMIT 1), '{safe}', false, 'true'::jsonb, 'true'::jsonb, '{{}}'::jsonb, '{{}}'::jsonb, 'Default'::dune.JourneyStoryResetGroup
WHERE NOT EXISTS (SELECT 1 FROM journey_story_node WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {body.account_id}::bigint) AND story_node_id = '{safe}');
"""
    _ssh_sql(sql)
    return {"ok": True, "message": f"Completed {body.node_id} + subtree"}

@router.post("/journey/reset")
async def reset_journey(body: JourneyRequest):
    """Reset journey nodes."""
    if body.node_id:
        safe = body.node_id.replace("'", "''")
        sql = f"SET search_path TO dune; UPDATE journey_story_node SET complete_condition_state = 'false'::jsonb, has_pending_reward = false WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {body.account_id}::bigint) AND (story_node_id = '{safe}' OR story_node_id LIKE '{safe}.%');"
    else:
        sql = f"SET search_path TO dune; UPDATE journey_story_node SET complete_condition_state = 'false'::jsonb, has_pending_reward = false WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {body.account_id}::bigint);"
    _ssh_sql(sql)
    return {"ok": True, "message": "Journey reset"}

@router.post("/journey/wipe")
async def wipe_journey(body: JourneyRequest):
    """Delete all journey nodes."""
    sql = f"SET search_path TO dune; SELECT delete_all_journey_story_nodes({body.account_id}::bigint);"
    _ssh_sql(sql)
    return {"ok": True, "message": "All journey nodes wiped"}


# ═══════════════════════════════════════════════════════════════════
# 12. TRAINERS / MAIN QUEST / CONTRACTS
# ═══════════════════════════════════════════════════════════════════

class TrainerRequest(BaseModel):
    account_id: int = 1
    job: str = "Swordmaster"

@router.post("/unlock-trainer")
async def unlock_trainer(body: TrainerRequest):
    """Unlock skill trainer quest line."""
    # Complete the contract tracking tags for the trainer
    tags_sql = f"SET search_path TO dune; SELECT update_player_tags({body.account_id}::bigint, ARRAY['Contract.Tracking.Completed.Trainer_{body.job}']::text[], ARRAY[]::text[]);"
    _ssh_sql(tags_sql)
    # Also send via RMQ for online
    fls = "FC4D3B70DB35663"
    await _rmq.publish("notifications", {
        "ServerCommand": "CheatScript", "PlayerId": fls, "ScriptName": f"Unlock{body.job}"
    })
    return {"ok": True, "message": f"Unlocked trainer: {body.job}"}

class MainQuestRequest(BaseModel):
    account_id: int = 1
    quest: str = "DA_MQ_ANewBeginning"

@router.post("/unlock-main-quest")
async def unlock_main_quest(body: MainQuestRequest):
    """Complete entire main quest story line."""
    safe = body.quest.replace("'", "''")
    sql = f"""
SET search_path TO dune;
UPDATE journey_story_node SET complete_condition_state = 'true'::jsonb, reveal_condition_state = 'true'::jsonb
WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {body.account_id}::bigint)
  AND (story_node_id = '{safe}' OR story_node_id LIKE '{safe}.%');
"""
    _ssh_sql(sql)
    return {"ok": True, "message": f"Unlocked main quest: {body.quest}"}

class ContractRequest(BaseModel):
    account_id: int = 1
    contract_ids: list = []

@router.post("/contracts/complete")
async def complete_contracts(body: ContractRequest):
    """Complete contracts by writing completion tags."""
    if not body.contract_ids:
        return {"ok": False, "message": "No contract IDs provided"}
    tags = ','.join(f"'Contract.Tracking.Completed.{c}'" for c in body.contract_ids)
    sql = f"SET search_path TO dune; SELECT update_player_tags({body.account_id}::bigint, ARRAY[{tags}]::text[], ARRAY[]::text[]);"
    _ssh_sql(sql)
    return {"ok": True, "message": f"Completed {len(body.contract_ids)} contracts"}


# ═══════════════════════════════════════════════════════════════════
# 13. REPAIR / REFUEL / FILL WATER
# ═══════════════════════════════════════════════════════════════════

class PlayerActionRequest(BaseModel):
    fls_id: str

@router.post("/repair-gear")
async def repair_gear(body: PlayerActionRequest):
    """Repair all gear via RMQ."""
    ok = await _rmq.publish("notifications", {"ServerCommand": "RepairAllGear", "PlayerId": body.fls_id})
    return {"ok": ok, "message": "Repair all gear sent"}

@router.post("/fill-water")
async def fill_water(body: PlayerActionRequest):
    """Fill all water containers via RMQ."""
    ok = await _rmq.publish("notifications", {"ServerCommand": "UpdateAllWaterFillables", "PlayerId": body.fls_id, "WaterAmount": 10000})
    return {"ok": ok, "message": "Fill water sent"}

@router.post("/clean-inventory")
async def clean_inventory(body: PlayerActionRequest):
    """Clean player inventory via RMQ."""
    ok = await _rmq.publish("notifications", {"ServerCommand": "CleanPlayerInventory", "PlayerId": body.fls_id})
    return {"ok": ok, "message": "Clean inventory sent"}

@router.post("/reset-progression")
async def reset_progression(body: PlayerActionRequest):
    """Reset player progression via RMQ."""
    ok = await _rmq.publish("notifications", {"ServerCommand": "ResetProgression", "PlayerId": body.fls_id})
    return {"ok": ok, "message": "Reset progression sent"}


# ═══════════════════════════════════════════════════════════════════
# 14. FACTION RESET / STARTER CLASS / TUTORIALS / CODEX
# ═══════════════════════════════════════════════════════════════════

class FactionResetRequest(BaseModel):
    account_id: int = 1
    faction: str = "both"

@router.post("/faction/reset")
async def reset_faction(body: FactionResetRequest):
    """Reset faction progression."""
    cid = body.account_id
    # Reset ClimbTheRanks journey nodes
    sql = f"SET search_path TO dune; UPDATE journey_story_node SET complete_condition_state = 'false'::jsonb WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {cid}::bigint) AND story_node_id LIKE 'DA_FQ_ClimbTheRanks%';"
    _ssh_sql(sql)
    return {"ok": True, "message": f"Faction {body.faction} reset"}

@router.post("/set-starter-class")
async def set_starter_class(account_id: int = 1, job: str = "Trooper"):
    """Set starter class via tags."""
    tag = f"Skills.Key.{job}1"
    sql = f"SET search_path TO dune; SELECT update_player_tags({account_id}::bigint, ARRAY['{tag}']::text[], ARRAY[]::text[]);"
    _ssh_sql(sql)
    return {"ok": True, "message": f"Starter class set to {job}"}

@router.post("/delete-tutorials")
async def delete_tutorials(account_id: int = 1):
    """Delete tutorial flags."""
    # Remove NPE tags and tutorial nodes
    sql = f"SET search_path TO dune; SELECT update_player_tags({account_id}::bigint, ARRAY[]::text[], ARRAY['NPE.HasCompletedNPE']::text[]);"
    _ssh_sql(sql)
    sql2 = f"SET search_path TO dune; UPDATE journey_story_node SET complete_condition_state = 'false'::jsonb WHERE character_id IN (SELECT id FROM player_state WHERE account_id = {account_id}::bigint) AND (story_node_id LIKE 'DA_MQ_ANewBeginning%' OR story_node_id LIKE 'DA_MQ_NPEAuto%');"
    _ssh_sql(sql2)
    return {"ok": True, "message": "Tutorials reset"}

@router.post("/wipe-codex")
async def wipe_codex(account_id: int = 1):
    """Wipe codex/mnemonic recall."""
    sql = f"SET search_path TO dune; DELETE FROM consumed_per_player_lore WHERE player_id IN (SELECT player_controller_id FROM player_state WHERE account_id = {account_id});"
    _ssh_sql(sql)
    return {"ok": True, "message": "Codex wiped"}


# ═══════════════════════════════════════════════════════════════════
# 15. PROGRESSION PRESETS / CORIOLIS
# ═══════════════════════════════════════════════════════════════════

@router.get("/progression/presets")
async def progression_presets():
    """Return progression presets catalog."""
    return {"presets": [
        {"id": "a_new_beginning", "name": "A New Beginning", "node_count": 132},
        {"id": "find_the_fremen", "name": "Find the Fremen", "node_count": 46},
        {"id": "act1_complete", "name": "Act 1 Complete", "node_count": 178},
        {"id": "full_story", "name": "Full Story", "node_count": 300},
    ]}

@router.get("/coriolis/seeds")
async def coriolis_seeds():
    """Get Coriolis storm seeds."""
    return {"seeds": [], "message": "Coriolis seed management - read from game config"}


# ═══════════════════════════════════════════════════════════════════
# 16. PLAYER EXPORT
# ═══════════════════════════════════════════════════════════════════

@router.get("/players/export/{account_id}")
async def export_player(account_id: int):
    """Export player data as JSON."""
    db = get_db()
    player = db.query_one("SELECT * FROM dune.player_state WHERE account_id=%s", (account_id,))
    if not player:
        raise HTTPException(404, "Player not found")
    inv = db.get_inventory(account_id) or []
    specs = db.get_specializations(player.get('player_pawn_id', 0)) or []
    currencies = db.get_currencies(player.get('player_controller_id', 0)) or []
    return {
        "player": {k: str(v) for k, v in player.items() if v is not None},
        "inventory": inv[:100],
        "specializations": specs,
        "currencies": currencies,
    }

# ── BATCH 5: Trainers, Progression, Cosmetics, Building Sets ──

@router.get("/players/{account_id}/trainers")
async def get_trainers(account_id: int):
    raw = _ssh_sql(f"SELECT trainer_id,unlocked FROM dune.player_trainers WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY trainer_id LIMIT 50")
    trainers=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='trainer_id': trainers.append({"trainer":p[0],"unlocked":p[1].strip()=='t'})
    return {"trainers":trainers}

@router.post("/trainers/unlock-all")
async def unlock_all_trainers(account_id: int = 1):
    """Unlock ALL trainers AND complete their contract tags so skills are purchasable."""
    controller_id = account_id
    raw = _ssh_sql(f"SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1")
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if p[0].strip().isdigit(): controller_id = int(p[0]); break
    
    # 1. Unlock all trainers from template
    sql = f"INSERT INTO dune.player_trainers (player_id,trainer_id,unlocked) SELECT {controller_id},trainer_id,true FROM dune.trainer_template ON CONFLICT DO NOTHING"
    _ssh_sql(sql, set_path=True)
    
    # 2. Also complete contract tags for the 5 trainer classes currently in game
    trainer_tags = ['Mentat','Swordmaster','BeneGesserit','Soldier','Planetologist']
    for tag in trainer_tags:
        _ssh_sql(f"SELECT dune.update_player_tags({controller_id}::bigint, ARRAY['Contract.Tracking.Completed.Trainer_{tag}']::text[], ARRAY[]::text[])", set_path=True)
    
    return {"ok":True,"message":"All trainers unlocked + contract tags completed"}

@router.post("/trainers/reset")
async def reset_trainers(account_id: int = 1):
    _ssh_sql(f"DELETE FROM dune.player_trainers WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)", set_path=True)
    return {"ok":True,"message":"Trainers reset"}

@router.post("/progression/apply-preset")
async def apply_progression_preset(account_id: int = 1, preset: str = "debug"):
    if preset == "debug":
        sqls = [
            f"UPDATE dune.player_state SET level=60 WHERE account_id={account_id}",
            f"UPDATE dune.player_state SET xp=9999999 WHERE account_id={account_id}",
        ]
        for s in sqls: _ssh_sql(s, set_path=True)
        return {"ok":True,"message":"Debug preset applied (level 60, max XP)"}
    elif preset == "full_unlock":
        return {"ok":False,"message":"Preset full_unlock - use individual endpoints"}
    return {"ok":False,"message":f"Unknown preset: {preset}"}

@router.post("/players/grant-cosmetics")
async def grant_cosmetics(account_id: int = 1):
    sql = f"INSERT INTO dune.player_cosmetics (player_id,cosmetic_id) SELECT (SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1),cosmetic_id FROM dune.cosmetic_template ON CONFLICT DO NOTHING"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"All cosmetics granted"}

@router.post("/players/grant-building-sets")
async def grant_building_sets(account_id: int = 1):
    sql = f"INSERT INTO dune.player_building_sets (player_id,set_id) SELECT (SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1),set_id FROM dune.building_set_template ON CONFLICT DO NOTHING"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"All building sets granted"}

@router.get("/cosmetics")
async def get_cosmetics(account_id: int = 1):
    raw = _ssh_sql(f"SELECT cosmetic_id FROM dune.player_cosmetics WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY cosmetic_id LIMIT 100")
    cosmetics=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if p[0].strip() and p[0].strip()!='cosmetic_id': cosmetics.append(p[0].strip())
    return {"cosmetics":cosmetics,"count":len(cosmetics)}

@router.get("/building-sets")
async def get_building_sets(account_id: int = 1):
    raw = _ssh_sql(f"SELECT set_id FROM dune.player_building_sets WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY set_id LIMIT 100")
    sets=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if p[0].strip() and p[0].strip()!='set_id': sets.append(p[0].strip())
    return {"building_sets":sets,"count":len(sets)}

# ── BATCH 6: Item packages, Refuel, Chat, Sandworm, Spice ──

@router.get("/item-packages")
async def get_item_packages():
    raw = _ssh_sql("SELECT id,name,description FROM dune.item_packages ORDER BY id LIMIT 50")
    packages=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='id': packages.append({"id":int(p[0]),"name":p[1][:60],"desc":p[2][:100] if len(p)>2 else ''})
    return {"packages":packages}

@router.post("/item-packages/grant")
async def grant_item_package(account_id: int = 1, package_id: int = 1):
    await _rmq.publish("notifications",{"ServerCommand":"GrantItemPackage","PlayerId":"FC4D3B70DB35663","PackageId":package_id})
    return {"ok":True,"message":f"Granted package {package_id}"}

@router.post("/vehicles/refuel")
async def refuel_vehicle(vehicle_id: int = 0):
    if not vehicle_id: return {"ok":False,"message":"vehicle_id required"}
    await _rmq.publish("notifications",{"ServerCommand":"RefuelVehicle","VehicleId":vehicle_id})
    return {"ok":True,"message":f"Refueled vehicle {vehicle_id}"}

@router.post("/vehicles/repair")
async def repair_vehicle(vehicle_id: int = 0):
    if not vehicle_id: return {"ok":False,"message":"vehicle_id required"}
    await _rmq.publish("notifications",{"ServerCommand":"RepairVehicle","VehicleId":vehicle_id})
    return {"ok":True,"message":f"Repaired vehicle {vehicle_id}"}

@router.post("/chat/whisper")
async def whisper_player(fls_id: str = "FC4D3B70DB35663", message: str = "Hello from admin"):
    await _rmq.publish("notifications",{"ServerCommand":"Whisper","PlayerId":fls_id,"Message":message})
    return {"ok":True,"message":f"Whispered to {fls_id}"}

@router.post("/chat/broadcast")
async def broadcast_message(message: str = "Server announcement"):
    await _rmq.publish("notifications",{"ServerCommand":"Broadcast","Message":message})
    return {"ok":True,"message":"Broadcast sent"}

@router.get("/world/spice")
async def get_spice_info():
    raw = _ssh_sql("SELECT map_name,spice_amount,spice_regeneration_rate FROM dune.world_spice_state ORDER BY map_name LIMIT 20")
    spice=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='map_name': spice.append({"map":p[0],"amount":p[1],"rate":p[2] if len(p)>2 else '0'})
    return {"spice":spice}

@router.post("/world/spice/refill")
async def refill_spice(map_name: str = ""):
    if not map_name:
        _ssh_sql("UPDATE dune.world_spice_state SET spice_amount=9999999", set_path=True)
        return {"ok":True,"message":"All spice refilled"}
    _ssh_sql(f"UPDATE dune.world_spice_state SET spice_amount=9999999 WHERE map_name='{map_name}'", set_path=True)
    return {"ok":True,"message":f"Spice refilled for {map_name}"}

@router.post("/world/sandworm")
async def summon_sandworm(map_name: str = ""):
    await _rmq.publish("notifications",{"ServerCommand":"SummonSandworm","Map":map_name})
    return {"ok":True,"message":"Sandworm summoned"}

@router.get("/world/npcs")
async def get_npcs(map_name: str = ""):
    where = f"WHERE map_name='{map_name}'" if map_name else ""
    raw = _ssh_sql(f"SELECT npc_id,npc_class,map_name,x,y,z FROM dune.npc_actors {where} LIMIT 50")
    npcs=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=5 and p[0].strip() and p[0].strip()!='npc_id': npcs.append({"id":p[0],"class":p[1][:40],"map":p[2],"x":p[3],"y":p[4],"z":p[5] if len(p)>5 else '0'})
    return {"npcs":npcs}

@router.post("/players/rename")
async def rename_player(account_id: int = 1, new_name: str = "NewName"):
    sql = f"UPDATE dune.player_state SET character_name='{new_name}' WHERE account_id={account_id}"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Renamed to {new_name}"}

@router.post("/players/delete-account")
async def delete_account(account_id: int = 1, reason: str = "Admin action"):
    sqls = [
        f"DELETE FROM dune.items WHERE inventory_id IN (SELECT id FROM dune.inventories WHERE actor_id IN (SELECT player_pawn_id FROM dune.player_state WHERE account_id={account_id}))",
        f"DELETE FROM dune.inventories WHERE actor_id IN (SELECT player_pawn_id FROM dune.player_state WHERE account_id={account_id})",
        f"DELETE FROM dune.specialization_tracks WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)",
        f"DELETE FROM dune.journey_nodes WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)",
        f"DELETE FROM dune.player_cosmetics WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)",
        f"DELETE FROM dune.player_trainers WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)",
        f"DELETE FROM dune.permission_actor WHERE owner_account_id={account_id}",
        f"DELETE FROM dune.player_state WHERE account_id={account_id}",
    ]
    for s in sqls: _ssh_sql(s, set_path=True)
    await _rmq.publish("notifications",{"ServerCommand":"KickPlayer","PlayerId":"FC4D3B70DB35663"})
    return {"ok":True,"message":f"Account {account_id} deleted: {reason}"}

@router.get("/world/server-time")
async def get_server_time():
    raw = _ssh_sql("SELECT NOW()::text")
    time_str = ""
    if raw:
        for line in raw.strip().split('\n'):
            if line.strip() and not line.startswith('now'): time_str = line
    return {"time":time_str}

@router.get("/players/{account_id}/codex")
async def get_player_codex(account_id: int):
    raw = _ssh_sql(f"SELECT entry_id,unlocked FROM dune.player_codex WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1) ORDER BY entry_id LIMIT 100")
    entries=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='entry_id': entries.append({"entry":p[0],"unlocked":p[1].strip()=='t'})
    return {"codex":entries,"unlocked":sum(1 for e in entries if e['unlocked'])}

@router.post("/players/wipe-codex")
async def wipe_player_codex(account_id: int = 1):
    _ssh_sql(f"DELETE FROM dune.player_codex WHERE player_id=(SELECT player_controller_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)", set_path=True)
    return {"ok":True,"message":"Codex wiped"}

@router.post("/players/clear-tutorial")
async def clear_tutorial(account_id: int = 1):
    await _rmq.publish("notifications",{"ServerCommand":"ClearTutorial","PlayerId":"FC4D3B70DB35663"})
    return {"ok":True,"message":"Tutorial cleared"}

@router.post("/players/returning-award")
async def returning_player_award(account_id: int = 1):
    await _rmq.publish("notifications",{"ServerCommand":"ReturningPlayerAward","PlayerId":"FC4D3B70DB35663"})
    return {"ok":True,"message":"Returning player award granted"}

# ── BATCH 7: Landsraad full cycle, Market bot settings ──

@router.get("/landsraad/full")
async def landsraad_full_status():
    raw = _ssh_sql("SELECT id,name,completed,term,contribution FROM dune.landsraad_tasks ORDER BY id LIMIT 50")
    tasks=[]
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=3 and p[0].strip() and p[0].strip()!='id': tasks.append({"id":int(p[0]),"name":p[1][:80],"completed":p[2].strip()=='t',"term":p[3] if len(p)>3 else '','contribution':p[4] if len(p)>4 else '0'})
    # Also get house info
    raw2 = _ssh_sql("SELECT house_name,active_term,term_progress FROM dune.landsraad_state LIMIT 5")
    houses=[]
    if raw2 and '0 rows' not in raw2:
        for line in raw2.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='house_name': houses.append({"house":p[0],"active_term":p[1],"progress":p[2] if len(p)>2 else '0'})
    return {"tasks":tasks,"houses":houses}

@router.post("/landsraad/new-term")
async def landsraad_new_term():
    await _rmq.publish("notifications",{"ServerCommand":"NewLandsraadTerm"})
    return {"ok":True,"message":"New Landsraad term started"}

@router.post("/landsraad/auto-complete")
async def landsraad_auto_complete():
    sql = "UPDATE dune.landsraad_tasks SET completed=true WHERE term_id=(SELECT term_id FROM dune.landsraad_decree_term ORDER BY term_id DESC LIMIT 1)"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":"Current term Landsraad tasks completed"}

@router.get("/market/bot/settings")
async def market_bot_settings():
    raw = _ssh_sql("SELECT key,value FROM dune.market_bot_settings ORDER BY key LIMIT 30")
    settings={}
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p=line.split('|')
            if len(p)>=2 and p[0].strip() and p[0].strip()!='key': settings[p[0].strip()]=p[1].strip()
    return {"settings":settings}

@router.post("/market/bot/settings")
async def update_market_bot_settings(key: str = "", value: str = ""):
    if not key: return {"ok":False,"message":"key required"}
    sql = f"INSERT INTO dune.market_bot_settings (key,value) VALUES ('{key}','{value}') ON CONFLICT (key) DO UPDATE SET value='{value}'"
    _ssh_sql(sql, set_path=True)
    return {"ok":True,"message":f"Set {key}={value}"}

# ── BATCH 8: Quick fix endpoints ──
@router.post("/fix-player-state")
async def fix_player_state(account_id: int = 1):
    """Fix common player state issues."""
    sqls = [
        f"UPDATE dune.player_state SET online_status=false WHERE account_id={account_id}",
        f"UPDATE dune.items SET stats = jsonb_set(stats,'{{FItemStackAndDurabilityStats,1,CurrentDurability}}',stats->'FItemStackAndDurabilityStats'->1->'MaxDurability') WHERE inventory_id IN (SELECT id FROM dune.inventories WHERE actor_id=(SELECT player_pawn_id FROM dune.player_state WHERE account_id={account_id} LIMIT 1)) AND stats ? 'FItemStackAndDurabilityStats' AND (stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability')::float8 < (stats->'FItemStackAndDurabilityStats'->1->>'MaxDurability')::float8",
    ]
    for s in sqls: _ssh_sql(s, set_path=True)
    return {"ok":True,"message":"Player state fixed"}

# ── BATCH 9: DST Market (items, sales, stats, categories, catalog) ──
@router.get("/market/items")
async def market_items(
    search: str = "",
    category: str = "",
    owner: str = "",  # ''=all, 'bot'=NPC, 'player'=players
    sort: str = "display_name",
    dir: str = "asc",
    page: int = 1,
    limit: int = 20
):
    """DST-compatible market items endpoint with catalog enrichment."""
    try:
        # 1. Get all orders grouped by template_id
        raw = _ssh_sql("""
SELECT o.template_id,
       COUNT(*) as listing_count,
       MIN(o.item_price) as lowest_price,
       SUM(CASE WHEN o.is_npc_order THEN 1 ELSE 0 END) as bot_count,
       SUM(CASE WHEN NOT o.is_npc_order THEN 1 ELSE 0 END) as player_count,
       COUNT(DISTINCT o.owner_id) as owner_count
FROM dune.dune_exchange_orders o
GROUP BY o.template_id
ORDER BY listing_count DESC
        """)

        items = []
        if raw and '0 rows' not in raw and 'ERROR' not in raw:
            for line in raw.strip().split('\n'):
                p = line.split('|')
                if len(p) >= 3 and p[0].strip() and p[0].strip() != 'template_id':
                    tid = p[0].strip()
                    lc = int(p[1]) if len(p) > 1 and p[1].strip().lstrip('-').isdigit() else 0
                    lp = int(p[2]) if len(p) > 2 and p[2].strip().lstrip('-').isdigit() else 0
                    bc = int(p[3]) if len(p) > 3 and p[3].strip().lstrip('-').isdigit() else 0
                    pc = int(p[4]) if len(p) > 4 and p[4].strip().lstrip('-').isdigit() else 0
                    items.append({
                        "template_id": tid,
                        "display_name": _cat_name(tid),
                        "category": _cat_category(tid),
                        "tier": _cat_tier(tid),
                        "rarity": _cat_rarity(tid),
                        "lowest_price": lp,
                        "listing_count": lc,
                        "bot_stock": bc,
                        "player_stock": pc,
                        "total_stock": lc,
                    })

        # 2. Filter
        s_lower = search.lower().strip()
        if s_lower:
            items = [i for i in items
                     if s_lower in i['display_name'].lower()
                     or s_lower in i['template_id'].lower()]

        if category:
            items = [i for i in items
                     if i['category'].startswith(category)
                     or _cat_group(i['category']) == category]

        if owner == 'bot':
            items = [i for i in items if i['bot_stock'] > 0]
        elif owner == 'player':
            items = [i for i in items if i['player_stock'] > 0]

        # 3. Sort
        rev = (dir == 'desc')
        sort_key = sort if sort in ('display_name', 'category', 'tier', 'rarity', 'lowest_price', 'listing_count', 'total_stock') else 'display_name'
        if sort_key == 'display_name':
            items.sort(key=lambda x: x['display_name'].lower(), reverse=rev)
        elif sort_key == 'category':
            items.sort(key=lambda x: x['category'].lower(), reverse=rev)
        else:
            items.sort(key=lambda x: x.get(sort_key, 0) or 0, reverse=rev)

        total = len(items)

        # 4. Paginate
        start = (page - 1) * limit
        paged = items[start:start + limit]

        return {
            "items": paged,
            "total": total,
            "page": page,
            "limit": limit,
            "source": "live"
        }
    except Exception as e:
        logger.error(f"market/items error: {e}")
        return {"items": [], "total": 0, "page": page, "limit": limit, "source": "live", "error": str(e)}

@router.get("/market/sales")
async def market_sales(limit: int = 50):
    try:
        raw = _ssh_sql(f"SELECT o.id, o.template_id, o.item_price, o.owner_id FROM dune.dune_exchange_orders o WHERE o.is_npc_order = false ORDER BY o.id DESC LIMIT {limit}")
        sales = []
        if raw and '0 rows' not in raw and 'ERROR' not in raw:
            for line in raw.strip().split('\n'):
                p = line.split('|')
                if len(p) >= 4 and p[0].strip().isdigit():
                    sales.append({"order_id": p[0], "template_id": p[1], "price": int(p[2]) if p[2].isdigit() else 0, "seller_name": p[3]})
    except: sales = []
    return {"sales": sales, "source": "live"}

@router.get("/market/stats")
async def market_stats():
    try:
        # Use the SAME working table as /market/listings
        raw = _ssh_sql("SELECT COUNT(*), SUM(CASE WHEN is_npc_order THEN 1 ELSE 0 END), SUM(CASE WHEN NOT is_npc_order THEN 1 ELSE 0 END), COUNT(DISTINCT template_id) FROM dune.dune_exchange_orders")
        t = 0; b = 0; p = 0; u = 0
        if raw and 'ERROR' not in raw:
            for line in raw.strip().split('\n'):
                parts = line.split('|')
                vals = [x.strip() for x in parts if x.strip().lstrip('-').isdigit()]
                if len(vals) >= 4:
                    t = int(vals[0]); b = int(vals[1]); p = int(vals[2]); u = int(vals[3])
                    break
        return {"stats": {"total_listings": t, "bot_listings": b, "player_listings": p, "total_stock": t, "bot_stock": b, "player_stock": p, "unique_items": u}, "source": "live"}
    except Exception as e:
        return {"stats": {"total_listings": 0, "bot_listings": 0, "player_listings": 0, "total_stock": 0, "bot_stock": 0, "player_stock": 0, "unique_items": 0}, "source": "live", "error": str(e)}

@router.get("/market/categories")
async def market_categories():
    """Return all unique category paths from catalog for items actually in the exchange."""
    try:
        # Get distinct template_ids in market
        raw = _ssh_sql("SELECT DISTINCT template_id FROM dune.dune_exchange_orders")
        market_ids = set()
        if raw and '0 rows' not in raw and 'ERROR' not in raw:
            for line in raw.strip().split('\n'):
                p = line.split('|')
                tid = p[0].strip()
                if tid and tid != 'template_id':
                    market_ids.add(tid)

        # Collect categories from catalog for those items
        cats = set()
        for tid in market_ids:
            cat = _cat_category(tid)
            if cat:
                cats.add(cat)
                # Also add parent paths
                parts = cat.strip('/').split('/')
                for i in range(1, len(parts)):
                    cats.add('/'.join(parts[:i]))

        if not cats:
            # Fallback: show all catalog categories that have tradeable items
            for tid, item in _CATALOG.items():
                if item.get('tradeable') and item.get('category'):
                    cats.add(item['category'])
                    parts = item['category'].strip('/').split('/')
                    for i in range(1, len(parts)):
                        cats.add('/'.join(parts[:i]))

        return {"categories": sorted(cats)}
    except Exception as e:
        logger.error(f"categories error: {e}")
        return {"categories": []}

@router.get("/market/catalog")
async def market_catalog():
    """Return all tradeable items from the catalog for the item picker."""
    try:
        items = []
        for tid, item in _CATALOG.items():
            if item.get('tradeable', True) and not tid.startswith(('MTX_', 'Social_', 'Emote_', 'Stillsuit_')):
                items.append({
                    "template_id": tid,
                    "display_name": item.get('name', tid),
                    "category": item.get('category', ''),
                    "tier": item.get('tier', 0),
                    "rarity": item.get('rarity', 'common'),
                    "vendor_price": item.get('vendor_price', 0),
                })
        items.sort(key=lambda x: x['display_name'].lower())
        return {"items": items[:500]}  # Cap at 500 for performance
    except Exception as e:
        logger.error(f"catalog error: {e}")
        return {"items": []}

# Market bot seed/status endpoints
_market_bot_state = {"enabled": False, "last_tick": None}

@router.get("/market/bot/status")
async def market_bot_status():
    """Get market bot status."""
    try:
        raw = _ssh_sql("SELECT COUNT(*) as total, SUM(CASE WHEN is_npc_order THEN 1 ELSE 0 END) as bot_count FROM dune.dune_exchange_orders")
        total = 0; bot = 0
        if raw and 'ERROR' not in raw:
            for line in raw.strip().split('\n'):
                p = line.split('|')
                vals = [x.strip() for x in p if x.strip().lstrip('-').isdigit()]
                if len(vals) >= 2:
                    total = int(vals[0]); bot = int(vals[1])
                    break
        return {"enabled": _market_bot_state["enabled"], "last_tick": _market_bot_state["last_tick"],
                "total_listings": total, "bot_listings": bot, "status": "running" if _market_bot_state["enabled"] else "stopped"}
    except: return {"enabled": False, "status": "error"}

# ── Broadcast & Whisper ─────────────────────────────────────────
class BroadcastRequest(BaseModel):
    title: str = ""
    body: str = ""
    durationSec: int = 30

class ShutdownBroadcastRequest(BaseModel):
    shutdownType: str = "Restart"  # Restart, Shutdown, Maintenance, Update
    delayMinutes: int = 10
    cancel: bool = False

class WhisperRequest(BaseModel):
    target_fls_id: str = ""
    message: str = ""
    target_name: str = ""

@router.post("/broadcast/generic")
async def broadcast_generic(req: BroadcastRequest):
    """Send a server-wide pop-up to all connected players via RMQ."""
    try:
        msg = {"command": "BroadcastMessage", "title": req.title, "body": req.body or req.title, "duration": req.durationSec}
        # Publish to RMQ heartbeats exchange
        from backend.services.rmq_service import RMQService
        rmq = RMQService()
        await rmq.publish("heartbeats", msg, routing_key="notifications")
        logger.info(f"Broadcast sent: {req.title}")
        return {"ok": True, "action": "broadcast", "message": f"Broadcast sent: {req.title}"}
    except Exception as e:
        logger.error(f"Broadcast failed: {e}")
        return {"ok": False, "action": "broadcast", "message": str(e)}

@router.post("/broadcast/shutdown")
async def broadcast_shutdown(req: ShutdownBroadcastRequest):
    """Send a shutdown/restart countdown banner to all players."""
    try:
        if req.cancel:
            msg = {"command": "CancelShutdown"}
        else:
            msg = {"command": "ShutdownBroadcast", "type": req.shutdownType, "delayMinutes": req.delayMinutes}
        from backend.services.rmq_service import RMQService
        rmq = RMQService()
        await rmq.publish("heartbeats", msg, routing_key="notifications")
        action = "cancel" if req.cancel else "shutdown"
        logger.info(f"Shutdown broadcast: {action} type={req.shutdownType} delay={req.delayMinutes}")
        return {"ok": True, "action": action, "message": f"Shutdown broadcast {'cancelled' if req.cancel else f'sent ({req.shutdownType} in {req.delayMinutes} min)'}"}
    except Exception as e:
        logger.error(f"Shutdown broadcast failed: {e}")
        return {"ok": False, "action": "shutdown", "message": str(e)}

@router.post("/chat/whisper")
async def chat_whisper(req: WhisperRequest):
    """Send a private GM whisper to an online player via RMQ."""
    try:
        if not req.target_fls_id or not req.message:
            return {"ok": False, "message": "target_fls_id and message are required"}
        msg = {"fls_id": req.target_fls_id, "message": req.message, "source": "GM"}
        from backend.services.rmq_service import RMQService
        rmq = RMQService()
        await rmq.publish("chat.whispers", msg)
        logger.info(f"Whisper to {req.target_fls_id}: {req.message[:50]}")
        return {"ok": True, "message": f"Whisper sent to {req.target_fls_id}"}
    except Exception as e:
        logger.error(f"Whisper failed: {e}")
        return {"ok": False, "message": f"Note: whisper publish is experimental — broker accepts but the game may silently drop. Error: {e}"}

# ── BATCH 10: DST Player Summary, Stats, Events ──
@router.get("/players/summary")
async def player_summary():
    raw = _ssh_sql("SELECT COUNT(*) as total, SUM(CASE WHEN online_status::text = 'Online' THEN 1 ELSE 0 END) as online FROM dune.player_state")
    total = 0; online = 0
    if raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip().isdigit():
                total = int(p[0]); online = int(p[1]) if p[1].strip().isdigit() else 0
                break
    # By faction
    raw2 = _ssh_sql("SELECT COALESCE(f.name,'Unknown'), COUNT(*) FROM dune.player_state ps LEFT JOIN dune.player_faction pf ON pf.actor_id = ps.player_controller_id LEFT JOIN dune.factions f ON f.id = pf.faction_id GROUP BY f.name ORDER BY COUNT(*) DESC")
    by_faction = []
    if raw2 and '0 rows' not in raw2:
        for line in raw2.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip() and p[0].strip() != 'name' and p[1].strip().isdigit():
                by_faction.append({"name": p[0].strip(), "count": int(p[1])})
    # By map
    raw3 = _ssh_sql("SELECT COALESCE(a.map,'Unknown'), COUNT(*) FROM dune.player_state ps LEFT JOIN dune.actors a ON a.id = ps.player_pawn_id GROUP BY a.map ORDER BY COUNT(*) DESC")
    by_map = []
    if raw3 and '0 rows' not in raw3:
        for line in raw3.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip() and p[0].strip() != 'map' and p[1].strip().isdigit():
                by_map.append({"name": p[0].strip(), "count": int(p[1])})
    return {"totals": {"players": total, "online": online, "factions": len(by_faction)}, "by_faction": by_faction, "by_map": by_map, "source": "live"}

@router.get("/players/stats")
async def player_stats(pawn: int = 6):
    raw = _ssh_sql(f"SELECT ps.account_id, ps.player_controller_id, ps.player_pawn_id, ps.character_name, COALESCE(a.class,''), COALESCE(a.map,''), COALESCE(ps.online_status::text,'Offline'), COALESCE(f.name,''), COALESCE(pvcb.balance,0) FROM dune.player_state ps LEFT JOIN dune.actors a ON a.id=ps.player_pawn_id LEFT JOIN dune.player_faction pf ON pf.actor_id=ps.player_controller_id LEFT JOIN dune.factions f ON f.id=pf.faction_id LEFT JOIN dune.player_virtual_currency_balances pvcb ON pvcb.player_controller_id = ps.player_controller_id AND pvcb.currency_id = 0 WHERE ps.player_pawn_id = {pawn} LIMIT 1")
    stats = None
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 9 and p[0].strip().isdigit():
                stats = {"pawn_id": pawn, "account_id": int(p[0]), "controller_id": int(p[1]), "character_name": p[3], "class": p[4], "map": p[5], "online_status": p[6], "faction_name": p[7], "solaris": int(p[8]) if p[8].strip().isdigit() else 0}
                break
    return {"stats": stats, "source": "live"}

@router.get("/players/events")
async def player_events(account: int = 1, limit: int = 50):
    raw = _ssh_sql(f"SELECT id, event_type, metadata, created_at FROM dune.player_events WHERE player_id IN (SELECT player_controller_id FROM dune.player_state WHERE account_id = {account}) ORDER BY id DESC LIMIT {limit}")
    events = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip().isdigit():
                events.append({"id": int(p[0]), "event_type": p[1] if len(p) > 1 else '', "meta": p[2] if len(p) > 2 else '', "ts": p[3] if len(p) > 3 else ''})
    return {"events": events, "source": "live"}

# ── BATCH 11: DST Landsraad contributions/rewards/thresholds ──
@router.get("/landsraad/player-contributions")
async def landsraad_player_contributions(controller: int = 4):
    raw = _ssh_sql(f"SELECT lt.house_name, lt.display_name, lpc.contribution_amount, lt.id FROM dune.landsraad_task_player_contributions lpc JOIN dune.landsraad_tasks lt ON lt.id = lpc.task_id WHERE lpc.player_id = {controller} ORDER BY lpc.contribution_amount DESC")
    contribs = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 3 and p[1].strip():
                contribs.append({"house_name": p[0], "display_name": p[1], "amount": int(p[2]) if p[2].strip().isdigit() else 0, "task_id": int(p[3]) if len(p) > 3 and p[3].strip().isdigit() else 0})
    return {"term_id": 0, "contributions": contribs, "source": "live"}

@router.post("/landsraad/set-contribution")
async def set_landsraad_contribution(controller_id: int = 4, task_id: int = 1, amount: int = 1000000):
    _ssh_sql(f"INSERT INTO dune.landsraad_task_player_contributions (player_id, task_id, amount) VALUES ({controller_id}, {task_id}, {amount}) ON CONFLICT (player_id, task_id) DO UPDATE SET amount = {amount}", set_path=True)
    return {"ok": True, "message": f"Set contribution task {task_id} = {amount}"}

# ── BATCH 12: DST Spec Level, Keystones Reset, Repair Single Item ──
class SpecLevelRequest(BaseModel):
    controller_id: int = 4
    track_type: str = "Combat"
    level: int = 100

@router.post("/players/set-spec-level")
async def set_spec_level(req: SpecLevelRequest):
    max_xp = 44182
    _ssh_sql(f"INSERT INTO dune.specialization_tracks (player_id, track_type, xp_amount, level) VALUES ({req.controller_id}, '{req.track_type}'::dune.specializationtracktype, {max_xp}, {req.level}) ON CONFLICT (player_id, track_type) DO UPDATE SET xp_amount = {max_xp}, level = {req.level}", set_path=True)
    return {"ok": True, "message": f"Set {req.track_type} to level {req.level}"}

@router.post("/players/grant-max-spec")
async def grant_max_spec(controller_id: int = 4, track_type: str = "Combat"):
    max_xp = 44182
    _ssh_sql(f"INSERT INTO dune.specialization_tracks (player_id, track_type, xp_amount, level) VALUES ({controller_id}, '{track_type}'::dune.specializationtracktype, {max_xp}, 100) ON CONFLICT (player_id, track_type) DO UPDATE SET xp_amount = {max_xp}, level = 100", set_path=True)
    return {"ok": True, "message": f"Maxed {track_type} spec"}

@router.post("/players/reset-spec")
async def reset_player_spec(controller_id: int = 4, track_type: str = "Combat"):
    _ssh_sql(f"DELETE FROM dune.specialization_tracks WHERE player_id = {controller_id} AND track_type = '{track_type}'", set_path=True)
    return {"ok": True, "message": f"Reset {track_type} spec"}

@router.post("/players/reset-all-specs")
async def reset_all_player_specs(controller_id: int = 4):
    _ssh_sql(f"DELETE FROM dune.specialization_tracks WHERE player_id = {controller_id}", set_path=True)
    return {"ok": True, "message": "All specs reset"}

@router.post("/players/grant-all-keystones")
async def grant_all_player_keystones(controller_id: int = 4):
    _ssh_sql(f"INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id) SELECT {controller_id}, id FROM dune.specialization_keystones_map ON CONFLICT DO NOTHING", set_path=True)
    return {"ok": True, "message": "All 205 keystones granted"}

@router.post("/players/reset-all-keystones")
async def reset_all_keystones(controller_id: int = 4):
    _ssh_sql(f"DELETE FROM dune.purchased_specialization_keystones WHERE player_id = {controller_id}", set_path=True)
    return {"ok": True, "message": "All keystones reset"}

@router.post("/players/repair-item")
async def repair_single_item(item_id: int = 0):
    if not item_id: return {"ok": False, "message": "item_id required"}
    sql = f"UPDATE dune.items SET stats = jsonb_set(jsonb_set(stats, '{{FItemStackAndDurabilityStats,1,CurrentDurability}}', stats->'FItemStackAndDurabilityStats'->1->'MaxDurability'), '{{FItemStackAndDurabilityStats,1,MaxDurability}}', stats->'FItemStackAndDurabilityStats'->1->'MaxDurability') WHERE id = {item_id} AND stats ? 'FItemStackAndDurabilityStats'"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Repaired item {item_id}"}

# ── BATCH 13: DST Blueprint Export/Import, Storage Items/Actions, Base Destroy ──
@router.get("/blueprints/export")
async def export_blueprint(id: int = 0):
    raw = _ssh_sql(f"SELECT id, owner_name, item_id, pieces, placeables, name FROM dune.building_blueprints WHERE id = {id} LIMIT 1")
    bp = {}
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 6 and p[0].strip().isdigit():
                bp = {"id": int(p[0]), "owner": p[1], "item_id": int(p[2]) if p[2].isdigit() else 0, "pieces": int(p[3]) if p[3].isdigit() else 0, "placeables": int(p[4]) if p[4].isdigit() else 0, "name": p[5]}
                break
    return {"blueprint": {"name": bp.get("name", f"blueprint-{id}"), "instances": [], "placeables": [], "pentashields": []}, "filename": f"blueprint-{id}.json", "source": "live"}

@router.get("/storage/items")
async def storage_items(id: int = 0):
    raw = _ssh_sql(f"SELECT i.id, i.template_id, i.stack_size, COALESCE(i.quality_level, 0) as ql, COALESCE((i.stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability')::text, 'N/A') as dur, COALESCE((i.stats->'FFillableItemStats'->1->>'CurrentAmount')::text, '') as amt FROM dune.items i WHERE i.inventory_id = {id} ORDER BY i.id LIMIT 100")
    items = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 4 and p[0].strip().isdigit():
                items.append({"id": int(p[0]), "template_id": p[1], "stack_size": int(p[2]) if p[2].isdigit() else 1, "quality": int(p[3]) if p[3].isdigit() else 0, "durability": p[4] if len(p) > 4 else 'N/A', "water_amount": p[5] if len(p) > 5 else ''})
    return {"items": items, "source": "live"}

@router.post("/storage/give-item")
async def storage_give_item(container_id: int = 0, template: str = "", qty: int = 1, quality: int = 0):
    if not template: return {"ok": False, "message": "template required"}
    import time
    _ssh_sql(f"INSERT INTO dune.items (inventory_id, template_id, stack_size, position_index, is_new, acquisition_time, stats, quality_level) VALUES ({container_id}, '{template.replace(chr(39), chr(39)+chr(39))}', {qty}, 0, true, {int(time.time()*1000)}, '{{}}'::jsonb, {quality})", set_path=True)
    return {"ok": True, "message": f"Gave {qty}x {template} to container {container_id}"}

@router.post("/storage/delete-item")
async def storage_delete_item(item_id: int = 0):
    if not item_id: return {"ok": False, "message": "item_id required"}
    _ssh_sql(f"DELETE FROM dune.items WHERE id = {item_id}", set_path=True)
    return {"ok": True, "message": f"Deleted item {item_id}"}

@router.post("/storage/set-item-stack")
async def storage_set_stack(item_id: int = 0, stack_size: int = 1):
    if not item_id: return {"ok": False, "message": "item_id required"}
    _ssh_sql(f"UPDATE dune.items SET stack_size = {stack_size} WHERE id = {item_id}", set_path=True)
    return {"ok": True, "message": f"Set stack to {stack_size}"}

@router.post("/bases/destroy-claim")
async def destroy_claim(totem_id: int = 0):
    if not totem_id: return {"ok": False, "message": "totem_id required"}
    _ssh_sql(f"DELETE FROM dune.permission_actor WHERE actor_id = {totem_id}", set_path=True)
    _ssh_sql(f"DELETE FROM dune.actors WHERE id = {totem_id}", set_path=True)
    return {"ok": True, "message": f"Destroyed base claim {totem_id}. Restart BG to apply."}

# ── BATCH 14: DST Status endpoint + Fill Water All ──
@router.get("/status")
async def gameplay_status():
    db_ok = _ssh_sql("SELECT 1") is not None
    return {"db_available": db_ok, "db_message": "Connected" if db_ok else "Offline", "bot_configured": False, "bot_reachable": False, "source": "live"}

@router.post("/players/repair-all-gear")
async def repair_all_gear_rmq(fls_id: str = "FC4D3B70DB35663"):
    await _rmq.publish("notifications", {"ServerCommand": "RepairAllGear", "PlayerId": fls_id})
    return {"ok": True, "message": "Repair all gear sent"}

@router.post("/players/fill-water")
async def fill_player_water(fls_id: str = "FC4D3B70DB35663", water_amount: int = 10000):
    await _rmq.publish("notifications", {"ServerCommand": "UpdateAllWaterFillables", "PlayerId": fls_id, "WaterAmount": water_amount})
    return {"ok": True, "message": f"Fill water sent ({water_amount})"}

# ── BATCH 15: DST Give Item, Delete Item, Set Durability/Water/Stack (player-scoped) ──
class PlayerGiveItemReq(BaseModel):
    fls_id: str
    template: str
    qty: int = 1
    quality: int = 0

@router.post("/players/give-item")
async def give_item_to_player(body: PlayerGiveItemReq):
    if not body.template: return {"ok": False, "message": "template required"}
    await _rmq.publish("notifications", {"ServerCommand": "AddItemToInventory", "PlayerId": body.fls_id, "ItemName": body.template, "Quantity": body.qty, "Durability": 1.0, "Quality": body.quality})
    return {"ok": True, "message": f"Gave {body.qty}x {body.template} to {body.fls_id}"}

@router.post("/players/delete-item")
async def delete_player_item(item_id: int = 0):
    if not item_id: return {"ok": False, "message": "item_id required"}
    _ssh_sql(f"DELETE FROM dune.items WHERE id = {item_id}", set_path=True)
    return {"ok": True, "message": f"Deleted item {item_id}"}

@router.post("/players/set-item-durability")
async def set_player_item_durability(item_id: int = 0, max: float = 100.0, current: float = 100.0, decayed: float = 100.0):
    if not item_id: return {"ok": False, "message": "item_id required"}
    sql = f"UPDATE dune.items SET stats = jsonb_set(jsonb_set(jsonb_set(stats, '{{FItemStackAndDurabilityStats,1,MaxDurability}}', to_jsonb({max})), '{{FItemStackAndDurabilityStats,1,CurrentDurability}}', to_jsonb({current})), '{{FItemStackAndDurabilityStats,1,DecayedMaxDurability}}', to_jsonb({decayed})) WHERE id = {item_id} AND stats ? 'FItemStackAndDurabilityStats'"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Set durability of {item_id}"}

@router.post("/players/set-item-water")
async def set_player_item_water(item_id: int = 0, amount: float = 100.0):
    if not item_id: return {"ok": False, "message": "item_id required"}
    sql = f"UPDATE dune.items SET stats = jsonb_set(stats, '{{FFillableItemStats,1,CurrentAmount}}', to_jsonb({amount})) WHERE id = {item_id} AND stats ? 'FFillableItemStats'"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Set water of {item_id}"}

@router.post("/players/set-item-stack")
async def set_player_item_stack(item_id: int = 0, stack_size: int = 1):
    if not item_id: return {"ok": False, "message": "item_id required"}
    _ssh_sql(f"UPDATE dune.items SET stack_size = {stack_size} WHERE id = {item_id}", set_path=True)
    return {"ok": True, "message": f"Set stack of {item_id} to {stack_size}"}

@router.get("/players/detail")
async def player_detail_dst(pawn: int = 6, controller: int = 4):
    inv_raw = _ssh_sql(f"SELECT i.id, i.template_id, i.stack_size, COALESCE(i.quality_level, 0), COALESCE((i.stats->'FItemStackAndDurabilityStats'->1->>'CurrentDurability'), 'N/A'), COALESCE((i.stats->'FItemStackAndDurabilityStats'->1->>'MaxDurability'), 'N/A'), COALESCE((i.stats->'FFillableItemStats'->1->>'CurrentAmount'), ''), COALESCE((i.stats->'FFillableItemStats'->1->>'FillableType'), '') FROM dune.items i JOIN dune.inventories inv ON inv.id = i.inventory_id WHERE inv.actor_id = {pawn}::bigint ORDER BY i.template_id LIMIT 100")
    inventory = []
    if inv_raw and '0 rows' not in inv_raw:
        for line in inv_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 5 and p[0].strip().isdigit():
                inventory.append({"id": int(p[0]), "template_id": p[1], "stack_size": int(p[2]) if p[2].isdigit() else 1, "quality": int(p[3]) if p[3].isdigit() else 0, "durability": p[4], "max_durability": p[5] if len(p) > 5 else 'N/A', "water_amount": p[6] if len(p) > 6 else '', "water_type": p[7] if len(p) > 7 else ''})
    specs_raw = _ssh_sql(f"SELECT track_type::text, xp_amount, level FROM dune.specialization_tracks WHERE player_id = {controller} ORDER BY track_type")
    specs = []
    if specs_raw and '0 rows' not in specs_raw:
        for line in specs_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 3 and p[0].strip() in ['Combat', 'Crafting', 'Exploration', 'Gathering', 'Sabotage']:
                specs.append({"track_type": p[0], "xp": int(p[1]) if p[1].isdigit() else 0, "level": int(p[2]) if p[2].isdigit() else 0})
    curr_raw = _ssh_sql(f"SELECT currency_id, balance FROM dune.player_virtual_currency_balances WHERE player_controller_id = {controller}")
    currency = []
    if curr_raw and '0 rows' not in curr_raw:
        for line in curr_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip().isdigit():
                currency.append({"currency_id": int(p[0]), "balance": int(p[1]) if p[1].strip().isdigit() else 0})
    return {"inventory": inventory, "specs": specs, "currency": currency, "source": "live"}

# ═══════════════════════════════════════════════════════════════════
# CHARACTER EDITOR (ported from dune-awakening-server-manager)
# Uses pawn_id (actor_id) for everything — no 3-ID confusion!
# ═══════════════════════════════════════════════════════════════════

@router.get("/characters")
async def list_characters():
    """List all characters with their pawn actor IDs."""
    raw = _ssh_sql("SELECT ps.player_pawn_id as id, ps.character_name as name, ps.account_id, ps.player_controller_id FROM dune.player_state ps ORDER BY ps.player_pawn_id")
    chars = []
    if raw and '0 rows' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 4 and p[0].strip().isdigit():
                chars.append({"id": int(p[0]), "name": p[1], "account_id": int(p[2]) if p[2].strip().isdigit() else 0, "controller_id": int(p[3]) if p[3].strip().isdigit() else 0})
    return {"characters": chars}

@router.get("/characters/{actor_id}")
async def get_character(actor_id: int):
    """Full character data: stats, inventory, items."""
    # Properties (stats like health, tech points, eyes of ibad)
    props = _ssh_sql(f"SELECT properties::text FROM dune.actors WHERE id = {actor_id}")
    # Gas attributes (hydration, heat, spice, addiction)
    gas = _ssh_sql(f"SELECT gas_attributes::text FROM dune.actors WHERE id = {actor_id}")
    # Inventories
    inv = _ssh_sql(f"SELECT id, inventory_type, max_item_count FROM dune.inventories WHERE actor_id = {actor_id} AND inventory_type IS NOT NULL ORDER BY id")
    # Items
    items_raw = _ssh_sql(f"SELECT i.id, i.inventory_id, i.template_id, i.stack_size, inv.inventory_type FROM dune.items i JOIN dune.inventories inv ON i.inventory_id = inv.id WHERE inv.actor_id = {actor_id} ORDER BY inv.inventory_type, i.position_index")
    
    inventories = []
    if inv and '0 rows' not in inv:
        for line in inv.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 3 and p[0].strip().isdigit():
                inventories.append({"id": int(p[0]), "type": int(p[1]) if p[1].strip().isdigit() else 0, "max": int(p[2]) if p[2].strip().isdigit() else 0})
    
    items = []
    if items_raw and '0 rows' not in items_raw:
        for line in items_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 5 and p[0].strip().isdigit():
                items.append({"id": int(p[0]), "inv_id": int(p[1]), "template": p[2], "stack": int(p[3]) if p[3].strip().isdigit() else 1, "inv_type": int(p[4]) if p[4].strip().isdigit() else 0})
    
    return {"actorId": actor_id, "properties": props or "{}", "gasAttributes": gas or "{}", "inventories": inventories, "items": items}

class CharStatsUpdate(BaseModel):
    updates: list = []  # [{field: "properties"|"gas_attributes", path: ["DamageableActorComponent","m_TotalMaxHealth"], value: 500}]

@router.post("/characters/{actor_id}/stats")
async def update_character_stats(actor_id: int, body: CharStatsUpdate):
    """Update character stats via jsonb_set on actors.properties or gas_attributes."""
    if not body.updates:
        return {"ok": False, "message": "No updates provided"}
    
    prop_updates = [u for u in body.updates if u.get("field") == "properties"]
    gas_updates = [u for u in body.updates if u.get("field") == "gas_attributes"]
    
    try:
        if prop_updates:
            expr = "properties"
            for u in prop_updates:
                path = "{" + ",".join(u["path"]) + "}"
                val = u["value"]
                expr = f"jsonb_set({expr}, '{path}', '{val}'::jsonb)"
            _ssh_sql(f"UPDATE dune.actors SET properties = {expr} WHERE id = {actor_id}", set_path=True)
        
        if gas_updates:
            expr = "gas_attributes"
            for u in gas_updates:
                path = "{" + ",".join(u["path"]) + "}"
                val = u["value"]
                expr = f"jsonb_set({expr}, '{path}', '{val}'::jsonb)"
            _ssh_sql(f"UPDATE dune.actors SET gas_attributes = {expr} WHERE id = {actor_id}", set_path=True)
        
        return {"ok": True, "message": f"Stats updated for character {actor_id}"}
    except Exception as e:
        return {"ok": False, "message": str(e)}

# ── Specializations per-track (individual editing) ──

@router.get("/characters/{actor_id}/specializations")
async def get_character_specs(actor_id: int):
    """Get specialization tracks + keystones for a character."""
    tracks_raw = _ssh_sql(f"SELECT track_type::text, xp_amount, level FROM dune.specialization_tracks WHERE player_id = {actor_id} ORDER BY track_type")
    keystones_raw = _ssh_sql(f"SELECT COUNT(*) FROM dune.purchased_specialization_keystones WHERE player_id = {actor_id}")
    
    tracks = []
    if tracks_raw and '0 rows' not in tracks_raw:
        for line in tracks_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 3 and p[0].strip() in ['Combat','Crafting','Exploration','Gathering','Sabotage']:
                tracks.append({"track_type": p[0], "xp_amount": int(p[1]) if p[1].isdigit() else 0, "level": float(p[2]) if p[2].strip().replace('.','').isdigit() else 0})
    
    keystones = 0
    if keystones_raw:
        for line in keystones_raw.strip().split('\n'):
            if line.strip().isdigit(): keystones = int(line)
    
    return {"actorId": actor_id, "tracks": tracks, "purchasedKeystones": keystones, "maxKeystones": 205}

@router.post("/characters/{actor_id}/specializations/track")
async def set_spec_track(actor_id: int, track_type: str = "Combat", xp: int = 44182, level: float = 100.0):
    """Set ONE specialization track to specific level/XP."""
    valid = ['Combat','Crafting','Exploration','Gathering','Sabotage']
    if track_type not in valid:
        return {"ok": False, "message": f"Invalid track. Valid: {valid}"}
    sql = f"INSERT INTO dune.specialization_tracks (player_id, track_type, xp_amount, level) VALUES ({actor_id}, '{track_type}'::dune.specializationtracktype, {xp}, {level}) ON CONFLICT (player_id, track_type) DO UPDATE SET xp_amount = {xp}, level = {level}"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Set {track_type} to level {level} ({xp} XP)"}

@router.post("/characters/{actor_id}/specializations/unlock-keystones")
async def unlock_track_keystones(actor_id: int, track_prefix: str = "Combat_"):
    """Unlock all keystones for one specialization track."""
    valid = ['Combat_','Crafting_','Exploration_','Gathering_','Sabotage_']
    if track_prefix not in valid:
        return {"ok": False, "message": f"Invalid prefix. Valid: {valid}"}
    sql = f"INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id) SELECT {actor_id}, id FROM dune.specialization_keystones_map WHERE name LIKE '{track_prefix}%' ON CONFLICT DO NOTHING"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Unlocked {track_prefix} keystones"}

# ── Cosmetics (from dune-awakening-server-manager) ──

@router.get("/characters/{actor_id}/cosmetics")
async def get_character_cosmetics(actor_id: int):
    """List unlocked cosmetics for a character."""
    raw = _ssh_sql(f"SELECT COALESCE(json_agg(elem->>'m_CustomizationId' ORDER BY elem->>'m_CustomizationId'), '[]') FROM (SELECT jsonb_array_elements(properties->'CustomizationLibraryActorComponent'->'m_UnlockedCustomizationSerializableList'->'m_UnlockedCustomizationIds') as elem FROM dune.actors WHERE id = {actor_id}) sub")
    cosmetics = []
    if raw:
        try:
            import json as j
            cosmetics = j.loads(raw.strip())
        except: pass
    return {"actorId": actor_id, "cosmetics": cosmetics, "count": len(cosmetics)}

@router.post("/characters/{actor_id}/cosmetics/add")
async def add_cosmetic(actor_id: int, cosmetic_id: str = ""):
    """Add a cosmetic unlock to a character."""
    if not cosmetic_id: return {"ok": False, "message": "cosmetic_id required"}
    safe = cosmetic_id.replace("'", "''")
    sql = f"""UPDATE dune.actors SET properties = jsonb_set(properties, '{{CustomizationLibraryActorComponent,m_UnlockedCustomizationSerializableList,m_UnlockedCustomizationIds}}', (properties->'CustomizationLibraryActorComponent'->'m_UnlockedCustomizationSerializableList'->'m_UnlockedCustomizationIds') || '[{{"m_CustomizationId": "{safe}"}}]'::jsonb) WHERE id = {actor_id}"""
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Added cosmetic: {cosmetic_id}"}

@router.post("/characters/{actor_id}/cosmetics/remove")
async def remove_cosmetic(actor_id: int, cosmetic_id: str = ""):
    """Remove a cosmetic unlock from a character."""
    if not cosmetic_id: return {"ok": False, "message": "cosmetic_id required"}
    safe = cosmetic_id.replace("'", "''")
    sql = f"""UPDATE dune.actors SET properties = jsonb_set(properties, '{{CustomizationLibraryActorComponent,m_UnlockedCustomizationSerializableList,m_UnlockedCustomizationIds}}', (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements(properties->'CustomizationLibraryActorComponent'->'m_UnlockedCustomizationSerializableList'->'m_UnlockedCustomizationIds') as elem WHERE elem->>'m_CustomizationId' != '{safe}')) WHERE id = {actor_id}"""
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Removed cosmetic: {cosmetic_id}"}

# ── Economy / Faction Rep ──

@router.get("/characters/{actor_id}/economy")
async def get_character_economy(actor_id: int):
    """Get currency and faction reputation for a character."""
    # Get controller_id from player_state
    ctrl = _ssh_sql(f"SELECT player_controller_id FROM dune.player_state WHERE player_pawn_id = {actor_id} LIMIT 1")
    controller_id = 0
    if ctrl:
        for line in ctrl.strip().split('\n'):
            if line.strip().isdigit(): controller_id = int(line)
    
    curr_raw = _ssh_sql(f"SELECT currency_id, balance FROM dune.player_virtual_currency_balances WHERE player_controller_id = {controller_id} ORDER BY currency_id")
    faction_raw = _ssh_sql(f"SELECT fr.faction_id, f.name, fr.reputation_amount FROM dune.player_faction_reputation fr JOIN dune.factions f ON fr.faction_id = f.id WHERE fr.actor_id = {actor_id} ORDER BY fr.faction_id")
    
    currency = []
    if curr_raw and '0 rows' not in curr_raw:
        for line in curr_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip().isdigit():
                currency.append({"currency_id": int(p[0]), "balance": int(p[1]) if p[1].strip().isdigit() else 0})
    
    faction_rep = []
    if faction_raw and '0 rows' not in faction_raw:
        for line in faction_raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 3 and p[0].strip().isdigit():
                faction_rep.append({"faction_id": int(p[0]), "faction_name": p[1], "reputation": int(p[2]) if p[2].strip().isdigit() else 0})
    
    return {"actorId": actor_id, "controllerId": controller_id, "currency": currency, "factionRep": faction_rep}

@router.post("/characters/{actor_id}/economy/currency")
async def set_character_currency(actor_id: int, currency_id: int = 0, balance: int = 1000000):
    """Set currency balance (0=Solaris, 1=Scrip)."""
    ctrl = _ssh_sql(f"SELECT player_controller_id FROM dune.player_state WHERE player_pawn_id = {actor_id} LIMIT 1")
    controller_id = 0
    if ctrl:
        for line in ctrl.strip().split('\n'):
            if line.strip().isdigit(): controller_id = int(line)
    if not controller_id: return {"ok": False, "message": "Character not found"}
    sql = f"INSERT INTO dune.player_virtual_currency_balances (player_controller_id, currency_id, balance) VALUES ({controller_id}, {currency_id}, {balance}) ON CONFLICT (player_controller_id, currency_id) DO UPDATE SET balance = {balance}"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Set currency {currency_id} = {balance:,}"}

@router.post("/characters/{actor_id}/economy/reputation")
async def set_character_faction_rep(actor_id: int, faction_id: int = 2, amount: int = 500000):
    """Set faction reputation."""
    sql = f"INSERT INTO dune.player_faction_reputation (actor_id, faction_id, reputation_amount) VALUES ({actor_id}, {faction_id}, {amount}) ON CONFLICT (actor_id, faction_id) DO UPDATE SET reputation_amount = {amount}"
    _ssh_sql(sql, set_path=True)
    return {"ok": True, "message": f"Set faction {faction_id} rep = {amount:,}"}

# ═══════════════════════════════════════════════════════════════════
# GIVE PACKAGE — Create, save, and give custom item bundles
# ═══════════════════════════════════════════════════════════════════
import os, json as _json

PACKAGES_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'item-packages.json')

def _load_packages():
    try:
        with open(PACKAGES_FILE, 'r') as f:
            return _json.load(f)
    except:
        return {}

def _save_packages(pkgs):
    os.makedirs(os.path.dirname(PACKAGES_FILE), exist_ok=True)
    with open(PACKAGES_FILE, 'w') as f:
        _json.dump(pkgs, f, indent=2)

class PackageItem(BaseModel):
    template: str
    qty: int = 1
    quality: int = 0

class PackageCreate(BaseModel):
    name: str
    items: list = []  # [{template, qty, quality}, ...]

@router.get("/packages")
async def list_packages():
    return {"packages": _load_packages()}

@router.post("/packages/create")
async def create_package(req: PackageCreate):
    if not req.name or not req.items:
        return {"ok": False, "message": "Name and items required"}
    pkgs = _load_packages()
    pkgs[req.name] = [{"template": i.get("template",""), "qty": i.get("qty",1), "quality": i.get("quality",0)} for i in req.items]
    _save_packages(pkgs)
    return {"ok": True, "message": f"Package '{req.name}' saved ({len(req.items)} items)"}

@router.post("/packages/delete")
async def delete_package(name: str = ""):
    if not name: return {"ok": False, "message": "name required"}
    pkgs = _load_packages()
    if name in pkgs:
        del pkgs[name]
        _save_packages(pkgs)
        return {"ok": True, "message": f"Deleted '{name}'"}
    return {"ok": False, "message": f"Package '{name}' not found"}

@router.post("/packages/give")
async def give_package(fls_id: str = "FC4D3B70DB35663", name: str = ""):
    """Give all items from a saved package to a player via RMQ."""
    if not name: return {"ok": False, "message": "Package name required"}
    pkgs = _load_packages()
    pkg = pkgs.get(name)
    if not pkg: return {"ok": False, "message": f"Package '{name}' not found"}
    results = []
    for item in pkg:
        r = _send_rmq({"ServerCommand": "AddItemToInventory", "PlayerId": fls_id,
                        "ItemName": item["template"], "Quantity": item.get("qty",1),
                        "Durability": 1.0, "Quality": item.get("quality",0)})
        results.append({"item": item["template"], "qty": item.get("qty",1), "ok": r.get("ok",False)})
    ok_count = sum(1 for r in results if r["ok"])
    return {"ok": ok_count > 0, "message": f"Package '{name}': {ok_count}/{len(results)} items sent", "results": results}

# Pre-built packages (starter kits as packages)
STARTER_PACKAGES = {
    "Welcome Pack": [
        {"template":"BuildingTool","qty":1},{"template":"RespawnBeacon","qty":1},
        {"template":"WeldingMaterial","qty":200},{"template":"RepairTool5","qty":1},
        {"template":"Water","qty":200},{"template":"Literjon","qty":1},
        {"template":"CopperOre","qty":200},{"template":"IronOre","qty":100},
        {"template":"PlantFiber","qty":200},{"template":"SalvagedMetal","qty":100},
        {"template":"FuelCell","qty":20},{"template":"GraniteStone","qty":200},
        {"template":"Coal","qty":50},{"template":"Sulfur","qty":50},{"template":"MelangeSpice","qty":20},
        {"template":"LightAmmo","qty":500},{"template":"HeavyAmmo","qty":200},
        {"template":"HealthPack_Channeled_3","qty":40},
        {"template":"Combat_Hark_MedUnique02_Boots","qty":1,"quality":5},
        {"template":"Combat_Hark_MedUnique02_Bottom","qty":1,"quality":5},
        {"template":"Combat_Hark_MedUnique02_Gloves","qty":1,"quality":5},
        {"template":"Combat_Hark_MedUnique02_Helmet","qty":1,"quality":5},
        {"template":"Combat_Hark_MedUnique02_Top","qty":1,"quality":5},
        {"template":"HarkAr4","qty":1,"quality":5},
        {"template":"HoltzmanShieldActiveDrain2","qty":1,"quality":5},
        {"template":"PowerPack2","qty":1,"quality":5},
    ],
    "Full Vehicle Kit T6": [
        {"template":"SandbikeChassis_6","qty":1},{"template":"SandbikeEngine_Unique_Speed_6","qty":1},
        {"template":"SandbikeGenerator_6","qty":1},{"template":"SandbikeHull_6","qty":1},
        {"template":"SandbikeLocomotion_6","qty":3},{"template":"SandbikeBoost_Unique_LessHeat_6","qty":1},
        {"template":"FuelCanister_Large","qty":2},{"template":"WeldingMaterial","qty":500},
        {"template":"RepairTool5","qty":1},
    ],
}

@router.post("/packages/init-defaults")
async def init_default_packages():
    """Create default starter packages if they don't exist."""
    pkgs = _load_packages()
    added = []
    for name, items in STARTER_PACKAGES.items():
        if name not in pkgs:
            pkgs[name] = items
            added.append(name)
    if added:
        _save_packages(pkgs)
        return {"ok": True, "message": f"Created {len(added)} default packages: {added}"}
    return {"ok": True, "message": "Defaults already exist"}

# ── GAME CONFIG ──
class GameConfigUpdate(BaseModel):
    server_name: str = ""
    server_password: str = ""

@router.get("/game-config")
async def get_game_config():
    """Read server identity from Game.ini on VM."""
    cfg = {"server_name": "", "server_password": "", "raw": ""}
    try:
        raw = _ssh_raw("cat /funcom/dune/UserGame.ini 2>/dev/null | head -100", 10)
        if raw:
            cfg["raw"] = raw[:2000]
            for line in raw.split('\n'):
                if 'ServerName=' in line:
                    cfg["server_name"] = line.split('=',1)[1].strip()
                if 'ServerPassword=' in line:
                    cfg["server_password"] = line.split('=',1)[1].strip()
    except: pass
    return cfg

@router.post("/game-config")
async def set_game_config(req: GameConfigUpdate):
    """Update server name and password in Game.ini."""
    changes = []
    if req.server_name:
        _ssh_raw(f"sed -i 's/^ServerName=.*/ServerName={req.server_name}/' /funcom/dune/UserGame.ini", 10)
        changes.append(f"ServerName={req.server_name}")
    if req.server_password:
        _ssh_raw(f"sed -i 's/^ServerPassword=.*/ServerPassword={req.server_password}/' /funcom/dune/UserGame.ini", 10)
        changes.append("ServerPassword=***")
    return {"ok": True, "message": f"Updated: {', '.join(changes) if changes else 'no changes'}"}

def _ssh_raw(cmd: str, timeout: int = 10):
    """Run a raw SSH command, return stdout."""
    try:
        from backend.services.ssh_service import get_ssh
        ssh = get_ssh()
        key = ssh._find_key()
        c = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
             '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
        if key: c += ['-i', key]
        c += [f'dune@{ssh.host}', cmd]
        r = subprocess.run(c, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() if r.returncode == 0 else ""
    except:
        return ""
