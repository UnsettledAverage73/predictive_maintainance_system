import json
import time
import random
import os
import sqlite3
import sys
from datetime import datetime

# CONFIG
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "demo_data")
IPC_FILE = os.path.join(DATA_DIR, "stream.json")
DB_FILE = os.path.join(DATA_DIR, "demo.db")
EQUIPMENT = ["CNC001", "CONV01", "HYD005", "EXT002"]

def init():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.execute("CREATE TABLE IF NOT EXISTS readings (eq_id TEXT, ts DATETIME, temp REAL, vib REAL)")
    conn.commit()
    conn.close()

def simulate():
    print(f"--- Simulator Start ---")
    readings = []
    for eq_id in EQUIPMENT:
        temp = random.uniform(60, 100)
        vib = random.uniform(0, 5)
        readings.append({"eq_id": eq_id, "ts": time.time(), "temp": round(temp, 2), "vib": round(vib, 2)})
    
    with open(IPC_FILE, "w") as f:
        json.dump(readings, f)
    print(f"Generated data for {len(EQUIPMENT)} machines.")

def ingest():
    print(f"--- Ingestor Start ---")
    if not os.path.exists(IPC_FILE):
        return
    
    with open(IPC_FILE, "r") as f:
        readings = json.load(f)
    
    conn = sqlite3.connect(DB_FILE)
    for r in readings:
        conn.execute("INSERT INTO readings VALUES (?, ?, ?, ?)", (r['eq_id'], datetime.now().isoformat(), r['temp'], r['vib']))
        print(f"| RECV | {r['eq_id']:7} | Temp: {r['temp']:5.1f} | Vib: {r['vib']:4.2f} |")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init()
    simulate()
    time.sleep(1)
    ingest()
    
    conn = sqlite3.connect(DB_FILE)
    count = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
    print(f"\nSUCCESS: Database has {count} readings.")
    conn.close()
