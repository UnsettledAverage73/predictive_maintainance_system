import sqlite3
from datetime import datetime, timedelta
import os

DB_PATH = "data/factory_ops.db"

def init_db():
    """Initializes the Sovereign Ledger with Telemetry, Intelligence, and Human Feedback layers."""
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Telemetry Layer: High-frequency raw sensor data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            temperature REAL,
            vibration REAL
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
    
    conn.commit()
    conn.close()
    print(f"--- [DATABASE UPDATED] Schema V2 Live at {DB_PATH} ---")

def add_equipment(id, name, production_line, protocol):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS equipment_metadata (
                id TEXT PRIMARY KEY,
                name TEXT,
                production_line TEXT,
                protocol TEXT,
                status TEXT DEFAULT 'online',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute(
            "INSERT INTO equipment_metadata (id, name, production_line, protocol) VALUES (?, ?, ?, ?)",
            (id, name, production_line, protocol)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"DB Error: {e}")
        return False
    finally:
        conn.close()

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

def log_sensor_reading(eq_id, temp, vib):
    """Logs raw telemetry data into the local persistence layer."""
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
