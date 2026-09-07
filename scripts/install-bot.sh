#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Muaddib Market Bot — One-command installer for Dune VM
# Copy this file to the VM: scp install-bot.sh dune@192.168.1.100:/tmp/
# Run: ssh dune@192.168.1.100 "bash /tmp/install-bot.sh"
# ═══════════════════════════════════════════════════════════════
set -e

echo "🤖 Muaddib Market Bot — Installer"
echo "=================================="

# 1. Install Python3 if missing
if ! command -v python3 &>/dev/null; then
    echo "📦 Installing Python3..."
    sudo apt-get update -qq && sudo apt-get install -y python3 python3-pip
fi

# 2. Install psycopg2 for direct DB access
echo "📦 Installing psycopg2..."
pip3 install psycopg2-binary --quiet

# 3. Create bot directory
BOT_DIR="/opt/muaddib-bot"
sudo mkdir -p "$BOT_DIR"
sudo chown dune:dune "$BOT_DIR"

# 4. Download bot script
echo "📥 Downloading bot script..."
cat > "$BOT_DIR/bot.py" << 'BOTEOF'
#!/usr/bin/env python3
"""Muaddib Market Bot — autonomous buy/sell ticks."""
import psycopg2, random, time, os, json

DB = {
    "host": "localhost", "port": 15432, "user": "dune",
    "password": "", "dbname": "dune"
}
CONFIG_FILE = "/opt/muaddib-bot/config.json"
DEFAULT_CONFIG = {
    "enabled": True,
    "buy_interval": 300,      # seconds between buy ticks
    "list_interval": 1800,    # seconds between list ticks
    "max_buys": 25,           # max buys per tick
    "die_size": 12,           # d12
    "die_target": 5,          # buy on roll == 5
    "price_cap": 100000,      # max solari per listing
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return {**DEFAULT_CONFIG, **json.load(f)}
    return dict(DEFAULT_CONFIG)

def get_conn():
    return psycopg2.connect(**DB)

def get_bot_owner(conn):
    cur = conn.cursor()
    cur.execute("SELECT id FROM dune.actors WHERE class = 'Muaddib' LIMIT 1")
    row = cur.fetchone()
    if row:
        return row[0]
    # Create Muaddib actor
    cur.execute("SELECT partition_id FROM dune.world_partition ORDER BY partition_id LIMIT 1")
    pid = cur.fetchone()
    pid = pid[0] if pid else 0
    cur.execute(
        "INSERT INTO dune.actors (class, serial, gas_attributes, properties, dimension_index, partition_id) "
        f"VALUES ('Muaddib', 0, '{{}}', '{{}}', 0, {pid}) RETURNING id"
    )
    oid = cur.fetchone()[0]
    conn.commit()
    return oid

def buy_tick(conn, owner_id, cfg):
    """Roll d12 for each player listing, buy on win."""
    cur = conn.cursor()
    cur.execute(
        "SELECT o.id, o.template_id, o.item_price, o.owner_id "
        "FROM dune.dune_exchange_orders o "
        "WHERE o.is_npc_order = false AND o.owner_id != %s "
        "ORDER BY o.item_price ASC LIMIT %s",
        (owner_id, cfg["max_buys"] * 3)
    )
    candidates = cur.fetchall()
    bought = 0
    for row in candidates:
        if bought >= cfg["max_buys"]:
            break
        roll = random.randint(1, cfg["die_size"])
        if roll == cfg["die_target"]:
            oid, tid, price, seller = row
            cur.execute(
                "SELECT dune.dune_exchange_modify_user_solari_balance(%s, %s)",
                (seller, price)
            )
            cur.execute(
                "DELETE FROM dune.dune_exchange_orders WHERE id = %s", (oid,)
            )
            bought += 1
    conn.commit()
    return bought

def list_tick(conn, owner_id, cfg):
    """Create NPC sell orders for catalog items not already listed."""
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT template_id FROM dune.dune_exchange_orders WHERE is_npc_order = true")
    existing = {r[0] for r in cur.fetchall()}
    # Pick random tradeable items not already listed
    cur.execute(
        "SELECT DISTINCT template_id FROM dune.items WHERE template_id NOT LIKE 'MTX_%' "
        "AND template_id NOT LIKE 'Social_%' LIMIT 200"
    )
    candidates = [r[0] for r in cur.fetchall() if r[0] not in existing]
    if not candidates:
        return 0
    to_list = random.sample(candidates, min(10, len(candidates)))
    now_ms = int(time.time() * 1000)
    created = 0
    for tid in to_list:
        price = random.randint(100, cfg["price_cap"])
        cur.execute(
            "INSERT INTO dune.dune_exchange_orders "
            "(exchange_id, owner_id, template_id, item_price, is_npc_order, "
            "quality_level, durability_cur, durability_max, access_point_id, "
            "expiration_time, category_mask, category_depth) "
            "VALUES (1, %s, %s, %s, true, 0, 100, 100, 1, %s, 0, 1)",
            (owner_id, tid, price, now_ms + 86400000)
        )
        created += 1
    conn.commit()
    return created

def main():
    cfg = load_config()
    if not cfg["enabled"]:
        print("Bot disabled in config. Exiting.")
        return
    conn = get_conn()
    owner_id = get_bot_owner(conn)
    print(f"🤖 Muaddib bot started (owner_id={owner_id})")
    print(f"   Buy interval: {cfg['buy_interval']}s | List interval: {cfg['list_interval']}s")
    print(f"   Dice: d{cfg['die_size']} win on {cfg['die_target']}")
    last_buy = 0
    last_list = 0
    while True:
        cfg = load_config()
        if not cfg["enabled"]:
            time.sleep(5)
            continue
        now = time.time()
        try:
            if now - last_buy >= cfg["buy_interval"]:
                bought = buy_tick(conn, owner_id, cfg)
                print(f"[{time.strftime('%H:%M:%S')}] Buy tick: bought {bought} items")
                last_buy = now
            if now - last_list >= cfg["list_interval"]:
                listed = list_tick(conn, owner_id, cfg)
                print(f"[{time.strftime('%H:%M:%S')}] List tick: listed {listed} items")
                last_list = now
        except Exception as e:
            print(f"⚠️ Tick error: {e}")
            try: conn = get_conn()
            except: pass
        time.sleep(10)

if __name__ == "__main__":
    main()
BOTEOF

# 5. Create systemd service for auto-start
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/muaddib-bot.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Muaddib Market Bot for Dune Awakening
After=network.target postgresql.service

[Service]
Type=simple
User=dune
WorkingDirectory=/opt/muaddib-bot
ExecStart=/usr/bin/python3 /opt/muaddib-bot/bot.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

# 6. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable muaddib-bot
sudo systemctl start muaddib-bot

echo ""
echo "✅ Muaddib Market Bot installed!"
echo ""
echo "📋 Commands:"
echo "   sudo systemctl status muaddib-bot    — check status"
echo "   sudo systemctl stop muaddib-bot      — stop bot"
echo "   sudo systemctl start muaddib-bot     — start bot"
echo "   sudo journalctl -u muaddib-bot -f    — view logs"
echo "   nano /opt/muaddib-bot/config.json    — edit config"
echo ""
echo "⚙️ Default config:"
echo "   Buy every 5 min, List every 30 min"
echo "   d12 dice, buys on roll of 5"
echo "   100k Solari price cap"
