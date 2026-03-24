import json
import os
import sys
import time
import redis
import asyncio
from typing import List, Tuple
from datetime import datetime

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

# --- PREDICTIVE TREND CONFIGURATION ---
ROC_THRESHOLDS = {
    "temperature": 0.5,      # °C per second
    "vibration": 0.1,        # G per second
    "vibration_rms": 0.1,    # mm/s per second
    "pressure": 0.2,         # bar per second
    "current_draw": 2.0      # A per second
}

class TrendAnalyzer:
    """Detects rapid parameter shifts (Rate of Change) before they hit critical thresholds."""
    def __init__(self, history_size=5):
        self.history = {} # (machine_id, param) -> [(timestamp, value)]
        self.history_size = history_size

    def analyze(self, machine_id: str, param: str, value: float, ts: float) -> Tuple[bool, str]:
        key = (machine_id, param)
        if key not in self.history:
            self.history[key] = []
        
        # Add new point
        self.history[key].append((ts, value))
        if len(self.history[key]) > self.history_size:
            self.history[key].pop(0)

        if len(self.history[key]) < 2:
            return False, ""

        # Calculate ROC over the window
        first_ts, first_val = self.history[key][0]
        time_delta = ts - first_ts
        if time_delta <= 0:
            return False, ""

        roc = abs(value - first_val) / time_delta
        threshold = ROC_THRESHOLDS.get(param, 1.0) # Default 1.0 units/sec

        if roc > threshold:
            direction = "Rising" if value > first_val else "Falling"
            reason = f"Rapid {param} shift: {direction} at {roc:.2f} units/sec (Threshold: {threshold})"
            return True, reason
        
        return False, ""

# Initialize Database Schema
init_db()

# Load Sovereign AI Agent
agent = MaintenanceAgent("data/sample_maintenance_data.json")
trend_engine = TrendAnalyzer()

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

async def run_ingestor():
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
                await asyncio.sleep(POLL_INTERVAL)
                continue

            try:
                with open(IPC_FILE, "r") as f:
                    readings = json.load(f)

                if not readings:
                    await asyncio.sleep(POLL_INTERVAL)
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

                    # 3. Predictive Trend Analysis (ROC)
                    trend_reason = ""
                    is_trend_anomaly = False
                    for key, val in payload.items():
                        if key in {"equipment_id", "timestamp"}: continue
                        num_val = _coerce_float(val)
                        if num_val is not None:
                            triggered, msg = trend_engine.analyze(eq_id, key, num_val, ts)
                            if triggered:
                                is_trend_anomaly = True
                                trend_reason = msg
                                break # One trend is enough to trigger
                    
                    # 4. Parameter-driven Anomaly Detection (Thresholds)
                    critical_breaches = _evaluate_parameter_alerts(eq_id, payload)
                    is_threshold_anomaly = bool(critical_breaches)
                    
                    is_anomaly = is_threshold_anomaly or is_trend_anomaly
                    
                    if is_anomaly:
                        now = time.time()
                        last_alert_ts = get_last_alert_timestamp(eq_id)
                        
                        if (now - last_alert_ts) > ALERT_COOLDOWN:
                            reason = _build_alert_reason(critical_breaches) if is_threshold_anomaly else trend_reason
                            severity = "CRITICAL" if is_threshold_anomaly else "WARNING"
                            print(f"\n[!!!] {severity} ANOMALY: {eq_id} | {reason} [!!!]")
                            
                            try:
                                # Trigger Comprehensive AI Orchestrator Response
                                trigger_query = f"URGENT {severity} ALERT: {reason}. Provide technical analysis and prioritized prescription."
                                orchestrator_result = await agent.get_orchestrator_response(
                                    query=trigger_query, 
                                    machine_id=eq_id,
                                    session_id="SYSTEM-INGESTOR"
                                )
                                
                                analysis = orchestrator_result["message"]
                                create_ai_alert(eq_id, severity, reason, analysis)
                                
                                # 4. ZERO-LATENCY CACHING: Store the latest summary in Redis for the dashboard
                                cache_key = f"ai_latest_summary:{eq_id}"
                                summary_data = {
                                    "message": analysis,
                                    "timestamp": datetime.now().isoformat(),
                                    "reason": reason,
                                    "sources": orchestrator_result.get("sources", []),
                                    "confidence": orchestrator_result.get("confidence", 95)
                                }
                                r.setex(cache_key, 86400, json.dumps(summary_data)) # Cache for 24h
                                
                                print(f"✅ AI STRATEGIC PRESCRIPTION LOGGED & CACHED")
                            except Exception as e:
                                error_msg = f"AI Layer Offline. Protocol: Manual Inspection. Error: {str(e)[:40]}"
                                create_ai_alert(eq_id, "CRITICAL", reason, error_msg)
                                print(f"⚠️ AI FALLBACK ACTIVE: {error_msg}")
                        else:
                            # Log heartbeat without calling AI
                            pass 

                    last_processed_ts = ts

            except (json.JSONDecodeError, IOError):
                pass
            
            await asyncio.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\n[!] Sovereign Ingestor: Graceful Shutdown Initiated.")

if __name__ == "__main__":
    asyncio.run(run_ingestor())
