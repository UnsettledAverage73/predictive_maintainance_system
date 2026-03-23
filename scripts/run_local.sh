#!/bin/bash

# Ensure data directory exists
mkdir -p data

# Kill background processes on exit
trap "kill 0" EXIT

echo "--- [SOVEREIGN] Launching Local Backend Stack ---"

# 0. Start Redis
echo "[0/4] Starting Redis Server..."
if ! pgrep -x "redis-server" > /dev/null; then
    redis-server --daemonize yes
    echo "Redis started."
else
    echo "Redis is already running."
fi

# 1. Start Simulator
echo "[1/4] Starting IoT Simulator..."
uv run python src/data/iot_simulator.py > data/simulator.log 2>&1 &

# 2. Start Ingestor
echo "[2/4] Starting IoT Ingestor..."
uv run python src/data/iot_ingestor.py > data/ingestor.log 2>&1 &

# 3. Start API (FastAPI)
echo "[3/4] Starting FastAPI Server (Port 8000)..."
uv run uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload > data/api.log 2>&1 &

# 4. Start Dashboard (Streamlit)
echo "[4/4] Starting Streamlit Dashboard (Port 8501)..."
uv run streamlit run src/cli/dashboard.py --server.port 8501 > data/dashboard.log 2>&1 &

echo "--- [SOVEREIGN] Stack is ONLINE ---"
echo "API: http://localhost:8000"
echo "Dashboard: http://localhost:8501"
echo "Logs are available in data/*.log"

# Keep the script running
wait
