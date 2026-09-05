import json
import os
from datetime import datetime
from urllib import error as urllib_error
from urllib import request as urllib_request

import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "sensor/telemetry"
BACKEND_INGEST_URL = os.getenv("MQTT_INGEST_URL", "http://127.0.0.1:8000/api/iot/ingest")
DEFAULT_SENSOR_KIND = os.getenv("MQTT_SENSOR_KIND", "temperature_humidity")


def forward_to_dashboard(data):
    payload = {
        "equipment_id": data.get("device_id") or "esp32_node_01",
        "sensor_kind": data.get("sensor_kind") or DEFAULT_SENSOR_KIND,
        "temperature": data.get("temperature"),
        "humidity": data.get("humidity"),
        "timestamp": data.get("timestamp") or datetime.now().isoformat(),
        "source": "mqtt",
        "parameters": {
            "humidity": data.get("humidity"),
            "status": data.get("status", "OK"),
        },
    }

    body = json.dumps(payload).encode("utf-8")
    request = urllib_request.Request(
        BACKEND_INGEST_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(request, timeout=3) as response:
            response.read()
        print(f"  └─ Forwarded to dashboard ingest: {payload['equipment_id']}")
    except urllib_error.URLError as exc:
        print(f"  └─ Dashboard ingest unavailable: {exc}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT Broker on {BROKER}. Subscribed to: {TOPIC}")
        client.subscribe(TOPIC)
    else:
        print(f"Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8")
    print(f"[MQTT REALTIME] Topic: {msg.topic} | Payload: {payload}")
    
    # Parse JSON telemetry for processing or dashboard ingestion
    try:
        data = json.loads(payload)
        device_id = data.get("device_id", "esp32_node_01")
        temp = data.get("temperature")
        hum = data.get("humidity")
        status = data.get("status", "OK")
        print(
            f"  └─ Captured -> Device: {device_id} | Temp: {temp}°C | Humidity: {hum}% | Status: {status}\n"
        )
        forward_to_dashboard(data)
    except json.JSONDecodeError:
        pass

def start_consumer():
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"Connecting to MQTT Broker {BROKER}:{PORT}...")
    client.connect(BROKER, PORT, 60)
    client.loop_forever()

if __name__ == "__main__":
    start_consumer()

