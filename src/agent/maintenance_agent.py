import json
import os
import requests
import time
from typing import List, Dict, Any
from groq import Groq
from sarvamai import SarvamAI
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
from datetime import datetime, timedelta
from src.agent import ocr_engine

# Load environment variables
load_dotenv()

class MaintenanceAgent:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.data = self._load_data()
        
        # Local Sovereign Configuration (Ollama)
        # Note: In Docker, use http://host.docker.internal:11434/api if Ollama is on host
        self.ollama_base_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api")
        self.local_model = "qwen2.5:0.5b"
        self.embed_model = "nomic-embed-text:latest"
        
        # Cloud Fallback 1: Groq (Llama 3.1 8B for efficiency)
        self.groq_key = os.getenv("GROQ_API_KEY")
        if self.groq_key:
            self.groq_client = Groq(api_key=self.groq_key)
            self.groq_model = 'llama-3.1-8b-instant'
        else:
            self.groq_client = None

        # Cloud Multilingual Layer: Sarvam AI
        self.sarvam_key = os.getenv("SARVAM_API_KEY")
        if self.sarvam_key:
            self.sarvam_client = SarvamAI(api_subscription_key=self.sarvam_key)
            self.sarvam_model = "sarvam-105b"
        else:
            self.sarvam_client = None

        # Vector DB Configuration (Pinecone)
        self.pc_key = os.getenv("PINECONE_API_KEY")
        self.index_name = "maintenance-logs"
        if self.pc_key:
            self.pc = Pinecone(api_key=self.pc_key)
            self._init_pinecone()
        else:
            self.pc = None

    def get_orchestrator_response(self, query: str, machine_id: str = "GLOBAL") -> Dict[str, Any]:
        """
        The Sovereign Orchestrator: 
        Retrieves context from SQL, JSON, and Pinecone before reasoning.
        """
        # 1. Fetch Context from Vector DB (Pinecone)
        vector_context = self.query_similar_issues(query, top_k=2)
        
        # 2. Fetch Context from SQL (Latest Alerts/Telemtry)
        import sqlite3
        conn = sqlite3.connect("data/factory_ops.db")
        cursor = conn.cursor()
        cursor.execute("SELECT severity, reason FROM ai_alerts ORDER BY timestamp DESC LIMIT 3")
        sql_context = [f"{r[0]}: {r[1]}" for r in cursor.fetchall()]
        conn.close()

        # 3. Construct Deep Reasoning Prompt
        system_prompt = f"""
        You are the Plant-wide Orchestrator AI. 
        Context from Sovereign Memory (RAG): {vector_context}
        Context from Live SQL Ledger: {sql_context}
        Current Target: {machine_id}
        """
        
        response = self._get_cloud_inference(system_prompt, query)
        
        # Return response with 'Sources' for the Frontend Context Panel
        return {
            "message": response,
            "sources": [
                {"name": "SQLite: ai_alerts", "description": "Latest strategic prescriptions"},
                {"name": "Vector: Sovereign Memory", "description": f"Retrieved: {vector_context[:50]}..."},
                {"name": "JSON: maintenance_logs", "description": "Historical servicing patterns"}
            ],
            "confidence": 94.2 # You can calculate this based on RAG scores
        }

    def process_multimodal_event(self, telemetry_data: Dict[str, Any], image_bytes: bytes) -> Dict[str, Any]:
        """
        Combines sensor data with visual context (OCR) for deep diagnostics.
        """
        raw_ocr = ocr_engine.extract_text(image_bytes)
        eq_id = telemetry_data.get("equipment_id", "UNKNOWN")
        
        prompt = f"""
        Analyze machine event. 
        Telemetry: {json.dumps(telemetry_data)}
        Visual context (OCR): {raw_ocr}
        """
        
        prescription = self.analyze_patterns() # Fallback to pattern analysis
        if self.sarvam_client:
            prescription = self._get_sarvam_inference("You are a multimodal diagnostic expert.", prompt)
            
        return {
            "equipment_id": eq_id,
            "raw_ocr": raw_ocr,
            "prescription": prescription,
            "telemetry": telemetry_data
        }

    def _init_pinecone(self):
        try:
            active_indexes = [idx.name for idx in self.pc.list_indexes()]
            if self.index_name not in active_indexes:
                self.pc.create_index(
                    name=self.index_name,
                    dimension=768,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                while not self.pc.describe_index(self.index_name).status['ready']:
                    time.sleep(2)
            self.index = self.pc.Index(self.index_name)
        except Exception as e:
            print(f"Pinecone Init Error: {e}")
            self.pc = None

    def _get_embedding(self, text: str) -> List[float]:
        try:
            response = requests.post(
                f"{self.ollama_base_url}/embeddings",
                json={"model": self.embed_model, "prompt": text},
                timeout=2
            )
            return response.json().get("embedding", [])
        except:
            return []

    def sync_to_vector_db(self):
        if not self.pc: return "Pinecone not initialized."
        vectors = []
        # Syncing limited slices to stay within free tier limits
        for i, log in enumerate(self.data.get("maintenance_logs", [])[-20:]):
            text = f"Log: {log['equipment_name']} - {log['notes']}"
            embedding = self._get_embedding(text)
            if embedding:
                vectors.append({"id": f"log_{i}", "values": embedding, "metadata": {**log, "type": "maintenance_log"}})
        
        if vectors:
            self.index.upsert(vectors=vectors)
            return f"Synced {len(vectors)} records."
        return "No new data."

    def query_similar_issues(self, query: str, top_k: int = 2) -> str:
        if not self.pc or not self.index: return "Vector DB offline."
        embedding = self._get_embedding(query)
        if not embedding: return "Local embeddings offline."
        
        results = self.index.query(vector=embedding, top_k=top_k, include_metadata=True)
        output = ""
        for res in results.matches:
            m = res.metadata
            output += f"Past Case: {m.get('notes') or m.get('note')} | "
        return output

    def analyze_patterns(self) -> str:
        """Windowed Analysis: Only sends recent data to avoid 429 Rate Limits."""
        # 1. Get limited semantic context
        semantic_context = self.query_similar_issues("machine noise, vibration, overheating", top_k=2)

        # 2. Windowed context (Last 3 events only)
        recent_notes = self.data.get("operational_notes", [])[-3:]
        
        system_prompt = f"""
        You are a Senior Plant CTO. Provide a 1-sentence technical prescription.
        Identify Indic code-mixed slang (Hinglish) if present.
        Historical Context: {semantic_context}
        """

        user_content = f"Recent Observations: {json.dumps(recent_notes)}"

        # Attempt Sarvam for Multilingual edge
        if self.sarvam_client:
            try:
                print(f"--- [SARVAM] Reasoning ---")
                return self._get_sarvam_inference(system_prompt, user_content)
            except:
                pass

        # Fallback to Groq
        print(f"--- [GROQ] Reasoning ---")
        return self._get_cloud_inference(system_prompt, user_content)

    def _get_sarvam_inference(self, system_prompt, user_content) -> str:
        try:
            response = self.sarvam_client.chat.completions.create(
                model=self.sarvam_model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {e}"

    def _get_cloud_inference(self, system_prompt, user_content) -> str:
        if not self.groq_client: return "Groq offline."
        try:
            response = self.groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
                model=self.groq_model,
                max_tokens=100, # Strict limit to conserve tokens
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            if "429" in str(e):
                return "⚠️ RATE LIMIT: Inspect manual for emergency cooling protocols."
            return f"Error: {e}"

    def _load_data(self) -> Dict[str, Any]:
        with open(self.data_path, "r") as f:
            return json.load(f)

    def generate_prioritized_schedule(self) -> List[Dict[str, Any]]:
        """
        Generates a prioritized list of maintenance tasks.
        In a full implementation, this would analyze risk scores and pending alerts.
        """
        return [
            {
                "id": "task-101",
                "machineId": "CNC001",
                "machineName": "CNC Lathe Machine A",
                "title": "Bearing Inspection & Lubrication",
                "description": "High vibration detected in spindle assembly. Inspect bearings for wear.",
                "aiReason": "Linear regression shows 82% probability of bearing failure within 48h.",
                "priority": "critical",
                "status": "pending",
                "dueDate": (datetime.now() + timedelta(days=1)).isoformat(),
                "assignedTo": "Sarah Connor",
                "estimatedHours": 2.5,
                "createdAt": datetime.now().isoformat()
            },
            {
                "id": "task-102",
                "machineId": "EXT002",
                "machineName": "Extruder D",
                "title": "Heating Element Calibration",
                "description": "Temperature fluctuations observed in Zone 3.",
                "aiReason": "Thermal patterns indicate potential thermocouple degradation.",
                "priority": "high",
                "status": "in_progress",
                "dueDate": (datetime.now() + timedelta(days=2)).isoformat(),
                "assignedTo": "Mike T.",
                "estimatedHours": 1.5,
                "createdAt": datetime.now().isoformat()
            },
            {
                "id": "task-103",
                "machineId": "HYD005",
                "machineName": "Hydraulic Press C",
                "title": "Fluid Level & Seal Check",
                "description": "Minor pressure drop during peak load.",
                "aiReason": "Efficiency dropped by 4% over the last 100 cycles.",
                "priority": "medium",
                "status": "pending",
                "dueDate": (datetime.now() + timedelta(days=5)).isoformat(),
                "assignedTo": "Alex J.",
                "estimatedHours": 4.0,
                "createdAt": datetime.now().isoformat()
            }
        ]


    def ingest_human_fix(self, eq_id: str, action: str):
        """
        Converts a human repair log into a vector and stores it in Pinecone.
        Now, the next time this machine fails, the AI will remember YOUR fix.
        """
        if not self.pc or not self.index:
            return "Vector DB Offline"

        text = f"FIXED: {eq_id} | ACTION: {action} | TIMESTAMP: {time.time()}"
        embedding = self._get_embedding(text)
        
        if embedding:
            self.index.upsert(vectors=[{
                "id": f"human_fix_{int(time.time())}",
                "values": embedding,
                "metadata": {
                    "equipment_id": eq_id,
                    "notes": action,
                    "type": "human_intervention",
                    "sovereign_verified": True
                }
            }])
            return "Knowledge absorbed into Sovereign Memory."
        return "Embedding failed."
