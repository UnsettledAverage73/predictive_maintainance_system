import os
import json
import sqlite3
import base64
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from twilio.rest import Client
from src.agent.maintenance_agent import MaintenanceAgent
from src.data.analytics import calculate_failure_probability
from src.agent.reporter import SovereignReporter

app = FastAPI(title="Sovereign Predictive Maintenance API")
reporter = SovereignReporter()

# Enable CORS for Next.js (port 3000) integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production: replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = "data/sample_maintenance_data.json"
IOT_PATH = "data/iot_stream.json"
DB_PATH = "data/factory_ops.db"
COMMAND_FILE = "data/commands.json"

# Initialize AI Agent with context windowing
agent = MaintenanceAgent(DATA_PATH)

class ChatRequest(BaseModel):
    messages: List[dict]
    machineId: str
    machineName: str
    equipmentData: Optional[dict] = None

class RepairRequest(BaseModel):
    equipment_id: str
    operator_name: str
    action_taken: str
    parts_replaced: Optional[str] = "None"
    alert_id: Optional[int] = None

class ParameterRequest(BaseModel):
    parameter_key: str
    display_name: str
    unit: Optional[str] = None
    normal_min: Optional[float] = None
    normal_max: Optional[float] = None
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    direction: Optional[str] = "above"
    description: Optional[str] = None

@app.get("/api/machines/{machine_id}/parameters")
async def get_machine_params(machine_id: str):
    from src.data.database import get_machine_parameters
    return get_machine_parameters(machine_id)

@app.post("/api/machines/{machine_id}/parameters")
async def add_machine_param(machine_id: str, request: ParameterRequest):
    from src.data.database import add_parameter
    success = add_parameter(machine_id, **request.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add parameter")
    return {"status": "success"}

@app.get("/api/machines/templates")
async def get_templates():
    return agent.get_parameter_templates()

@app.post("/api/machines/{machine_id}/parameters/template/{template_name}")
async def apply_template(machine_id: str, template_name: str):
    from src.data.database import add_parameter
    templates = agent.get_parameter_templates()
    if template_name not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for p in templates[template_name]:
        add_parameter(
            machine_id, 
            key=p['key'], 
            name=p['name'], 
            unit=p['unit'],
            normal_min=p['n_min'],
            normal_max=p['n_max'],
            warning_threshold=p['w_th'],
            critical_threshold=p['c_th'],
            direction=p['dir']
        )
    return {"status": "success", "message": f"Applied {template_name} template"}

class ConnectionTestRequest(BaseModel):
    protocol: str
    url: str
    port: Optional[str] = None

@app.post("/api/test-connection")
async def test_connection(request: ConnectionTestRequest):
    """
    Sovereign Connection Probe: 
    Validates if the target machine/broker is reachable.
    """
    # In a real scenario, you'd attempt a socket connection or ping
    import time
    time.sleep(1.5) # Simulate network latency
    
    if "error" in request.url.lower():
        raise HTTPException(status_code=400, detail=f"Connection refused by {request.url}")
        
    return {"status": "success", "latency_ms": 42, "message": f"Handshake with {request.protocol} broker established."}

CONFIG_FILE = "data/config.json"

class WhatsAppRequest(BaseModel):
    number: str

def get_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {"whatsapp_number": os.getenv("MY_PHONE_NUMBER", "")}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)

def send_whatsapp_alert(equipment_id: str, severity: str, prescription: str):
    """
    Sovereign Protocol: Escalates critical anomalies to WhatsApp.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    if not account_sid or not auth_token:
        return None
        
    config = get_config()
    to_number = config.get("whatsapp_number")
    if not to_number:
        return None

    from_whatsapp = "whatsapp:+14155238886" # Twilio Sandbox Number
    to_whatsapp = f"whatsapp:{to_number}"

    client = Client(account_sid, auth_token)

    # Industrial Grade Alert Formatting
    message_body = (
        f"🚨 *SOVEREIGN INDUSTRIAL ALERT*\n\n"
        f"*Asset:* {equipment_id}\n"
        f"*Severity:* {severity.upper()}\n\n"
        f"*AI Prescription:* \n_{prescription}_\n\n"
        f"Check Dashboard: http://localhost:3000/dashboard/alerts"
    )

    try:
        message = client.messages.create(
            body=message_body,
            from_=from_whatsapp,
            to=to_whatsapp
        )
        return message.sid
    except Exception as e:
        print(f"WhatsApp Dispatch Error: {e}")
        return None

@app.post("/api/chat")
async def chat_with_agent(request: ChatRequest):
    """
    Sovereign Deep Reasoning: 
    Connects the Frontend Orchestrator to the Multi-Agent Backend.
    """
    user_msg = request.messages[-1]["content"]
    
    # Enrich context if machine specific
    context_prefix = ""
    if request.machineId != "GLOBAL" and request.equipmentData:
        context_prefix = f"Analyzing Asset: {request.machineName} ({request.machineId}). Current State: {json.dumps(request.equipmentData)}. "

    try:
        # Call the upgraded Orchestrator logic
        result = agent.get_orchestrator_response(
            query=context_prefix + user_msg, 
            machine_id=request.machineId
        )
        
        return {
            "message": result["message"],
            "sources": result["sources"],
            "confidence": result["confidence"],
            "machineId": request.machineId
        }
    except Exception as e:
        print(f"Orchestrator Failure: {e}")
        raise HTTPException(status_code=500, detail="Neural link to Sovereign Brain severed.")
    
@app.post("/api/equipment")
async def onboard_machine(request: OnboardRequest):
    """Onboards a new machine into the system."""
    from src.data.database import add_equipment
    success = add_equipment(
        request.id,
        request.name,
        request.productionLine,
        request.protocol
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to onboard machine")
    return {"status": "success", "message": f"Machine {request.name} onboarded successfully"}

@app.post("/api/logs")
async def log_repair(request: RepairRequest):
    """
    The Sovereign Feedback Entrypoint.
    Records the human fix, actuates hardware recovery, and injects knowledge into AI memory.
    """
    from src.data.database import log_manual_repair
    
    # 1. Commit to the Local SQL Ledger (Audit Trail)
    log_id = log_manual_repair(
        request.equipment_id, 
        request.operator_name, 
        request.action_taken, 
        request.parts_replaced,
        request.alert_id
    )
    
    if not log_id:
        raise HTTPException(status_code=500, detail="Failed to write to Sovereign Ledger")

    # 2. Sovereign Actuation: Tell the Simulator the machine is fixed!
    try:
        command = {
            "equipment_id": request.equipment_id,
            "action": "RESET_LOAD", # Return to 100% power
            "value": 1.0,
            "timestamp": datetime.now().isoformat()
        }
        with open(COMMAND_FILE, "w") as f:
            json.dump(command, f)
    except Exception as e:
        print(f"Actuation Error: {e}")

    # 3. Synchronize with Vector Memory (RAG Learning)
    try:
        memory_status = agent.ingest_human_fix(request.equipment_id, request.action_taken)
        return {
            "status": "success",
            "log_id": log_id,
            "memory_sync": memory_status,
            "message": f"Fix recorded for {request.equipment_id}. Knowledge absorbed. Machine returning to full capacity."
        }
    except Exception as e:
        return {"status": "partial_success", "log_id": log_id, "error": str(e)}

@app.get("/api/schedule")
async def get_maintenance_schedule():
    """Returns the AI-prioritized maintenance schedule."""
    tasks = agent.generate_prioritized_schedule()
    return tasks

@app.get("/api/factory/report")
async def get_daily_report():
    """Generates the 24-hour Sovereign Intelligence Brief."""
    report_text = reporter.generate_daily_brief()
    return {
        "generated_at": datetime.now().isoformat(),
        "report": report_text
    }

@app.get("/api/history/{equipment_id}")
async def get_machine_history(equipment_id: str):
    """Retrieves the full human-fix history for a specific asset."""
    if not os.path.exists(DB_PATH):
        return []
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM manual_logs 
            WHERE equipment_id = ? 
            ORDER BY timestamp DESC
        """, (equipment_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception:
        return []

@app.get("/api/equipment")
async def get_all_equipment():
    """
    Sovereign Intelligence Layer: Merges metadata with real-time 
    telemetry and runs a Linear Regression slope analysis for RUL prediction.
    """
    from src.data.database import get_all_equipment_metadata
    
    # 1. Pull registered equipment metadata
    try:
        equipment_metadata = get_all_equipment_metadata()
    except Exception:
        equipment_metadata = []
    
    # Fallback to demo data if empty
    if not equipment_metadata:
        static_data = agent._load_data()
        equipment_ids = set()
        for log in static_data.get("maintenance_logs", []):
            equipment_ids.add(log["equipment_id"])
        
        for eq_id in equipment_ids:
            name = next((log["equipment_name"] for log in static_data["maintenance_logs"] if log["equipment_id"] == eq_id), eq_id)
            equipment_metadata.append({
                "id": eq_id,
                "name": name,
                "production_line": "Line " + str(hash(eq_id) % 3 + 1),
                "protocol": ["OPC-UA", "MQTT", "Modbus"][hash(eq_id) % 3],
                "status": "online",
                "mtbf": 4000 + (hash(eq_id) % 2000),
                "last_maintenance_date": "2024-02-28",
                "next_scheduled_date": "2024-12-01",
                "agent_id": f"agt-{eq_id}"
            })

    # 2. Pull latest telemetry
    live_telemetry = {}
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s1.equipment_id, s1.temperature, s1.vibration 
                FROM sensor_readings s1
                JOIN (SELECT equipment_id, MAX(timestamp) as max_ts FROM sensor_readings GROUP BY equipment_id) s2
                ON s1.equipment_id = s2.equipment_id AND s1.timestamp = s2.max_ts
            """)
            rows = cursor.fetchall()
            for r in rows:
                live_telemetry[r[0]] = {"temperature": r[1], "vibration": r[2]}
            
            results = []
            for eq in equipment_metadata:
                eq_id = eq["id"]
                stats = live_telemetry.get(eq_id, {"temperature": 0, "vibration": 0})
                temp = stats.get("temperature", 0)
                vib = stats.get("vibration", 0)

                # 3. Analytics
                cursor.execute("""
                    SELECT temperature FROM sensor_readings 
                    WHERE equipment_id = ? 
                    ORDER BY timestamp DESC LIMIT 20
                """, (eq_id,))
                recent_temps = [{"temperature": r[0]} for r in cursor.fetchall()]
                
                prob, time_left = calculate_failure_probability(recent_temps)

                # 4. Decision Logic
                is_critical = temp > 130 or prob > 80
                is_warning = temp > 110 or prob > 50

                results.append({
                    "id": eq_id,
                    "name": eq["name"],
                    "type": "Industrial Asset",
                    "status": "critical" if is_critical else ("warning" if is_warning else "online"),
                    "temperature": round(temp, 1),
                    "vibration": round(vib, 2),
                    "failureProbability": prob,
                    "minutesToFailure": time_left,
                    "healthScore": 100 - prob,
                    "riskScore": prob,
                    "efficiency": round(95 - (prob * 0.3), 1),
                    "lastMaintenanceDate": eq.get("last_maintenance_date", "2024-01-01"),
                    "nextScheduledDate": eq.get("next_scheduled_date", "2024-12-31"),
                    "failureRisk": "high" if is_critical else ("medium" if is_warning else "low"),
                    "productionLine": eq.get("production_line", "Line 1"),
                    "protocol": eq.get("protocol", "MQTT"),
                    "mtbf": eq.get("mtbf", 5000),
                    "openWorkOrders": 1 if is_warning or is_critical else 0,
                    "agentId": eq.get("agent_id", f"agt-{eq_id}")
                })
            
            conn.close()
            return results
        except Exception as e:
            print(f"Sovereign API Error: {e}")
            return []

    return []

@app.get("/api/telemetry/{equipment_id}")
async def get_machine_telemetry(equipment_id: str):
    """Fetches real-time telemetry for the chart."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Fetch last 50 points for the graph
    cursor.execute("""
        SELECT timestamp as time, temperature, vibration 
        FROM sensor_readings 
        WHERE equipment_id = ? 
        ORDER BY timestamp DESC LIMIT 50
    """, (equipment_id,))
    
    # Reverse so time flows left-to-right on the chart
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows[::-1]

@app.get("/api/history/{equipment_id}")
async def get_machine_history(equipment_id: str):
    """Fetches the repair history for the table."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Pulling from your manual logs or alerts table
    cursor.execute("""
        SELECT timestamp, action_taken, operator_name 
        FROM manual_logs 
        WHERE equipment_id = ? 
        ORDER BY timestamp DESC
    """, (equipment_id,))
    
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/equipment/{equipment_id}/mitigate")
async def mitigate_risk(equipment_id: str):
    """
    Sovereign Intervention: Sends a 'Throttling' command.
    """
    command = {
        "equipment_id": equipment_id,
        "action": "THROTTLE_LOAD",
        "value": 0.5,
        "timestamp": datetime.now().isoformat()
    }
    
    with open(COMMAND_FILE, "w") as f:
        json.dump(command, f)
        
    return {"status": "Command Dispatched", "action": "Load Reduction Active"}

@app.get("/api/factory/stats")
async def get_factory_stats():
    """
    Sovereign Executive Summary.
    """
    all_equipment = await get_all_equipment()
    if not all_equipment:
        return {"globalRisk": 0, "activeAlerts": 0, "avgHealth": 100, "factoryStatus": "N/A"}

    risks = [e["failureProbability"] for e in all_equipment]
    max_risk = max(risks)
    avg_risk = sum(risks) / len(risks)
    global_risk_index = (max_risk * 0.7) + (avg_risk * 0.3)
    active_alerts = len([e for e in all_equipment if e["status"] != "online"])

    return {
        "globalRisk": round(global_risk_index, 1),
        "activeAlerts": active_alerts,
        "avgHealth": round(100 - avg_risk, 1),
        "factoryStatus": "Critical" if global_risk_index > 75 else ("Degraded" if global_risk_index > 40 else "Optimal")
    }

class OnboardRequest(BaseModel):
    id: str
    name: str
    productionLine: str
    protocol: str
    machineType: Optional[str] = "Generic Industrial"
    brokerUrl: Optional[str] = None
    port: Optional[str] = None
    topic: Optional[str] = None

@app.post("/api/equipment")
async def onboard_machine(request: OnboardRequest):
    """
    Sovereign Onboarding: 
    Validates machine parameters and registers it in the Global Asset Registry.
    """
    from src.data.database import add_equipment, seed_common_parameters, add_parameter
    
    success = add_equipment(
        id=request.id,
        name=request.name,
        production_line=request.productionLine,
        protocol=request.protocol
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Ledger Write Failed")

    # 1. Seed Universal Parameters
    seed_common_parameters(request.id)

    # 2. Seed Template Parameters if applicable
    templates = agent.get_parameter_templates()
    if request.machineType in templates:
        for p in templates[request.machineType]:
            add_parameter(
                request.id, 
                key=p['key'], 
                name=p['name'], 
                unit=p['unit'],
                normal_min=p['n_min'],
                normal_max=p['n_max'],
                warning_threshold=p['w_th'],
                critical_threshold=p['c_th'],
                direction=p['dir']
            )

    return {"status": "Agent Spawned", "id": request.id}

@app.get("/api/telemetry/{equipment_id}")
async def get_machine_telemetry(equipment_id: str, minutes: int = 60):
    """Retrieves time-series data."""
    if not os.path.exists(DB_PATH):
        return []

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, temperature, vibration 
            FROM sensor_readings 
            WHERE equipment_id = ? 
            AND timestamp > datetime('now', '-' || ? || ' minutes')
            ORDER BY timestamp ASC
        """, (equipment_id, minutes))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
async def get_alerts():
    """Retrieves AI strategic prescriptions."""
    if not os.path.exists(DB_PATH):
        return []

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT 15")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception:
        return []

@app.post("/api/chat/voice")
async def chat_voice(file: UploadFile = File(...), machineId: str = Form("GLOBAL")):
    """
    Voice-to-Voice: STT -> Agent -> TTS.
    """
    audio_bytes = await file.read()
    
    # 1. Speech-to-Text
    transcript = agent.speech_to_text(audio_bytes)
    
    # 2. Agent Logic
    result = agent.get_orchestrator_response(query=transcript, machine_id=machineId)
    
    # 3. Text-to-Speech
    audio_response = agent.text_to_speech(result["message"])
    
    return {
        "transcript": transcript,
        "message": result["message"],
        "audio": audio_response, # Base64 string
        "sources": result["sources"],
        "confidence": result["confidence"]
    }

@app.post("/api/chat/vision")
async def chat_vision(file: UploadFile = File(...), prompt: str = Form("Describe this machine event"), machineId: str = Form("GLOBAL")):
    """
    Multimodal: Image Analysis -> Agent response.
    """
    image_bytes = await file.read()
    
    # 1. Image context extraction
    vision_context = agent.analyze_document_vision(image_bytes)
    
    # 2. Combined reasoning
    query = f"User Prompt: {prompt}\nContext from Image (Sarvam Vision): {vision_context}"
    result = agent.get_orchestrator_response(query=query, machine_id=machineId)
    
    return {
        "visual_context": vision_context,
        "message": result["message"],
        "sources": result["sources"],
        "confidence": result["confidence"]
    }

@app.get("/api/settings/whatsapp")
async def get_whatsapp_settings():
    return get_config()

@app.post("/api/settings/whatsapp")
async def update_whatsapp_settings(request: WhatsAppRequest):
    config = get_config()
    config["whatsapp_number"] = request.number
    save_config(config)
    return {"status": "success", "message": "WhatsApp number updated."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
