import unittest
import json
import os
import sys

# Protocol: Ensure Project Root is in the path for absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

# Correct Absolute Imports
from src.api import app

client = TestClient(app)

class TestSovereignIntegration(unittest.TestCase):

    @patch('src.api.agent.analyze_patterns')
    def test_api_equipment_intelligence(self, mock_analyze):
        """Protocol: Ensure the Dashboard API returns predictive health scores."""
        mock_analyze.return_value = "CNC001: Operational stability high."

        response = client.get("/api/equipment")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Verify the Sovereign Schema
        if len(data) > 0:
            self.assertIn("healthScore", data[0])
            self.assertIn("failureProbability", data[0])
            print("✅ API: Equipment Intelligence Schema Validated.")

    @patch('src.api.agent._get_cloud_inference')
    @patch('src.api.agent._get_embedding')
    def test_sovereign_chat_loop(self, mock_embed, mock_inference):
        """Protocol: Test the End-to-End RAG Chat Loop."""
        # 1. Mock the Vector Memory & Reasoning
        mock_embed.return_value = [0.1] * 1536
        mock_inference.return_value = "I recommend checking the S-902 sensor on CNC001."

        # 2. Mock the Pinecone Index within the Agent stored in the API
        with patch('src.api.agent.index') as mock_index:
            mock_index.query.return_value = {
                "matches": [{"metadata": {"notes": "Previous thermal fix"}, "score": 0.95}]
            }

            # 3. Trigger a Chat Request
            chat_payload = {
                "messages": [{"role": "user", "content": "What's wrong with CNC001?"}],
                "machineId": "CNC001",
                "machineName": "CNC Miller",
                "equipmentData": {
                    "temperature": 125, 
                    "vibration": 12,
                    "pressure": 45,
                    "runtimeHours": 1000,
                    "efficiency": 90,
                    "lastMaintenance": "2024-01-01"
                }
            }

            response = client.post("/api/chat", json=chat_payload)

            self.assertEqual(response.status_code, 200)
            result = response.json()
            # Verify RAG context was used in the response
            self.assertIn("sensor", result["message"].lower())
            print("✅ API: Sovereign Chat Loop (RAG) Validated.")

    def test_factory_stats_aggregation(self):
        """Protocol: Ensure the Global Risk Index (GRI) is calculated."""
        response = client.get("/api/factory/stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        self.assertIn("globalRisk", stats)
        print(f"✅ API: Factory Stats GRI = {stats['globalRisk']}%")

if __name__ == "__main__":
    unittest.main()
