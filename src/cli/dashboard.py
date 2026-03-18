import streamlit as st
import pandas as pd
import sqlite3
import plotly.express as px
import time
from datetime import datetime
import os

# --- ENTERPRISE GOVERNANCE: AUTHENTICATION ---
# In a real enterprise app, use a proper Auth provider or hashed DB.
# For Level 7 Prototype, we use a simple RBAC system.
CREDENTIALS = {
    "admin": {"password": "admin123", "role": "Plant Manager"},
    "op1": {"password": "operator123", "role": "Operator"}
}

def login():
    st.sidebar.title("🔐 Factory Login")
    user = st.sidebar.text_input("Username")
    pwd = st.sidebar.text_input("Password", type="password")
    if st.sidebar.button("Login"):
        if user in CREDENTIALS and CREDENTIALS[user]["password"] == pwd:
            st.session_state["authenticated"] = True
            st.session_state["user"] = user
            st.session_state["role"] = CREDENTIALS[user]["role"]
            st.sidebar.success(f"Logged in as {st.session_state['role']}")
        else:
            st.sidebar.error("Invalid credentials")

def logout():
    if st.sidebar.button("Logout"):
        st.session_state["authenticated"] = False
        st.rerun()

# --- DASHBOARD CORE ---
DB_PATH = "data/factory_ops.db"

st.set_page_config(page_title="Sovereign Predictive Maintenance", layout="wide")

if "authenticated" not in st.session_state or not st.session_state["authenticated"]:
    st.title("🏭 Sovereign Predictive Maintenance System")
    st.info("Please login from the sidebar to access the Industrial Command Center.")
    login()
    st.stop()

# User is authenticated
st.sidebar.write(f"Logged in: **{st.session_state['user']}**")
st.sidebar.write(f"Role: **{st.session_state['role']}**")
logout()

st.title("🏭 Sovereign Predictive Maintenance Dashboard")
st.subheader(f"Industrial Command Center | {st.session_state['role']} View")

refresh_rate = st.sidebar.slider("Refresh Rate (seconds)", 2, 30, 5)

def load_data():
    conn = sqlite3.connect(DB_PATH)
    sensors_df = pd.read_sql_query("SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 200", conn)
    alerts_df = pd.read_sql_query("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT 50", conn)
    conn.close()
    return sensors_df, alerts_df

placeholder = st.empty()

while True:
    sensors, alerts = load_data()
    
    with placeholder.container():
        # RBAC MASKING: Only Managers see "Critical Alert Count" and "System Health %"
        m1, m2, m3 = st.columns(3)
        with m1:
            st.metric("Active Assets", "4")
        
        if st.session_state["role"] == "Plant Manager":
            with m2:
                st.metric("Critical Alerts (24h)", len(alerts))
            with m3:
                st.metric("System Health", "92%", "-2%")
        else:
            with m2:
                st.metric("Alert Status", "MONITORED")
            with m3:
                st.metric("Shift Status", "ONGOING")

        # Sensor Visualizations (Shared Access)
        st.write("### Live Telemetry Stream")
        c1, c2 = st.columns(2)
        
        if not sensors.empty:
            with c1:
                fig_temp = px.line(sensors, x='timestamp', y='temperature', color='equipment_id', title="Temp Monitor (°C)")
                st.plotly_chart(fig_temp, use_container_width=True)
            with c2:
                fig_vib = px.line(sensors, x='timestamp', y='vibration', color='equipment_id', title="Vibration Analysis (mm/s)")
                st.plotly_chart(fig_vib, use_container_width=True)

        # AI STRATEGIC LAYER: RBAC PROTECTION
        st.write("### 🧠 AI Strategic Prescriptions")
        if st.session_state["role"] == "Plant Manager":
            if not alerts.empty:
                for _, row in alerts.iterrows():
                    with st.expander(f"🔴 ALERT: {row['equipment_id']} - {row['severity']}"):
                        st.write(f"**Root Cause Analysis (RAG):** {row['reason']}")
                        st.markdown(f"**Prescribed Action:**\n{row['prescription']}")
            else:
                st.info("System operating within normal parameters.")
        else:
            st.warning("🔒 Managerial approval required to view strategic AI prescriptions.")

        # Raw Logs (Shared for debugging)
        st.write("### Factory Operations Feed")
        st.dataframe(sensors.head(15), use_container_width=True)

    time.sleep(refresh_rate)
