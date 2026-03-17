import json
import os
import requests
from typing import List, Dict, Any
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class MaintenanceAgent:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.data = self._load_data()
        
        # Local Sovereign Configuration (Ollama)
        self.local_url = "http://localhost:11434/api/generate"
        self.local_model = "qwen2.5:0.5b"  # Fast, local model found in your environment
        
        # Cloud Fallback Configuration (Groq)
        self.groq_key = os.getenv("GROQ_API_KEY")
        if self.groq_key:
            self.groq_client = Groq(api_key=self.groq_key)
            self.groq_model = 'llama-3.3-70b-versatile'
        else:
            self.groq_client = None

    def _load_data(self) -> Dict[str, Any]:
        with open(self.data_path, "r") as f:
            return json.load(f)

    def get_equipment_history(self, equipment_id: str) -> Dict[str, List]:
        history = {
            "logs": [log for log in self.data["maintenance_logs"] if log["equipment_id"] == equipment_id],
            "notes": [note for note in self.data["operational_notes"] if note["equipment_id"] == equipment_id],
            "incidents": [inc for inc in self.data["incident_reports"] if inc["equipment_id"] == equipment_id]
        }
        return history

    def summarize_all_equipment(self) -> str:
        summary = "Current Equipment Status Summary:\n"
        for eq_id in set(log["equipment_id"] for log in self.data["maintenance_logs"]):
            history = self.get_equipment_history(eq_id)
            num_logs = len(history["logs"])
            num_incidents = len(history["incidents"])
            summary += f"- {eq_id}: {num_logs} maintenance logs, {num_incidents} incidents recorded.\n"
        return summary

    def analyze_patterns(self) -> str:
        """
        Sovereign Logic: Performs reasoning over logs to find hidden failure signatures.
        Tries Local LLM first, falls back to Cloud if local fails.
        """
        context = json.dumps(self.data, indent=2)
        system_prompt = """
        You are a Senior Plant CTO. Analyze the provided logs. 
        Look for 'Brownfield' legacy issues:
        1. Identify hidden correlations (e.g., specific operators reporting recurring issues).
        2. Flag vernacular notes or slang that indicate failure.
        3. Suggest immediate 'Prescriptive' actions.
        """

        # PHASE 3: Try Local Inference First
        print(f"--- ATTEMPTING LOCAL SOVEREIGN INFERENCE ({self.local_model}) ---")
        local_result = self._get_local_inference(system_prompt, context)
        
        if local_result and "Error" not in local_result:
            return local_result
        
        # FALLBACK: Cloud Inference
        print("--- FALLING BACK TO CLOUD INFERENCE (Groq) ---")
        return self._get_cloud_inference(system_prompt, context)

    def _get_local_inference(self, system_prompt, user_content) -> str:
        """
        Calls the local Ollama instance for sovereign inference.
        """
        try:
            full_prompt = f"{system_prompt}\n\nData Context:\n{user_content}"
            payload = {
                "model": self.local_model,
                "prompt": full_prompt,
                "stream": False
            }
            response = requests.post(self.local_url, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json().get("response", "No response from local model.")
            else:
                return f"Error: Local model service returned status {response.status_code}"
        except Exception as e:
            return f"Error connecting to local model: {str(e)}"

    def _get_cloud_inference(self, system_prompt, user_content) -> str:
        """
        Calls the Groq API for cloud inference.
        """
        if not self.groq_client:
            return "Error: Cloud client not initialized. Check your API key."
            
        try:
            response = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Data Context:\n{user_content}"}
                ],
                model=self.groq_model,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error during Cloud AI inference: {str(e)}"

    def generate_prioritized_schedule(self) -> str:
        priorities = []
        for eq_id in set(log["equipment_id"] for log in self.data["maintenance_logs"]):
            history = self.get_equipment_history(eq_id)
            score = len(history["incidents"]) * 5 + len(history["notes"]) * 2
            priorities.append((eq_id, score))

        priorities.sort(key=lambda x: x[1], reverse=True)
        
        schedule = "Prioritized Maintenance Schedule:\n"
        for i, (eq_id, score) in enumerate(priorities, 1):
            reason = "High incident count" if score > 10 else "Routine check recommended"
            schedule += f"{i}. {eq_id} (Priority Score: {score}) - Reason: {reason}\n"
        return schedule
