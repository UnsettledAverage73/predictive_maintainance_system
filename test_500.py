import requests
import json
import time
import subprocess

# Start uvicorn in a subprocess and capture its stderr
proc = subprocess.Popen(
    ["python3", "-m", "uvicorn", "src.api:app", "--port", "8002"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

# Wait for it to start
time.sleep(5)

try:
    # Send the request
    url = "http://127.0.0.1:8002/api/chat"
    payload = {"messages": [{"role": "user", "content": "test"}], "machineId": "GLOBAL", "machineName": "Test"}
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
finally:
    # Read the logs
    proc.terminate()
    logs, _ = proc.communicate(timeout=2)
    print("--- LOGS ---")
    print(logs)
