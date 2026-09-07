"""Characters API - stats, tech tree, specializations, economy, cosmetics."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.db_service import get_db
from backend.services.ssh_service import get_ssh

router = APIRouter(tags=["Characters"])

@router.get("/{account_id}/stats")
async def get_stats(account_id:int):
    player = get_db().get_player_detail(account_id)
    if not player: raise HTTPException(404, "Character not found")
    return {"player_id":player.get("player_pawn_id"),"character_name":player.get("character_name"),
        "character_state":player.get("character_state"),"online":player.get("online_status")}

@router.post("/tech-tree/unlock-all")
async def unlock_tech_tree(account_id:int, unlock_all:bool=True):
    import json
    from pathlib import Path
    cat = Path(__file__).parent.parent.parent/"data"/"catalogs"/"item-catalog.json"
    recipes = []
    if cat.exists():
        data = json.loads(cat.read_text(encoding="utf-8"))
        recipes = [k for k,v in data.get("items",{}).items() if v.get("is_schematic")]
    if recipes:
        for r in recipes:
            get_db().execute("INSERT INTO dune.player_recipes(account_id,recipe_id,unlocked) VALUES(%s,%s,true) ON CONFLICT DO NOTHING", (account_id, r))
    return {"ok":f"Unlocked {len(recipes)} recipes"}

@router.get("/{player_id}/keystones")
async def get_keystones(player_id:int):
    return {"keystones":get_db().get_keystones(player_id) or []}

@router.post("/keystones/grant-all")
async def grant_all_keystones(player_id:int):
    return {"ok":"Keystones granted - requires DB implementation"}

@router.post("/economy/set")
async def set_economy(account_id:int, solari:int=None, scrip:int=None):
    db = get_db()
    if solari is not None: db.adjust_currency(account_id, "Solaris", solari)
    if scrip is not None: db.adjust_currency(account_id, "Scrip", scrip)
    return {"ok":"Economy updated"}
