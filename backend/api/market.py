"""Market API."""
from fastapi import APIRouter
from backend.services.market_bot import MarketBotService

router = APIRouter(tags=["Market"])
_bot = MarketBotService()

@router.get("/listings")
async def listings(limit:int=100): return {"listings":[],"count":0}
@router.get("/bot/status")
async def bot_status(): return _bot.status()
@router.post("/bot/start")
async def bot_start(): return {"ok":"Bot started"} if _bot.start() else {"error":"Failed"}
@router.post("/bot/stop")
async def bot_stop(): return {"ok":"Bot stopped"} if _bot.stop() else {"error":"Failed"}
@router.post("/bot/restart")
async def bot_restart(): return {"ok":"Bot restarted"} if _bot.restart() else {"error":"Failed"}
