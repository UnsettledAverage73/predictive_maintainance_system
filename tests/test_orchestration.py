import unittest
import json
import os
import sys
import sqlite3
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime

# Add src to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

from src.agent.maintenance_agent import MaintenanceAgent
from src.data import database

class TestOrchestration(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        database.DB_PATH = "data/test_factory.db"
        database.init_db()
        # Seed some data
        database.add_equipment("TEST-CNC", "Test CNC Machine", "Line 1", "MQTT")
        database.log_sensor_reading("TEST-CNC", 125.0, 5.0) # High temp/vib
        
        # Create test_data.json
        if not os.path.exists("data"):
            os.makedirs("data")
        with open("data/test_data.json", "w") as f:
            json.dump({"maintenance_logs": [], "operational_notes": []}, f)
        
    async def asyncTearDown(self):
        if os.path.exists("data/test_factory.db"):
            os.remove("data/test_factory.db")
        if os.path.exists("data/test_data.json"):
            os.remove("data/test_data.json")

    def test_history_persistence(self):
        """Verify that agent history is correctly logged with session_id."""
        machine_id = "TEST-CNC"
        session_id = "session-" + str(datetime.now().timestamp())
        database.log_agent_interaction(machine_id, "user", "Hello", session_id)
        database.log_agent_interaction(machine_id, "assistant", "Hi there", session_id)
        
        history = database.get_agent_history(machine_id=machine_id, session_id=session_id)
        self.assertEqual(len(history), 2)
        # Chronological order: [Hello, Hi there]
        self.assertEqual(history[0]['content'], "Hello")
        self.assertEqual(history[1]['content'], "Hi there")

    def test_prioritized_scheduling(self):
        """Verify that the agent generates a prioritized schedule based on health."""
        agent = MaintenanceAgent("data/test_data.json")
        
        # Mocking health summary and failure probability to trigger a critical task only for TEST-CNC
        def side_effect_health(machine_id):
            if machine_id == "TEST-CNC":
                return {
                    "alerts": [{"severity": "critical", "reason": "High vibration"}],
                    "telemetry": [{"temperature": 125, "vibration": 5.0}]
                }
            return {"alerts": [], "telemetry": []}

        def side_effect_prob(readings):
            if readings and any(r.get('temperature', 0) > 100 for r in readings):
                return (85, 10.0)
            return (5, None)
            
        with patch('src.data.database.get_machine_health_summary', side_effect=side_effect_health), \
             patch('src.data.analytics.calculate_failure_probability', side_effect=side_effect_prob):
            
            schedule = agent.generate_prioritized_schedule()
            
            self.assertTrue(len(schedule) > 0)
            # Find the TEST-CNC task
            test_cnc_task = next((t for t in schedule if t['machineId'] == "TEST-CNC"), None)
            self.assertIsNotNone(test_cnc_task)
            self.assertEqual(test_cnc_task['priority'], "critical")
            self.assertIn("Urgent Diagnostic", test_cnc_task['title'])
            
            # Verify that critical tasks are at the top (CNC001 might also be critical due to seed data)
            self.assertEqual(schedule[0]['priority'], "critical")

    @patch('src.agent.maintenance_agent.MaintenanceAgent._get_cloud_inference')
    @patch('src.agent.maintenance_agent.MaintenanceAgent.query_similar_issues')
    async def test_orchestrator_session_context(self, mock_rag, mock_llm):
        """Verify the orchestrator uses session context."""
        agent = MaintenanceAgent("data/test_data.json")
        mock_rag.return_value = "No relevant manuals."
        mock_llm.return_value = "I remember you said Hello."
        
        # Pre-populate history
        database.log_agent_interaction("TEST-CNC", "user", "My name is Gemini", "sess-456")
        
        result = await agent.get_orchestrator_response("What is my name?", "TEST-CNC", "sess-456")
        
        self.assertIn("I remember", result['message'])
        # Verify it was logged
        history = database.get_agent_history(session_id="sess-456")
        self.assertEqual(len(history), 3) # My name is Gemini, response, What is my name?

    @patch('src.agent.maintenance_agent.MaintenanceAgent._get_cloud_inference')
    @patch('src.agent.maintenance_agent.MaintenanceAgent.query_similar_issues')
    async def test_multimodal_visual_persistence(self, mock_rag, mock_llm):
        """Verify the orchestrator uses persistent visual memory from a previous image upload."""
        agent = MaintenanceAgent("data/test_data.json")
        mock_rag.return_value = "No relevant manuals."
        
        # 1. Simulate an image upload (OCR context saved to DB)
        vision_context = "SERIAL_NUMBER: XYZ-789 | MODEL: TURBINE-V3"
        database.log_agent_interaction("TEST-CNC", "system_vision", vision_context, "sess-multi", is_visual_context=1)
        
        # 2. Simulate a text-only follow-up query
        mock_llm.return_value = "The serial number in that image is XYZ-789."
        
        result = await agent.get_orchestrator_response("What serial number did you see?", "TEST-CNC", "sess-multi")
        
        self.assertIn("XYZ-789", result['message'])
        
        # Verify that the history retrieval correctly excludes the raw system_vision message from "RECENT CONVERSATION"
        # but the orchestrator includes it in "VISUAL MEMORY"
        history = database.get_agent_history(session_id="sess-multi")
        # Should have [system_vision, What serial, Response]
        self.assertEqual(len(history), 3)
        self.assertEqual(history[0]['role'], 'system_vision')
        self.assertEqual(history[0]['is_visual_context'], 1)

    @patch('src.agent.maintenance_agent.MaintenanceAgent._get_cloud_inference')
    @patch('src.agent.maintenance_agent.MaintenanceAgent.query_similar_issues')
    async def test_multi_image_synthesis(self, mock_rag, mock_llm):
        """Verify the orchestrator synthesizes information from multiple images."""
        agent = MaintenanceAgent("data/test_data.json")
        mock_rag.return_value = "No relevant manuals."
        
        # 1. Simulate a multi-image upload
        v1 = "Image 1: SERIAL_NUMBER: ABC-123"
        v2 = "Image 2: ERROR_CODE: E-404"
        database.log_agent_interaction("TEST-CNC", "system_vision", v1 + "\n---\n" + v2, "sess-multi-img", is_visual_context=1)
        
        # 2. Simulate query about both
        mock_llm.return_value = "The machine with serial ABC-123 is showing error E-404."
        
        result = await agent.get_orchestrator_response("What is the status of the machine in these images?", "TEST-CNC", "sess-multi-img")
        
        self.assertIn("ABC-123", result['message'])
        self.assertIn("E-404", result['message'])

if __name__ == "__main__":
    unittest.main()
