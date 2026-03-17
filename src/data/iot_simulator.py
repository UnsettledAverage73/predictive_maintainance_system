import json
import time
import random
import os

# Configuration: STRICT LOCAL IPC
IPC_FILE = os.path.join("data", "iot_stream.json")
EQUIPMENT_IDS = ["CNC001", "CONV01", "HYD005", "EXT002"]

def simulate_sensors():
    os.makedirs("data", exist_ok=True)
    print(f"--- [SOVEREIGN] IoT Simulator Started (Mode: LOCAL IPC) ---")
    
    try:
        while True:
            readings = []
            for eq_id in EQUIPMENT_IDS:
                # Generate sensor data
                temp = random.uniform(60.0, 100.0)
                vibration = random.uniform(0.1, 5.0)
                
                # Anomaly Logic
                if random.random() < 0.15:
                    temp += random.uniform(40.0, 60.0)
                    vibration += random.uniform(5.0, 12.0)
                
                payload = {
                    "equipment_id": eq_id,
                    "timestamp": time.time(),
                    "temperature": round(temp, 2),
                    "vibration": round(vibration, 2)
                }
                readings.append(payload)
                
                if temp > 115 or vibration > 9:
                    print(f"  [SIMULATOR ALERT] {eq_id} Critical: Temp {temp:.1f}C, Vib {vibration:.1f}")

            # Atomic JSON Write
            temp_path = IPC_FILE + ".tmp"
            with open(temp_path, "w") as f:
                json.dump(readings, f)
            os.replace(temp_path, IPC_FILE)
            
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("Simulator shutting down...")

if __name__ == "__main__":
    simulate_sensors()
