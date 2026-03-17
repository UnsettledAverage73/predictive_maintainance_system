import unittest
import json
import os
import sys

# Add src to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

from src.agent.maintenance_agent import MaintenanceAgent

class TestMaintenanceAgent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a temporary test data file
        cls.test_data = {
            "maintenance_logs": [
                {"equipment_id": "EQ1", "equipment_name": "Test EQ", "timestamp": "2023-01-01T00:00:00", "activity_type": "Repair", "notes": "Fixed stuff", "status": "Fixed", "severity": "Medium"}
            ],
            "operational_notes": [
                {"equipment_id": "EQ1", "timestamp": "2023-01-02T00:00:00", "note": "Making noise", "observed_by": "John"}
            ],
            "incident_reports": [
                {"equipment_id": "EQ1", "timestamp": "2023-01-03T00:00:00", "incident_type": "Overheating", "description": "Too hot", "impact": "Partial Downtime", "resolution": "Cooled down"}
            ]
        }
        cls.test_data_path = "tests/test_data.json"
        with open(cls.test_data_path, "w") as f:
            json.dump(cls.test_data, f)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_data_path):
            os.remove(cls.test_data_path)

    def test_load_data(self):
        agent = MaintenanceAgent(self.test_data_path)
        self.assertEqual(len(agent.data["maintenance_logs"]), 1)

    def test_get_history(self):
        agent = MaintenanceAgent(self.test_data_path)
        history = agent.get_equipment_history("EQ1")
        self.assertEqual(len(history["logs"]), 1)
        self.assertEqual(len(history["incidents"]), 1)

    def test_summarize(self):
        agent = MaintenanceAgent(self.test_data_path)
        summary = agent.summarize_all_equipment()
        self.assertIn("EQ1", summary)

if __name__ == "__main__":
    unittest.main()
