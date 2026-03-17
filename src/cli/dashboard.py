import streamlit as st
import pandas as pd
import sqlite3
import plotly.express as px
import time
from datetime import datetime

DB_PATH = "data/factory_ops.db"

st.set_page_config(page_title="Sovereign Predictive Maintenance", layout="wide")

st.title("🏭 Sovereign Predictive Maintenance Dashboard")
st.subheader("Level 6: Visual Analytics & Real-Time Command Center")

# Sidebar for Filters
st.sidebar.header("Dashboard Settings")
refresh_rate = st.sidebar.slider("Refresh Rate (seconds)", 2, 30, 5)

def load_data():
    conn = sqlite3.connect(DB_PATH)
    sensors_df = pd.read_sql_query("SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 200", conn)
    alerts_df = pd.read_sql_query("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT 50", conn)
    conn.close()
    return sensors_df, alerts_df

# Main Dashboard Loop
placeholder = st.empty()

while True:
    sensors, alerts = load_data()
    
    with placeholder.container():
        # Top Metrics
        m1, m2, m3 = st.columns(3)
        with m1:
            st.metric("Total Equipment", "4")
        with m2:
            st.metric("Critical Alerts (24h)", len(alerts))
        with m3:
            st.metric("System Health", "92%", "-2%")

        # Sensor Visualizations
        st.write("### Real-Time Sensor Streams")
        c1, c2 = st.columns(2)
        
        if not sensors.empty:
            with c1:
                fig_temp = px.line(sensors, x='timestamp', y='temperature', color='equipment_id', title="Temperature Monitoring (°C)")
                st.plotly_chart(fig_temp, use_container_width=True)
            
            with c2:
                fig_vib = px.line(sensors, x='timestamp', y='vibration', color='equipment_id', title="Vibration Analysis (mm/s)")
                st.plotly_chart(fig_vib, use_container_width=True)

        # AI Insights Section
        st.write("### 🧠 AI Strategic Prescriptions (Recent Alerts)")
        if not alerts.empty:
            for index, row in alerts.iterrows():
                with st.expander(f"🔴 ALERT: {row['equipment_id']} at {row['timestamp']} - {row['severity']}"):
                    st.write(f"**Reason:** {row['reason']}")
                    st.markdown(f"**AI Prescription:**\n{row['prescription']}")
        else:
            st.info("No active AI alerts. System operating within normal parameters.")

        # Data Table
        st.write("### Raw Operational Logs")
        st.dataframe(sensors.head(20), use_container_width=True)

    time.sleep(refresh_rate)
