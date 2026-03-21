import json
import os
import sys
import time

# Add src to python path for internal module discovery
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from src.agent.maintenance_agent import MaintenanceAgent
from src.data.database import init_db, log_sensor_reading, log_ai_alert, get_last_alert_timestamp

# --- CONFIGURATION PROTOCOLS ---
IPC_FILE = os.path.join("data", "iot_stream.json")
COMMAND_FILE = os.path.join("data", "commands.json") # AI -> Hardware Bridge
ALERT_COOLDOWN = 300  # 5 Minutes to prevent token bleed
POLL_INTERVAL = 0.5   # Real-time responsiveness

# Initialize Database Schema
init_db()

# Load Sovereign AI Agent
agent = MaintenanceAgent("data/sample_maintenance_data.json")

def run_ingestor():
    print(f"--- [SOVEREIGN] IoT Ingestor Online ---")
    print(f"Monitoring: {IPC_FILE} | Commands: {COMMAND_FILE}")
    
    last_processed_ts = 0

    try:
        while True:
            # --- PHASE 1: COMMAND LISTENING (ACTUATION) ---
            # Check if the AI has issued a mitigation command
            if os.path.exists(COMMAND_FILE):
                try:
                    with open(COMMAND_FILE, "r") as f:
                        cmd = json.load(f)
                    print(f"\n[!!!] MITIGATION COMMAND RECEIVED: {cmd['action']} for {cmd['equipment_id']} [!!!]")
                    
                    # In this simulation, we delete the file to 'execute' the command
                    # In a real factory, you'd send a Modbus/PLC signal here
                    os.remove(COMMAND_FILE) 
                    print(f"✅ Command Dispatched to Hardware Layer.")
                except (json.JSONDecodeError, IOError):
                    pass

            # --- PHASE 2: TELEMETRY INGESTION (SENSING) ---
            if not os.path.exists(IPC_FILE):
                time.sleep(POLL_INTERVAL)
                continue

            try:
                with open(IPC_FILE, "r") as f:
                    readings = json.load(f)

                if not readings:
                    time.sleep(POLL_INTERVAL)
                    continue

                # Sort by timestamp to ensure chronological processing
                readings.sort(key=lambda x: x.get('timestamp', 0))

                for payload in readings:
                    ts = payload.get("timestamp", 0)
                    if ts <= last_processed_ts:
                        continue

                    eq_id = payload.get("equipment_id")
                    temp = payload.get("temperature", 0)
                    vib = payload.get("vibration", 0)

                    # 1. Log Raw Telemetry
                    log_sensor_reading(eq_id, temp, vib)
                    
                    # 2. Heuristic Anomaly Detection
                    is_anomaly = temp > 120 or vib > 10
                    
                    if is_anomaly:
                        now = time.time()
                        # Use the Persistent Database Check for cooldown
                        last_alert_ts = get_last_alert_timestamp(eq_id)
                        
                        if (now - last_alert_ts) > ALERT_COOLDOWN:
                            print(f"\n[!!!] CRITICAL ANOMALY: {eq_id} | Temp: {temp}°C | Vib: {vib} [!!!]")
                            
                            try:
                                # Trigger LLM Reasoning
                                analysis = agent.analyze_patterns()
                                log_ai_alert(eq_id, "CRITICAL", "Sensor Threshold Breach", analysis)
                                print(f"✅ AI STRATEGIC PRESCRIPTION LOGGED")
                            except Exception as e:
                                error_msg = f"AI Layer Offline. Protocol: Manual Inspection. Error: {str(e)[:40]}"
                                log_ai_alert(eq_id, "CRITICAL", "Threshold Breach", error_msg)
                                print(f"⚠️ AI FALLBACK ACTIVE")
                        else:
                            # Log heartbeat without calling AI
                            pass 

                    last_processed_ts = ts

            except (json.JSONDecodeError, IOError):
                pass
            
            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\n[!] Sovereign Ingestor: Graceful Shutdown Initiated.")

if __name__ == "__main__":
    run_ingestor()

