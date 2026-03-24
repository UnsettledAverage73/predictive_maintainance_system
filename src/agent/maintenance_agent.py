import json
import os
import requests
import time
import sqlite3
from typing import List, Dict, Any, Optional
try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from sarvamai import SarvamAI
except ImportError:
    SarvamAI = None
try:
    from pinecone import Pinecone, ServerlessSpec
except ImportError:
    Pinecone = None
    ServerlessSpec = None

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(): pass
from datetime import datetime, timedelta
from src.agent import ocr_engine
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None
import io

# Load environment variables
load_dotenv()

class MaintenanceAgent:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.data = self._load_data()
        self._last_schedule = [] # Cache for virtual task validation
        
        # Local Sovereign Configuration (Ollama)
        # Note: In Docker, use http://host.docker.internal:11434/api if Ollama is on host
        self.ollama_base_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api")
        self.local_model = "qwen2.5:0.5b"
        self.embed_model = "nomic-embed-text:latest"
        
        # Cloud Fallback 1: OpenAI (Primary for precision)
        self.openai_key = os.getenv("OPENAI_API_KEY")
        if self.openai_key and OpenAI:
            self.openai_client = OpenAI(api_key=self.openai_key)
            self.openai_model = 'gpt-4o-mini' # Optimized for industrial data
        else:
            self.openai_client = None

        # Cloud Fallback 2: Groq (Llama 3.1 8B for efficiency)
        self.groq_key = os.getenv("GROQ_API_KEY")
        if self.groq_key and Groq:
            self.groq_client = Groq(api_key=self.groq_key)
            self.groq_model = 'llama-3.1-8b-instant'
        else:
            self.groq_client = None

        # Cloud Multilingual Layer: Sarvam AI
        self.sarvam_key = os.getenv("SARVAM_API_KEY")
        if self.sarvam_key and SarvamAI:
            self.sarvam_client = SarvamAI(api_subscription_key=self.sarvam_key)
            self.sarvam_model = "sarvam-105b"
        else:
            self.sarvam_client = None

        # Vector DB Configuration (Pinecone)
        self.pc_key = os.getenv("PINECONE_API_KEY")
        self.index_name = "maintenance-logs"
        if self.pc_key and Pinecone:
            self.pc = Pinecone(api_key=self.pc_key)
            self._init_pinecone()
        else:
            self.pc = None

    def get_parameter_templates(self) -> Dict[str, List[Dict[str, Any]]]:
        """Library of pre-built parameter templates for common machine types."""
        return {
            "Centrifugal Pump": [
                {"parameterKey": "vibration_rms", "displayName": "Vibration RMS", "unit": "mm/s", "normalMin": 0, "normalMax": 2.5, "warningThreshold": 3.5, "criticalThreshold": 5.0, "direction": "above"},
                {"parameterKey": "pressure", "displayName": "Pressure", "unit": "bar", "normalMin": 2, "normalMax": 8, "warningThreshold": 10, "criticalThreshold": 12, "direction": "above"},
                {"parameterKey": "cavitation_index", "displayName": "Cavitation Index", "unit": "index", "normalMin": 0, "normalMax": 0.3, "warningThreshold": 0.5, "criticalThreshold": 0.8, "direction": "above"},
                {"parameterKey": "seal_temp", "displayName": "Seal Face Temperature", "unit": "°C", "normalMin": 30, "normalMax": 70, "warningThreshold": 85, "criticalThreshold": 100, "direction": "above"}
            ],
            "Air Compressor": [
                {"parameterKey": "discharge_pressure", "displayName": "Discharge Pressure", "unit": "bar", "normalMin": 6, "normalMax": 8.5, "warningThreshold": 9.5, "criticalThreshold": 11, "direction": "above"},
                {"parameterKey": "dew_point", "displayName": "Dew Point", "unit": "°C", "normalMin": -20, "normalMax": -10, "warningThreshold": -5, "criticalThreshold": 0, "direction": "above"},
                {"parameterKey": "separator_delta_p", "displayName": "Separator Delta-P", "unit": "bar", "normalMin": 0, "normalMax": 0.3, "warningThreshold": 0.6, "criticalThreshold": 1.0, "direction": "above"}
            ],
            "CNC Milling Machine": [
                {"parameterKey": "spindle_load", "displayName": "Spindle Load", "unit": "%", "normalMin": 0, "normalMax": 70, "warningThreshold": 85, "criticalThreshold": 100, "direction": "above"},
                {"parameterKey": "tool_wear_index", "displayName": "Tool Wear Index", "unit": "index", "normalMin": 0, "normalMax": 50, "warningThreshold": 80, "criticalThreshold": 95, "direction": "above"},
                {"parameterKey": "coolant_flow", "displayName": "Coolant Flow Rate", "unit": "L/min", "normalMin": 15, "normalMax": 25, "warningThreshold": 10, "criticalThreshold": 5, "direction": "below"}
            ]
        }

    async def handle_slash_command(self, query: str, machine_id: str, session_id: str = None) -> Optional[Dict[str, Any]]:
        """Parses and executes slash commands."""
        parts = query.strip().split()
        if not parts or not parts[0].startswith("/"):
            return None

        command = parts[0].lower()
        args = parts[1:]

        from src.data import database
        
        if command == "/help":
            return {
                "message": "Available Commands:\n- /status [id]: Get health snapshot\n- /priority: Show AI-prioritized schedule\n- /manuals: List uploaded manuals\n- /history: Show recent interaction history\n- /help: Show this menu",
                "sources": [{"name": "System", "description": "Command Registry"}],
                "confidence": 100
            }

        elif command == "/status":
            target_id = args[0] if args else (machine_id if machine_id != "GLOBAL" else None)
            if not target_id:
                return {"message": "Please specify a machine ID: `/status CNC001`", "confidence": 100}
            
            health = database.get_machine_health_summary(target_id)
            if not health['telemetry'] and not health['alerts']:
                 return {"message": f"No data found for machine {target_id}.", "confidence": 100}
            
            status_msg = f"Health Status for {target_id}:\n"
            if health['alerts']:
                status_msg += f"- Latest Alert: {health['alerts'][0]['severity'].upper()}: {health['alerts'][0]['reason']}\n"
            if health['telemetry']:
                status_msg += f"- Current Temp: {health['telemetry'][0]['temperature']}°C\n"
                status_msg += f"- Vibration: {health['telemetry'][0]['vibration']}mm/s"
            
            return {"message": status_msg, "sources": [{"name": "SQL Ledger", "description": "Live Telemetry"}], "confidence": 100}

        elif command == "/priority" or command == "/schedule":
            schedule = self.generate_prioritized_schedule()
            msg = "AI-Prioritized Maintenance Schedule:\n"
            for i, task in enumerate(schedule):
                msg += f"{i+1}. [{task['priority'].upper()}] {task['title']} ({task['machineId']})\n"
            return {"message": msg, "sources": [{"name": "AI Orchestrator", "description": "Heuristic Priority Engine"}], "confidence": 100}

        elif command == "/manuals":
            target_id = machine_id if machine_id != "GLOBAL" else None
            manuals = database.get_registered_manuals(target_id)
            if not manuals:
                return {"message": "No manuals found for this asset.", "confidence": 100}
            msg = "Registered Manuals:\n" + "\n".join([f"- {m['filename']} ({m['file_type']})" for m in manuals])
            return {"message": msg, "sources": [{"name": "Knowledge Base", "description": "Manuals Registry"}], "confidence": 100}

        elif command == "/history":
            history = database.get_agent_history(machine_id=machine_id, session_id=session_id, limit=5)
            msg = "Recent History:\n" + "\n".join([f"{h['role'].upper()}: {h['content'][:50]}..." for h in history])
            return {"message": msg, "sources": [{"name": "Memory", "description": "Session Logs"}], "confidence": 100}

        return None

    async def get_orchestrator_response(self, query: str, machine_id: str = "GLOBAL", session_id: str = None) -> Dict[str, Any]:
        """
        The Sovereign Orchestrator: 
        Retrieves context from SQL (Dynamic Parameters + Metadata + History), JSON, and Pinecone in parallel.
        """
        # 0. Check for Slash Commands
        command_result = await self.handle_slash_command(query, machine_id, session_id)
        if command_result:
            return command_result

        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        loop = asyncio.get_event_loop()
        executor = ThreadPoolExecutor(max_workers=5)

        # Helper to run blocking DB calls in a thread
        def fetch_sql_context():
            from src.data import database
            import sqlite3
            conn = sqlite3.connect("data/factory_ops.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            m_meta = ""
            p_context = ""
            history_context = ""
            visual_context_memory = ""
            
            # 1. Asset Metadata & Thresholds
            if machine_id != "GLOBAL":
                cursor.execute("SELECT * FROM equipment WHERE id = ?", (machine_id,))
                m_row = cursor.fetchone()
                if m_row:
                    m_row = dict(m_row)
                    m_meta = f"ASSET: {m_row['name']} ({m_row['id']}) | Plant: {m_row.get('plant_id','Hosur')} | Sector: {m_row.get('sector','Auto')}"
                
                params = database.get_machine_parameters(machine_id)
                p_details = [f"- {p['display_name']} ({p['parameter_key']}): {p['normal_min']}-{p['normal_max']} {p['unit']}" for p in params if p.get('is_used_for_prediction')]
                p_context = "\nTHRESHOLDS:\n" + "\n".join(p_details)
                
                # 2. Chat History (Short-term Memory)
                history = database.get_agent_history(machine_id=machine_id, limit=5, session_id=session_id)
                if history:
                    history_context = "\nRECENT CONVERSATION:\n" + "\n".join([f"{h['role'].upper()}: {h['content']}" for h in history if not h.get('is_visual_context')])
                
                # 2.1 Persistent Visual Memory (Multimodal context)
                v_contexts = database.get_recent_visual_context(machine_id, session_id, limit=5)
                if v_contexts:
                    visual_context_memory = "\nVISUAL MEMORY (Multiple recently uploaded images/documents):\n"
                    for i, ctx in enumerate(reversed(v_contexts)): # Reverse to chronological
                        visual_context_memory += f"Entry {i+1}: {ctx}\n"

            else:
                cursor.execute("SELECT id, name, status FROM equipment LIMIT 10")
                m_meta = "PLANT SUMMARY:\n" + "\n".join([f"- {m['name']} ({m['id']}): {m['status']}" for m in cursor.fetchall()])

            # 3. Recent Alerts
            cursor.execute("SELECT severity, reason FROM ai_alerts WHERE equipment_id = ? OR ? = 'GLOBAL' ORDER BY timestamp DESC LIMIT 3", (machine_id, machine_id))
            alerts = [f"{r[0]}: {r[1]}" for r in cursor.fetchall()]

            # 4. Current Telemetry
            telemetry_context = ""
            if machine_id != "GLOBAL":
                # Corrected table name to telemetry_readings and column to machine_id
                cursor.execute("SELECT parameter_key, value FROM telemetry_readings WHERE machine_id = ? ORDER BY timestamp DESC LIMIT 10", (machine_id,))
                t_rows = cursor.fetchall()
                if t_rows:
                    telemetry_context = "\nCURRENT TELEMETRY:\n" + "\n".join([f"- {r['parameter_key']}: {r['value']}" for r in t_rows])

            conn.close()
            return m_meta, p_context, alerts, history_context, visual_context_memory, telemetry_context

        # Parallel Execution: SQL + Pinecone
        sql_task = loop.run_in_executor(executor, fetch_sql_context)
        vector_task = loop.run_in_executor(executor, self.query_similar_issues, query, machine_id, 5) # Increased top_k

        m_meta, p_context, sql_alerts, history_context, visual_context_memory, telemetry_context = await sql_task
        vector_context = await vector_task

        # 4. Construct Optimized Prompt
        system_prompt = f"""
        You are the Sovereign Industrial Intelligence Orchestrator. 
        Provide high-precision, concise maintenance prescriptions. 

        ASSET: {m_meta}
        {p_context}
        
        {telemetry_context}

        ANOMALIES: {sql_alerts}

        {visual_context_memory}

        {history_context}

        KNOWLEDGE BASE (RAG): {vector_context}

        OUTPUT GUIDELINES:
        1. BE CONCISE. Use bullet points and bold text for key metrics/actions.
        2. STRUCTURE: 
           - **HEALTH SNAPSHOT**: 1-sentence status.
           - **CRITICAL ANOMALIES**: List only breaches/threats.
           - **ROOT CAUSE**: Most likely technical failure.
           - **PRESCRIPTION**: Numbered, prioritized technical actions.
        3. PRIORITY: Ground Truth (RAG) > Visual Memory > Telemetry.
        4. TONE: Senior Engineer, urgent but calm, technical.
        5. LANGUAGE: If user uses Hinglish, respond in clear technical English with brief Hinglish confirmation if needed.
        """
        
        # Cloud Inference
        response = self._get_cloud_inference(system_prompt, query, max_tokens=700)
        
        # Log this interaction to SQL
        from src.data.database import log_agent_interaction
        log_agent_interaction(machine_id, "user", query, session_id=session_id)
        log_agent_interaction(machine_id, "assistant", response, session_id=session_id)
        
        return {
            "message": response,
            "sources": [
                {"name": "Multimodal RAG", "description": "Manuals & Repair Logs retrieved"},
                {"name": "Short-term Memory", "description": "Last 5 chat interactions analyzed"},
                {"name": "Live SQL State", "description": "Asset metadata & alerts fused"}
            ],
            "confidence": 98.5
        }

    def ingest_manual_pdf(self, machine_id: str, filename: str, pdf_bytes: bytes):
        """
        Extracts text from industrial PDF manuals, chunks it, and indexes in Pinecone with metadata.
        """
        if not self.pc or not self.index:
            return "Vector DB Offline"

        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            vectors = []
            
            # 1. Fetch Machine Type for better context filtering
            from src.data.database import get_all_equipment_metadata
            m_data = next((m for m in get_all_equipment_metadata() if m['id'] == machine_id), {})
            machine_type = m_data.get('name', 'Generic')

            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if not text: continue
                
                # Chunks per page
                chunk_size = 800
                overlap = 100
                for i in range(0, len(text), chunk_size - overlap):
                    chunk = text[i : i + chunk_size]
                    embedding = self._get_embedding(chunk)
                    if embedding:
                        vectors.append({
                            "id": f"manual_{machine_id}_{int(time.time())}_{page_num}_{i}",
                            "values": embedding,
                            "metadata": {
                                "machine_id": machine_id,
                                "machine_type": machine_type,
                                "content": chunk,
                                "source": filename,
                                "page": page_num + 1,
                                "type": "manual_chunk",
                                "ingested_at": datetime.now().isoformat()
                            }
                        })
            
            if vectors:
                # Upsert in batches of 50
                for i in range(0, len(vectors), 50):
                    self.index.upsert(vectors=vectors[i:i+50])
                
                from src.data.database import register_manual
                register_manual(machine_id, filename, "pdf", f"manual_{machine_id}")
                return f"Ingested {len(vectors)} chunks from {filename} ({len(reader.pages)} pages)."
            
            return "No text extracted from PDF."
        except Exception as e:
            return f"Ingestion Error: {str(e)}"

    def process_multimodal_event(self, telemetry_data: Dict[str, Any], image_bytes: bytes) -> Dict[str, Any]:
        """
        Combines sensor data with visual context (Sarvam Vision/OCR) for deep diagnostics.
        """
        visual_context = self.analyze_document_vision(image_bytes)
        eq_id = telemetry_data.get("equipment_id", "UNKNOWN")
        
        prompt = f"""
        Analyze machine event. 
        Telemetry: {json.dumps(telemetry_data)}
        Visual context (OCR/Vision): {visual_context}
        """
        
        prescription = self.analyze_patterns() # Fallback to pattern analysis
        if self.sarvam_key:
            prescription = self._get_sarvam_inference("You are a multimodal diagnostic expert.", prompt)
            
        return {
            "equipment_id": eq_id,
            "visual_context": visual_context,
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
                print(f"Creating Pinecone index {self.index_name}. It will be available shortly.")
            else:
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

    def query_similar_issues(self, query: str, machine_id: str = None, top_k: int = 3) -> str:
        if not self.pc or not self.index: return ""

        # 1. Enrich query with machine class context if available
        machine_context = ""
        if machine_id:
            from src.data.database import get_machine_class
            m_class = get_machine_class(machine_id)
            machine_context = f"Machine Type: {m_class} | "

        enriched_query = f"{machine_context}{query}"
        embedding = self._get_embedding(enriched_query)
        if not embedding: return ""

        # 2. Vector Search (Cross-Asset Intelligence)
        results = self.index.query(vector=embedding, top_k=top_k, include_metadata=True)
        output = ""
        for res in results.matches:
            m = res.metadata
            output += f"[Case Study: {m.get('equipment_name') or 'Similar Asset'}] {m.get('notes') or m.get('note')} | "
        return output
    def analyze_patterns(self) -> str:
        """Windowed Analysis: Uses Route-based intelligence."""
        # 1. Route 1 (Worker): Get limited semantic context
        semantic_context = self.query_similar_issues("machine noise, vibration, overheating", top_k=2)

        # 2. Windowed context
        recent_notes = self.data.get("operational_notes", [])[-3:]
        
        system_prompt = f"""
        You are a Senior Plant CTO. Provide a 1-sentence technical prescription.
        Historical Context: {semantic_context}
        """

        user_content = f"Recent Observations: {json.dumps(recent_notes)}"

        # 3. Route 2 (Brain): Detailed Reasoning
        print(f"--- [BRAIN] Node (OpenAI) Reasoning ---")
        return self._call_brain_node(system_prompt, user_content, max_tokens=350)

    def speech_to_text(
        self,
        audio_bytes: bytes,
        language_code: str = "hi-IN",
        filename: str = "audio.webm",
        content_type: str = "audio/webm"
    ) -> str:
        """
        Sarvam AI: Converts speech (audio bytes) into text.
        Supports 22 Indian languages.
        """
        if not self.sarvam_key:
            return "Sarvam API Key not configured."

        # Sanitize content_type (e.g. "audio/webm;codecs=opus" -> "audio/webm")
        clean_content_type = content_type.split(";")[0].strip().lower()
        
        codec_map = {
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/wave": "wav",
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/aac": "aac",
            "audio/ogg": "ogg",
            "audio/opus": "opus",
            "audio/flac": "flac",
            "audio/mp4": "mp4",
            "audio/x-m4a": "m4a",
            "audio/webm": "webm",
        }
        input_audio_codec = codec_map.get(clean_content_type, "webm")

        try:
            response = self.sarvam_client.speech_to_text.transcribe(
                file=(filename, audio_bytes, clean_content_type),
                model="saaras:v3",
                mode="transcribe",
                language_code=language_code,
                input_audio_codec=input_audio_codec
            )

            transcript = getattr(response, "transcript", None)
            if isinstance(transcript, str) and transcript.strip():
                return transcript

            if isinstance(response, dict):
                transcript = response.get("transcript")
                if isinstance(transcript, str) and transcript.strip():
                    return transcript

            return "No transcript found."
        except Exception as e:
            return f"STT Error: {str(e)}"

    def text_to_speech(self, text: str, language_code: str = "hi-IN") -> str:
        """
        Sarvam AI: Converts text to speech.
        Returns base64 encoded audio string.
        """
        if not self.sarvam_key:
            return ""
            
        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": self.sarvam_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "model": "bulbul:v1",
            "speaker": "meera",
            "target_language_code": language_code,
            "speech_sample_rate": 22050,
            "enable_preprocessing": True
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            # Sarvam returns JSON with "audios" field containing a list of base64 strings
            audios = response.json().get("audios", [])
            return audios[0] if audios else ""
        except Exception as e:
            print(f"TTS Error: {e}")
            return ""

    def analyze_document_vision(self, image_bytes: bytes) -> str:
        """
        Sarvam AI: Multimodal/Document Intelligence.
        Analyzes images and extracts context.
        """
        if not self.sarvam_key:
            return "Sarvam API Key not configured."
            
        # The correct direct vision endpoint
        url = "https://api.sarvam.ai/v1/vision/document"
        headers = {"api-subscription-key": self.sarvam_key}
        files = {"image": ("image.jpg", image_bytes, "image/jpeg")}
        data = {"extract_structured": "false"}
        
        try:
            response = requests.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            # Sarvam Vision returns "text" field
            return response.json().get("text", "No content extracted.")
        except Exception as e:
            # Fallback to local OCR if Sarvam fails
            print(f"Sarvam Vision Error: {e}. Attempting local OCR fallback...")
            try:
                return ocr_engine.extract_text(image_bytes)
            except Exception as ocr_err:
                return f"Vision Error: {str(e)}. OCR Fallback failed: {str(ocr_err)}"

    def _get_sarvam_inference(self, system_prompt, user_content) -> str:
        if not self.sarvam_client or not self.sarvam_key:
            return "Sarvam API Key not configured."

        try:
            if hasattr(self.sarvam_client, "chat") and hasattr(self.sarvam_client.chat, "completions"):
                response = self.sarvam_client.chat.completions(
                    model=self.sarvam_model,
                    messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
                    temperature=0.1
                )
                choice = response.choices[0] if getattr(response, "choices", None) else None
                if choice is None:
                    return "Error: Sarvam returned no choices."

                message = getattr(choice, "message", None)
                if message is not None:
                    content = getattr(message, "content", None)
                    if isinstance(content, str) and content.strip():
                        return content

                if isinstance(choice, dict):
                    msg = choice.get("message", {})
                    content = msg.get("content")
                    if isinstance(content, str) and content.strip():
                        return content

                return "Error: Sarvam response did not contain message content."

            return "Error: Sarvam chat client unavailable."
        except Exception as e:
            return f"Error: {e}"

    def _response_looks_incomplete(self, text: str) -> bool:
        if not text:
            return True
        stripped = text.strip()
        if len(stripped) < 80:
            return True
        if stripped.endswith(("...", "…", "-", "•", ":", "**")):
            return True
        if stripped[-1].isalnum():
            return True
        return False

    def _call_worker_node(self, system_prompt: str, user_content: str) -> str:
        """Route 1: High-Volume Data Parsing (Groq/Llama 3.1 8B)"""
        if not self.groq_client:
            return self._call_vault_node(system_prompt, user_content) # Fallback to local
        
        try:
            response = self.groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
                model=self.groq_model,
                max_tokens=300,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Worker Node Error: {e}")
            return self._call_vault_node(system_prompt, user_content)

    def _call_brain_node(self, system_prompt: str, user_content: str, max_tokens: int = 700) -> str:
        """Route 2: Complex Diagnostics & Scheduling (OpenAI/GPT-4o-mini)"""
        if not self.openai_client:
            return self._call_worker_node(system_prompt, user_content) # Fallback to Groq
        
        try:
            response = self.openai_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
                model=self.openai_model,
                max_tokens=max_tokens,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Brain Node Error: {e}")
            return self._call_worker_node(system_prompt, user_content)

    def _call_vault_node(self, system_prompt: str, user_content: str, max_tokens: int = 500) -> str:
        """Route 3: Highly Confidential Edge Data (Local/Qwen 2.5)"""
        try:
            payload = {
                "model": self.local_model,
                "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
                "stream": False,
                "options": {"num_predict": max_tokens, "temperature": 0.1}
            }
            response = requests.post(f"{self.ollama_base_url}/chat", json=payload, timeout=10)
            if response.status_code == 200:
                return response.json().get("message", {}).get("content", "Error: Empty Local response.")
            return f"Error: Local Vault offline (Status {response.status_code})"
        except Exception as e:
            return f"Vault Error: Local engine offline. {str(e)}"

    def _get_cloud_inference(self, system_prompt, user_content, max_tokens: int = 250) -> str:
        """Unified fallback for general queries, defaulting to Brain (OpenAI)."""
        return self._call_brain_node(system_prompt, user_content, max_tokens=max_tokens)

    def _load_data(self) -> Dict[str, Any]:
        with open(self.data_path, "r") as f:
            return json.load(f)

    def generate_prioritized_schedule(self) -> List[Dict[str, Any]]:
        """Generates the schedule tab priorities using the shared priority scheduler."""
        from src.services.priority_scheduler import generate_prioritized_schedule

        self._last_schedule = generate_prioritized_schedule()
        return self._last_schedule


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
