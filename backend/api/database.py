"""Database API - backup, restore, SQL console, table browser."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.db_service import get_db
from backend.services.backup_service import BackupService
from backend.services.ssh_service import get_ssh
from backend.middleware import audit_log

router = APIRouter(tags=["Database"])
_backup = BackupService()

class SQLQueryReq(BaseModel):
    query: str; readonly: bool = True

class BackupScheduleReq(BaseModel):
    enabled: bool = True
    interval_minutes: int = 10

@router.post("/query")
async def run_query(body: SQLQueryReq):
    db = get_db()
    if body.readonly and not body.query.strip().upper().startswith("SELECT"):
        raise HTTPException(400, "Only SELECT with readonly=true")
    rows = db.query(body.query)
    return {"rows":rows or [], "count":len(rows) if rows else 0}

@router.post("/backup")
async def create_backup(name: str = ""):
    ssh = get_ssh()
    # Find the DB pod and namespace
    code, ns_out, _ = await ssh.run("sudo kubectl get ns -o name 2>/dev/null | grep -E 'funcom.*(seabass|sh-)' | head -1", 10)
    ns = ns_out.strip().replace("namespace/", "")
    if not ns: raise HTTPException(500, "No Dune namespace found")

    code, pod_out, _ = await ssh.run(f"sudo kubectl get pods -n {ns} -l app.kubernetes.io/name=postgres -o name 2>/dev/null | head -1", 10)
    pod = pod_out.strip().replace("pod/", "")
    if not pod:
        # Try db-depl pod
        code, pod_out, _ = await ssh.run(f"sudo kubectl get pods -n {ns} -o name 2>/dev/null | grep db-dbdepl | head -1", 10)
        pod = pod_out.strip().replace("pod/", "")

    if pod:
        ts = __import__('datetime').datetime.now().strftime("%Y%m%d_%H%M%S")
        fn = name or f"backup_{ts}"
        code, out, err = await ssh.run(f"sudo kubectl exec -n {ns} {pod} -- pg_dump -U dune -d dune -F c -f /tmp/{fn}.dump 2>/dev/null", timeout=300)
        if code == 0:
            audit_log("database:backup")
            return {"ok": f"Backup created: {fn}.dump", "namespace": ns}
    raise HTTPException(500, "Backup failed - DB pod not found")

@router.get("/backups")
async def list_backups():
    return {"backups":_backup.list_backups()}

@router.get("/tables")
async def list_tables():
    return {"tables":get_db().list_tables() or []}

@router.get("/tables/{table}")
async def browse_table(table: str, limit: int = 50, offset: int = 0):
    cols, rows = get_db().browse_table(table, limit, offset)
    return {"table":table,"columns":cols,"rows":rows}

@router.get("/schema-version")
async def schema_version():
    return {"schema_version":get_db().get_schema_version()}

@router.post("/auto-backup")
async def enable_auto_backup(body: BackupScheduleReq):
    """Enable automatic database backups every N hours."""
    ssh = get_ssh()
    code, ns_out, _ = await ssh.run("sudo kubectl get ns -o name 2>/dev/null | grep -E 'funcom.*(seabass|sh-)' | head -1", 10)
    ns = ns_out.strip().replace("namespace/", "")
    if not ns: raise HTTPException(500, "No Dune namespace found")

    if body.enabled:
        # Get battlegroup name
        code, bg_out, _ = await ssh.run("sudo kubectl get battlegroups -A -o name 2>/dev/null | head -1", 5)
        bg = bg_out.strip().replace("battlegroup.igw.funcom.com/", "")
        schedule_yaml = f'''apiVersion: igw.funcom.com/v1
kind: DatabaseBackupSchedule
metadata:
  name: auto-backup-10min
  namespace: {ns}
spec:
  battleGroup: {bg}
  schedule: "*/{body.interval_minutes} * * * *"
  history:
    limits:
      success: {min(144, 1440 // body.interval_minutes)}
      failure: 10'''
        code, out, err = await ssh.run(f"echo '{schedule_yaml}' | sudo kubectl apply -f -", 20)
        ok = code == 0
    else:
        code, out, err = await ssh.run(f"sudo kubectl delete databasebackupschedule auto-backup-10min -n {ns} 2>/dev/null", 10)
        ok = True

    return {"ok": f"Auto-backup {'enabled' if body.enabled else 'disabled'} every {body.interval_minutes}min", "namespace": ns}

@router.get("/auto-backup")
async def get_auto_backup_status():
    """Check if auto-backup is configured."""
    ssh = get_ssh()
    code, out, _ = await ssh.run("sudo kubectl get databasebackupschedule -A 2>/dev/null | head -5", 10)
    return {"schedules": out.strip(), "active": "auto-backup-10min" in out if out else False}
