import streamlit as st
import pandas as pd
import sqlite3
import plotly.express as px
import time

# --- ENTERPRISE GOVERNANCE: AUTHENTICATION ---
# In a real enterprise app, use a proper Auth provider or hashed DB.
CREDENTIALS = {
    "admin": {"password": "admin123"},
    "op1": {"password": "operator123"}
}

def login():
    st.sidebar.title("🔐 Factory Login")
    user = st.sidebar.text_input("Username")
    pwd = st.sidebar.text_input("Password", type="password")
    if st.sidebar.button("Login"):
        if user in CREDENTIALS and CREDENTIALS[user]["password"] == pwd:
            st.session_state["authenticated"] = True
            st.session_state["user"] = user
            st.sidebar.success(f"Logged in as {user}")
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
logout()

st.title("🏭 Sovereign Predictive Maintenance Dashboard")
st.subheader(f"Industrial Command Center View")

refresh_rate = st.sidebar.slider("Refresh Rate (seconds)", 2, 30, 5)

def load_data():
    conn = sqlite3.connect(DB_PATH)
    telemetry_df = pd.read_sql_query(
        """
        SELECT machine_id, parameter_key, value, string_value, timestamp
        FROM telemetry_readings
        ORDER BY timestamp DESC
        LIMIT 500
        """,
        conn,
    )
    alerts_df = pd.read_sql_query("SELECT * FROM ai_alerts ORDER BY timestamp DESC LIMIT 50", conn)
    conn.close()
    return telemetry_df, alerts_df

def build_latest_snapshot(telemetry_df):
    if telemetry_df.empty:
        return telemetry_df, pd.DataFrame()

    df = telemetry_df.copy()
    df["reading"] = df["value"].where(df["value"].notna(), df["string_value"])
    df = df.sort_values("timestamp")

    latest = df.pivot_table(
        index="machine_id",
        columns="parameter_key",
        values="reading",
        aggfunc="last",
    )
    latest["last_seen"] = df.groupby("machine_id")["timestamp"].max()
    latest = latest.reset_index()

    for column in ("temperature", "humidity", "vibration", "rpm", "current_draw"):
        if column in latest.columns:
            latest[column] = pd.to_numeric(latest[column], errors="coerce")

    return df, latest

placeholder = st.empty()

while True:
    telemetry, alerts = load_data()
    telemetry, latest = build_latest_snapshot(telemetry)
    
    with placeholder.container():
        # Unified View for all users
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric("Active Devices", latest["machine_id"].nunique() if not latest.empty else 0)
        with m2:
            st.metric("Critical Alerts (24h)", len(alerts))
        with m3:
            avg_temp = latest["temperature"].dropna().mean() if not latest.empty and "temperature" in latest else None
            st.metric("Avg Temp", f"{avg_temp:.1f}°C" if pd.notna(avg_temp) else "--")
        with m4:
            avg_humidity = latest["humidity"].dropna().mean() if not latest.empty and "humidity" in latest else None
            st.metric("Avg Humidity", f"{avg_humidity:.0f}%" if pd.notna(avg_humidity) else "--")

        # Sensor Visualizations (Shared Access)
        st.write("### Live MQTT Telemetry Stream")
        c1, c2 = st.columns(2)
        
        if not telemetry.empty:
            with c1:
                temp_df = telemetry[telemetry["parameter_key"] == "temperature"].copy()
                temp_df["value"] = pd.to_numeric(temp_df["value"], errors="coerce")
                fig_temp = px.line(temp_df, x="timestamp", y="value", color="machine_id", title="Temperature Monitor (°C)")
                fig_temp.update_layout(yaxis_title="°C")
                st.plotly_chart(fig_temp, use_container_width=True)
            with c2:
                humidity_df = telemetry[telemetry["parameter_key"] == "humidity"].copy()
                humidity_df["value"] = pd.to_numeric(humidity_df["value"], errors="coerce")
                fig_humidity = px.line(humidity_df, x="timestamp", y="value", color="machine_id", title="Humidity Monitor (%)")
                fig_humidity.update_layout(yaxis_title="%")
                st.plotly_chart(fig_humidity, use_container_width=True)
        else:
            st.info("Waiting for MQTT packets on `sensor/telemetry`.")

        if not latest.empty:
            st.write("### Latest MQTT Packet Snapshot")
            snapshot_cols = [col for col in ["machine_id", "temperature", "humidity", "status", "last_seen"] if col in latest.columns]
            st.dataframe(latest[snapshot_cols].sort_values("last_seen", ascending=False), use_container_width=True)

        # AI STRATEGIC LAYER
        st.write("### 🧠 AI Strategic Prescriptions")
        if not alerts.empty:
            for _, row in alerts.iterrows():
                with st.expander(f"🔴 ALERT: {row['equipment_id']} - {row['severity']}"):
                    st.write(f"**Root Cause Analysis (RAG):** {row['reason']}")
                    st.markdown(f"**Prescribed Action:**\n{row['prescription']}")
        else:
            st.info("System operating within normal parameters.")

        # Raw Logs (Shared for debugging)
        st.write("### Factory Operations Feed")
        st.dataframe(telemetry.head(15), use_container_width=True)

    time.sleep(refresh_rate)
