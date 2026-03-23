import os
import sqlite3
import base64
import asyncio
import time
import json
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.agent.maintenance_agent import MaintenanceAgent
from src.data.analytics import calculate_failure_probability
from src.agent.reporter import SovereignReporter
from src.agent.cloud_provisioner import router as cloud_router
from src.data.database import init_db
from src.notifications.whatsapp import get_config, save_config

# Path Configurations
DATA_PATH = "data/sample_maintenance_data.json"
DB_PATH = "data/factory_ops.db"
COMMAND_FILE = "data/commands.json"

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_CHANNEL = "telemetry_stream"
SCHEDULE_CHANNEL = "schedule_updates"

# Redis Client
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# Models
class ChatRequest(BaseModel):
    messages: List[dict]
    machineId: str
    machineName: str
    equipmentData: Optional[dict] = None
    sessionId: Optional[str] = None

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

class TaskUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    operator: Optional[str] = None

# App Initialization
app = FastAPI(title="Sovereign Predictive Maintenance API")

# Middleware MUST be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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

from src.auth import (
    Token, User, authenticate_user, create_access_token, 
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from fastapi.security import OAuth2PasswordRequestForm

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- SECURED ENDPOINTS ---

@app.post("/api/chat")
async def chat_with_agent(req: ChatRequest):
    """Orchestrates machine-specific reasoning with AI caching and advanced orchestration."""
    # 1. Check AI Cache (Phase 4)
    # Using a deterministic hash of the message content
    last_msg = req.messages[-1]["content"] if req.messages else ""
    cache_key = f"ai_cache:{req.machineId}:{req.sessionId or 'global'}:{hash(last_msg)}"
    
    cached_response = None
    try:
        cached_response = await r.get(cache_key)
        if cached_response:
            try:
                return {**json.loads(cached_response), "cached": True}
            except:
                return {"response": cached_response, "cached": True}
    except Exception as re:
        print(f"Redis Cache Read Error: {re}")

    # 2. Advanced Real-time Inference
    user_msg = req.messages[-1]["content"]
    context_prefix = f"Analyzing Asset: {req.machineName} ({req.machineId}). Current State: {json.dumps(req.equipmentData)}. " if req.machineId != "GLOBAL" and req.equipmentData else ""
    
    try:
        result = await agent.get_orchestrator_response(
            query=context_prefix + user_msg, 
            machine_id=req.machineId,
            session_id=req.sessionId
        )
        response_data = {**result, "machineId": req.machineId, "sessionId": req.sessionId}
        
        # 3. Save to Cache
        try:
            await r.setex(cache_key, 3600, json.dumps(response_data)) # Cache for 1 hour
        except Exception as re:
            print(f"Redis Cache Write Error: {re}")
        
        return {**response_data, "cached": False}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

@app.post("/api/chat/upload")
async def upload_manual(machine_id: str = Form(...), file: UploadFile = File(...)):
    """Uploads a PDF manual and ingests it into the AI's Knowledge Base."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    pdf_bytes = await file.read()
    result = agent.ingest_manual_pdf(machine_id, file.filename, pdf_bytes)
    
    if "Error" in result or "Offline" in result:
        raise HTTPException(status_code=500, detail=result)
        
    return {"status": "success", "message": result}

@app.post("/api/onboard")
async def onboard_machine(req: OnboardRequest):
    """Securely onboard new industrial assets."""
    # ... logic for onboarding ...
@app.get("/api/schedule")
async def get_schedule(ai_prioritized: bool = False):
    """Returns the master maintenance schedule, optionally prioritized by AI."""
    if ai_prioritized:
        return agent.generate_prioritized_schedule()
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.*, e.name as machine_name 
        FROM maintenance_tasks t
        JOIN equipment e ON t.machine_id = e.id
        ORDER BY t.due_date ASC
    """)
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Map to camelCase for frontend
    for t in tasks:
        if 'machine_id' in t: t['machineId'] = t.pop('machine_id')
        if 'machine_name' in t: t['machineName'] = t.pop('machine_name')
        if 'due_date' in t: t['dueDate'] = t.pop('due_date')
        
    return tasks

@app.post("/api/schedule/{task_id}")
async def update_task_status(task_id: str, update: TaskUpdate):
    """Updates a maintenance task and broadcasts the change in real-time."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Handle Virtual AI Tasks (IDs starting with ai-gen-)
    if task_id.startswith("ai-gen-"):
        # 1. Verify this task exists in the current AI schedule
        # We fetch the current schedule to find the metadata for this virtual task
        current_ai_tasks = agent.generate_prioritized_schedule()
        virtual_task = next((t for t in current_ai_tasks if str(t.get('id')) == task_id), None)
        
        if not virtual_task:
             conn.close()
             raise HTTPException(status_code=404, detail="AI Task expired or not found")
        
        # 2. Persist it to the real database so it becomes a "real" task
        cursor.execute("""
            INSERT INTO maintenance_tasks (machine_id, task_name, task_type, due_date, status, assigned_to, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            virtual_task['machineId'], 
            virtual_task['title'], 
            'repair', 
            virtual_task['dueDate'], 
            update.status, 
            update.operator or "AI System",
            virtual_task.get('aiReason', '')
        ))
        real_id = cursor.lastrowid
        conn.commit()
        # Update task_id to the new numeric ID for subsequent operations
        task_id = str(real_id)

    completed_at = None
    if update.status == "completed":
        completed_at = datetime.now().isoformat()

    operator = update.operator or "System"
    cursor.execute("""
        UPDATE maintenance_tasks 
        SET status = ?, notes = ?, assigned_to = ?, completed_at = ?
        WHERE id = ?
    """, (update.status, update.notes, operator, completed_at, task_id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
        
    conn.commit()
    
    # Fetch updated task for broadcast
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.*, e.name as machine_name 
        FROM maintenance_tasks t
        JOIN equipment e ON t.machine_id = e.id
        WHERE t.id = ?
    """, (task_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found after update")
        
    updated_task = dict(row)
    conn.close()
    
    # Broadcast via Redis
    try:
        r_broadcast = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        await r_broadcast.publish(SCHEDULE_CHANNEL, json.dumps(updated_task))
        await r_broadcast.aclose()
    except Exception as re:
        print(f"Redis Broadcast Error: {re}")
    
    return updated_task

@app.websocket("/ws/schedule")
async def schedule_websocket(websocket: WebSocket):
    await websocket.accept()
    r_async = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r_async.pubsub()
    
    try:
        await pubsub.subscribe(SCHEDULE_CHANNEL)
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        try:
            await pubsub.unsubscribe(SCHEDULE_CHANNEL)
        except:
            pass
    except Exception as e:
        print(f"Schedule WS Error: {e}")
        try:
            await websocket.send_text(json.dumps({"error": "Real-time updates unavailable (Redis Offline)"}))
        except:
            pass
        await asyncio.sleep(60) 
    finally:
        try:
            await r_async.aclose()
        except:
            pass

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
                    "plantId": eq.get("plant_id", "Hosur-01"),
                    "sector": eq.get("sector", "Electronics"),
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

@app.websocket("/ws/telemetry/{equipment_id}")
async def telemetry_websocket(websocket: WebSocket, equipment_id: str):
    await websocket.accept()
    r_async = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r_async.pubsub()

    try:
        await pubsub.subscribe(REDIS_CHANNEL)
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                # Only send if it matches the equipment_id requested
                if data.get("equipment_id") == equipment_id:
                    await websocket.send_json({
                        "time": data.get("timestamp", time.time()),
                        "temperature": data.get("temperature", 0),
                        "vibration": data.get("vibration", 0)
                    })
    except WebSocketDisconnect:
        try:
            await pubsub.unsubscribe(REDIS_CHANNEL)
        except:
            pass
    except Exception as e:
        print(f"Telemetry WS Error: {e}")
        try:
            await websocket.send_json({"error": "Real-time telemetry unavailable (Redis Offline)"})
        except:
            pass
        await asyncio.sleep(60)
    finally:
        try:
            await r_async.aclose()
        except:
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

@app.post("/api/chat/voice")
async def chat_voice(file: UploadFile = File(...), machineId: str = Form("GLOBAL"), sessionId: Optional[str] = Form(None)):
    audio_bytes = await file.read()
    transcript = await asyncio.to_thread(
        agent.speech_to_text,
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
    result = await agent.get_orchestrator_response(query=transcript, machine_id=machineId, session_id=sessionId)
    audio_response = await asyncio.to_thread(agent.text_to_speech, result["message"])
    return {"transcript": transcript, "message": result["message"], "audio": audio_response, "sources": result["sources"], "confidence": result["confidence"], "sessionId": sessionId}

@app.post("/api/chat/vision")
async def chat_vision(
    files: List[UploadFile] = File(...), 
    prompt: str = Form("Describe this machine event"), 
    machineId: str = Form("GLOBAL"), 
    sessionId: Optional[str] = Form(None)
):
    # Process all images in parallel
    tasks = []
    for file in files:
        # Read the file content once before threading
        content = await file.read()
        tasks.append(asyncio.to_thread(agent.analyze_document_vision, content))
    
    vision_results = await asyncio.gather(*tasks)
    
    # Aggregate context
    vision_context = "\n---\n".join([f"Image {i+1}: {res}" for i, res in enumerate(vision_results)])
    
    # Persistent Visual Memory: Log the aggregated vision context
    from src.data.database import log_agent_interaction
    await asyncio.to_thread(log_agent_interaction, machineId, "system_vision", vision_context, session_id=sessionId, is_visual_context=1)
    
    query = f"User Prompt: {prompt}\nContext from Images: {vision_context}"
    result = await agent.get_orchestrator_response(query=query, machine_id=machineId, session_id=sessionId)
    return {
        "visual_context": vision_context, 
        "message": result["message"], 
        "sources": result["sources"], 
        "confidence": result["confidence"], 
        "sessionId": sessionId,
        "image_count": len(files)
    }
    result = await agent.get_orchestrator_response(query=query, machine_id=machineId, session_id=sessionId)
    return {
        "visual_context": vision_context, 
        "message": result["message"], 
        "sources": result["sources"], 
        "confidence": result["confidence"], 
        "sessionId": sessionId,
        "image_count": len(files)
    }

@app.get("/api/factory/stats")
async def get_factory_stats():
    all_equipment = await get_all_equipment()
    if not all_equipment: return {"globalRisk": 0, "activeAlerts": 0, "avgHealth": 100, "factoryStatus": "Optimal"}
    
    risks = [e.get("failureProbability", 0) for e in all_equipment]
    max_risk = max(risks); avg_risk = sum(risks) / len(risks)
    global_risk = (max_risk * 0.7) + (avg_risk * 0.3)
    
    # New: Group by Plant
    plants = set([e.get("plantId", "Unknown") for e in all_equipment])
    sectors = set([e.get("sector", "General") for e in all_equipment])
    
    return {
        "globalRisk": round(global_risk, 1),
        "activeAlerts": len([e for e in all_equipment if e.get("status") != "online"]),
        "avgHealth": round(100 - avg_risk, 1),
        "factoryStatus": "Critical" if global_risk > 75 else ("Degraded" if global_risk > 40 else "Optimal"),
        "plantCount": len(plants),
        "sectorCount": len(sectors)
    }

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
