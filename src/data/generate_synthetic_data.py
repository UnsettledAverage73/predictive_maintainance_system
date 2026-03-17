import json
import random
from datetime import datetime, timedelta
from typing import List, Dict

# Synthetic Equipment List
EQUIPMENT = [
    {"id": "CNC001", "name": "CNC Lathe Machine A"},
    {"id": "CONV01", "name": "Conveyor Belt Assembly B"},
    {"id": "HYD005", "name": "Hydraulic Press C"},
    {"id": "EXT002", "name": "Extruder D"},
]

ACTIVITY_TYPES = ["Repair", "Inspection", "Routine Maintenance", "Emergency Fix"]
STATUSES = ["Fixed", "Pending", "Needs Follow-up"]
SEVERITIES = ["Low", "Medium", "High", "Critical"]
INCIDENT_TYPES = ["Overheating", "Strange Noise", "Leakage", "Power Failure", "Sensor Error"]
IMPACTS = ["None", "Partial Downtime", "Total Downtime"]

def generate_data(num_logs: int = 10, num_notes: int = 10, num_incidents: int = 5):
    data = {
        "maintenance_logs": [],
        "operational_notes": [],
        "incident_reports": []
    }

    start_date = datetime.now() - timedelta(days=30)

    # Generate Logs
    for _ in range(num_logs):
        eq = random.choice(EQUIPMENT)
        log = {
            "equipment_id": eq["id"],
            "equipment_name": eq["name"],
            "timestamp": (start_date + timedelta(days=random.randint(0, 30))).isoformat(),
            "activity_type": random.choice(ACTIVITY_TYPES),
            "notes": f"Standard {random.choice(['checkup', 'servicing', 'replacement'])} performed on {eq['name']}.",
            "status": random.choice(STATUSES),
            "severity": random.choice(SEVERITIES)
        }
        data["maintenance_logs"].append(log)

    # Generate Operational Notes
    for _ in range(num_notes):
        eq = random.choice(EQUIPMENT)
        note = {
            "equipment_id": eq["id"],
            "timestamp": (start_date + timedelta(days=random.randint(0, 30))).isoformat(),
            "note": f"Operator observed {random.choice(['minor vibration', 'strange smell', 'slight lag', 'fluctuating temperature'])} in {eq['name']}.",
            "observed_by": f"Operator {random.randint(1, 20)}"
        }
        data["operational_notes"].append(note)

    # Generate Incident Reports
    for _ in range(num_incidents):
        eq = random.choice(EQUIPMENT)
        incident = {
            "equipment_id": eq["id"],
            "timestamp": (start_date + timedelta(days=random.randint(0, 30))).isoformat(),
            "incident_type": random.choice(INCIDENT_TYPES),
            "description": f"Unexpected {random.choice(['failure', 'breakdown', 'malfunction'])} of {eq['name']} during peak hours.",
            "impact": random.choice(IMPACTS),
            "resolution": random.choice(["Fixed on site", "Requires external technician", "Pending spare parts", None])
        }
        data["incident_reports"].append(incident)

    return data

if __name__ == "__main__":
    synthetic_data = generate_data()
    with open("data/sample_maintenance_data.json", "w") as f:
        json.dump(synthetic_data, f, indent=4)
    print("Synthetic data generated successfully.")
