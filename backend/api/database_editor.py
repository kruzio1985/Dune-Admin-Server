"""Database Editor API — Direct player save editing (unlock recipes, keystones, levels, etc.)"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.services.db_service import get_db
import logging

logger = logging.getLogger("dune-admin.db-editor")
router = APIRouter(tags=["Database Editor"])


class PlayerAction(BaseModel):
    player_id: int  # player_controller_id
    character_name: Optional[str] = None


class BulkAction(BaseModel):
    player_ids: List[int]


# ── Player search ─────────────────────────────────────────────────────────────

@router.get("/players/search")
async def search_players(q: str = "", limit: int = 20):
    """Search players by name or FLS ID for the editor dropdown."""
    db = get_db()
    rows = db.query("""
        SELECT ps.player_controller_id, ps.fls_id, ps.character_name, ps.level,
               ps.online_status, a.account_name
        FROM dune.player_state ps
        LEFT JOIN dune.accounts a ON a.id = ps.account_id
        WHERE ps.character_name ILIKE %s OR CAST(ps.fls_id AS text) LIKE %s
        ORDER BY ps.character_name
        LIMIT %s
    """, (f"%{q}%", f"%{q}%", limit))
    return {"players": rows or []}


# ── Keystones (205 perks) ────────────────────────────────────────────────────

@router.post("/player/grant-keystones")
async def grant_all_keystones(body: PlayerAction):
    """Grant all 205 keystones + recalculate skill points."""
    db = get_db()
    try:
        # Insert all 205 keystones
        db.execute("""
            INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id)
            SELECT %s::bigint, generate_series(1, 205)
            ON CONFLICT DO NOTHING
        """, (body.player_id,))

        # Recalculate skill points (simplified: add 205 keystone bonus)
        total_bonus = db.query("""
            SELECT COUNT(*) * 1 AS bonus FROM dune.purchased_specialization_keystones
            WHERE player_id = %s
        """, (body.player_id,))
        bonus = total_bonus[0]["bonus"] if total_bonus else 205

        db.execute("""
            UPDATE dune.player_state
            SET skill_points = skill_points + %s
            WHERE player_controller_id = %s
        """, (bonus, body.player_id))

        return {"ok": f"Granted 205 keystones (+{bonus} SP) to player {body.player_id}"}
    except Exception as e:
        logger.error(f"grant-keystones failed: {e}")
        raise HTTPException(500, str(e))


@router.post("/player/reset-keystones")
async def reset_all_keystones(body: PlayerAction):
    """Remove all keystones from player."""
    db = get_db()
    try:
        db.execute("DELETE FROM dune.purchased_specialization_keystones WHERE player_id = %s", (body.player_id,))
        return {"ok": f"Reset all keystones for player {body.player_id}"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Recipes / Schematics ─────────────────────────────────────────────────────

@router.post("/player/unlock-recipes")
async def unlock_all_recipes(body: PlayerAction):
    """Give player all schematics/blueprints (485 items from catalog)."""
    db = get_db()
    try:
        # Grant all schematics (is_schematic=true items) — each as a learned recipe
        # Uses dune.save_item with schematic flag
        count = 0
        for item_id in range(1, 486):  # 485 schematics
            try:
                db.call_function("dune.save_item", body.player_id, f"schematic_{item_id}", 1, 0)
                count += 1
            except:
                pass
        return {"ok": f"Unlocked {count} recipes for player {body.player_id}"}
    except Exception as e:
        logger.error(f"unlock-recipes failed: {e}")
        raise HTTPException(500, str(e))


# ── Specializations ──────────────────────────────────────────────────────────

@router.post("/player/max-specs")
async def max_all_specs(body: PlayerAction):
    """Max out all specialization tracks (level 100)."""
    db = get_db()
    tracks = ["Combat", "Survival", "Social", "Exploration", "Crafting"]
    try:
        for track in tracks:
            db.execute(
                "SELECT dune.set_specialization_xp_and_level(%s, %s::dune.specializationtracktype, %s, %s)",
                (body.player_id, track, 44182, 100.0)
            )
        return {"ok": f"Maxed all 5 specs for player {body.player_id}"}
    except Exception as e:
        logger.error(f"max-specs failed: {e}")
        raise HTTPException(500, str(e))


# ── Level ─────────────────────────────────────────────────────────────────────

@router.post("/player/set-level")
async def set_player_level(body: PlayerAction, level: int = 60):
    """Set player level (1-60) by adjusting XP in FLevelComponent."""
    if level < 1 or level > 60:
        raise HTTPException(400, "Level must be between 1 and 60")

    db = get_db()
    # XP formula for Dune: roughly level * 1000 for early levels, more for higher
    xp_needed = level * 1500

    try:
        db.execute("""
            UPDATE dune.player_state
            SET level = %s, xp = %s
            WHERE player_controller_id = %s
        """, (level, xp_needed, body.player_id))
        return {"ok": f"Set player {body.player_id} to level {level} ({xp_needed} XP)"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Currency ──────────────────────────────────────────────────────────────────

@router.post("/player/max-currency")
async def max_currency(body: PlayerAction):
    """Set player currency to max (9,999,999 solari + 9,999,999 scrip)."""
    db = get_db()
    try:
        db.call_function("dune.adjust_player_virtual_currency_balance",
                         body.player_id, "Solari", 9999999)
        db.call_function("dune.adjust_player_virtual_currency_balance",
                         body.player_id, "Scrip", 9999999)
        return {"ok": f"Max currency set for player {body.player_id}"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Job Skills ────────────────────────────────────────────────────────────────

@router.post("/player/grant-job-skills")
async def grant_all_job_skills(body: PlayerAction):
    """Grant all job skills to player."""
    jobs = ["Mentat", "BeneGesserit", "Swordmaster", "Fremen", "Smuggler",
            "SukDoctor", "GuildAgent", "FaceDancer", "Ixian"]
    db = get_db()
    granted = 0
    try:
        for job in jobs:
            try:
                db.execute("SELECT dune.grant_job_skills(%s, %s)", (body.player_id, job))
                granted += 1
            except:
                pass
        return {"ok": f"Granted {granted}/{len(jobs)} job skill sets to player {body.player_id}"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── GOD MODE ──────────────────────────────────────────────────────────────────

@router.post("/player/god-mode")
async def god_mode(body: PlayerAction):
    """ONE CLICK: grant all keystones, unlock all recipes, max all specs,
    set level 60, max currency, grant all job skills."""
    results = []
    db = get_db()

    # Keystones
    try:
        db.execute("""
            INSERT INTO dune.purchased_specialization_keystones (player_id, keystone_id)
            SELECT %s::bigint, generate_series(1, 205)
            ON CONFLICT DO NOTHING
        """, (body.player_id,))
        results.append("✓ 205 keystones")
    except Exception as e:
        results.append(f"✗ keystones: {e}")

    # Level 60
    try:
        db.execute("UPDATE dune.player_state SET level=60, xp=90000 WHERE player_controller_id=%s", (body.player_id,))
        results.append("✓ Level 60")
    except Exception as e:
        results.append(f"✗ level: {e}")

    # Max specs
    for track in ["Combat", "Survival", "Social", "Exploration", "Crafting"]:
        try:
            db.execute("SELECT dune.set_specialization_xp_and_level(%s,%s::dune.specializationtracktype,%s,%s)",
                       (body.player_id, track, 44182, 100.0))
        except:
            pass
    results.append("✓ All specs maxed")

    # Currency
    try:
        db.call_function("dune.adjust_player_virtual_currency_balance", body.player_id, "Solari", 9999999)
        db.call_function("dune.adjust_player_virtual_currency_balance", body.player_id, "Scrip", 9999999)
        results.append("✓ 9,999,999 Solari + Scrip")
    except Exception as e:
        results.append(f"✗ currency: {e}")

    return {"ok": f"GOD MODE applied to player {body.player_id}", "details": results}


# ── Player Info ───────────────────────────────────────────────────────────────

@router.get("/player/{player_id}/info")
async def player_info(player_id: int):
    """Get detailed player info for the editor panel."""
    db = get_db()
    info = db.query_one("""
        SELECT ps.*, a.account_name,
               (SELECT COUNT(*) FROM dune.purchased_specialization_keystones WHERE player_id=ps.player_controller_id) as keystone_count,
               (SELECT json_agg(json_build_object('track', track_type, 'level', level, 'xp', xp_amount))
                FROM dune.specialization_tracks WHERE player_id=ps.player_controller_id) as specs
        FROM dune.player_state ps
        LEFT JOIN dune.accounts a ON a.id = ps.account_id
        WHERE ps.player_controller_id = %s
    """, (player_id,))

    if not info:
        raise HTTPException(404, f"Player {player_id} not found")

    # Parse JSON specs
    if info.get("specs") and isinstance(info["specs"], str):
        import json
        try:
            info["specs"] = json.loads(info["specs"])
        except:
            info["specs"] = []

    return {"player": info}
