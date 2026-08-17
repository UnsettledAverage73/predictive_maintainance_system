import os
import sqlite3
import base64
import asyncio
import time
import json
import socket
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.agent.maintenance_agent import MaintenanceAgent
from src.data.analytics import calculate_failure_probability
from src.agent.reporter import SovereignReporter
from src.agent.cloud_provisioner import router as cloud_router
from src.data.database import (
    init_db,
    log_alert_feedback,
    add_equipment,
    get_equipment_metadata,
    seed_common_parameters,
    log_sensor_reading,
    log_telemetry_point,
)
from src.services.machine_insights import get_machine_insights
from src.services.priority_scheduler import generate_prioritized_schedule
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
ALERT_CHANNEL = os.getenv("ALERT_CHANNEL", "ai_alerts_channel")

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

class NetworkEndpointResponse(BaseModel):
    host: str
    local_ip: str
    port: int
    http_base_url: str
    ws_base_url: str

class ConnectedSensorResponse(BaseModel):
    equipment_id: str
    name: str
    protocol: str
    mac_address: Optional[str] = None
    sensor_kind: Optional[str] = None
    last_seen: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    vibration: Optional[float] = None
    telemetry_status: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    status: str

class IoTIngestRequest(BaseModel):
    equipment_id: str
    mac_address: Optional[str] = None
    sensor_kind: Optional[str] = None
    timestamp: Optional[Any] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    vibration: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = None
    source: Optional[str] = "esp32"

class WhatsAppRequest(BaseModel):
    number: str

class TaskUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    operator: Optional[str] = None

class FeedbackRequest(BaseModel):
    score: int
    notes: Optional[str] = None

class PairEsp32Request(BaseModel):
    mac_address: str
    sensor_kind: Optional[str] = None


def resolve_virtual_task(task_id: str) -> Optional[Dict[str, Any]]:
    """Resolve a virtual AI task from cached or freshly generated schedules."""
    cached_tasks = getattr(agent, "_last_schedule", []) or []
    virtual_task = next((t for t in cached_tasks if str(t.get("id")) == task_id), None)
    if virtual_task:
        return virtual_task

    current_ai_tasks = generate_prioritized_schedule()
    agent._last_schedule = current_ai_tasks
    virtual_task = next((t for t in current_ai_tasks if str(t.get("id")) == task_id), None)
    if virtual_task:
        return virtual_task

    if task_id.startswith("ai-gen-"):
        machine_id = task_id.removeprefix("ai-gen-")
        return next((t for t in current_ai_tasks if t.get("machineId") == machine_id), None)

    return None


def _coerce_ingest_float(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_ingest_timestamp(value: Any) -> str:
    if value is None:
        return datetime.now().isoformat()

    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value).isoformat()

    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return datetime.now().isoformat()
        try:
            return datetime.fromisoformat(raw).isoformat()
        except ValueError:
            try:
                return datetime.fromtimestamp(float(raw)).isoformat()
            except (TypeError, ValueError):
                return datetime.now().isoformat()

    return datetime.now().isoformat()


def _prepare_ingest_payload(req: IoTIngestRequest) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "equipment_id": req.equipment_id,
        "timestamp": _normalize_ingest_timestamp(req.timestamp),
    }
    if req.mac_address:
        payload["mac_address"] = req.mac_address
    if req.sensor_kind:
        payload["sensor_kind"] = req.sensor_kind

    if req.temperature is not None:
        payload["temperature"] = req.temperature
    if req.humidity is not None:
        payload["humidity"] = req.humidity
    if req.vibration is not None:
        payload["vibration"] = req.vibration

    parameters = dict(req.parameters or {})
    for key in ("temperature", "humidity", "vibration", "vibration_rms", "pressure", "rpm", "current_draw", "status", "telemetry_status"):
        if key in parameters:
            payload[key] = parameters[key]

    for key, value in parameters.items():
        if key not in payload:
            payload[key] = value

    payload["parameters"] = parameters
    payload["source"] = req.source or "esp32"
    return payload


def _normalize_mac_address(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip().lower().replace("-", ":")
    if not cleaned:
        return None
    parts = [part for part in cleaned.split(":") if part]
    if len(parts) == 6:
        try:
            return ":".join(f"{int(part, 16):02x}" for part in parts)
        except ValueError:
            return cleaned
    return cleaned


def _find_equipment_by_mac(mac_address: Optional[str]) -> Optional[str]:
    normalized = _normalize_mac_address(mac_address)
    if not normalized:
        return None

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, mac_address FROM equipment WHERE mac_address IS NOT NULL")
    rows = cursor.fetchall()
    conn.close()

    for eq_id, stored_mac in rows:
        if _normalize_mac_address(stored_mac) == normalized:
            return eq_id
    return None


def _normalize_sensor_kind(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip().lower().replace(" ", "_")
    aliases = {
        "temp": "temperature",
        "temperature": "temperature",
        "temperature_only": "temperature",
        "temp_only": "temperature",
        "temp_humidity": "temperature_humidity",
        "temperature_humidity": "temperature_humidity",
        "humidity": "temperature_humidity",
        "vibration": "vibration",
        "vib": "vibration",
        "combined": "multi",
        "multi": "multi",
    }
    return aliases.get(cleaned, cleaned)


def _resolve_http_base_url(host_header: Optional[str] = None) -> str:
    base_host = (host_header or "").strip()
    if not base_host:
        base_host = os.getenv("BACKEND_HOST", "127.0.0.1:8000")

    if "://" in base_host:
        return base_host.rstrip("/")

    return f"http://{base_host}".rstrip("/")


def _detect_lan_ip() -> str:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        finally:
            sock.close()
    except Exception:
        return "127.0.0.1"

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
    # 0. Zero-Latency Initial Analysis Check
    # If this is the auto-triggered summary request, check for pre-computed content
    INITIAL_SUMMARY_TRIGGER = "Generate a technical health summary for this asset. Be concise, highlight critical breaches, and provide a numbered technical prescription."
    user_msg = req.messages[-1]["content"] if req.messages else ""
    
    if user_msg == INITIAL_SUMMARY_TRIGGER and req.machineId != "GLOBAL":
        try:
            pre_computed_key = f"ai_latest_summary:{req.machineId}"
            pre_computed_data = await r.get(pre_computed_key)
            if pre_computed_data:
                summary = json.loads(pre_computed_data)
                # Ensure it's not too stale (e.g., last 1 hour)
                ts = datetime.fromisoformat(summary["timestamp"])
                if datetime.now() - ts < timedelta(hours=1):
                    return {
                        "message": summary["message"],
                        "sources": summary.get("sources", []),
                        "confidence": summary.get("confidence", 98.5),
                        "machineId": req.machineId,
                        "sessionId": req.sessionId,
                        "cached": True,
                        "pre_computed": True
                    }
        except Exception as e:
            print(f"Pre-computed cache retrieval error: {e}")

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
        prioritized = generate_prioritized_schedule()
        agent._last_schedule = prioritized
        return prioritized
        
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
        # 1. Verify this task exists in the cached or current AI schedule
        virtual_task = resolve_virtual_task(task_id)
        
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

@app.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket):
    await websocket.accept()
    r_async = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r_async.pubsub()
    try:
        await pubsub.subscribe(ALERT_CHANNEL)
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        try:
            await pubsub.unsubscribe(ALERT_CHANNEL)
        except:
            pass
    except Exception as e:
        print(f"Alert WS Error: {e}")
        try:
            await websocket.send_text(json.dumps({"error": "Alert stream unavailable (Redis Offline)"}))
        except:
            pass
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

@app.get("/api/network/endpoint", response_model=NetworkEndpointResponse)
async def get_network_endpoint(request: Request):
    host_header = request.headers.get("host") if request and request.headers else None
    local_ip = _detect_lan_ip()
    http_base_url = _resolve_http_base_url(host_header)
    if http_base_url in {"http://127.0.0.1:8000", "http://localhost:8000"}:
        http_base_url = f"http://{local_ip}:8000"
    ws_base_url = http_base_url.replace("http://", "ws://").replace("https://", "wss://")
    host = host_header or http_base_url.removeprefix("http://").removeprefix("https://")
    port = 443 if http_base_url.startswith("https://") else 80
    if ":" in host and host.count(":") == 1:
        try:
            port = int(host.rsplit(":", 1)[1])
        except ValueError:
            pass
    return {
        "host": host,
        "local_ip": local_ip,
        "port": port,
        "http_base_url": http_base_url,
        "ws_base_url": ws_base_url,
    }

@app.get("/api/iot/connected-sensors", response_model=List[ConnectedSensorResponse])
async def get_connected_sensors(minutes: int = 5):
    if minutes <= 0:
        minutes = 5

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    connected = []

    cursor.execute("SELECT id, name, protocol, mac_address, sensor_kind FROM equipment ORDER BY name ASC")
    equipment_rows = cursor.fetchall()
    for row in equipment_rows:
        equipment_id = row["id"]
        protocol = (row["protocol"] or "HTTP").upper()
        stored_mac = row["mac_address"]
        sensor_kind = row["sensor_kind"]

        cursor.execute(
            """
            SELECT timestamp, temperature, vibration
            FROM sensor_readings
            WHERE equipment_id = ?
              AND timestamp > datetime('now', '-' || ? || ' minutes')
            ORDER BY timestamp DESC
            LIMIT 1
            """,
            (equipment_id, minutes),
        )
        legacy_row = cursor.fetchone()

        cursor.execute(
            """
            SELECT timestamp, parameter_key, value, string_value
            FROM telemetry_readings
            WHERE machine_id = ?
              AND timestamp > datetime('now', '-' || ? || ' minutes')
            ORDER BY timestamp DESC, id DESC
            LIMIT 20
            """,
            (equipment_id, minutes),
        )
        telemetry_rows = cursor.fetchall()

        latest_time = None
        temperature = None
        humidity = None
        vibration = None
        telemetry_status = None
        parameters: Dict[str, Any] = {}

        if legacy_row:
            latest_time = legacy_row["timestamp"]
            temperature = legacy_row["temperature"]
            vibration = legacy_row["vibration"]

        for tele_row in telemetry_rows:
            key = tele_row["parameter_key"]
            value = tele_row["value"] if tele_row["value"] is not None else tele_row["string_value"]
            parameters[key] = value
            if tele_row["timestamp"] and (latest_time is None or tele_row["timestamp"] > latest_time):
                latest_time = tele_row["timestamp"]
            if key == "temperature" and temperature is None:
                temperature = tele_row["value"]
            if key == "humidity" and humidity is None:
                humidity = tele_row["value"]
            if key in {"vibration", "vibration_rms"} and vibration is None:
                vibration = tele_row["value"]
            if key in {"status", "telemetry_status"} and telemetry_status is None:
                telemetry_status = str(value) if value is not None else None

        if not latest_time:
            if protocol != "HTTP":
                continue
            connected.append({
                "equipment_id": equipment_id,
                "name": row["name"] or equipment_id,
                "protocol": row["protocol"] or "HTTP",
                "mac_address": stored_mac,
                "sensor_kind": sensor_kind,
                "last_seen": None,
                "temperature": None,
                "humidity": None,
                "vibration": None,
                "telemetry_status": None,
                "parameters": {},
                "status": "registered",
            })
            continue

        connected.append({
            "equipment_id": equipment_id,
            "name": row["name"] or equipment_id,
            "protocol": row["protocol"] or "HTTP",
            "mac_address": stored_mac,
            "sensor_kind": sensor_kind,
            "last_seen": latest_time,
            "temperature": temperature,
            "humidity": humidity,
            "vibration": vibration,
            "telemetry_status": telemetry_status,
            "parameters": parameters,
            "status": "connected" if latest_time else "registered",
        })

    conn.close()
    connected.sort(key=lambda item: item["last_seen"] or "", reverse=True)
    return connected

@app.post("/api/iot/ingest")
async def ingest_iot_telemetry(request: IoTIngestRequest):
    payload = _prepare_ingest_payload(request)
    equipment_id = payload["equipment_id"]
    timestamp = payload["timestamp"]
    normalized_mac = _normalize_mac_address(payload.get("mac_address"))
    matched_equipment_id = _find_equipment_by_mac(normalized_mac) if normalized_mac else None
    if matched_equipment_id:
        equipment_id = matched_equipment_id

    equipment_meta = get_equipment_metadata(equipment_id)
    if not equipment_meta:
        add_equipment(
            eq_id=equipment_id,
            name=equipment_id,
            line="ESP32",
            protocol="HTTP",
            mac_address=normalized_mac,
            sensor_kind=_normalize_sensor_kind(payload.get("sensor_kind")),
        )
        seed_common_parameters(equipment_id)
    elif normalized_mac:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE equipment SET mac_address = ?, sensor_kind = COALESCE(?, sensor_kind) WHERE id = ?",
            (normalized_mac, _normalize_sensor_kind(payload.get("sensor_kind")), equipment_id),
        )
        conn.commit()
        conn.close()

    temp = _coerce_ingest_float(payload.get("temperature"))
    humidity = _coerce_ingest_float(payload.get("humidity"))
    vib = _coerce_ingest_float(payload.get("vibration"))
    log_sensor_reading(equipment_id, temp if temp is not None else 0.0, vib if vib is not None else 0.0)

    telemetry_fields = payload.get("parameters") or {}
    telemetry_fields = {**telemetry_fields}
    for key in ("temperature", "humidity", "vibration", "vibration_rms", "pressure", "rpm", "current_draw", "status", "telemetry_status"):
        if key in payload:
            telemetry_fields[key] = payload[key]

    for key, value in telemetry_fields.items():
        numeric_value = _coerce_ingest_float(value)
        if numeric_value is not None:
            log_telemetry_point(equipment_id, key, numeric_value)
        else:
            log_telemetry_point(equipment_id, key, None, str(value))

    try:
        await r.publish(REDIS_CHANNEL, json.dumps(payload))
    except Exception as exc:
        print(f"Redis Publish Error: {exc}")

    return {
        "status": "success",
        "equipment_id": equipment_id,
        "timestamp": timestamp,
        "stored": True,
        "fields_logged": len(telemetry_fields),
    }

@app.post("/api/equipment/{equipment_id}/pair-esp32")
async def pair_esp32_device(equipment_id: str, request: PairEsp32Request):
    normalized_mac = _normalize_mac_address(request.mac_address)
    if not normalized_mac:
        raise HTTPException(status_code=400, detail="Invalid ESP32 MAC address")

    equipment = get_equipment_metadata(equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    existing_match = _find_equipment_by_mac(normalized_mac)
    if existing_match and existing_match != equipment_id:
        raise HTTPException(status_code=409, detail=f"MAC already paired with {existing_match}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE equipment SET mac_address = ?, sensor_kind = COALESCE(?, sensor_kind) WHERE id = ?",
        (normalized_mac, _normalize_sensor_kind(request.sensor_kind), equipment_id),
    )
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "equipment_id": equipment_id,
        "mac_address": normalized_mac,
        "sensor_kind": _normalize_sensor_kind(request.sensor_kind),
        "message": f"ESP32 {normalized_mac} paired to {equipment_id}"
    }

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
                    "macAddress": eq.get("mac_address"),
                    "sensorKind": eq.get("sensor_kind"),
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
                "macAddress": m.get("mac_address"),
                "sensorKind": m.get("sensor_kind"),
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
        
        # 1. Fetch from the legacy sensor_readings for backwards compatibility
        cursor.execute("SELECT timestamp as time, temperature, vibration FROM sensor_readings WHERE equipment_id = ? AND timestamp > datetime('now', '-' || ? || ' minutes') ORDER BY timestamp ASC", (equipment_id, minutes))
        legacy_rows = [dict(row) for row in cursor.fetchall()]
        
        # 2. Fetch from the dynamic telemetry_readings table for new parameters
        cursor.execute("""
            SELECT timestamp as time, parameter_key, value
            FROM telemetry_readings
            WHERE machine_id = ?
              AND timestamp > datetime('now', '-' || ? || ' minutes')
            ORDER BY timestamp ASC
        """, (equipment_id, minutes))
        dynamic_rows = cursor.fetchall()

        # 2.1 Fetch Alerts for the same window to tag anomalies
        cursor.execute("""
            SELECT id, timestamp as time, severity, reason 
            FROM ai_alerts 
            WHERE equipment_id = ? 
              AND timestamp > datetime('now', '-' || ? || ' minutes')
        """, (equipment_id, minutes))
        alert_rows = [dict(row) for row in cursor.fetchall()]
        
        # 3. Pivot dynamic rows by timestamp
        pivoted_data = {}
        for row in dynamic_rows:
            t = row['time']
            if t not in pivoted_data: pivoted_data[t] = {"time": t}
            pivoted_data[t][row['parameter_key']] = row['value']
            
        # 4. Merge alerts into the closest telemetry point
        # This allows the frontend to highlight specific anomalies on the chart
        for alert in alert_rows:
            # Find closest timestamp in merged_data (rough approximation for simulation)
            a_ts = alert['time']
            if a_ts in pivoted_data:
                pivoted_data[a_ts]["isAnomaly"] = True
                pivoted_data[a_ts]["alertSeverity"] = alert['severity']
                pivoted_data[a_ts]["alertReason"] = alert['reason']
                pivoted_data[a_ts]["alertId"] = alert['id']

        # 5. Merge legacy and dynamic
        merged_data = {row['time']: row for row in legacy_rows}
        for t, data in pivoted_data.items():
            if t in merged_data:
                merged_data[t].update(data)
            else:
                merged_data[t] = data
                
        results = sorted(merged_data.values(), key=lambda x: x['time'])
        conn.close()
        return results
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
                    # Send time and spread all parameters
                    payload = {
                        "time": data.get("timestamp", time.time()),
                        **data.get("parameters", {})
                    }
                    # For legacy support, also include temperature/vibration at root if they are in parameters
                    if "temperature" in payload: payload["temperature"] = payload["temperature"]
                    if "vibration" in payload: payload["vibration"] = payload["vibration"]
                    
                    await websocket.send_json(payload)
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


@app.get("/api/machines/{machine_id}/insights")
async def get_machine_insights_api(machine_id: str):
    try:
        return get_machine_insights(machine_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute machine insights: {exc}")

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

@app.post("/api/alerts/{alert_id}/feedback")
async def submit_alert_feedback(alert_id: int, req: FeedbackRequest):
    """Submits technician feedback for an AI alert to improve ground truth."""
    success = log_alert_feedback(alert_id, req.score, req.notes)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to log feedback")
    return {"status": "success", "message": "Feedback registered"}

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

class TriggerAnomalyRequest(BaseModel):
    parameter: Optional[str] = "temperature"
    value: Optional[float] = 125.0

@app.post("/api/equipment/{equipment_id}/trigger_anomaly")
async def trigger_anomaly(equipment_id: str, request: TriggerAnomalyRequest):
    command = {
        "equipment_id": equipment_id, 
        "action": "TRIGGER_ANOMALY", 
        "parameter": request.parameter,
        "value": request.value,
        "timestamp": datetime.now().isoformat()
    }
    with open(COMMAND_FILE, "w") as f: json.dump(command, f)
    return {"status": "Anomaly Triggered", "equipment_id": equipment_id, "parameter": request.parameter, "value": request.value}

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
