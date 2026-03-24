import sqlite3
from datetime import datetime
import numpy as np
import sys
import os

# Add src to python path for internal module discovery
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

try:
    import rust_engine
except ImportError:
    rust_engine = None

def calculate_historical_failure_factor(machine_id: str) -> float:
    """
    Analyzes past incident tickets to find recurring failure modes.
    Example: Specific bearing that fails every 500 hours.
    Returns: A risk factor (0.0 to 1.5) based on current runtime vs historical failure cycle.
    """
    from src.data.database import DB_PATH, get_latest_usage_snapshot
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all manual logs for this machine, ordered by timestamp
    cursor.execute("""
        SELECT timestamp, action_taken, parts_replaced 
        FROM manual_logs 
        WHERE equipment_id = ? 
        ORDER BY timestamp ASC
    """, (machine_id,))
    logs = cursor.fetchall()
    
    if len(logs) < 2:
        conn.close()
        return 0.0

    # Group by action/part to find cycles
    cycles = {} # action -> [timestamps]
    for log in logs:
        key = (log['action_taken'] or log['parts_replaced'] or "general").lower()
        # Simplify key for grouping
        if "bearing" in key: key = "bearing_replacement"
        elif "seal" in key: key = "seal_replacement"
        elif "belt" in key: key = "belt_adjustment"
        
        if key not in cycles: cycles[key] = []
        cycles[key].append(datetime.fromisoformat(log['timestamp']))

    max_factor = 0.0
    
    # Get current runtime
    usage = get_latest_usage_snapshot(machine_id)
    current_runtime = usage.get("runtime_hours", 0) if usage else 0

    for key, timestamps in cycles.items():
        if len(timestamps) < 2: continue
        
        # Calculate average time between failures (in hours approx)
        intervals = []
        for i in range(1, len(timestamps)):
            delta = (timestamps[i] - timestamps[i-1]).total_seconds() / 3600.0
            intervals.append(delta)
        
        avg_interval = np.mean(intervals)
        
        # If the cycle is consistent, check if we're approaching the limit
        if avg_interval > 0:
            time_since_last = (datetime.now() - timestamps[-1]).total_seconds() / 3600.0
            progress = time_since_last / avg_interval
            if progress > 0.8:
                factor = min(1.5, (progress - 0.8) * 5.0) # Scale to 1.5 at 110% progress
                max_factor = max(max_factor, factor)

    conn.close()
    return round(max_factor, 2)

def calculate_log_risk_score(logs):
    """
    Analyzes textual logs to determine a risk score (0-100).
    Focuses on keyword detection (including Hinglish) and report frequency.
    """
    if not logs:
        return 0

    # Risk Weight Keywords
    CRITICAL_KEYWORDS = ["dhuan", "smoke", "fire", "aag", "breakdown", "shat down", "fail", "total downtime", "leak", "phata", "hissing"]
    HIGH_KEYWORDS = ["awaz", "noise", "vibration", "vibrate", "garam", "hot", "overheat", "smell", "badhu", "lag", "atki"]
    MEDIUM_KEYWORDS = ["slow", "halki", "minor", "check", "dekho", "servicing", "replacement"]

    score = 0
    recent_logs = logs[:5]  # Only analyze last 5 events
    
    for entry in recent_logs:
        text = str(entry.get('note', entry.get('action_taken', ''))).lower()
        
        # Keyword matching
        if any(kw in text for kw in CRITICAL_KEYWORDS):
            score += 50
        elif any(kw in text for kw in HIGH_KEYWORDS):
            score += 25
        elif any(kw in text for kw in MEDIUM_KEYWORDS):
            score += 10
            
    # Cap score at 100
    return min(100, score)

def calculate_failure_probability(readings):
    """
    Analyzes telemetry slope to predict failure.
    Returns: Probability (0-100) and Estimated Minutes to Failure.
    """
    if len(readings) < 5:
        return 0, None

    temps = [r.get('temperature', 0) for r in readings if 'temperature' in r]
    if not temps:
        return 0, None
        
    times = np.arange(len(temps))

    # --- RUST INTEGRATION ---
    max_temp = max(temps)
    if rust_engine and len(temps) > 50:
        st = rust_engine.SegmentTree(temps)
        max_temp = st.query_max(0, len(temps))

    # Calculate Slope (m)
    slope, intercept = np.polyfit(times, temps, 1)

    # If temperature is dropping or stable, risk is low
    if slope <= 0:
        return 5, None

    # Predict time to hit 130C
    target_time = (130 - intercept) / slope
    mins_remaining = max(0, target_time - len(temps))

    # Probability logic: higher slope = higher immediate risk
    base_probability = min(100, int(slope * 50)) 
    if max_temp > 110:
        base_probability = max(base_probability, 80)
    
    return base_probability, round(mins_remaining, 1)
