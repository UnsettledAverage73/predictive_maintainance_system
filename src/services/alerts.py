from typing import Optional

from src.data.database import log_ai_alert
from src.notifications.whatsapp import send_whatsapp_alert


def create_ai_alert(
    equipment_id: str,
    severity: str,
    reason: str,
    prescription: str,
) -> Optional[str]:
    log_ai_alert(equipment_id, severity, reason, prescription)

    if severity.upper() == "CRITICAL":
        return send_whatsapp_alert(
            equipment_id=equipment_id,
            severity=severity.upper(),
            reason=reason,
            prescription=prescription,
        )

    return None
