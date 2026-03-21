import json
import os
from typing import Optional

CONFIG_FILE = "data/config.json"
TWILIO_SANDBOX_NUMBER = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def get_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {"whatsapp_number": os.getenv("MY_PHONE_NUMBER", "")}


def save_config(config):
    os.makedirs("data", exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)


def send_whatsapp_alert(
    equipment_id: str,
    severity: str,
    reason: str,
    prescription: str,
) -> Optional[str]:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    if not account_sid or not auth_token:
        return None

    config = get_config()
    to_number = (config.get("whatsapp_number") or "").strip()
    if not to_number:
        return None

    try:
        from twilio.rest import Client
    except ImportError:
        print("WhatsApp Dispatch Skipped: twilio dependency is not installed.")
        return None

    client = Client(account_sid, auth_token)
    to_whatsapp = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
    message_body = (
        f"CRITICAL MACHINE ALERT\n\n"
        f"Asset: {equipment_id}\n"
        f"Severity: {severity}\n"
        f"Reason: {reason}\n\n"
        f"AI Prescription:\n{prescription}\n"
    )

    try:
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_SANDBOX_NUMBER,
            to=to_whatsapp,
        )
        return message.sid
    except Exception as exc:
        print(f"WhatsApp Dispatch Error: {exc}")
        return None
