import sqlite3
from datetime import datetime, timedelta
import os

DB_PATH = "data/factory_ops.db"

def init_db():
    """Initializes the Sovereign Ledger with Telemetry, Intelligence, and Human Feedback layers."""
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
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
    
    conn.commit()
    conn.close()
    
    # 5. Seed initial data if empty
    seed_initial_data()
    
    print(f"--- [DATABASE UPDATED] Schema V2 Live at {DB_PATH} ---")

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
                add_parameter(eq_id, "spindle_load", "Spindle Load", "%", n_min=0, n_max=70, w_th=85, c_th=100)
            elif eq_id == "HYD005":
                add_parameter(eq_id, "oil_temp", "Oil Temperature", "°C", n_min=30, n_max=60, w_th=75, c_th=85)
        
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

def add_equipment(eq_id, name, line, protocol, agent_id=None):
    """
    Onboards a new physical asset into the Sovereign Matrix.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO equipment (id, name, production_line, protocol, agent_id, last_maintenance_date, next_scheduled_date, mtbf)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            eq_id, name, line, protocol, 
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
    """Logs raw telemetry data into the local persistence layer (Legacy)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
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
