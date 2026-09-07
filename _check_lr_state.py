import subprocess

key = r'C:\Users\YOUR_USERNAME\.ssh\dune_key'
host = 'dune@192.168.1.100'
ns = 'funcom-seabass-sh-1ba9d7a35da882ec-qagalq'
pod = 'sh-1ba9d7a35da882ec-qagalq-db-dbdepl-sts-0'

def run(sql):
    cmd = f'sudo kubectl exec -n {ns} {pod} -- psql -h localhost -p 15432 -U dune -d dune -t -A -F "|" -c "SET search_path TO dune; {sql}"'
    r = subprocess.run(['ssh','-o','StrictHostKeyChecking=no','-o','ConnectTimeout=10',
        '-o','BatchMode=yes','-i',key,host,cmd], capture_output=True, text=True, timeout=15)
    return r.stdout.strip() if r.returncode == 0 else f"ERR:{r.stderr[:150]}"

print("=== Active Term ===")
print(run("SELECT term_id, reigning_faction_id, active_decree_id, winning_faction_id, test_term FROM landsraad_decree_term ORDER BY term_id DESC LIMIT 1"))

print("\n=== Guild: STAR ===")
print(run("SELECT * FROM guilds WHERE guild_name ILIKE '%star%'"))

print("\n=== Guild Members (STAR) ===")
print(run("SELECT gm.* FROM guild_members gm JOIN guilds g ON g.guild_id=gm.guild_id WHERE g.guild_name ILIKE '%star%'"))

print("\n=== Guild Members Schema ===")
print(run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='dune' AND table_name='guild_members' ORDER BY ordinal_position"))

print("\n=== Player State (account 1) ===")
print(run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='dune' AND table_name='player_state' ORDER BY ordinal_position"))
print(run("SELECT * FROM player_state WHERE account_id=1 LIMIT 1"))

print("\n=== Landsraad Tasks (current term) ===")
print(run("SELECT id, house_name, goal_amount, completed, board_index FROM landsraad_tasks WHERE term_id=(SELECT term_id FROM landsraad_decree_term ORDER BY term_id DESC LIMIT 1) ORDER BY board_index"))

print("\n=== Landsraad Rotation ===")
print(run("SELECT dr.decree_id, d.decree_name FROM landsraad_decree_rotation dr JOIN landsraad_decrees d ON d.id=dr.decree_id"))
