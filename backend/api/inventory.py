"""Inventory API - item catalog and management."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.services.db_service import get_db
import json
from pathlib import Path

router = APIRouter(tags=["Inventory"])

class AddItemReq(BaseModel):
    account_id:int; template_id:str; count:int=1; quality:int=0

@router.get("/{account_id}")
async def get_inventory(account_id:int, limit:int=200):
    items = get_db().get_inventory(account_id, limit)
    return {"inventory":items or [],"count":len(items) if items else 0}

@router.post("/add")
async def add_item(body:AddItemReq):
    get_db().give_item(body.account_id, body.template_id, body.count, body.quality)
    return {"ok":f"Added {body.template_id} x{body.count}"}

@router.get("/catalog/search")
async def search_catalog(query:str="", category:str="", limit:int=50):
    cat_path = Path(__file__).parent.parent.parent/"data"/"catalogs"/"item-catalog.json"
    if not cat_path.exists(): return {"items":[],"count":0}
    data = json.loads(cat_path.read_text(encoding="utf-8"))
    items = data.get("items",{})
    names = data.get("names",{})
    results = []
    for tid, info in items.items():
        name = names.get(tid, tid)
        if query and query.lower() not in name.lower() and query.lower() not in tid.lower():
            continue
        results.append({"template_id":tid,"name":name,"category":info.get("category",""),
            "tier":info.get("tier",0),"stack_max":info.get("stack_max",100),
            "volume":info.get("volume",0)})
        if len(results) >= limit: break
    return {"items":results,"count":len(results)}

@router.get("/catalog/categories")
async def categories():
    return {"categories":["weapons","armor","helmets","gloves","boots","resources",
        "consumables","schematics","tools","vehicles","vehicle_modules","building_pieces",
        "furniture","dyes","cosmetics","patents","ammo","keys","quest_items","other"]}
