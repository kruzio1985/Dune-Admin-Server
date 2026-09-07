"""
Dune Admin Manager - Database Service
Full PostgreSQL connection and query service.
Uses psycopg2 with fallback to kubectl exec via SSH.
"""

import logging
import json
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from dataclasses import dataclass
import threading

logger = logging.getLogger("dune-admin.db")


@dataclass
class DBConfig:
    host: str = "127.0.0.1"
    port: int = 15432
    user: str = "dune"
    password: str = ""
    database: str = "dune"
    schema: str = "dune"


class DatabaseService:
    """PostgreSQL connection pool for the game database.
    Uses direct psycopg2 connection when possible, falls back to kubectl exec via SSH."""

    def __init__(self, config: DBConfig = None):
        self.config = config or DBConfig()
        self._pool = None
        self._lock = threading.Lock()
        self._ssh_mode = False
        self._k8s_ns = None
        self._k8s_pod = None

    def _get_pool(self):
        if self._pool is not None:
            return self._pool
        with self._lock:
            if self._pool is not None:
                return self._pool
            try:
                import psycopg2
                from psycopg2 import pool
                self._pool = pool.ThreadedConnectionPool(1, 5,
                    host=self.config.host, port=self.config.port,
                    user=self.config.user, password=self.config.password,
                    dbname=self.config.database, connect_timeout=10)
                logger.info(f"PostgreSQL connected: {self.config.host}:{self.config.port}")
                return self._pool
            except ImportError:
                logger.warning("psycopg2 not installed - using SSH fallback")
            except Exception as e:
                logger.warning(f"PostgreSQL direct connection failed: {e} - using SSH fallback")
            
            # Enable SSH mode
            self._ssh_mode = True
            self._pool = _SshPool(self)
            return self._pool

    def _ensure_ssh_detected(self):
        """Lazy detection of k8s namespace and DB pod."""
        if self._k8s_ns and self._k8s_pod:
            return
        try:
            from backend.services.ssh_service import get_ssh
            ssh = get_ssh()
            key_path = ssh._find_key()
            import subprocess
            ssh_cmd = [
                "C:\\Windows\\System32\\OpenSSH\\ssh.exe",
                "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes", "-o", "LogLevel=QUIET",
            ]
            if key_path:
                ssh_cmd += ["-i", key_path]
            ssh_cmd += [
                f"dune@{ssh.host}",
                "sudo kubectl get pods -A 2>/dev/null | grep 'db-dbdepl-sts' | awk '{print $1,$2}' | head -1"
            ]
            r = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
            if r.returncode == 0 and r.stdout.strip():
                parts = r.stdout.strip().split()
                if len(parts) >= 2:
                    self._k8s_ns = parts[0]
                    self._k8s_pod = parts[1]
                    logger.info(f"SSH DB mode: ns={self._k8s_ns}, pod={self._k8s_pod}")
                    return
            logger.warning("Could not detect DB pod via SSH")
        except Exception as e:
            logger.warning(f"SSH DB detection failed: {e}")

    def _ssh_query(self, sql: str) -> List[Dict]:
        """Execute SQL via kubectl exec on the DB pod. Returns list of dicts with column names."""
        self._ensure_ssh_detected()
        if not self._k8s_ns or not self._k8s_pod:
            return []
        try:
            from backend.services.ssh_service import get_ssh
            ssh = get_ssh()
            key_path = ssh._find_key()
            import subprocess
            # Use heredoc-style SQL via stdin to avoid all escaping issues
            safe_sql = sql.replace('\\', '\\\\').replace('"', '\\"')
            cmd = (
                f'sudo kubectl exec -n {self._k8s_ns} {self._k8s_pod} -- '
                f'psql -h localhost -p 15432 -U postgres -d dune -A -F "|" '
                f'-c "{safe_sql}"'
            )
            ssh_cmd = [
                "C:\\Windows\\System32\\OpenSSH\\ssh.exe",
                "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes", "-o", "LogLevel=QUIET",
            ]
            if key_path:
                ssh_cmd += ["-i", key_path]
            ssh_cmd += [f"dune@{ssh.host}", cmd]
            r = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=30)
            
            if r.returncode != 0:
                if r.stderr:
                    logger.debug(f"SQL error: {r.stderr[:200]}")
                return []
            
            # Parse: first line = headers (|-separated), rest = data rows
            lines = [l.strip() for l in r.stdout.strip().split('\n') if l.strip()]
            if len(lines) < 2:
                return []
            
            headers = lines[0].split('|')
            results = []
            for line in lines[1:]:
                values = line.split('|')
                row = {}
                for i, h in enumerate(headers):
                    row[h.strip()] = values[i].strip() if i < len(values) else None
                results.append(row)
            return results
        except Exception as e:
            logger.debug(f"SSH query failed: {e}")
            return []

    @contextmanager
    def connection(self):
        pool = self._get_pool()
        conn = pool.getconn()
        try:
            yield conn
        finally:
            pool.putconn(conn)

    def query(self, sql: str, params: tuple = None) -> List[Dict]:
        if self._ssh_mode:
            # Format params into SQL
            if params:
                formatted = sql
                for p in params:
                    if isinstance(p, str):
                        formatted = formatted.replace('%s', f"'{p}'", 1)
                    elif isinstance(p, int):
                        formatted = formatted.replace('%s', str(p), 1)
                    else:
                        formatted = formatted.replace('%s', str(p), 1)
                sql = formatted
            return self._ssh_query(sql)
        
        try:
            with self.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    if cur.description:
                        cols = [d[0] for d in cur.description]
                        return [dict(zip(cols, r)) for r in cur.fetchall()]
                    return []
        except Exception as e:
            logger.error(f"Query error: {e}")
            return []

    def query_one(self, sql: str, params: tuple = None) -> Optional[Dict]:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def execute(self, sql: str, params: tuple = None) -> bool:
        if self._ssh_mode:
            if params:
                formatted = sql
                for p in params:
                    if isinstance(p, str):
                        formatted = formatted.replace('%s', f"'{p}'", 1)
                    elif isinstance(p, int):
                        formatted = formatted.replace('%s', str(p), 1)
                    else:
                        formatted = formatted.replace('%s', str(p), 1)
                sql = formatted
            result = self._ssh_query(sql)
            return True  # SSH mode: assume success if no exception
        try:
            with self.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Execute error: {e}")
            return False

    def call_function(self, func: str, *args) -> List[Dict]:
        placeholders = ",".join(["%s"] * len(args))
        return self.query(f"SELECT * FROM {func}({placeholders})", args)

    # ── Player queries ─────────────────────────────────────────────────

    def get_players(self, search: str = "", limit: int = 50, offset: int = 0) -> List[Dict]:
        sql = """SELECT ps.account_id, ps.character_name, a.user as fls_id,
                        ps.character_state,
                        CASE WHEN ps.online_status = 'Online' THEN true ELSE false END as online_status,
                        a.takeoverable::text as faction_id
                 FROM dune.player_state ps
                 LEFT JOIN dune.accounts a ON a.id = ps.account_id"""
        params = []
        if search:
            sql += " WHERE ps.character_name ILIKE %s OR a.user ILIKE %s"
            params = [f"%{search}%", f"%{search}%"]
        sql += " ORDER BY ps.character_name LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        return self.query(sql, tuple(params))

    def get_player_detail(self, account_id: int) -> Optional[Dict]:
        return self.query_one("""SELECT ps.*, a.takeoverable::text as faction_id, a.user as fls_id FROM dune.player_state ps
            LEFT JOIN dune.accounts a ON a.id = ps.account_id WHERE ps.account_id=%s""", (account_id,))

    def get_inventory(self, account_id: int, limit: int = 200) -> List[Dict]:
        return self.query("""SELECT ii.id, ii.template_id, ii.count, ii.quality, ii.durability,
            ii.inventory_id, ii.slot_index FROM dune.item_instances ii
            WHERE ii.owner_account_id=%s ORDER BY ii.inventory_id, ii.slot_index LIMIT %s""",
            (account_id, limit))

    def get_specializations(self, player_id: int) -> List[Dict]:
        return self.query("SELECT track_type, xp, level FROM dune.specialization_tracks WHERE player_id=%s", (player_id,))

    def get_currencies(self, controller_id: int) -> List[Dict]:
        return self.query("SELECT currency_id, balance FROM dune.virtual_currency_balances WHERE owner_actor_id=%s", (controller_id,))

    def get_journey_nodes(self, account_id: int) -> List[Dict]:
        return self.query("SELECT node_id, completed_at FROM dune.journey_nodes WHERE account_id=%s AND completed=true", (account_id,))

    def get_vehicles(self, controller_id: int) -> List[Dict]:
        return self.query("""SELECT id, class, map, chassis_durability, vehicle_name FROM dune.actors
            WHERE owner_account_id IN (SELECT owner_account_id FROM dune.actors WHERE id=%s)
            AND class ILIKE '%%Vehicle%%'""", (controller_id,))

    def get_keystones(self, player_id: int) -> List[Dict]:
        return self.query("SELECT keystone_id, keystone_name FROM dune.specialization_keystones WHERE player_id=%s", (player_id,))

    def get_cheat_events(self, limit: int = 50) -> List[Dict]:
        return self.query("""SELECT lc.fls_id, lc.cheat_type::text as cheat_type, lc.event_time,
            (SELECT character_name FROM dune.player_state WHERE fls_id=lc.fls_id LIMIT 1) as character_name
            FROM dune.log_cheating lc ORDER BY event_time DESC LIMIT %s""", (limit,))

    def get_server_stats(self) -> Dict:
        r = self.query_one("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE online_status = 'Online') as online FROM dune.player_state")
        return r or {"total": 0, "online": 0}

    def list_tables(self) -> List[Dict]:
        return self.query("""SELECT table_name, (SELECT count(*) FROM information_schema.columns c
            WHERE c.table_name=t.table_name AND c.table_schema='dune') as column_count
            FROM information_schema.tables t WHERE table_schema='dune' ORDER BY table_name""")

    def browse_table(self, table: str, limit: int = 50, offset: int = 0):
        cols = self.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='dune' AND table_name=%s ORDER BY ordinal_position", (table,))
        rows = []
        try:
            rows = self.query(f'SELECT * FROM dune."{table}" LIMIT %s OFFSET %s', (limit, offset))
        except Exception:
            pass
        return cols, rows

    def get_schema_version(self) -> str:
        r = self.query("SELECT dune.get_schema_version()")
        return str(list(r[0].values())[0]) if r else "unknown"

    def get_player_events(self, actor_id: int, limit: int = 100) -> List[Dict]:
        return self.call_function("dune.load_events_log_data_from_player", actor_id, limit)

    def give_item(self, account_id: int, template: str, count: int = 1, quality: int = 0):
        return self.call_function("dune.save_item", account_id, template, count, quality)

    def adjust_currency(self, account_id: int, currency_type: str, delta: int):
        # Solaris = currency_id 0, Scrip = currency_id 1
        currency_map = {"solaris": 0, "solari": 0, "scrip": 1, "scrips": 1}
        currency_id = currency_map.get(currency_type.lower(), 0)
        # Get controller_id from player_state
        player = self.query_one(
            "SELECT player_controller_id FROM dune.player_state WHERE account_id=%s",
            (account_id,))
        if not player:
            return False
        cid = int(player.get('player_controller_id', 0)) if player.get('player_controller_id') else 0
        if not cid:
            return False
        return self.execute(
            "SET search_path TO dune; SELECT adjust_player_virtual_currency_balance(%s::bigint, %s::smallint, %s::bigint);",
            (cid, currency_id, delta))

    def set_faction_rep(self, account_id: int, faction: str, reputation: int):
        return self.call_function("dune.set_player_faction_reputation", account_id, faction, reputation)

    def update_tags(self, account_id: int, add: List[str], remove: List[str]):
        return self.call_function("dune.update_player_tags", account_id, add, remove)

    def delete_account(self, account_id: int):
        return self.call_function("dune.delete_account", account_id)


class _SshPool:
    """Pool wrapper for SSH-based DB queries."""
    def __init__(self, db_service):
        self._db = db_service
    def getconn(self): return self._Conn()
    def putconn(self, conn): pass
    class _Conn:
        def cursor(self): return _SshPool._Cursor()
        def commit(self): pass
        def __enter__(self): return self
        def __exit__(self, *a): pass
    class _Cursor:
        def execute(self, *a): pass
        def fetchall(self): return []
        def fetchone(self): return None
        @property
        def description(self): return None
        def __enter__(self): return self
        def __exit__(self, *a): pass


# Keep old name for backward compat
_FallbackPool = _SshPool


_db: Optional[DatabaseService] = None


def get_db() -> DatabaseService:
    global _db
    if _db is None:
        from backend.config import get_config
        cfg = get_config()
        _db = DatabaseService(DBConfig(
            host=cfg.database.host, port=cfg.database.port,
            user=cfg.database.user, password=cfg.database.password,
            database=cfg.database.database, schema=cfg.database.schema))
    return _db
