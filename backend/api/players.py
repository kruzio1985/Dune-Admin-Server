"""Players API - full player management."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from backend.services.db_service import get_db
from backend.services.ssh_service import get_ssh
from backend.services.rmq_service import RMQService
from backend.middleware import audit_log

router = APIRouter(tags=["Players"])
_rmq = RMQService()

class GiveItemReq(BaseModel):
    account_id: int; template: str; qty: int = 1; quality: int = 0

class GiveCurrencyReq(BaseModel):
    account_id: int; currency_type: str; delta: int

class CheatScriptReq(BaseModel):
    fls_id: str; script_name: str

class UpdateTagsReq(BaseModel):
    account_id: int; add: list[str] = []; remove: list[str] = []

@router.get("/")
async def list_players(search: Optional[str]=Query(None), limit:int=50, offset:int=0):
    db = get_db()
    players = db.get_players(search or "", limit, offset)
    return {"players":players or [], "total":len(players) if players else 0}

@router.get("/summary")
async def player_summary():
    db = get_db()
    stats = db.get_server_stats()
    return stats

@router.get("/{account_id}")
async def get_player(account_id: int):
    db = get_db()
    player = db.get_player_detail(account_id)
    if not player: raise HTTPException(404, "Player not found")
    inv = db.get_inventory(account_id) or []
    specs = db.get_specializations(player.get("player_pawn_id",0)) or []
    curr = db.get_currencies(player.get("player_controller_id",0)) or []
    journey = db.get_journey_nodes(account_id) or []
    vehicles = db.get_vehicles(player.get("player_controller_id",0)) or []
    keystones = db.get_keystones(player.get("player_pawn_id",0)) or []
    return {"player":player,"inventory":inv,"specializations":specs,"currencies":curr,
        "journey_nodes":journey,"vehicles":vehicles,"keystones":keystones}

@router.post("/give-item")
async def give_item(body: GiveItemReq):
    db = get_db()
    db.give_item(body.account_id, body.template, body.qty, body.quality)
    audit_log("players:give-item", details=body.model_dump())
    return {"ok":f"Given {body.template} x{body.qty} to {body.account_id}"}

@router.post("/give-currency")
async def give_currency(body: GiveCurrencyReq):
    get_db().adjust_currency(body.account_id, body.currency_type, body.delta)
    return {"ok":f"{body.delta} {body.currency_type} for {body.account_id}"}

@router.post("/cheat-script")
async def cheat_script(body: CheatScriptReq):
    await _rmq.publish("notifications", {
        "ServerCommand": "CheatScript",
        "PlayerId": body.fls_id,
        "ScriptName": body.script_name
    })
    audit_log("players:cheat-script", details=body.model_dump())
    return {"ok": f"Cheat script '{body.script_name}' sent for {body.fls_id}"}

@router.post("/update-tags")
async def update_tags(body: UpdateTagsReq):
    get_db().update_tags(body.account_id, body.add, body.remove)
    return {"ok":f"Tags updated: +{len(body.add)} -{len(body.remove)}"}

@router.post("/delete-account")
async def delete_account(account_id: int, reason: str = ""):
    get_db().delete_account(account_id)
    audit_log("players:delete-account", details={"account_id":account_id,"reason":reason})
    return {"ok":f"Account {account_id} deleted"}
