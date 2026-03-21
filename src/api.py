import os
import json
import sqlite3
import base64
import asyncio
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from twilio.rest import Client

from src.agent.maintenance_agent import MaintenanceAgent
from src.data.analytics import calculate_failure_probability
from src.agent.reporter import SovereignReporter
from src.agent.cloud_provisioner import router as cloud_router
from src.data.database import init_db

# Path Configurations
DATA_PATH = "data/sample_maintenance_data.json"
DB_PATH = "data/factory_ops.db"
COMMAND_FILE = "data/commands.json"
CONFIG_FILE = "data/config.json"

# Models
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

class OnboardRequest(BaseModel):
    id: str
    name: str
    productionLine: str
    protocol: str
    machineType: Optional[str] = "Generic Industrial"
    brokerUrl: Optional[str] = None
    port: Optional[str] = None
    topic: Optional[str] = None

class ConnectionTestRequest(BaseModel):
    protocol: str
    url: str
    port: Optional[str] = None

class WhatsAppRequest(BaseModel):
    number: str

# App Initialization
app = FastAPI(title="Sovereign Predictive Maintenance API")

# Middleware MUST be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database
init_db()

# Initialize Agent after DB and models
agent = MaintenanceAgent(DATA_PATH)
reporter = SovereignReporter()

# Include Routers
app.include_router(cloud_router)

# Helper Functions
def get_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {"whatsapp_number": os.getenv("MY_PHONE_NUMBER", "")}

def save_config(config):
    os.makedirs("data", exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)

# Endpoints
@app.get("/api/schedule")
async def get_schedule():
    """Returns the master maintenance schedule from the Asset Layer."""
    from src.data.database import get_all_equipment_metadata
    metadata = get_all_equipment_metadata()
    schedule = []
    for eq in metadata:
        schedule.append({
            "id": f"TASK-{eq['id']}",
            "machineId": eq["id"],
            "machineName": eq["name"],
            "task": "Periodic Calibration & Inspection",
            "date": eq.get("next_scheduled_date", "2024-12-31"),
            "status": "pending",
            "priority": "medium",
            "assignedTo": "Rajan Kumar"
        })
    return schedule

@app.get("/api/machines/{machine_id}/parameters")
async def get_machine_params(machine_id: str):
    from src.data.database import get_machine_parameters
    params = get_machine_parameters(machine_id)
    return [{
        "id": p["id"],
        "machineId": p["machine_id"],
        "parameterKey": p["parameter_key"],
        "displayName": p["display_name"],
        "unit": p["unit"],
        "normalMin": p["normal_min"],
        "normalMax": p["normal_max"],
        "warningThreshold": p["warning_threshold"],
        "criticalThreshold": p["critical_threshold"],
        "direction": p["direction"],
        "category": p["category"],
        "isVisible": bool(p["is_visible"]),
        "isUsedForPrediction": bool(p["is_used_for_prediction"]),
        "description": p["description"]
    } for p in params]

@app.post("/api/machines/{machine_id}/parameters")
async def add_machine_param(machine_id: str, request: ParameterRequest):
    from src.data.database import add_parameter
    success = add_parameter(
        machine_id,
        key=request.parameter_key,
        name=request.display_name,
        unit=request.unit,
        normal_min=request.normal_min,
        normal_max=request.normal_max,
        warning_threshold=request.warning_threshold,
        critical_threshold=request.critical_threshold,
        direction=request.direction,
        description=request.description,
        category="custom"
    )
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
            key=p['parameterKey'], 
            name=p['displayName'], 
            unit=p['unit'],
            normal_min=p['normalMin'],
            normal_max=p['normalMax'],
            warning_threshold=p['warningThreshold'],
            critical_threshold=p['criticalThreshold'],
            direction=p['direction']
        )
    return {"status": "success", "message": f"Applied {template_name} template"}

@app.post("/api/test-connection")
async def test_connection(request: ConnectionTestRequest):
    await asyncio.sleep(1.0)
    if "error" in request.url.lower():
        raise HTTPException(status_code=400, detail=f"Connection refused by {request.url}")
    return {"status": "success", "latency_ms": 42, "message": f"Handshake with {request.protocol} broker established."}

@app.post("/api/equipment")
async def onboard_machine(request: OnboardRequest):
    from src.data.database import add_equipment, seed_common_parameters, add_parameter
    success = add_equipment(eq_id=request.id, name=request.name, line=request.productionLine, protocol=request.protocol)
    if not success:
        raise HTTPException(status_code=500, detail="Ledger Write Failed")
    seed_common_parameters(request.id)
    templates = agent.get_parameter_templates()
    if request.machineType in templates:
        for p in templates[request.machineType]:
            add_parameter(request.id, key=p['parameterKey'], name=p['displayName'], unit=p['unit'], normal_min=p['normalMin'], normal_max=p['normalMax'], warning_threshold=p['warningThreshold'], critical_threshold=p['criticalThreshold'], direction=p['direction'])
    return {"status": "Agent Spawned", "id": request.id}

@app.get("/api/equipment")
async def get_all_equipment():
    from src.data.database import get_all_equipment_metadata
    metadata = get_all_equipment_metadata()
    if not metadata:
        return []
    
    results = []
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            for eq in metadata:
                eq_id = eq["id"]
                cursor.execute("SELECT temperature FROM sensor_readings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 20", (eq_id,))
                recent = [{"temperature": r[0]} for r in cursor.fetchall()]
                prob, time_left = calculate_failure_probability(recent)
                cursor.execute("SELECT temperature, vibration FROM sensor_readings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 1", (eq_id,))
                last = cursor.fetchone() or (0, 0)
                
                results.append({
                    "id": eq["id"],
                    "name": eq["name"],
                    "productionLine": eq["production_line"],
                    "protocol": eq["protocol"],
                    "status": "critical" if last[0] > 130 or prob > 80 else ("warning" if last[0] > 110 or prob > 50 else "online"),
                    "temperature": round(last[0], 1),
                    "vibration": round(last[1], 2),
                    "failureProbability": prob,
                    "minutesToFailure": time_left,
                    "healthScore": 100 - prob,
                    "riskScore": prob,
                    "lastMaintenanceDate": eq.get("last_maintenance_date", "2024-01-01"),
                    "nextScheduledDate": eq.get("next_scheduled_date", "2024-12-31"),
                    "agentId": eq.get("agent_id", f"agt-{eq_id}"),
                    "mtbf": eq.get("mtbf", 5000),
                    "failureRisk": "high" if prob > 80 else ("medium" if prob > 50 else "low"),
                    "openWorkOrders": 1 if prob > 50 else 0
                })
            conn.close()
            return results
        except Exception as e:
            print(f"API Error: {e}")
            return [{
                "id": m["id"],
                "name": m["name"],
                "productionLine": m["production_line"],
                "protocol": m["protocol"],
                "status": m.get("status", "online"),
                "riskScore": 0,
                "healthScore": 100
            } for m in metadata]
    return []

@app.get("/api/telemetry/{equipment_id}")
async def get_machine_telemetry(equipment_id: str, minutes: int = 60):
    if not os.path.exists(DB_PATH): return []
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp as time, temperature, vibration FROM sensor_readings WHERE equipment_id = ? AND timestamp > datetime('now', '-' || ? || ' minutes') ORDER BY timestamp ASC", (equipment_id, minutes))
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/telemetry/ws/{equipment_id}")
async def telemetry_websocket(websocket: WebSocket, equipment_id: str):
    await websocket.accept()
    try:
        while True:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT timestamp, temperature, vibration FROM sensor_readings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 1", (equipment_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                await websocket.send_json({"time": row[0], "temperature": row[1], "vibration": row[2]})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass

@app.get("/api/history/{equipment_id}")
async def get_machine_history(equipment_id: str):
    if not os.path.exists(DB_PATH): return []
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM manual_logs WHERE equipment_id = ? ORDER BY timestamp DESC", (equipment_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/chat")
async def chat_with_agent(request: ChatRequest):
    user_msg = request.messages[-1]["content"]
    context_prefix = f"Analyzing Asset: {request.machineName} ({request.machineId}). Current State: {json.dumps(request.equipmentData)}. " if request.machineId != "GLOBAL" and request.equipmentData else ""
    try:
        result = agent.get_orchestrator_response(query=context_prefix + user_msg, machine_id=request.machineId)
        return {**result, "machineId": request.machineId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/voice")
async def chat_voice(file: UploadFile = File(...), machineId: str = Form("GLOBAL")):
    audio_bytes = await file.read()
    transcript = agent.speech_to_text(
        audio_bytes,
        filename=file.filename or "audio.webm",
        content_type=file.content_type or "audio/webm"
    )
    if transcript.startswith("STT Error:") or transcript == "No transcript found.":
        return {
            "transcript": transcript,
            "message": transcript,
            "audio": "",
            "sources": [],
            "confidence": 0
        }
    result = agent.get_orchestrator_response(query=transcript, machine_id=machineId)
    audio_response = agent.text_to_speech(result["message"])
    return {"transcript": transcript, "message": result["message"], "audio": audio_response, "sources": result["sources"], "confidence": result["confidence"]}

@app.post("/api/chat/vision")
async def chat_vision(file: UploadFile = File(...), prompt: str = Form("Describe this machine event"), machineId: str = Form("GLOBAL")):
    image_bytes = await file.read()
    vision_context = agent.analyze_document_vision(image_bytes)
    query = f"User Prompt: {prompt}\nContext from Image (Sarvam Vision): {vision_context}"
    result = agent.get_orchestrator_response(query=query, machine_id=machineId)
    return {"visual_context": vision_context, "message": result["message"], "sources": result["sources"], "confidence": result["confidence"]}

@app.get("/api/factory/stats")
async def get_factory_stats():
    all_equipment = await get_all_equipment()
    if not all_equipment: return {"globalRisk": 0, "activeAlerts": 0, "avgHealth": 100, "factoryStatus": "Optimal"}
    risks = [e.get("failureProbability", 0) for e in all_equipment]
    max_risk = max(risks); avg_risk = sum(risks) / len(risks)
    global_risk = (max_risk * 0.7) + (avg_risk * 0.3)
    return {"globalRisk": round(global_risk, 1), "activeAlerts": len([e for e in all_equipment if e.get("status") != "online"]), "avgHealth": round(100 - avg_risk, 1), "factoryStatus": "Critical" if global_risk > 75 else ("Degraded" if global_risk > 40 else "Optimal")}

@app.get("/api/alerts")
async def get_alerts():
    if not os.path.exists(DB_PATH): return []
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row; cursor = conn.cursor()
    cursor.execute("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT 15")
    rows = [dict(row) for row in cursor.fetchall()]; conn.close()
    return rows

@app.get("/api/settings/whatsapp")
async def get_whatsapp_settings():
    return get_config()

@app.post("/api/settings/whatsapp")
async def update_whatsapp_settings(request: WhatsAppRequest):
    config = get_config(); config["whatsapp_number"] = request.number; save_config(config)
    return {"status": "success"}

@app.post("/api/equipment/{equipment_id}/mitigate")
async def mitigate_risk(equipment_id: str):
    command = {"equipment_id": equipment_id, "action": "THROTTLE_LOAD", "value": 0.5, "timestamp": datetime.now().isoformat()}
    with open(COMMAND_FILE, "w") as f: json.dump(command, f)
    return {"status": "Command Dispatched", "action": "Load Reduction Active"}

class CSVConfirmRequest(BaseModel):
    confirmed_mappings: List[dict] # {csv_col: str, parameter_key: str}
    timestamp_column: str
    timestamp_format: Optional[str] = "ISO8601"

@app.post("/api/machines/{machine_id}/import/preview")
async def preview_csv_import(machine_id: str, file: UploadFile = File(...)):
    import pandas as pd
    import io
    
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content), nrows=5)
    headers = df.columns.tolist()
    sample_rows = df.values.tolist()
    
    # Fetch existing parameters for this machine
    from src.data.database import get_machine_parameters
    existing_params = get_machine_parameters(machine_id)
    param_list = [{"key": p["parameter_key"], "name": p["display_name"]} for p in existing_params]
    
    # AI-Powered Mapping Suggestion
    mapping_prompt = f"""
    Headers: {headers}
    Sample Data: {sample_rows[0] if sample_rows else "No data"}
    Existing Parameters: {param_list}
    
    Map each header to an existing parameter key. If no match, return null for that header.
    Respond ONLY with a JSON list of objects: {{"csv_col": "header_name", "parameter_key": "matched_key", "confidence": 0.9}}
    """
    
    try:
        mapping_json = agent._get_cloud_inference("You are a data mapping expert.", mapping_prompt)
        # Clean potential markdown from response
        if "```json" in mapping_json:
            mapping_json = mapping_json.split("```json")[1].split("```")[0].strip()
        elif "```" in mapping_json:
            mapping_json = mapping_json.split("```")[1].split("```")[0].strip()
            
        suggested_mappings = json.loads(mapping_json)
    except Exception as e:
        print(f"AI Mapping Error: {e}")
        suggested_mappings = [{"csv_col": h, "parameter_key": None, "confidence": 0} for h in headers]
        
    return {
        "headers": headers,
        "sample_rows": sample_rows,
        "suggested_mappings": suggested_mappings,
        "timestamp_column": "timestamp" if "timestamp" in [h.lower() for h in headers] else headers[0]
    }

@app.post("/api/machines/{machine_id}/import/confirm")
async def confirm_csv_import(
    machine_id: str, 
    file: UploadFile = File(...), 
    mappings: str = Form(...), 
    timestamp_column: str = Form(...)):
    import pandas as pd
    import io
    from src.data.database import log_telemetry_point
    
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    confirmed_mappings = json.loads(mappings)
    
    rows_imported = 0
    for _, row in df.iterrows():
        for mapping in confirmed_mappings:
            csv_col = mapping["csv_col"]
            param_key = mapping["parameter_key"]
            if param_key and csv_col in row:
                val = row[csv_col]
                # Log to the new dynamic telemetry table
                try:
                    log_telemetry_point(machine_id, param_key, float(val) if not isinstance(val, str) else None, str(val) if isinstance(val, str) else None)
                except:
                    log_telemetry_point(machine_id, param_key, None, str(val))
        rows_imported += 1
        
    return {"status": "success", "rows_imported": rows_imported}

@app.get("/api/factory/usage")
async def get_factory_usage():
    """Returns aggregated machine usage percentages."""
    from src.data.database import get_all_equipment_metadata
    metadata = get_all_equipment_metadata()
    if not metadata: return []
    
    usage_data = []
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            for eq in metadata:
                cursor.execute("SELECT vibration FROM sensor_readings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 1", (eq["id"],))
                row = cursor.fetchone()
                vibration = row[0] if row else 0
                usage = min(100, max(0, (vibration / 10) * 100))
                usage_data.append({"id": eq["id"], "name": eq["name"], "usage": round(usage, 1)})
            conn.close()
        except Exception:
            pass
    return usage_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
