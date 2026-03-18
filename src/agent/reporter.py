import sqlite3
import json
from datetime import datetime, timedelta
from src.agent.maintenance_agent import MaintenanceAgent

class SovereignReporter:
    def __init__(self, db_path="data/factory_ops.db"):
        self.db_path = db_path
        self.agent = MaintenanceAgent("data/sample_maintenance_data.json")

    def generate_daily_brief(self):
        """Compiles 24h data into a high-stakes executive summary."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 1. Fetch 24h Stats
        day_ago = (datetime.now() - timedelta(hours=24)).isoformat()
        
        cursor.execute("SELECT COUNT(*) FROM ai_alerts WHERE timestamp > ?", (day_ago,))
        total_alerts = cursor.fetchone()[0]

        cursor.execute("SELECT equipment_id, action_taken FROM manual_logs WHERE timestamp > ?", (day_ago,))
        human_fixes = cursor.fetchall()

        # 2. Strategic Prompting
        report_prompt = f"""
        [ROLE: CHIEF TECHNICAL OFFICER]
        [TASK: GENERATE 24H PERFORMANCE BRIEF]
        DATA:
        - Total AI Alerts Triggered: {total_alerts}
        - Human Interventions Recorded: {human_fixes}
        
        SUMMARY REQUIREMENTS:
        1. Identify the 'Problem Child' (most volatile machine).
        2. Evaluate 'Sovereign Efficiency' (how many AI alerts were resolved by humans).
        3. Risk Outlook for the next 24 hours.
        Language: High-level, direct, zero fluff. Use Hinglish only if referencing operator notes.
        """

        try:
            # Use the Deep Model (70B) for the final report quality
            return self.agent._get_cloud_inference("You are a CTO reporting to the Board.", report_prompt)
        except Exception as e:
            return f"Report Generation Failed: {str(e)}"
        finally:
            conn.close()
