import sqlite3
from datetime import datetime, timedelta
import os

DB_PATH = "data/factory_ops.db"
TEXTUAL_DATA_PATH = "data/sample_maintenance_data.json"

def init_db():
    """Initializes the Sovereign Ledger with Telemetry, Intelligence, and Human Feedback layers."""
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
   # connect 
    # 1. Telemetry Layer: High-frequency raw sensor data (Legacy)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            temperature REAL,
            vibration REAL
        )
    ''')

    # 1.1 Universal Telemetry Layer: Parameter-aware time-series (New)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            parameter_key TEXT NOT NULL,
            value REAL,
            string_value TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 1.2 Parameter Registry: Defines what a machine can measure
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS machine_parameters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            parameter_key TEXT NOT NULL,
            display_name TEXT NOT NULL,
            category TEXT DEFAULT 'custom',
            data_type TEXT DEFAULT 'float',
            unit TEXT,
            normal_min REAL,
            normal_max REAL,
            warning_threshold REAL,
            critical_threshold REAL,
            direction TEXT DEFAULT 'above',
            source_field TEXT,
            is_visible BOOLEAN DEFAULT 1,
            is_used_for_prediction BOOLEAN DEFAULT 1,
            aggregation TEXT DEFAULT 'last',
            display_order INTEGER DEFAULT 0,
            description TEXT,
            alert_enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(machine_id, parameter_key)
        )
    ''')
    
    # 2. Intelligence Layer: AI-generated strategic prescriptions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            severity TEXT,
            reason TEXT,
            prescription TEXT
        )
    ''')

    # 3. Feedback Layer: Manual repair logs from the Sovereign Engineer
    # This is the "Ground Truth" that makes your RAG system smarter over time.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS manual_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            operator_name TEXT,
            action_taken TEXT NOT NULL,
            parts_replaced TEXT,
            resolved_anomaly_id INTEGER,
            FOREIGN KEY(resolved_anomaly_id) REFERENCES ai_alerts(id)
        )
    ''')

    # 4. Asset Layer: Persistent machine metadata
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS equipment (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            production_line TEXT,
            plant_id TEXT DEFAULT 'Hosur-01', -- New: Plant Identification
            sector TEXT DEFAULT 'Electronics', -- New: Sector (Steel, Auto, Semi)
            protocol TEXT,
            status TEXT DEFAULT 'online',
            mtbf INTEGER,
            last_maintenance_date TEXT,
            next_scheduled_date TEXT,
            agent_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 5. Maintenance Schedule: Task management
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS maintenance_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            task_name TEXT NOT NULL,
            task_type TEXT DEFAULT 'routine', -- routine, repair, inspection
            due_date TEXT,
            status TEXT DEFAULT 'pending', -- pending, in_progress, completed, overdue
            assigned_to TEXT,
            completed_at TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(machine_id) REFERENCES equipment(id)
        )
    ''')

    # 6. AI Agent Memory: Chat History
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            machine_id TEXT NOT NULL,
            role TEXT NOT NULL, -- user, assistant, system_vision
            content TEXT NOT NULL,
            is_visual_context BOOLEAN DEFAULT 0, -- Flag for OCR/Vision data
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 7. Knowledge Base: Manuals Registry
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS manuals_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL, -- pdf, image, doc
            pinecone_id_prefix TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(machine_id) REFERENCES equipment(id)
        )
    ''')

    # 8. Financial Layer: Cost model inputs in INR
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS machine_financials (
            machine_id TEXT PRIMARY KEY,
            planned_labor_cost_inr REAL NOT NULL,
            emergency_labor_multiplier REAL DEFAULT 3.0,
            downtime_cost_per_hour_inr REAL NOT NULL,
            default_parts_markup_multiplier REAL DEFAULT 1.35,
            currency TEXT DEFAULT 'INR',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(machine_id) REFERENCES equipment(id)
        )
    ''')

    # 9. Spare Parts Catalog: Planned vs emergency cost baselines
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS spare_parts_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            part_name TEXT NOT NULL,
            part_code TEXT,
            planned_cost_inr REAL NOT NULL,
            emergency_cost_inr REAL,
            lead_time_hours REAL DEFAULT 24,
            oem_recommended_life_hours REAL,
            FOREIGN KEY(machine_id) REFERENCES equipment(id)
        )
    ''')

    # 10. Usage Layer: Runtime and load snapshots for wear modelling
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS machine_usage_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            runtime_hours REAL NOT NULL,
            idle_hours REAL DEFAULT 0,
            load_percent REAL DEFAULT 0,
            captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(machine_id) REFERENCES equipment(id)
        )
    ''')

    # 11. AI Incident Intelligence: Latest synthesized machine incident report
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_reports_ai (
            machine_id TEXT PRIMARY KEY,
            incident_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            who_text TEXT,
            what_text TEXT,
            where_text TEXT,
            when_text TEXT,
            why_text TEXT,
            root_cause_summary TEXT,
            threat_signature TEXT,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(machine_id) REFERENCES equipment(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    
    # 5. Seed initial data if empty
    seed_initial_data()
    seed_insight_data()
    
    print(f"--- [DATABASE UPDATED] Schema V3 Live at {DB_PATH} ---")

def log_agent_interaction(machine_id, role, content, session_id=None, is_visual_context=0):
    """Saves a chat interaction to the Sovereign Memory."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO agent_history (machine_id, role, content, session_id, is_visual_context) VALUES (?, ?, ?, ?, ?)",
        (machine_id, role, content, session_id, is_visual_context)
    )
    conn.commit()
    conn.close()

def get_agent_history(machine_id=None, limit=10, session_id=None):
    """Retrieves previous interactions for a specific machine context or session."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if session_id:
        cursor.execute(
            "SELECT role, content, timestamp, is_visual_context FROM agent_history WHERE session_id = ? ORDER BY timestamp DESC, id DESC LIMIT ?",
            (session_id, limit)
        )
    elif machine_id:
        cursor.execute(
            "SELECT role, content, timestamp, is_visual_context FROM agent_history WHERE machine_id = ? ORDER BY timestamp DESC, id DESC LIMIT ?",
            (machine_id, limit)
        )
    else:
        cursor.execute(
            "SELECT role, content, timestamp, is_visual_context FROM agent_history ORDER BY timestamp DESC, id DESC LIMIT ?",
            (limit,)
        )
        
    rows = cursor.fetchall()
    conn.close()
    # Reverse to get chronological order
    return [dict(row) for row in reversed(rows)]

def get_recent_visual_context(machine_id, session_id=None, limit=5):
    """Fetches the most recent visual context (OCR/Vision) entries for a session."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if session_id:
        cursor.execute("""
            SELECT content FROM agent_history 
            WHERE session_id = ? AND is_visual_context = 1 
            ORDER BY timestamp DESC LIMIT ?
        """, (session_id, limit))
    else:
        cursor.execute("""
            SELECT content FROM agent_history 
            WHERE machine_id = ? AND is_visual_context = 1 
            ORDER BY timestamp DESC LIMIT ?
        """, (machine_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    return [row['content'] for row in rows] if rows else []

def get_machine_textual_history(machine_id):
    """
    Consolidates textual history (operational notes, incident reports, manual logs)
    from both the JSON flat file and the SQLite Sovereign Ledger.
    """
    import json
    history = []
    
    # 1. Fetch from SQLite Manual Logs
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT timestamp, action_taken as note, 'Technician' as observed_by FROM manual_logs WHERE equipment_id = ?", (machine_id,))
    history.extend([dict(row) for row in cursor.fetchall()])
    conn.close()

    # 2. Fetch from JSON Sample Data
    try:
        with open(TEXTUAL_DATA_PATH, "r") as f:
            sample_data = json.load(f)
            
            # Operational Notes
            history.extend([n for n in sample_data.get("operational_notes", []) if n['equipment_id'] == machine_id])
            
            # Incident Reports (Mapped to note format)
            for inc in sample_data.get("incident_reports", []):
                if inc['equipment_id'] == machine_id:
                    history.append({
                        "timestamp": inc['timestamp'],
                        "note": f"INCIDENT: {inc['incident_type']} - {inc['description']}. Impact: {inc['impact']}",
                        "observed_by": "System"
                    })
    except FileNotFoundError:
        pass
        
    # Sort by timestamp descending
    history.sort(key=lambda x: x['timestamp'], reverse=True)
    return history

def get_machine_health_summary(machine_id):
    """Returns a summary of machine health for scheduling prioritization."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Recent Alerts
    cursor.execute("SELECT severity, reason FROM ai_alerts WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 3", (machine_id,))
    alerts = [dict(row) for row in cursor.fetchall()]
    
    # 2. Recent Telemetry
    cursor.execute("SELECT temperature, vibration FROM sensor_readings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 5", (machine_id,))
    telemetry = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {"alerts": alerts, "telemetry": telemetry}

def get_all_pending_tasks():
    """Retrieves all tasks that are not completed."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.*, e.name as machine_name 
        FROM maintenance_tasks t
        JOIN equipment e ON t.machine_id = e.id
        WHERE t.status != 'completed'
        ORDER BY t.due_date ASC
    """)
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks

def register_manual(machine_id, filename, file_type, pinecone_prefix=None):
    """Registers an uploaded manual in the industrial knowledge base."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO manuals_registry (machine_id, filename, file_type, pinecone_id_prefix) VALUES (?, ?, ?, ?)",
        (machine_id, filename, file_type, pinecone_prefix)
    )
    conn.commit()
    conn.close()

def get_registered_manuals(machine_id=None):
    """Retrieves list of available manuals."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if machine_id:
        cursor.execute("SELECT * FROM manuals_registry WHERE machine_id = ?", (machine_id,))
    else:
        cursor.execute("SELECT * FROM manuals_registry")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

from datetime import datetime, timedelta

# ... existing imports ...

def seed_initial_data():
    """Populates the database with initial machines and parameters if empty."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM equipment")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        print("--- [SEEDING] Initializing Default Industrial Assets ---")
        initial_machines = [
            ("CNC001", "Precision CNC Lathe Alpha", "Line 1 - Machining", "MQTT"),
            ("CONV01", "Main Assembly Conveyor", "Line 2 - Assembly", "OPC-UA"),
            ("HYD005", "High-Pressure Hydraulic Press", "Line 1 - Machining", "Modbus"),
            ("EXT002", "Polymer Extrusion Line", "Line 3 - Packaging", "MQTT")
        ]
        for eq_id, name, line, protocol in initial_machines:
            add_equipment(eq_id, name, line, protocol)
            seed_common_parameters(eq_id)
            # Add some machine-specific parameters too
            if eq_id == "CNC001":
                add_parameter(eq_id, "spindle_load", "Spindle Load", "%", normal_min=0, normal_max=70, warning_threshold=85, critical_threshold=100)
            elif eq_id == "HYD005":
                add_parameter(eq_id, "oil_temp", "Oil Temperature", "°C", normal_min=30, normal_max=60, warning_threshold=75, critical_threshold=85)
        
        seed_maintenance_tasks()

def seed_maintenance_tasks():
    """Initializes a few maintenance tasks for demonstration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM maintenance_tasks")
    if cursor.fetchone()[0] == 0:
        tasks = [
            ("CNC001", "Lubricate Spindle Bearings", "routine", 2, "pending", "Operator A"),
            ("CONV01", "Belt Tension Calibration", "inspection", 5, "in_progress", "Operator B"),
            ("HYD005", "Seal Integrity Verification", "repair", -1, "overdue", "Admin"),
            ("EXT002", "Sensor Node Battery Swap", "routine", 10, "pending", "Operator A")
        ]
        for eq_id, name, t_type, days, status, assigned in tasks:
            due = (datetime.now() + timedelta(days=days)).date().isoformat()
            cursor.execute("""
                INSERT INTO maintenance_tasks (machine_id, task_name, task_type, due_date, status, assigned_to)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (eq_id, name, t_type, due, status, assigned))
    conn.commit()
    conn.close()
    print("--- [SEEDING] Maintenance Tasks Online ---")


def seed_insight_data():
    """Populate financial, parts, usage, and baseline textual data for machine insights."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM equipment")
    machines = cursor.fetchall()

    financial_defaults = {
        "CNC001": (18000, 3.4, 95000, 1.35),
        "CONV01": (12000, 3.1, 65000, 1.25),
        "HYD005": (15000, 3.3, 85000, 1.30),
        "EXT002": (11000, 3.0, 60000, 1.25),
    }

    part_defaults = {
        "CNC001": [
            ("Bearing Unit-B", "BRG-UNIT-B", 28000, 41000, 18, 5000),
            ("Spindle Coolant Pump", "CNC-PMP-17", 22000, 34500, 20, 6200),
            ("Drive Belt Set", "CNC-BELT-04", 6500, 9800, 8, 2400),
        ],
        "CONV01": [
            ("Conveyor Belt Section", "CNV-BELT-02", 18000, 25500, 24, 4200),
            ("Tensioner Assembly", "CNV-TNS-09", 9500, 14200, 16, 3600),
        ],
        "HYD005": [
            ("Seal Kit", "HYD-SEAL-11", 14000, 21000, 12, 3200),
            ("Hydraulic Valve Pack", "HYD-VLV-07", 26000, 39000, 18, 5400),
        ],
        "EXT002": [
            ("Extruder Bearing Set", "EXT-BRG-03", 21000, 31500, 16, 4700),
            ("Thermal Sensor Node", "EXT-SNS-05", 5500, 8800, 6, 1800),
        ],
    }

    usage_defaults = {
        "CNC001": [(4520, 340, 72), (5010, 360, 79), (5520, 372, 86)],
        "CONV01": [(3180, 410, 61), (3490, 425, 65), (3725, 433, 68)],
        "HYD005": [(4010, 295, 66), (4380, 310, 71), (4675, 325, 76)],
        "EXT002": [(2875, 515, 58), (3150, 540, 62), (3440, 566, 67)],
    }

    manual_defaults = {
        "CNC001": [
            ("Ravi", "Adjusted spindle alignment after high-pitched grinding sound near Unit-B.", "Bearing grease"),
            ("Anita", "Manual reset performed after amperage spike; vibration remained elevated.", "None"),
            ("Karan", "Observed overheating around spindle housing during second shift inspection.", "Coolant filter"),
        ],
        "CONV01": [
            ("Meena", "Retensioned conveyor belt after slip alarms on startup.", "Tension spring"),
        ],
        "HYD005": [
            ("Dinesh", "Checked seal pack after minor hydraulic leak near valve bank.", "Seal kit"),
        ],
    }

    incident_defaults = {
        "CNC001": (
            "Bearing degradation risk",
            "high",
            "Shift technician and line supervisor",
            "Grinding sound, current spike, and repeated manual reset around the spindle assembly.",
            "CNC001 spindle Unit-B",
            "During the last two shifts",
            "Early overheating signals were observed but not escalated before bearing wear accelerated.",
            "Grinding-sound -> amperage spike -> manual reset",
        ),
    }

    for machine_id, machine_name in machines:
        planned_labor, emergency_mult, downtime_cost, markup = financial_defaults.get(
            machine_id, (10000, 3.0, 50000, 1.25)
        )
        cursor.execute("""
            INSERT OR IGNORE INTO machine_financials
            (machine_id, planned_labor_cost_inr, emergency_labor_multiplier, downtime_cost_per_hour_inr, default_parts_markup_multiplier, currency)
            VALUES (?, ?, ?, ?, ?, 'INR')
        """, (machine_id, planned_labor, emergency_mult, downtime_cost, markup))

        cursor.execute("SELECT COUNT(*) FROM spare_parts_catalog WHERE machine_id = ?", (machine_id,))
        if cursor.fetchone()[0] == 0:
            for part in part_defaults.get(machine_id, [(f"{machine_name} Service Kit", f"{machine_id}-KIT", 12000, 18000, 12, 3000)]):
                cursor.execute("""
                    INSERT INTO spare_parts_catalog
                    (machine_id, part_name, part_code, planned_cost_inr, emergency_cost_inr, lead_time_hours, oem_recommended_life_hours)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (machine_id, *part))

        cursor.execute("SELECT COUNT(*) FROM machine_usage_snapshots WHERE machine_id = ?", (machine_id,))
        if cursor.fetchone()[0] == 0:
            for idx, snapshot in enumerate(usage_defaults.get(machine_id, [(2500, 300, 55), (2750, 320, 58), (2900, 335, 60)])):
                runtime_hours, idle_hours, load_percent = snapshot
                captured_at = (datetime.now() - timedelta(days=(2 - idx) * 7)).isoformat()
                cursor.execute("""
                    INSERT INTO machine_usage_snapshots
                    (machine_id, runtime_hours, idle_hours, load_percent, captured_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (machine_id, runtime_hours, idle_hours, load_percent, captured_at))

        cursor.execute("SELECT COUNT(*) FROM manual_logs WHERE equipment_id = ?", (machine_id,))
        if cursor.fetchone()[0] == 0 and machine_id in manual_defaults:
            for idx, (operator, action, parts) in enumerate(manual_defaults[machine_id]):
                timestamp = (datetime.now() - timedelta(hours=(idx + 1) * 9)).isoformat()
                cursor.execute("""
                    INSERT INTO manual_logs
                    (equipment_id, timestamp, operator_name, action_taken, parts_replaced)
                    VALUES (?, ?, ?, ?, ?)
                """, (machine_id, timestamp, operator, action, parts))

        if machine_id in incident_defaults:
            cursor.execute("SELECT COUNT(*) FROM incident_reports_ai WHERE machine_id = ?", (machine_id,))
            if cursor.fetchone()[0] == 0:
                incident_type, severity, who_text, what_text, where_text, when_text, why_text, threat_signature = incident_defaults[machine_id]
                cursor.execute("""
                    INSERT INTO incident_reports_ai
                    (machine_id, incident_type, severity, who_text, what_text, where_text, when_text, why_text, root_cause_summary, threat_signature, generated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    machine_id,
                    incident_type,
                    severity,
                    who_text,
                    what_text,
                    where_text,
                    when_text,
                    why_text,
                    why_text,
                    threat_signature,
                    datetime.now().isoformat()
                ))

    conn.commit()
    conn.close()

def add_equipment(eq_id, name, line, protocol, plant_id='Hosur-01', sector='Electronics', agent_id=None):
    """
    Onboards a new physical asset into the Sovereign Matrix across global facilities.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO equipment (id, name, production_line, plant_id, sector, protocol, agent_id, last_maintenance_date, next_scheduled_date, mtbf)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            eq_id, name, line, plant_id, sector, protocol, 
            agent_id or f"agt-{eq_id}", 
            datetime.now().date().isoformat(),
            (datetime.now() + timedelta(days=90)).date().isoformat(),
            5000
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"Equipment Onboarding Error: {e}")
        return False
    finally:
        conn.close()

def get_all_equipment_metadata():
    """Retrieves all registered equipment metadata."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM equipment")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def log_manual_repair(eq_id, operator, action, parts="None", alert_id=None):
    """
    Records a human intervention in the Sovereign Ledger.
    This data is the 'Ground Truth' for future AI reasoning.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO manual_logs (equipment_id, timestamp, operator_name, action_taken, parts_replaced, resolved_anomaly_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (eq_id, datetime.now().isoformat(), operator, action, parts, alert_id))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"Repair Log Error: {e}")
        return None
    finally:
        conn.close()

def add_parameter(machine_id, key, name, unit=None, **kwargs):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cols = ['machine_id', 'parameter_key', 'display_name', 'unit'] + list(kwargs.keys())
    vals = [machine_id, key, name, unit] + list(kwargs.values())
    placeholders = ', '.join(['?'] * len(cols))
    col_names = ', '.join(cols)
    try:
        cursor.execute(f"INSERT OR REPLACE INTO machine_parameters ({col_names}) VALUES ({placeholders})", vals)
        conn.commit()
        return True
    except Exception as e:
        print(f"Error adding parameter: {e}")
        return False
    finally:
        conn.close()

def get_machine_parameters(machine_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM machine_parameters WHERE machine_id = ? ORDER BY display_order ASC", (machine_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_machine_financials(machine_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM machine_financials WHERE machine_id = ?", (machine_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_spare_parts(machine_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM spare_parts_catalog
        WHERE machine_id = ?
        ORDER BY planned_cost_inr DESC, id ASC
    """, (machine_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_latest_usage_snapshot(machine_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM machine_usage_snapshots
        WHERE machine_id = ?
        ORDER BY captured_at DESC, id DESC
        LIMIT 1
    """, (machine_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_usage_snapshots(machine_id, limit=12):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM machine_usage_snapshots
        WHERE machine_id = ?
        ORDER BY captured_at DESC, id DESC
        LIMIT ?
    """, (machine_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_incident_report_ai(machine_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incident_reports_ai WHERE machine_id = ?", (machine_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def upsert_incident_report_ai(machine_id, report):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO incident_reports_ai
        (machine_id, incident_type, severity, who_text, what_text, where_text, when_text, why_text, root_cause_summary, threat_signature, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(machine_id) DO UPDATE SET
            incident_type = excluded.incident_type,
            severity = excluded.severity,
            who_text = excluded.who_text,
            what_text = excluded.what_text,
            where_text = excluded.where_text,
            when_text = excluded.when_text,
            why_text = excluded.why_text,
            root_cause_summary = excluded.root_cause_summary,
            threat_signature = excluded.threat_signature,
            generated_at = excluded.generated_at
    """, (
        machine_id,
        report.get("incident_type", "Unknown incident"),
        report.get("severity", "medium"),
        report.get("who_text"),
        report.get("what_text"),
        report.get("where_text"),
        report.get("when_text"),
        report.get("why_text"),
        report.get("root_cause_summary"),
        report.get("threat_signature"),
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()

def seed_common_parameters(machine_id):
    """Seeds the 5 universal parameters for a new machine."""
    commons = [
        ('temperature', 'Temperature', '°C', 20, 80, 100, 120, 'above'),
        ('vibration_rms', 'Vibration RMS', 'mm/s', 0, 2.5, 4.5, 6.0, 'above'),
        ('pressure', 'Pressure', 'bar', 1, 10, 12, 15, 'above'),
        ('rpm', 'RPM', 'RPM', 0, 3000, 3500, 4000, 'above'),
        ('current_draw', 'Current Draw', 'A', 0, 50, 60, 75, 'above')
    ]
    for key, name, unit, n_min, n_max, w_th, c_th, direction in commons:
        add_parameter(machine_id, key, name, unit, 
                      category='common', normal_min=n_min, normal_max=n_max, 
                      warning_threshold=w_th, critical_threshold=c_th, direction=direction)

def log_telemetry_point(machine_id, key, value, string_value=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO telemetry_readings (machine_id, parameter_key, value, string_value, timestamp) VALUES (?, ?, ?, ?, ?)",
        (machine_id, key, value, string_value, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def log_sensor_reading(eq_id, temp, vib):
    """
    Logs raw telemetry data and performs sub-millisecond Edge analysis via Rust.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Edge Intelligence: High-Frequency Harmonics Check (Rust-Powered)
    # In a real CNC environment, this would run on the Edge IPC
    try:
        from src.data.analytics import calculate_failure_probability
        # Fetch last 50 points to check for harmonic resonance
        cursor.execute("SELECT vibration FROM sensor_readings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 50", (eq_id,))
        recent_vib = [r[0] for r in cursor.fetchall()]
        if len(recent_vib) > 10 and rust_engine:
            st = rust_engine.SegmentTree(recent_vib + [vib])
            peak_vib = st.query_max(0, len(recent_vib) + 1)
            # If peak vibration in window exceeds CNC precision threshold (e.g. 1.5G)
            if peak_vib > 1.5:
                 print(f"⚠️ [EDGE AI] RESONANCE DETECTED ({eq_id}): PEAK {peak_vib}G")
    except:
        pass

    cursor.execute(
        "INSERT INTO sensor_readings (equipment_id, timestamp, temperature, vibration) VALUES (?, ?, ?, ?)",
        (eq_id, datetime.now().isoformat(), temp, vib)
    )
    conn.commit()
    conn.close()

def log_ai_alert(eq_id, severity, reason, prescription):
    """Logs AI strategic prescriptions. This is what the dashboard pulls from."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO ai_alerts (equipment_id, timestamp, severity, reason, prescription) VALUES (?, ?, ?, ?, ?)",
        (eq_id, datetime.now().isoformat(), severity, reason, prescription)
    )
    conn.commit()
    conn.close()

def get_last_alert_timestamp(equipment_id):
    """
    Returns the Unix timestamp of the last AI alert for a specific machine.
    Used by the Ingestor to enforce cooldown protocols and save tokens.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp FROM ai_alerts 
        WHERE equipment_id = ? 
        ORDER BY timestamp DESC LIMIT 1
    """, (equipment_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        try:
            # Convert ISO 8601 string back to timestamp
            dt = datetime.fromisoformat(row[0])
            return dt.timestamp()
        except Exception:
            return 0
    return 0

def get_recent_readings(limit=100):
    """Retrieves chronological telemetry for frontend charting."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_latest_alerts(limit=10):
    """Retrieves high-priority AI prescriptions for the dashboard notifications."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    init_db()
    print(f"--- [SOVEREIGN DB] Initialized at {DB_PATH} ---")
