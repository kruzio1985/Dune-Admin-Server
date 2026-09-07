"""Logs API - game logs, cheat events, player events."""
from fastapi import APIRouter, Query
from typing import Optional
from backend.services.db_service import get_db
from backend.services.ssh_service import get_ssh
from backend.services.log_service import LogService

router = APIRouter(tags=["Logs"])

@router.get("/")
async def get_logs(component: Optional[str]=Query(None), lines:int=100):
    ssh = get_ssh()
    # Find the actual dune namespace
    code, ns_out, _ = await ssh.run("sudo kubectl get ns -o name 2>/dev/null | grep -E 'funcom.*(seabass|sh-|dune)' | head -1", 10)
    ns = ns_out.strip().replace("namespace/", "") if ns_out else None

    if not ns:
        return {"component": component or "all", "lines": 0, "logs": [], "error": "No Dune namespace found"}

    # Get pod names first, then logs for each
    code, pods_out, _ = await ssh.run(f"sudo kubectl get pods -n {ns} -o name 2>/dev/null", 10)
    pod_names = [p.strip().replace("pod/", "") for p in pods_out.strip().split("\n") if p.strip()]

    entries = []
    for pod in pod_names[:10]:  # limit to 10 pods
        code, log_out, _ = await ssh.run(
            f"sudo kubectl logs {pod} --tail={max(5, lines//len(pod_names)+1)} --all-containers=true -n {ns} 2>/dev/null",
            15
        )
        if log_out.strip():
            for line in log_out.strip().split("\n"):
                if line.strip():
                    entries.append({"message": f"[{pod}] {line[:500]}"})

    return {"component": component or "all", "namespace": ns, "lines": len(entries), "logs": entries}

@router.get("/cheat-events")
async def cheat_events(limit:int=50):
    return {"cheat_events":get_db().get_cheat_events(limit) or []}

@router.get("/player-events/{account_id}")
async def player_events(account_id:int, limit:int=100):
    db = get_db()
    player = db.get_player_detail(account_id)
    if not player: return {"events":[]}
    events = db.get_player_events(player.get("player_controller_id",0), limit)
    return {"events":events or []}

@router.get("/components")
async def components():
    return {"components":LogService.get_components()}
