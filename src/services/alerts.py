import json
import os
from datetime import datetime
from typing import Optional

import redis

from src.data.database import log_ai_alert
from src.notifications.whatsapp import send_whatsapp_alert

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
ALERT_CHANNEL = os.getenv("ALERT_CHANNEL", "ai_alerts_channel")


def create_ai_alert(
    equipment_id: str,
    severity: str,
    reason: str,
    prescription: str,
) -> Optional[str]:
    alert_id = log_ai_alert(equipment_id, severity, reason, prescription)

    payload = {
        "id": alert_id or f"{equipment_id}-{datetime.now().timestamp()}",
        "equipment_id": equipment_id,
        "severity": severity,
        "reason": reason,
        "prescription": prescription,
        "timestamp": datetime.now().isoformat(),
    }
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        r.publish(ALERT_CHANNEL, json.dumps(payload))
    except Exception:
        pass

    if severity.upper() == "CRITICAL":
        return send_whatsapp_alert(
            equipment_id=equipment_id,
            severity=severity.upper(),
            reason=reason,
            prescription=prescription,
        )

    return None
