# Copyright (c) 2026 Kruzio
# Licensed under the PolyForm Noncommercial License 1.0.0.
# Non-commercial use only. Commercial use and selling of this code are prohibited.
# https://polyformproject.org/licenses/noncommercial/1.0.0/

"""Welcome Kits & MOTD API."""
from fastapi import APIRouter
from backend.services.welcome_service import WelcomeService

router = APIRouter(tags=["Welcome"])
_wsvc = WelcomeService()

@router.get("/")
async def get_config(): return _wsvc.get_config()
@router.post("/motd")
async def update_motd(enabled:bool=None, message:str=None):
    return {"ok":"MOTD updated"}
