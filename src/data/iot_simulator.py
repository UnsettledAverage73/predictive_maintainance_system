import json
import time
import random
import os

# --- CONFIGURATION: SOVEREIGN IPC ---
IPC_FILE = os.path.join("data", "iot_stream.json")
COMMAND_FILE = os.path.join("data", "commands.json")
EQUIPMENT_IDS = ["CNC001", "CONV01", "HYD005", "EXT002"]

def simulate_sensors():
    os.makedirs("data", exist_ok=True)
    print(f"--- [SOVEREIGN] IoT Simulator Online (Mode: FULL CLOSED-LOOP) ---")

    # Initial Machine Load (1.0 = 100% capacity)
    load_factors = {eq_id: 1.0 for eq_id in EQUIPMENT_IDS}

    try:
        while True:
            # --- 1. COMMAND INTERCEPTOR (ACTUATION LAYER) ---
            if os.path.exists(COMMAND_FILE):
                try:
                    with open(COMMAND_FILE, "r") as f:
                        cmd = json.load(f)
                    
                    target = cmd.get("equipment_id")
                    action = cmd.get("action")
                    
                    if target in load_factors:
                        if action == "THROTTLE_LOAD":
                            new_load = cmd.get("value", 0.5)
                            load_factors[target] = new_load
                            print(f"!!! [AUTO-MITIGATION] Throttling {target} to {new_load*100}% load !!!")
                        
                        elif action == "RESET_LOAD":
                            load_factors[target] = 1.0
                            print(f"✅ [HUMAN-RECOVERY] {target} restored to 100% load by Operator.")
                    
                    # Command consumed by the hardware
                    os.remove(COMMAND_FILE)
                except (json.JSONDecodeError, IOError):
                    pass

            readings = []
            for eq_id in EQUIPMENT_IDS:
                current_load = load_factors[eq_id]

                # --- 2. SENSOR GENERATION (TELEMETRY LAYER) ---
                # Thermodynamics: Base metrics scale with load
                base_temp = 60.0 + (current_load * 35.0)  
                base_vib = 0.5 + (current_load * 4.0)

                # Stochastic jitter
                temp = base_temp + random.uniform(0, 8.0)
                vibration = base_vib + random.uniform(0, 0.8)

                # --- 3. ANOMALY & RECOVERY LOGIC ---
                # Anomalies only occur during high-load stress
                if current_load > 0.8 and random.random() < 0.10:
                    temp += random.uniform(30.0, 50.0)
                    vibration += random.uniform(4.0, 8.0)
                
                # Cooling curve simulation when throttled
                if current_load < 1.0:
                     temp -= random.uniform(3.0, 6.0)
                     vibration = max(0.5, vibration - 2.0)

                payload = {
                    "equipment_id": eq_id,
                    "timestamp": time.time(),
                    "temperature": round(max(35.0, temp), 2),
                    "vibration": round(max(0.1, vibration), 2),
                    "load_factor": current_load 
                }
                readings.append(payload)

                if temp > 115 or vibration > 9:
                    print(f"  [SIMULATOR ALERT] {eq_id} Critical: Temp {temp:.1f}C, Vib {vibration:.1f}")

            # --- 4. ATOMIC DATA DISPATCH ---
            temp_path = IPC_FILE + ".tmp"
            with open(temp_path, "w") as f:
                json.dump(readings, f)
            os.replace(temp_path, IPC_FILE)

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[!] Simulator shutting down...")

if __name__ == "__main__":
    simulate_sensors()

