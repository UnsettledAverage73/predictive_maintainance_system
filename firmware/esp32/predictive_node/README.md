# ESP32 Edge Telemetry Node for Predictive Maintenance

This module connects physical hardware sensors directly to the Sovereign AI Predictive Maintenance System over WiFi via HTTP POST ingestion.

---

## 🔌 Hardware Pin Configuration

| Sensor / Component | ESP32 GPIO | Pin Type | Function |
| :--- | :--- | :--- | :--- |
| **DHT11 (Temp & Humidity)** | **GPIO 4** | Digital I/O | Motor casing temp (°C) & ambient humidity (%) |
| **ACS712 (Current Sensor)** | **GPIO 34** | ADC1_CH6 (Analog) | Motor stator current draw (A) True RMS |
| **Hall Effect Sensor (D0)** | **GPIO 25** | Digital (Interrupt) | Shaft rotation pulse counter -> Real-time RPM |
| **Hall Effect Sensor (A0)** | **GPIO 35** | ADC1_CH7 (Analog) | Proximity / Magnetic flux index |
| **Push Button** | **GPIO 27** | Input (Pullup) | Operator inspection event / E-Stop / Local alert |
| **Piezo Buzzer** | **GPIO 13** | Digital Output | Audible alarm annunciator (AI & safety alerts) |

---

## ⚙️ Network Configuration

- **WiFi SSID**: `Atharva's iPhone`
- **WiFi Password**: `12345678`
- **Target Backend Host**: `172.20.10.7` (Port `8000`)
- **Ingest API Endpoint**: `http://172.20.10.7:8000/api/iot/ingest`

> [!IMPORTANT]
> **iPhone Hotspot Setup:**
> In your iPhone's **Settings -> Personal Hotspot**, make sure to turn **ON "Maximize Compatibility"**.
> The ESP32 utilizes a 2.4 GHz radio. Enabling "Maximize Compatibility" forces the iPhone to broadcast on 2.4 GHz.

---

## 🏭 Mapped Machine: CNC001 / MTR001

The sensor suite matches a **Rotating Industrial Motor / CNC Spindle Drive**:
- **`temperature`**: Monitors bearing friction and stator winding heat.
- **`humidity`**: Detects condensation risks in motor housing.
- **`current_draw`**: Measures phase current to detect mechanical overload, bearing seizure, or tool wear.
- **`rpm`**: Measures shaft rotation via Hall effect interrupt to detect slippage or stalling.
- **`button_state`**: Operator manual flag / local acknowledgment.
- **`buzzer_state`**: Audible alarm driven locally by thresholds or remotely by AI prescriptions.

---

## 🚀 How to Run the Stack

1. **Start Redis Server**:
   ```bash
   redis-server --daemonize yes
   ```

2. **Start Backend API**:
   ```bash
   uvicorn src.api:app --host 0.0.0.0 --port 8000
   ```

3. **Start Next.js Frontend Dashboard**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Power on ESP32 & Enable Hotspot**:
   The ESP32 will auto-connect to `Atharva's iPhone`, chirp twice, and start streaming live telemetry into the dashboard!
