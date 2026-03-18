import os
import json
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

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

@app.post("/api/logs")
async def log_repair(request: RepairRequest):
    """
    The Sovereign Feedback Entrypoint.
    Records the human fix and injects it into the AI's long-term memory.
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

    # 2. Synchronize with Vector Memory (RAG Learning)
    # This makes the AI 'remember' this fix for the next time this machine fails.
    try:
        memory_status = agent.ingest_human_fix(request.equipment_id, request.action_taken)
        return {
            "status": "success",
            "log_id": log_id,
            "memory_sync": memory_status,
            "message": f"Fix recorded for {request.equipment_id}. Knowledge absorbed."
        }
    except Exception as e:
        return {"status": "partial_success", "log_id": log_id, "error": str(e)}

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

@app.get("/api/equipment")
async def get_all_equipment():
    """
    Sovereign Intelligence Layer: Merges legacy logs with real-time 
    telemetry and runs a Linear Regression slope analysis for RUL prediction.
    """
    from src.data.analytics import calculate_failure_probability
    
    static_data = agent._load_data()
    equipment_ids = set()
    for log in static_data.get("maintenance_logs", []):
        equipment_ids.add(log["equipment_id"])

    # 1. Pull latest telemetry for current status display
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
            for eq_id in equipment_ids:
                name = next((log["equipment_name"] for log in static_data["maintenance_logs"] if log["equipment_id"] == eq_id), eq_id)
                
                stats = live_telemetry.get(eq_id, {"temperature": 0, "vibration": 0})
                temp = stats.get("temperature", 0)
                vib = stats.get("vibration", 0)

                # 2. Analytics: Fetch last 20 readings to calculate the Slope
                cursor.execute("""
                    SELECT temperature FROM sensor_readings 
                    WHERE equipment_id = ? 
                    ORDER BY timestamp DESC LIMIT 20
                """, (eq_id,))
                recent_temps = [{"temperature": r[0]} for r in cursor.fetchall()]
                
                # Run the Predictive Engine
                prob, time_left = calculate_failure_probability(recent_temps)

                # 3. Decision Logic: Define Status based on Prediction + Thresholds
                is_critical = temp > 130 or prob > 80
                is_warning = temp > 110 or prob > 50

                results.append({
                    "id": eq_id,
                    "name": name,
                    "type": "Industrial Asset",
                    "status": "critical" if is_critical else ("warning" if is_warning else "healthy"),
                    "temperature": round(temp, 1),
                    "vibration": round(vib, 2),
                    "failureProbability": prob,          # New Strategic Metric
                    "minutesToFailure": time_left,      # New Strategic Metric
                    "healthScore": 100 - prob,
                    "efficiency": 95 - (prob * 0.3),
                    "lastMaintenance": "2024-02-28",
                    "failureRisk": "high" if is_critical else ("medium" if is_warning else "low")
                })
            
            conn.close()
            return results
            
        except Exception as e:
            print(f"Sovereign API Error: {e}")
            return []

    return []

@app.post("/api/equipment/{equipment_id}/mitigate")
async def mitigate_risk(equipment_id: str):
    """
    Sovereign Intervention: Sends a 'Throttling' command to the 
    industrial controller (Simulator/Rust) to prevent failure.
    """
    command = {
        "equipment_id": equipment_id,
        "action": "THROTTLE_LOAD",
        "value": 0.5, # Reduce speed by 50%
        "timestamp": datetime.now().isoformat()
    }
    
    with open("data/commands.json", "w") as f:
        json.dump(command, f)
        
    return {"status": "Command Dispatched", "action": "Load Reduction Active"}

@app.post("/api/logs")
async def log_repair(request: RepairRequest):
    from src.data.database import log_manual_repair
    
    # 1. Log to SQLite
    log_id = log_manual_repair(request.equipment_id, request.operator_name, 
                              request.action_taken, request.parts_replaced)
    
    # 2. Sovereign Actuation: Tell the Simulator the machine is fixed!
    command = {
        "equipment_id": request.equipment_id,
        "action": "RESET_LOAD", # Return to 100% power
        "value": 1.0,
        "timestamp": datetime.now().isoformat()
    }
    
    with open(COMMAND_FILE, "w") as f:
        json.dump(command, f)

    # 3. Sync to Pinecone (Knowledge Absorption)
    memory_status = agent.ingest_human_fix(request.equipment_id, request.action_taken)
    
    return {"status": "success", "message": "Repair logged. Machine returning to full capacity."}

@app.get("/api/factory/stats")
async def get_factory_stats():
    """
    Sovereign Executive Summary: Calculates Global Risk Index (GRI)
    based on the 'Weakest Link' theory of industrial production.
    """
    all_equipment = await get_all_equipment()
    if not all_equipment:
        return {"globalRisk": 0, "activeAlerts": 0, "avgHealth": 100}

    # Weakest Link Theory: Global risk is heavily weighted by the highest individual risk
    risks = [e["failureProbability"] for e in all_equipment]
    max_risk = max(risks)
    avg_risk = sum(risks) / len(risks)
    
    # Global Risk Index (GRI) formula
    global_risk_index = (max_risk * 0.7) + (avg_risk * 0.3)
    
    active_alerts = len([e for e in all_equipment if e["status"] != "healthy"])

    return {
        "globalRisk": round(global_risk_index, 1),
        "activeAlerts": active_alerts,
        "avgHealth": round(100 - avg_risk, 1),
        "factoryStatus": "Critical" if global_risk_index > 75 else ("Degraded" if global_risk_index > 40 else "Optimal")
    }

@app.get("/api/telemetry/{equipment_id}")
async def get_machine_telemetry(equipment_id: str, minutes: int = 60):
    """Retrieves time-series data for high-performance charting."""
    if not os.path.exists(DB_PATH):
        return []

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Pull data points for the requested window
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
    """Retrieves AI strategic prescriptions for the 'Active Alerts' panel."""
    if not os.path.exists(DB_PATH):
        return []

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # Only get the 15 most recent tactical prescriptions
        cursor.execute("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT 15")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception:
        return []

@app.post("/api/chat")
async def chat_with_agent(request: ChatRequest):
    """Deep reasoning endpoint for machine-specific troubleshooting."""
    user_msg = request.messages[-1]["content"]
    
    # Enrich AI context with the current machine state
    context = f"Asset: {request.machineName} ({request.machineId})\n"
    if request.equipmentData:
        context += f"Current State: {json.dumps(request.equipmentData)}\n"

    system_prompt = f"You are an expert industrial maintenance CTO. {context}"
    
    # Call the agent's cloud reasoning (llama-3.3-70b-versatile)
    try:
        response = agent._get_cloud_inference(system_prompt, user_msg)
        return {"message": response, "machineId": request.machineId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
