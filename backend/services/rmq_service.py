"""RabbitMQ service for server commands — proper rabbitmqctl eval implementation."""
import logging, json, base64, time, subprocess
logger = logging.getLogger("dune-admin.rmq")

AUTH_TOKEN = 'Nu6VmPWUMvdPMeB7qErr'

class RMQService:
    def __init__(self):
        self._connected = False

    async def publish(self, routing_key: str, message: dict):
        """Publish server command via rabbitmqctl eval (mirrors Icehunter/dune-admin)."""
        try:
            from backend.services.ssh_service import get_ssh
            ssh = get_ssh()
            key_path = ssh._find_key()
            
            # Build envelope
            inner = json.dumps(message)
            outer = json.dumps({"Version": 2, "AuthToken": AUTH_TOKEN, "MessageContent": inner})
            outer_b64 = base64.b64encode(outer.encode()).decode()
            msg_id = f"dune-admin-cmd-{int(time.time()*1000)}"
            
            erlang = (
                f'Outer = base64:decode(<<"{outer_b64}">>),'
                f'XName = rabbit_misc:r(<<"/">>, exchange, <<"heartbeats">>),'
                f'X = rabbit_exchange:lookup_or_die(XName),'
                f'MsgId = <<"{msg_id}">>,'
                f'P = {{list_to_atom("P_basic"), <<"Content">>, undefined, [], undefined,'
                f' undefined, undefined, undefined, undefined, MsgId, undefined,'
                f' undefined, <<"fls">>, <<"fls_backend">>, undefined}},'
                f'Content = rabbit_basic:build_content(P, Outer),'
                f'{{ok, Msg}} = rabbit_basic:message(XName, <<"notifications">>, Content),'
                f'rabbit_queue_type:publish_at_most_once(X, Msg).'
            )
            
            # Find MQ game pod
            ns_cmd = "sudo kubectl get pods -A 2>/dev/null | grep 'mq-game-sts' | awk '{print $1,$2}' | head -1"
            ssh_cmd = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
                       '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
            if key_path: ssh_cmd += ['-i', key_path]
            ssh_cmd += [f'dune@{ssh.host}', ns_cmd]
            r = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
            if r.returncode != 0 or not r.stdout.strip():
                logger.warning("Could not find MQ game pod")
                return False
            
            parts = r.stdout.strip().split()
            ns, pod = parts[0], parts[1]
            
            # Execute rabbitmqctl eval
            eval_cmd = f"sudo kubectl exec -n {ns} {pod} -- rabbitmqctl eval '{erlang}' 2>&1"
            ssh_cmd2 = ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', '-o', 'StrictHostKeyChecking=no',
                        '-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', '-o', 'LogLevel=QUIET']
            if key_path: ssh_cmd2 += ['-i', key_path]
            ssh_cmd2 += [f'dune@{ssh.host}', eval_cmd]
            r2 = subprocess.run(ssh_cmd2, capture_output=True, text=True, timeout=30)
            
            if r2.returncode == 0:
                logger.info(f"RMQ published: {message.get('ServerCommand', '?')} -> {message.get('PlayerId', '?')[:20]}")
                return True
            else:
                logger.warning(f"RMQ publish failed: {r2.stderr[:200]}")
                return False
        except Exception as e:
            logger.warning(f"RMQ error: {e}")
            return False
