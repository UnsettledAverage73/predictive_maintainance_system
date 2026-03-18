#!/bin/bash
# Sovereign Cleanup Protocol

echo "--- [CLEANUP] Resetting Factory Ecosystem ---"

# 1. Clear IPC Streams
rm -f data/*.json
rm -f data/*.tmp
echo "✅ JSON IPC Streams Cleared."

# 2. Reset SQLite Database (Schema only)
rm -f data/factory_ops.db
python src/data/schema.py
echo "✅ SQLite Schema Reinitialized."

# 3. Clear Logs
> data/ingestor.log
> data/simulator.log
> data/dashboard.log
echo "✅ System Logs Rotated."

echo "--- [READY] System is in Healthy Baseline State ---"
