# Predictive Maintenance AI Agent (Sovereign Industrial Stack)

This project implements a high-performance, Generative AI Agent for Predictive Maintenance in Manufacturing, following the "Sovereign Backbone" architecture (Levels 1-7).

## 🌟 Enterprise Features
- **Multilingual Reasoning (Level 2.5):** Powered by **Sarvam AI**, recognizing Hinglish/Indic code-mixed logs for local factory floor nuances.
- **Hybrid AI Inference (Level 3):** Local-first (Ollama) with resilient Cloud Fallbacks (Groq/Google).
- **Semantic Memory (Level 4):** Pinecone Vector DB integration for historical RAG context.
- **Sovereign IoT Ingestor (Level 5):** Real-time, high-frequency sensor monitoring via Local IPC.
- **Visual Command Center (Level 6):** Streamlit dashboard with real-time Plotly analytics.
- **Industrial RBAC & Deployment (Level 7):** Secure Role-Based Access Control and full Docker orchestration.

## 🚀 Deployment (Docker - Recommended)
1. **Configure Environment:**
   Ensure your `.env` file contains:
   ```bash
   GROQ_API_KEY=your_key
   PINECONE_API_KEY=your_key
   SARVAM_API_KEY=your_key
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
2. **Launch Sovereign Stack:**
   ```bash
   docker-compose up --build
   ```
3. **Access Dashboard:**
   Open `http://localhost:8501`
   - **Manager:** `admin` / `admin123`
   - **Operator:** `op1` / `operator123`

## 🛠️ Local Development (Manual)
1. **Initialize Environment:** `uv sync`
2. **Launch Services:**
   - Simulator: `uv run python src/data/iot_simulator.py`
   - Ingestor: `uv run python src/data/iot_ingestor.py`
   - Dashboard: `uv run streamlit run src/cli/dashboard.py`
3. **Enable WhatsApp Escalation:**
   Set the recipient number from the alerts screen or in `data/config.json` as `whatsapp_number` with country code, for example `+919876543210`. Critical alerts are sent automatically when the ingestor logs a critical event.

## 🏗️ System Architecture (Mermaid)

```mermaid
graph TD
    subgraph Hardware_Layer [Physical Layer / Simulator]
        S[(IoT Sensors)] -->|Telemetry| I[Python Ingestor]
        C[Command Bus] -->|Actuation| S
    end

    subgraph Intelligence_Layer [Sovereign Brain]
        I -->|Anomaly Detect| R[RAG Reasoning Engine]
        R -->|Groq/Sarvam LLM| P[Strategic Prescription]
        P -->|JSON IPC| C
    end

    subgraph Memory_Layer [Knowledge Base]
        P -->|Vector Embedding| V[(Pinecone DB)]
        H[Human Feedback] -->|Learning| V
        V -->|Contextual Recall| R
    end

    subgraph Interface_Layer [Next.js Control Center]
        R -->|Live Stream| D[Dashboard]
        D -->|Manual Reset| C
    end

## 🛡️ Security & Privacy
Following the Sovereign protocol, all sensitive raw sensor data stays within the local SQLite/IPC layer. AI reasoning is routed through privacy-preserving local models where available.
