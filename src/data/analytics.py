import numpy as np

def calculate_failure_probability(readings):
    """
    Analyzes telemetry slope to predict failure.
    Returns: Probability (0-100) and Estimated Minutes to Failure.
    """
    if len(readings) < 5:
        return 0, None

    temps = [r['temperature'] for r in readings]
    times = np.arange(len(temps))

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
    probability = min(100, int(slope * 50)) 
    
    return probability, round(mins_remaining, 1)
