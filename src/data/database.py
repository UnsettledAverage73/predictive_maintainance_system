import sqlite3
from datetime import datetime
import os

DB_PATH = "data/factory_ops.db"

def init_db():
    """Initializes the SQLite database with tables for sensors and alerts."""
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Table for raw sensor readings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id TEXT,
            timestamp DATETIME,
            temperature REAL,
            vibration REAL
        )
    ''')
    
    # Table for AI-generated alerts and prescriptions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id TEXT,
            timestamp DATETIME,
            severity TEXT,
            reason TEXT,
            prescription TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def log_sensor_reading(eq_id, temp, vib):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sensor_readings (equipment_id, timestamp, temperature, vibration) VALUES (?, ?, ?, ?)",
        (eq_id, datetime.now().isoformat(), temp, vib)
    )
    conn.commit()
    conn.close()

def log_ai_alert(eq_id, severity, reason, prescription):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO ai_alerts (equipment_id, timestamp, severity, reason, prescription) VALUES (?, ?, ?, ?, ?)",
        (eq_id, datetime.now().isoformat(), severity, reason, prescription)
    )
    conn.commit()
    conn.close()

def get_recent_readings(limit=100):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_latest_alerts(limit=10):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
