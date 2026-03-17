import json
import os
import sys
import time

# Add src to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from src.agent.maintenance_agent import MaintenanceAgent
from src.data.database import init_db, log_sensor_reading, log_ai_alert

# Configuration: STRICT LOCAL IPC
IPC_FILE = os.path.join("data", "iot_stream.json")

# Initialize Database
init_db()

# Load Agent
agent = MaintenanceAgent("data/sample_maintenance_data.json")

def run_ingestor():
    print(f"--- [SOVEREIGN] IoT Ingestor Started (Mode: LOCAL IPC) ---")
    last_processed_ts = 0
    
    try:
        while True:
            if os.path.exists(IPC_FILE):
                try:
                    with open(IPC_FILE, "r") as f:
                        readings = json.load(f)
                    
                    if readings and readings[0]['timestamp'] > last_processed_ts:
                        for payload in readings:
                            eq_id = payload.get("equipment_id")
                            temp = payload.get("temperature")
                            vib = payload.get("vibration")
                            ts = payload.get("timestamp")
                            
                            # Log Reading
                            log_sensor_reading(eq_id, temp, vib)
                            print(f"| RECV | {eq_id:7} | Temp: {temp:5.1f} | Vib: {vib:4.2f} |")
                            
                            # Anomaly Check
                            if temp > 120 or vib > 10:
                                print(f"\n[!!!] CRITICAL ANOMALY: {eq_id} [!!!]")
                                analysis = agent.analyze_patterns()
                                log_ai_alert(eq_id, "CRITICAL", "Sensor Threshold Breach", analysis)
                                print(f"--- AI STRATEGIC PRESCRIPTION LOGGED ---")

                            last_processed_ts = ts
                except (json.JSONDecodeError, IOError):
                    # Handle cases where file is being rewritten
                    pass
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("Ingestor shutting down...")

if __name__ == "__main__":
    run_ingestor()
