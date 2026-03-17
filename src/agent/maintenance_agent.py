import json
import os
import requests
from typing import List, Dict, Any
from groq import Groq
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class MaintenanceAgent:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.data = self._load_data()
        
        # Local Sovereign Configuration (Ollama)
        self.ollama_base_url = "http://localhost:11434/api"
        self.local_model = "qwen2.5:0.5b"
        self.embed_model = "nomic-embed-text:latest"
        
        # Cloud Fallback Configuration (Groq)
        self.groq_key = os.getenv("GROQ_API_KEY")
        if self.groq_key:
            self.groq_client = Groq(api_key=self.groq_key)
            self.groq_model = 'llama-3.3-70b-versatile'
        else:
            self.groq_client = None

        # Vector DB Configuration (Pinecone)
        self.pc_key = os.getenv("PINECONE_API_KEY")
        if self.pc_key:
            self.pc = Pinecone(api_key=self.pc_key)
            self.index_name = "maintenance-logs"
            self._init_pinecone()
        else:
            self.pc = None
            print("Warning: PINECONE_API_KEY not found. Vector features disabled.")

    def _init_pinecone(self):
        """Initializes the Pinecone index if it doesn't exist and waits for readiness."""
        try:
            import time
            if self.index_name not in [idx.name for idx in self.pc.list_indexes()]:
                print(f"Creating Pinecone index: {self.index_name}...")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=768, # Dimension for nomic-embed-text
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                # Wait for index to be ready
                while not self.pc.describe_index(self.index_name).status['ready']:
                    print("Waiting for Pinecone index to be ready...")
                    time.sleep(5)
            
            self.index = self.pc.Index(self.index_name)
        except Exception as e:
            print(f"Error initializing Pinecone: {str(e)}")
            self.pc = None

    def _get_embedding(self, text: str) -> List[float]:
        """Generates embedding using local Ollama model."""
        try:
            response = requests.post(
                f"{self.ollama_base_url}/embeddings",
                json={"model": self.embed_model, "prompt": text}
            )
            return response.json().get("embedding", [])
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            return []

    def sync_to_vector_db(self):
        """Syncs local JSON data to Pinecone vector database with verbose progress and retry logic."""
        if not self.pc:
            return "Pinecone not initialized."
        
        vectors = []
        print(f"Generating embeddings for {len(self.data['maintenance_logs'])} logs and {len(self.data['operational_notes'])} notes...")
        
        # Index Maintenance Logs
        for i, log in enumerate(self.data["maintenance_logs"]):
            text = f"Log: {log['equipment_name']} ({log['equipment_id']}) - {log['activity_type']}: {log['notes']} - Severity: {log['severity']}"
            embedding = self._get_embedding(text)
            if embedding:
                vectors.append({
                    "id": f"log_{i}",
                    "values": embedding,
                    "metadata": {**log, "type": "maintenance_log"}
                })
                if (i+1) % 5 == 0:
                    print(f"  Processed {i+1} log embeddings...")
        
        # Index Operational Notes
        for i, note in enumerate(self.data["operational_notes"]):
            text = f"Note: {note['equipment_id']} observed by {note['observed_by']}: {note['note']}"
            embedding = self._get_embedding(text)
            if embedding:
                vectors.append({
                    "id": f"note_{i}",
                    "values": embedding,
                    "metadata": {**note, "type": "operational_note"}
                })
                if (i+1) % 5 == 0:
                    print(f"  Processed {i+1} note embeddings...")

        if vectors:
            import time
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    print(f"Upserting {len(vectors)} vectors to Pinecone...")
                    # Batch upsert
                    for i in range(0, len(vectors), 100):
                        self.index.upsert(vectors=vectors[i:i+100])
                    return f"Successfully synced {len(vectors)} records to Pinecone."
                except Exception as e:
                    if "NameResolutionError" in str(e) or "Temporary failure in name resolution" in str(e):
                        print(f"DNS propagation in progress... Retrying in 10s (Attempt {attempt+1}/{max_retries})")
                        time.sleep(10)
                    else:
                        return f"Error syncing to Pinecone: {str(e)}"
            return "Error: Could not sync to Pinecone after multiple retries due to DNS issues."
        return "No new data to sync."

    def _load_data(self) -> Dict[str, Any]:
        with open(self.data_path, "r") as f:
            return json.load(f)

    def get_equipment_history(self, equipment_id: str) -> Dict[str, List]:
        # Original logic remains for exact matching
        history = {
            "logs": [log for log in self.data["maintenance_logs"] if log["equipment_id"] == equipment_id],
            "notes": [note for note in self.data["operational_notes"] if note["equipment_id"] == equipment_id],
            "incidents": [inc for inc in self.data["incident_reports"] if inc["equipment_id"] == equipment_id]
        }
        return history

    def query_similar_issues(self, query: str, top_k: int = 5) -> str:
        """Queries Pinecone for semantically similar issues."""
        if not self.pc:
            return "Vector DB not available."
        
        embedding = self._get_embedding(query)
        if not embedding:
            return "Could not generate query embedding."
            
        results = self.index.query(vector=embedding, top_k=top_k, include_metadata=True)
        
        output = "Semantically Similar Historical Issues:\n"
        for res in results.matches:
            meta = res.metadata
            output += f"- [{meta['type']}] {meta.get('equipment_id')}: {meta.get('notes') or meta.get('note')} (Confidence: {res.score:.2f})\n"
        return output

    def summarize_all_equipment(self) -> str:
        summary = "Current Equipment Status Summary:\n"
        for eq_id in set(log["equipment_id"] for log in self.data["maintenance_logs"]):
            history = self.get_equipment_history(eq_id)
            num_logs = len(history["logs"])
            num_incidents = len(history["incidents"])
            summary += f"- {eq_id}: {num_logs} maintenance logs, {num_incidents} incidents recorded.\n"
        return summary

    def analyze_patterns(self) -> str:
        """Sovereign Logic with RAG: Uses vector search context for deeper analysis."""
        context = json.dumps(self.data, indent=2)
        
        # Add a step for semantic context retrieval
        semantic_context = self.query_similar_issues("Identify failure patterns, overheating, or recurring vibration issues")
        
        system_prompt = f"""
        You are a Senior Plant CTO. Analyze the provided logs and semantic context. 
        Look for 'Brownfield' legacy issues:
        1. Identify hidden correlations (e.g., specific operators reporting recurring issues).
        2. Flag vernacular notes or slang that indicate failure.
        3. Use the semantic historical context to confirm if these issues have happened before.
        4. Suggest immediate 'Prescriptive' actions.

        Semantic Context from History:
        {semantic_context}
        """

        print(f"--- ATTEMPTING LOCAL SOVEREIGN INFERENCE ({self.local_model}) ---")
        local_result = self._get_local_inference(system_prompt, context)
        
        if local_result and "Error" not in local_result:
            return local_result
        
        print("--- FALLING BACK TO CLOUD INFERENCE (Groq) ---")
        return self._get_cloud_inference(system_prompt, context)

    def _get_local_inference(self, system_prompt, user_content) -> str:
        try:
            full_prompt = f"{system_prompt}\n\nData Context:\n{user_content}"
            payload = {
                "model": self.local_model,
                "prompt": full_prompt,
                "stream": False
            }
            response = requests.post(f"{self.ollama_base_url}/generate", json=payload, timeout=60)
            if response.status_code == 200:
                return response.json().get("response", "No response from local model.")
            else:
                return f"Error: Local model service status {response.status_code}"
        except Exception as e:
            return f"Error connecting to local model: {str(e)}"

    def _get_cloud_inference(self, system_prompt, user_content) -> str:
        if not self.groq_client:
            return "Error: Cloud client not initialized."
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
