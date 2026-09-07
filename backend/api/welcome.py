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
