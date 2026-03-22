import requests
import json
import os
import time

BASE_URL = "http://127.0.0.1:8000"

def test_case(name, endpoint, method="POST", payload=None, files=None, data=None):
    print(f"\n=== Running Test Case: {name} ===")
    try:
        if method == "POST":
            if files:
                response = requests.post(f"{BASE_URL}{endpoint}", files=files, data=data)
            elif payload:
                response = requests.post(f"{BASE_URL}{endpoint}", json=payload)
            else:
                response = requests.post(f"{BASE_URL}{endpoint}")
        else:
            response = requests.get(f"{BASE_URL}{endpoint}")
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            res_json = response.json()
            print("Response:", json.dumps(res_json, indent=2))
            return res_json
        else:
            print("Error:", response.text)
            return None
    except Exception as e:
        print(f"Failed: {e}")
        return None

# 1. Predictive Logic
test_case("1. Predictive Logic", "/api/chat", payload={
    "messages": [{"role": "user", "content": "Telemetry: CNC-01 spindle temp 45 to 88C in 15min, vibration 1.8mm/s2. Threshold 90C. Prediction?"}],
    "machineId": "CNC-01",
    "machineName": "CNC Miller"
})

# 2. RAG & Historical Retrieval
test_case("2. RAG & Historical Retrieval", "/api/chat", payload={
    "messages": [{"role": "user", "content": "Technician reports 'high-pitched grinding noise' on Air Compressor. Check historical logs and suggest fix."}],
    "machineId": "COMP-01",
    "machineName": "Air Compressor"
})

# 3. Multilingual & Voice
with open("test_audio.wav", "rb") as f:
    test_case("3. Multilingual & Voice", "/api/chat/voice", files={"file": ("test_audio.wav", f, "audio/wav")}, data={"machineId": "GLOBAL"})

# 4. Vision & OCR
with open("test_image.jpg", "rb") as f:
    test_case("4. Vision & OCR", "/api/chat/vision", files={"file": ("test_image.jpg", f, "image/jpeg")}, data={"prompt": "Analyze this gauge: 120 PSI vs sensor 80 PSI.", "machineId": "PRESS-01"})

# 5. Sovereign Fallback
# We can't easily kill cloud here, but we can check if the response mentions local/ollama if we provide a trigger or just see the current response.
test_case("5. Sovereign Fallback", "/api/chat", payload={
    "messages": [{"role": "user", "content": "Test fallback to local Ollama if Groq fails."}],
    "machineId": "GLOBAL",
    "machineName": "Global"
})

# 6. Automated Mitigation & Safety
test_case("6. Automated Mitigation & Safety", "/api/chat", payload={
    "messages": [{"role": "user", "content": "Motor burnout predicted for Lathe-02. Generate JSON mitigation: throttle 10%, whatsapp alert, schedule inspection."}],
    "machineId": "LATHE-02",
    "machineName": "Heavy Lathe"
})
