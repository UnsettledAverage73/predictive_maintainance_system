import unittest
import os
import sys
from unittest.mock import MagicMock, patch

# Add src to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

from src.agent.maintenance_agent import MaintenanceAgent
from src.data import database

class TestSlashCommands(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        database.DB_PATH = "data/test_slash.db"
        database.init_db()
        database.add_equipment("CNC-SLASH", "Slash Test Machine", "Line 1", "MQTT")
        
        # Create test_data.json
        if not os.path.exists("data"):
            os.makedirs("data")
        with open("data/test_data.json", "w") as f:
            import json
            json.dump({"maintenance_logs": [], "operational_notes": []}, f)

    async def asyncTearDown(self):
        if os.path.exists("data/test_slash.db"):
            os.remove("data/test_slash.db")
        if os.path.exists("data/test_data.json"):
            os.remove("data/test_data.json")

    async def test_help_command(self):
        agent = MaintenanceAgent("data/test_data.json")
        result = await agent.get_orchestrator_response("/help", "CNC-SLASH")
        self.assertIn("Available Commands", result['message'])
        self.assertEqual(result['confidence'], 100)

    async def test_priority_command(self):
        agent = MaintenanceAgent("data/test_data.json")
        result = await agent.get_orchestrator_response("/priority", "CNC-SLASH")
        self.assertIn("AI-Prioritized Maintenance Schedule", result['message'])

    async def test_status_command(self):
        agent = MaintenanceAgent("data/test_data.json")
        # Add some health data
        database.log_sensor_reading("CNC-SLASH", 45.0, 0.5)
        
        result = await agent.get_orchestrator_response("/status", "CNC-SLASH")
        self.assertIn("Health Status for CNC-SLASH", result['message'])
        self.assertIn("45.0°C", result['message'])

    async def test_history_command(self):
        agent = MaintenanceAgent("data/test_data.json")
        database.log_agent_interaction("CNC-SLASH", "user", "Test Query", "sess-test")
        
        result = await agent.get_orchestrator_response("/history", "CNC-SLASH", "sess-test")
        self.assertIn("Recent History", result['message'])
        self.assertIn("USER: Test Query", result['message'])

if __name__ == "__main__":
    unittest.main()
