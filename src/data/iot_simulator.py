import json
import time
import random
import os
import sqlite3

# --- CONFIGURATION: SOVEREIGN IPC ---
IPC_FILE = os.path.join("data", "iot_stream.json")
COMMAND_FILE = os.path.join("data", "commands.json")
DB_PATH = "data/factory_ops.db"

def get_equipment_parameters():
    """Fetches all parameters for all equipment from the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name FROM equipment")
    equipment = [dict(row) for row in cursor.fetchall()]
    
    config = {}
    for eq in equipment:
        cursor.execute("SELECT * FROM machine_parameters WHERE machine_id = ?", (eq['id'],))
        params = [dict(row) for row in cursor.fetchall()]
        config[eq['id']] = {
            "name": eq['name'],
            "parameters": params
        }
    
    conn.close()
    return config

def simulate_sensors():
    os.makedirs("data", exist_ok=True)
    print(f"--- [SOVEREIGN] Universal IoT Simulator Online (Mode: MULTI-PARAMETER) ---")

    # Initial Machine Load (1.0 = 100% capacity)
    load_factors = {}
    
    try:
        while True:
            # 1. Refresh config periodically to pick up new onboarded machines
            config = get_equipment_parameters()
            for eq_id in config:
                if eq_id not in load_factors:
                    load_factors[eq_id] = 1.0

            # 2. COMMAND INTERCEPTOR
            if os.path.exists(COMMAND_FILE):
                try:
                    with open(COMMAND_FILE, "r") as f:
                        cmd = json.load(f)
                    target = cmd.get("equipment_id")
                    if target in load_factors:
                        if cmd.get("action") == "THROTTLE_LOAD":
                            load_factors[target] = cmd.get("value", 0.5)
                            print(f"!!! [AUTO-MITIGATION] Throttling {target} !!!")
                        elif cmd.get("action") == "RESET_LOAD":
                            load_factors[target] = 1.0
                            print(f"✅ [RECOVERY] {target} restored.")
                    os.remove(COMMAND_FILE)
                except: pass

            readings = []
            for eq_id, eq_data in config.items():
                current_load = load_factors.get(eq_id, 1.0)
                
                # Base reading for this machine
                machine_payload = {
                    "equipment_id": eq_id,
                    "timestamp": time.time(),
                    "load_factor": current_load,
                    "parameters": {}
                }

                # Simulate each parameter
                for p in eq_data['parameters']:
                    key = p['parameter_key']
                    n_min = p['normal_min'] or 0
                    n_max = p['normal_max'] or 100
                    
                    # Logic: Scale value by load factor within the normal range
                    # Add some stochastic noise
                    range_width = n_max - n_min
                    base_val = n_min + (range_width * 0.7 * current_load) 
                    
                    # Random jitter
                    jitter = random.uniform(-range_width * 0.05, range_width * 0.05)
                    val = base_val + jitter

                    # Injection of Anomaly
                    if current_load > 0.8 and random.random() < 0.05:
                        if p['direction'] == 'above':
                            val += range_width * 0.4
                        else:
                            val -= range_width * 0.4

                    # Specialized logic for temperature/vibration legacy fields
                    if key == 'temperature': machine_payload['temperature'] = round(val, 2)
                    if key == 'vibration_rms' or key == 'vibration': machine_payload['vibration'] = round(val, 2)

                    machine_payload['parameters'][key] = round(val, 2)

                readings.append(machine_payload)

            # 3. ATOMIC DATA DISPATCH
            temp_path = IPC_FILE + ".tmp"
            with open(temp_path, "w") as f:
                json.dump(readings, f)
            os.replace(temp_path, IPC_FILE)

            time.sleep(2)

    except KeyboardInterrupt:
        print("\n[!] Simulator shutting down...")

if __name__ == "__main__":
    simulate_sensors()
