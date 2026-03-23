import numpy as np
import sys
import os

# Add src to python path for internal module discovery
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

try:
    import rust_engine
except ImportError:
    rust_engine = None

def calculate_log_risk_score(logs):
    """
    Analyzes textual logs to determine a risk score (0-100).
    Focuses on keyword detection (including Hinglish) and report frequency.
    """
    if not logs:
        return 0

    # Risk Weight Keywords
    CRITICAL_KEYWORDS = ["dhuan", "smoke", "fire", "aag", "breakdown", "shat down", "fail", "total downtime", "leak", "phata"]
    HIGH_KEYWORDS = ["awaz", "noise", "vibration", "vibrate", "garam", "hot", "overheat", "smell", "badhu", "lag", "atki"]
    MEDIUM_KEYWORDS = ["slow", "halki", "minor", "check", "dekho", "servicing", "replacement"]

    score = 0
    recent_logs = logs[:5]  # Only analyze last 5 events
    
    for entry in recent_logs:
        text = str(entry.get('note', '')).lower()
        
        # Keyword matching
        if any(kw in text for kw in CRITICAL_KEYWORDS):
            score += 40
        elif any(kw in text for kw in HIGH_KEYWORDS):
            score += 20
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

    temps = [r['temperature'] for r in readings]
    times = np.arange(len(temps))

    # --- RUST INTEGRATION (Phase 2) ---
    # Use Rust SegmentTree to find max temperature efficiently if many readings
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
    # 130 = slope * target_time + intercept
    target_time = (130 - intercept) / slope
    mins_remaining = max(0, target_time - len(temps))

    # Probability logic: higher slope = higher immediate risk
    # Adjusted probability based on peak temperature from Rust Engine
    base_probability = min(100, int(slope * 50)) 
    if max_temp > 110:
        base_probability = max(base_probability, 80)
    
    return base_probability, round(mins_remaining, 1)
