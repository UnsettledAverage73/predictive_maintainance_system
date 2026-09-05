#!/usr/bin/env python3
"""
USB Serial Telemetry Bridge for ESP32 Predictive Maintenance Node.
Reads live sensor telemetry directly from ESP32 USB serial and forwards
it to the local API ingest endpoint in real-time.
"""

import sys
import time
import json
import urllib.request
import urllib.error
import glob
import os

INGEST_URL = os.getenv("IOT_INGEST_URL", "http://127.0.0.1:8000/api/iot/ingest")
DEFAULT_BAUD = 115200


def find_serial_port():
    candidates = glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*")
    return candidates[0] if candidates else None


def forward_payload(payload_str):
    try:
        data = json.loads(payload_str)
        req = urllib.request.Request(
            INGEST_URL,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = resp.read().decode("utf-8")
            resp_data = json.loads(body)
            eq_id = data.get("equipment_id", "Unknown")
            params = data.get("parameters", {})
            temp = params.get("temperature", "-")
            curr = params.get("current_draw", "-")
            rpm = params.get("rpm", "-")
            print(f"[LIVE STREAM] {eq_id} -> Temp: {temp}°C | Current: {curr}A | RPM: {rpm} | Ingest: OK")
            cmd = resp_data.get("command")
            if cmd:
                print(f"  └─>>> Dispatched Command from Server: {cmd}")
    except Exception as exc:
        print(f"[Bridge Warning] Ingest forwarding error: {exc}")


def run_bridge(port=None):
    try:
        import serial
    except ImportError:
        print("Error: pyserial is required. Install via `pip install pyserial`.")
        sys.exit(1)

    while True:
        target_port = port or find_serial_port()
        if not target_port or not os.path.exists(target_port):
            print("[Bridge] Waiting for ESP32 USB connection on /dev/ttyUSB*...")
            time.sleep(2)
            continue

        try:
            print(f"--- [SOVEREIGN BRIDGE] Connecting to ESP32 on {target_port} ({DEFAULT_BAUD} baud) ---")
            ser = serial.Serial(target_port, DEFAULT_BAUD, timeout=1)
            time.sleep(1)

            while True:
                line = ser.readline().decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                if "[JSON_TELEMETRY]" in line:
                    json_str = line.split("[JSON_TELEMETRY]", 1)[1].strip()
                    forward_payload(json_str)

        except serial.SerialException as se:
            print(f"[Bridge Error] Serial connection lost: {se}. Reconnecting in 3s...")
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n[Bridge] Exiting on user request.")
            break


if __name__ == "__main__":
    port_arg = sys.argv[1] if len(sys.argv) > 1 else "/dev/ttyUSB0"
    run_bridge(port_arg)
