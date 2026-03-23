import json
import os
import sys
import time
import redis
from typing import List, Tuple

# Add src to python path for internal module discovery
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from src.agent.maintenance_agent import MaintenanceAgent
from src.data.database import (
    init_db,
    log_sensor_reading,
    get_last_alert_timestamp,
    get_machine_parameters,
    log_telemetry_point,
)
from src.services.alerts import create_ai_alert

# --- CONFIGURATION PROTOCOLS ---
IPC_FILE = os.path.join("data", "iot_stream.json")
COMMAND_FILE = os.path.join("data", "commands.json") # AI -> Hardware Bridge
ALERT_COOLDOWN = 300  # 5 Minutes to prevent token bleed
POLL_INTERVAL = 0.5   # Real-time responsiveness

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_CHANNEL = "telemetry_stream"

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# Initialize Database Schema
init_db()

# Load Sovereign AI Agent
agent = MaintenanceAgent("data/sample_maintenance_data.json")

FIELD_ALIASES = {
    "temperature": ["temperature"],
    "vibration_rms": ["vibration_rms", "vibration"],
    "pressure": ["pressure"],
    "rpm": ["rpm"],
    "current_draw": ["current_draw"],
}


def _coerce_float(value):
    try:
        if value is None or isinstance(value, bool):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _log_payload_telemetry(eq_id: str, payload: dict) -> None:
    for key, value in payload.items():
        if key in {"equipment_id", "timestamp"}:
            continue
        numeric_value = _coerce_float(value)
        if numeric_value is not None:
            log_telemetry_point(eq_id, key, numeric_value)
        else:
            log_telemetry_point(eq_id, key, None, str(value))


def _find_payload_value(payload: dict, parameter: dict):
    source_field = (parameter.get("source_field") or "").strip()
    candidate_keys = [source_field] if source_field else []
    candidate_keys.extend(FIELD_ALIASES.get(parameter["parameter_key"], []))
    if not candidate_keys:
        candidate_keys.append(parameter["parameter_key"])

    for key in candidate_keys:
        if key and key in payload:
            return key, payload[key]
    return None, None


def _is_critical(parameter: dict, numeric_value: float) -> bool:
    threshold = parameter.get("critical_threshold")
    if threshold is None:
        return False
    direction = (parameter.get("direction") or "above").lower()
    if direction == "below":
        return numeric_value <= float(threshold)
    return numeric_value >= float(threshold)


def _evaluate_parameter_alerts(eq_id: str, payload: dict) -> List[Tuple[str, float, dict]]:
    critical_breaches: List[Tuple[str, float, dict]] = []
    for parameter in get_machine_parameters(eq_id):
        if not parameter.get("alert_enabled", 1):
            continue
        source_key, raw_value = _find_payload_value(payload, parameter)
        if not source_key:
            continue
        numeric_value = _coerce_float(raw_value)
        if numeric_value is None:
            continue
        if _is_critical(parameter, numeric_value):
            critical_breaches.append((source_key, numeric_value, parameter))
    return critical_breaches


def _build_alert_reason(critical_breaches: List[Tuple[str, float, dict]]) -> str:
    formatted = []
    for source_key, numeric_value, parameter in critical_breaches:
        threshold = parameter.get("critical_threshold")
        direction = (parameter.get("direction") or "above").lower()
        comparator = ">=" if direction != "below" else "<="
        unit = parameter.get("unit") or ""
        unit_suffix = f" {unit}".rstrip()
        formatted.append(
            f"{parameter['display_name']} ({source_key}) {numeric_value}{unit_suffix} "
            f"{comparator} {threshold}{unit_suffix}"
        )
    return "Critical parameter threshold breach: " + "; ".join(formatted)

def run_ingestor():
    print(f"--- [SOVEREIGN] IoT Ingestor Online ---")
    print(f"Monitoring: {IPC_FILE} | Channel: {REDIS_CHANNEL} | Commands: {COMMAND_FILE}")
    
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

                    # 1. Publish to Redis for real-time dashboard
                    try:
                        r.publish(REDIS_CHANNEL, json.dumps(payload))
                    except Exception as re:
                        print(f"Redis Publish Error: {re}")

                    # 2. Log Raw Telemetry
                    log_sensor_reading(eq_id, temp, vib)
                    _log_payload_telemetry(eq_id, payload)
                    
                    # 3. Parameter-driven Anomaly Detection
                    critical_breaches = _evaluate_parameter_alerts(eq_id, payload)
                    is_anomaly = bool(critical_breaches)
                    
                    if is_anomaly:
                        now = time.time()
                        last_alert_ts = get_last_alert_timestamp(eq_id)
                        
                        if (now - last_alert_ts) > ALERT_COOLDOWN:
                            reason = _build_alert_reason(critical_breaches)
                            print(f"\n[!!!] CRITICAL ANOMALY: {eq_id} | {reason} [!!!]")
                            
                            try:
                                # Trigger LLM Reasoning
                                analysis = agent.analyze_patterns()
                                create_ai_alert(eq_id, "CRITICAL", reason, analysis)
                                print(f"✅ AI STRATEGIC PRESCRIPTION LOGGED")
                            except Exception as e:
                                error_msg = f"AI Layer Offline. Protocol: Manual Inspection. Error: {str(e)[:40]}"
                                create_ai_alert(eq_id, "CRITICAL", reason, error_msg)
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
