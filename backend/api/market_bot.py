"""
Market Bot API — Muaddib (Duke) bot: buy/list ticks, pricing, config.
Ported from DST-DuneServerTool market bot logic.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from backend.api.gameplay import _ssh_sql, _cat_name, _cat_category, _cat_tier, _cat_rarity, _CATALOG
import logging, json, time, random

router = APIRouter(tags=["Market Bot"])
logger = logging.getLogger("dune-admin.marketbot")

# ── Default config ──────────────────────────────────────────────
DEFAULT_CONFIG = {
    "enabled": False,
    "buy_tick_interval": 300,
    "max_buys_per_tick": 25,
    "die_size": 12,
    "die_target": 5,
    "over_market_guard": False,
    "over_market_pct": 5,
    "over_market_allow_unpriced": False,
    "over_market_baseline": 100,
    "maintain_balance": True,
    "target_balance": 450_000_000_000,
    "list_tick_interval": 1800,
    "listings_per_grade": 5,
    "stackables_only": False,
    "upstream_pricing": False,
    "disabled_items": [],
    # Pricing — sane
    "price_cap": 100000,
    "price_floor": 50,
    "default_unit_price": 100,
    "cap_displayed_price": 0,
    "tier_base_prices": {"0": 10, "1": 50, "2": 200, "3": 800, "4": 3000, "5": 10000, "6": 30000},
    "schematic_tier_prices": {"0": 500, "1": 500, "2": 1500, "3": 4000, "4": 12000, "5": 30000, "6": 75000},
    "stack_unit_prices": {"0": 1, "1": 1, "2": 5, "3": 20, "4": 75, "5": 250, "6": 800},
    "augment_factor": 0.6,
    "schematic_factor": 1.0,
    "gear_factor": 0.8,
    "rarity_multipliers": {"common": 1.0, "rare": 1.03, "unique": 1.05, "memento": 1.08},
    "vendor_multiplier": 0.95,
    "grade_multipliers": {"0": 1.0, "1": 1.25, "2": 1.55, "3": 2.0, "4": 2.6, "5": 3.3},
    # Market-follow pricing
    "market_follow_enabled": False,
    "market_follow_pct": 18,
    "market_follow_min_samples": 1,
    "market_follow_no_market": "formula",
    "market_follow_baseline": 0,
    "market_follow_force_guard": False,
    "per_template_overrides": {},
}

# ── Helpers ─────────────────────────────────────────────────────

def _load_config() -> dict:
    """Load bot config from DB, merge with defaults."""
    raw = _ssh_sql("SELECT key, value FROM dune.market_bot_settings ORDER BY key")
    cfg = dict(DEFAULT_CONFIG)
    if raw and '0 rows' not in raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 2 and p[0].strip() and p[0].strip() != 'key':
                key = p[0].strip()
                val = p[1].strip()
                # Parse JSON for complex types
                if val.startswith('{') or val.startswith('['):
                    try: cfg[key] = json.loads(val)
                    except: cfg[key] = val
                elif val.lower() in ('true', 'false'):
                    cfg[key] = val.lower() == 'true'
                elif val.lstrip('-').isdigit():
                    cfg[key] = int(val)
                elif val.replace('.', '', 1).lstrip('-').isdigit():
                    cfg[key] = float(val)
                else:
                    cfg[key] = val
    return cfg

def _save_config(cfg: dict):
    """Save config to DB."""
    for key, val in cfg.items():
        if key.startswith('_'):
            continue
        if isinstance(val, (dict, list)):
            val_str = json.dumps(val)
        elif isinstance(val, bool):
            val_str = 'true' if val else 'false'
        else:
            val_str = str(val)
        safe_key = key.replace("'", "''")
        safe_val = val_str.replace("'", "''")
        _ssh_sql(
            f"INSERT INTO dune.market_bot_settings (key, value) VALUES ('{safe_key}', '{safe_val}') "
            f"ON CONFLICT (key) DO UPDATE SET value = '{safe_val}'",
            set_path=True
        )

def _get_bot_owner_id() -> int:
    """Get or create the bot actor (Muaddib)."""
    raw = _ssh_sql("SELECT id FROM dune.actors WHERE class = 'Muaddib' LIMIT 1")
    if raw and '0 rows' not in raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if p[0].strip().lstrip('-').isdigit():
                return int(p[0])
    # Create Muaddib actor
    partition = _ssh_sql("SELECT partition_id FROM dune.world_partition ORDER BY partition_id LIMIT 1")
    pid = 0
    if partition and '0 rows' not in partition and 'ERROR' not in partition:
        for line in partition.strip().split('\n'):
            p = line.split('|')
            if p[0].strip().lstrip('-').isdigit():
                pid = int(p[0])
                break
    _ssh_sql(
        f"INSERT INTO dune.actors (class, serial, gas_attributes, properties, dimension_index, partition_id) "
        f"VALUES ('Muaddib', 0, '{{}}', '{{}}', 0, {pid})",
        set_path=True
    )
    raw2 = _ssh_sql("SELECT id FROM dune.actors WHERE class = 'Muaddib' LIMIT 1")
    if raw2 and '0 rows' not in raw2:
        for line in raw2.strip().split('\n'):
            p = line.split('|')
            if p[0].strip().lstrip('-').isdigit():
                return int(p[0])
    return 1  # Fallback to admin

def _get_bot_balance() -> int:
    """Get bot Solari balance."""
    oid = _get_bot_owner_id()
    raw = _ssh_sql(f"SELECT dune.dune_exchange_retrieve_solari_balance({oid})")
    if raw and '0 rows' not in raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if p[0].strip().lstrip('-').isdigit():
                return int(p[0])
    return 0

# ── API Endpoints ───────────────────────────────────────────────

class BotConfigUpdate(BaseModel):
    enabled: bool = False
    buy_tick_interval: int = 300
    max_buys_per_tick: int = 25
    die_size: int = 12
    die_target: int = 5
    over_market_guard: bool = False
    over_market_pct: float = 5.0
    over_market_allow_unpriced: bool = False
    over_market_baseline: int = 100
    maintain_balance: bool = True
    target_balance: int = 450_000_000_000
    list_tick_interval: int = 1800
    listings_per_grade: int = 5
    stackables_only: bool = False
    upstream_pricing: bool = False
    disabled_items: list = []
    price_cap: int = 100000
    price_floor: int = 50
    default_unit_price: int = 100
    cap_displayed_price: int = 0
    tier_base_prices: dict = {}
    schematic_tier_prices: dict = {}
    stack_unit_prices: dict = {}
    augment_factor: float = 0.6
    schematic_factor: float = 1.0
    gear_factor: float = 0.8
    rarity_multipliers: dict = {}
    vendor_multiplier: float = 0.95
    grade_multipliers: dict = {}
    market_follow_enabled: bool = False
    market_follow_pct: float = 18.0
    market_follow_min_samples: int = 1
    market_follow_no_market: str = "formula"
    market_follow_baseline: int = 0
    market_follow_force_guard: bool = False
    per_template_overrides: dict = {}

@router.get("/market-bot/status")
async def bot_status():
    """Get bot status: running state, listings count, balance."""
    config = _load_config()
    oid = _get_bot_owner_id()
    
    # Count bot listings
    raw = _ssh_sql(f"SELECT COUNT(*) FROM dune.dune_exchange_orders WHERE is_npc_order = true")
    listing_count = 0
    if raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if p[0].strip().lstrip('-').isdigit():
                listing_count = int(p[0])
                break

    balance = _get_bot_balance()

    return {
        "running": config.get("enabled", False),
        "provisioned": True,
        "listing_count": listing_count,
        "balance": balance,
        "last_buy_tick": config.get("_last_buy_tick"),
        "last_list_tick": config.get("_last_list_tick"),
        "seed_progress": None,
        "list_tick_progress": None,
        "source": "live"
    }

@router.get("/market-bot/config")
async def bot_config():
    """Get full bot configuration."""
    return _load_config()

@router.post("/market-bot/config")
async def bot_config_save(config: BotConfigUpdate):
    """Save bot configuration."""
    cfg = config.model_dump()
    _save_config(cfg)
    return {**cfg, "ok": True}

@router.post("/market-bot/config/reset")
async def bot_config_reset():
    """Reset bot config to defaults."""
    _save_config(DEFAULT_CONFIG)
    return {**DEFAULT_CONFIG, "ok": True}

@router.post("/market-bot/exec")
async def bot_exec(action: str = "start"):
    """Start/stop the bot."""
    cfg = _load_config()
    cfg["enabled"] = (action == "start")
    _save_config(cfg)
    return {"ok": True, "action": action, "enabled": cfg["enabled"]}

@router.post("/market-bot/tick")
async def bot_buy_tick(dry: bool = True):
    """Run a buy tick — roll dice for each player listing, buy on win."""
    cfg = _load_config()
    oid = _get_bot_owner_id()

    # Get player listings
    raw = _ssh_sql(
        f"SELECT o.id, o.template_id, o.item_price, o.owner_id, o.quality_level "
        f"FROM dune.dune_exchange_orders o "
        f"WHERE o.is_npc_order = false AND o.owner_id != {oid} "
        f"ORDER BY o.item_price ASC LIMIT {cfg.get('max_buys_per_tick', 25) * 3}"
    )

    candidates = []
    if raw and '0 rows' not in raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if len(p) >= 3 and p[0].strip().lstrip('-').isdigit():
                candidates.append({
                    "order_id": p[0].strip(),
                    "template_id": p[1].strip(),
                    "price": int(p[2]) if p[2].strip().lstrip('-').isdigit() else 0,
                    "owner_id": int(p[3]) if len(p) > 3 and p[3].strip().lstrip('-').isdigit() else 0,
                    "quality": int(p[4]) if len(p) > 4 and p[4].strip().lstrip('-').isdigit() else 0,
                })

    die_size = cfg.get("die_size", 12)
    die_target = cfg.get("die_target", 5)
    max_buys = cfg.get("max_buys_per_tick", 25)

    winners = []
    purchased = 0
    rolled = 0
    blocked = 0

    for c in candidates:
        if purchased >= max_buys:
            break
        roll = random.randint(1, die_size)
        rolled += 1
        if roll == die_target:
            winners.append({**c, "roll": roll})
            if not dry:
                # Execute buy: transfer Solari, move listing
                sql = (
                    f"SELECT dune.dune_exchange_modify_user_solari_balance({c['owner_id']}, {c['price']}); "
                )
                _ssh_sql(sql, set_path=True)
                # Delete the bought listing
                _ssh_sql(f"DELETE FROM dune.dune_exchange_orders WHERE id = {c['order_id']}", set_path=True)
            purchased += 1

    # Update last tick timestamp
    cfg["_last_buy_tick"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _save_config(cfg)

    return {
        "dryRun": dry,
        "die": f"d{die_size}",
        "candidates": len(candidates),
        "rolled": rolled,
        "won": len(winners),
        "purchased": purchased,
        "blocked": blocked,
        "errors": 0,
        "winners": winners[:20],
        "message": "Dry run — nothing was written." if dry else None
    }

@router.post("/market-bot/tick/list")
async def bot_list_tick(dry: bool = True):
    """Run a list tick — create NPC sell orders for catalog items."""
    cfg = _load_config()
    oid = _get_bot_owner_id()
    per_grade = cfg.get("listings_per_grade", 5)

    # Get existing bot template_ids
    raw = _ssh_sql("SELECT DISTINCT template_id FROM dune.dune_exchange_orders WHERE is_npc_order = true")
    existing = set()
    if raw and 'ERROR' not in raw:
        for line in raw.strip().split('\n'):
            p = line.split('|')
            if p[0].strip() and p[0].strip() != 'template_id':
                existing.add(p[0].strip())

    # Pick catalog items to list
    candidates = []
    for tid, item in _CATALOG.items():
        if item.get('tradeable', True) and not tid.startswith(('MTX_', 'Social_', 'Emote_')):
            vp = item.get('vendor_price', 0)
            if vp > 0 and tid not in existing:
                candidates.append((tid, vp))

    # Randomly select items
    to_list = random.sample(candidates, min(per_grade * 3, len(candidates))) if candidates else []
    now_ms = int(time.time() * 1000)
    created = 0

    for tid, vp in to_list[:per_grade * 2]:
        price = int(vp * random.uniform(0.8, 1.2))
        if price < 1: price = 1
        if price > cfg.get("price_cap", 100000): price = cfg["price_cap"]
        safe = tid.replace("'", "''")
        if not dry:
            sql = (
                f"INSERT INTO dune.dune_exchange_orders "
                f"(exchange_id, owner_id, template_id, item_price, is_npc_order, "
                f"quality_level, durability_cur, durability_max, access_point_id, "
                f"expiration_time, category_mask, category_depth) "
                f"VALUES (1, {oid}, '{safe}', {price}, true, 0, 100, 100, 1, "
                f"{now_ms + 86400000}, 0, 1)"
            )
            r = _ssh_sql(sql, set_path=True)
            if r is not None:
                created += 1

    cfg["_last_list_tick"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _save_config(cfg)

    return {
        "ok": True,
        "dryRun": dry,
        "created": created if not dry else len(to_list),
        "total_candidates": len(candidates),
        "existing_bot_items": len(existing),
        "message": f"{'Would list' if dry else 'Listed'} {len(to_list)} items"
    }

@router.post("/market-bot/balance")
async def bot_set_balance(target: int = 450_000_000_000):
    """Set bot Solari balance to target."""
    oid = _get_bot_owner_id()
    current = _get_bot_balance()
    delta = target - current
    if delta != 0:
        _ssh_sql(
            f"SELECT dune.dune_exchange_modify_user_solari_balance({oid}, {delta})",
            set_path=True
        )
    return {"before": current, "after": target, "delta": delta}

@router.post("/market-bot/clear-listings")
async def bot_clear_listings():
    """Clear all bot listings."""
    _ssh_sql("DELETE FROM dune.dune_exchange_orders WHERE is_npc_order = true", set_path=True)
    raw = _ssh_sql("SELECT COUNT(*) FROM dune.dune_exchange_orders WHERE is_npc_order = true")
    return {"ok": True, "message": "Cleared all bot listings", "cleared": 0}

@router.post("/market-bot/clear-error")
async def bot_clear_error():
    return {"ok": True}

@router.post("/market-bot/seed")
async def bot_seed_market(count: int = 100, dry: bool = False):
    """Bulk-seed the market with NPC listings from catalog."""
    candidates = []
    for tid, item in _CATALOG.items():
        if item.get('tradeable', True) and not tid.startswith(('MTX_', 'Social_', 'Emote_')):
            vp = item.get('vendor_price', 0)
            if vp > 0:
                candidates.append((tid, vp))

    if not candidates:
        return {"ok": False, "error": "No tradeable items in catalog"}

    selected = random.sample(candidates, min(count, len(candidates)))
    oid = _get_bot_owner_id()
    now_ms = int(time.time() * 1000)
    created = 0

    for tid, vp in selected:
        price = int(vp * random.uniform(0.7, 1.3))
        if price < 1: price = 1
        safe = tid.replace("'", "''")
        if not dry:
            sql = (
                f"INSERT INTO dune.dune_exchange_orders "
                f"(exchange_id, owner_id, template_id, item_price, is_npc_order, "
                f"quality_level, durability_cur, durability_max, access_point_id, "
                f"expiration_time, category_mask, category_depth) "
                f"VALUES (1, {oid}, '{safe}', {price}, true, 0, 100, 100, 1, "
                f"{now_ms + 86400000}, 0, 1)"
            )
            r = _ssh_sql(sql, set_path=True)
            if r is not None:
                created += 1
        else:
            created += 1

    return {
        "ok": True,
        "running": False,
        "created": created,
        "total_requested": count,
        "dryRun": dry,
        "message": f"Seeded {created} NPC listings"
    }

@router.post("/market-bot/seed/abort")
async def bot_seed_abort():
    return {"ok": True, "message": "No seed in progress"}

@router.get("/market-bot/vendor-snapshot")
async def bot_vendor_snapshot():
    """Preview items from catalog that bot would list with computed prices."""
    cfg = _load_config()
    candidates = []
    for tid, item in list(_CATALOG.items())[:50]:
        if item.get('tradeable', True) and not tid.startswith(('MTX_', 'Social_', 'Emote_')):
            vp = item.get('vendor_price', 0)
            if vp > 0:
                tier = str(item.get('tier', 0))
                base = cfg.get("tier_base_prices", {}).get(tier, 100)
                price = int(base * cfg.get("vendor_multiplier", 0.95))
                if price < 1: price = 1
                candidates.append({
                    "template_id": tid,
                    "display_name": item.get('name', tid),
                    "vendor_price": vp,
                    "computed_price": price,
                    "tier": item.get('tier', 0),
                    "rarity": item.get('rarity', 'common'),
                    "category": item.get('category', '')
                })
    return {"candidates": candidates[:30], "total": len(candidates)}


# ── Register in main.py ──
# This router is mounted at /api/v1/gameplay in main.py
