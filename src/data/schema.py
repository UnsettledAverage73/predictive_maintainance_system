from typing import List, Optional
from datetime import datetime
from dataclasses import dataclass, field

@dataclass
class MaintenanceLog:
    equipment_id: str
    equipment_name: str
    timestamp: datetime
    activity_type: str  # e.g., "Repair", "Inspection", "Routine"
    notes: str
    status: str  # e.g., "Fixed", "Pending", "Needs Follow-up"
    severity: str = "Low"  # "Low", "Medium", "High", "Critical"

@dataclass
class OperationalNote:
    equipment_id: str
    timestamp: datetime
    note: str
    observed_by: Optional[str] = None

@dataclass
class IncidentReport:
    equipment_id: str
    timestamp: datetime
    incident_type: str
    description: str
    impact: str  # e.g., "Partial Downtime", "Total Downtime", "None"
    resolution: Optional[str] = None
