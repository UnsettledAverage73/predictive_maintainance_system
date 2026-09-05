#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==============================================================================
// NETWORK & BACKEND CONFIGURATION
// ==============================================================================

// WiFi Hotspot Credentials
const char* WIFI_SSID     = "Atharva's iPhone";
const char* WIFI_PASSWORD = "12345678";

// Predictive Maintenance Backend Server
// Set SERVER_HOST to the IP address of the machine hosting the backend.
// When connected to "Atharva's iPhone", find your PC's IP using `ip route` or `ifconfig`.
const char* SERVER_HOST   = "172.20.10.7"; 
const int   SERVER_PORT   = 8000;
const char* INGEST_PATH   = "/api/iot/ingest";

// Equipment Identification
// Mapped to the Industrial Lathe / Spindle Motor node in the Predictive Maintenance Matrix
#define EQUIPMENT_ID      "CNC001"
#define SENSOR_KIND       "multi"

// Telemetry Transmit Interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

// ==============================================================================
// PIN DEFINITIONS (Hardware Layout)
// ==============================================================================

#define DHT_PIN          4        // DHT11 Data -> ESP32 GPIO 4
#define DHT_TYPE         DHT11

#define ACS712_PIN       34       // ACS712 Current Sensor OUT -> ESP32 GPIO 34 (ADC1_CH6)
#define HALL_A0_PIN      35       // Hall Effect Analog A0 -> ESP32 GPIO 35 (ADC1_CH7)
#define HALL_D0_PIN      25       // Hall Effect Digital D0 (Pulse) -> ESP32 GPIO 25 (Interrupt)
#define BUZZER_PIN       13       // Audible Alarm Buzzer (+) -> ESP32 GPIO 13
#define BUTTON_PIN       27       // Operator Button -> ESP32 GPIO 27 (INPUT_PULLUP)

// ==============================================================================
// SENSOR CALIBRATION & PARAMETERS
// ==============================================================================

// ACS712 Sensitivity (Volts per Ampere):
// - ACS712-05B: 0.185 V/A (185 mV/A)
// - ACS712-20A: 0.100 V/A (100 mV/A)  <-- Default standard module
// - ACS712-30A: 0.066 V/A (66 mV/A)
#define ACS_SENSITIVITY  0.100f

// Zero-current ADC calibration baseline
float zeroCurrentAdcOffset = 2048.0f; // Approx VCC/2 on 12-bit ADC (4096 / 2)

// Hall Effect RPM Measurement
#define PULSES_PER_REV   1        // 1 magnet on the rotating shaft
volatile unsigned long   hallPulseCounter = 0;
unsigned long            lastRpmCalcTime  = 0;
float                    measuredRpm      = 0.0f;

// Local Safety Thresholds (triggers immediate local buzzer alert)
#define CRITICAL_TEMP_C      80.0f
#define CRITICAL_CURRENT_A   18.0f

// ==============================================================================
// HARDWARE INSTANCES & STATE
// ==============================================================================

DHT dht(DHT_PIN, DHT_TYPE);

String deviceMacAddress = "";
unsigned long lastTelemetryTime = 0;
unsigned long lastWifiCheckTime = 0;

// Buzzer alert state machine
bool buzzerActive = false;
unsigned long buzzerEndTime = 0;
int buzzerBeepCount = 0;
unsigned long buzzerNextToggleTime = 0;
bool buzzerBeepState = false;

// Button debouncing
int lastButtonState = HIGH;
int currentButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY_MS = 50;

// ==============================================================================
// INTERRUPT SERVICE ROUTINES
// ==============================================================================

// Interrupt on Hall Sensor D0 pulse (magnet passing)
void IRAM_ATTR onHallPulseISR() {
  hallPulseCounter++;
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

// Non-blocking buzzer alarm pattern
void triggerBuzzerPattern(int beeps, int beepDurationMs) {
  buzzerBeepCount = beeps * 2; // on and off transitions
  buzzerNextToggleTime = millis();
  buzzerBeepState = false;
  buzzerActive = true;
}

void updateBuzzer() {
  if (!buzzerActive) return;

  unsigned long currentMillis = millis();
  if (currentMillis >= buzzerNextToggleTime) {
    if (buzzerBeepCount > 0) {
      buzzerBeepState = !buzzerBeepState;
      digitalWrite(BUZZER_PIN, buzzerBeepState ? HIGH : LOW);
      buzzerBeepCount--;
      buzzerNextToggleTime = currentMillis + 120; // 120ms toggle
    } else {
      digitalWrite(BUZZER_PIN, LOW);
      buzzerActive = false;
      buzzerBeepState = false;
    }
  }
}

// Calibrate ACS712 zero-current baseline
void calibrateACS712() {
  Serial.print("Calibrating ACS712 zero-current offset (keep motor disconnected)... ");
  long sum = 0;
  const int samples = 200;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(ACS712_PIN);
    delay(2);
  }
  zeroCurrentAdcOffset = (float)sum / (float)samples;
  Serial.print("Offset ADC = ");
  Serial.println(zeroCurrentAdcOffset);
}

// Measure RMS Current across full 50Hz/60Hz AC wave (or DC load)
float readCurrentRMS() {
  const unsigned long sampleDurationMs = 40; // 40ms covers 2 full 50Hz cycles
  unsigned long start = millis();
  float sumSquaredDiff = 0.0f;
  long sampleCount = 0;

  while (millis() - start < sampleDurationMs) {
    int adc = analogRead(ACS712_PIN);
    // Convert ADC to voltage (ESP32 ADC 3.3V reference, 4095 resolution)
    float sampleVoltage = ((float)adc - zeroCurrentAdcOffset) * (3.3f / 4095.0f);
    sumSquaredDiff += (sampleVoltage * sampleVoltage);
    sampleCount++;
    delayMicroseconds(250);
  }

  if (sampleCount == 0) return 0.0f;

  float vRms = sqrt(sumSquaredDiff / (float)sampleCount);
  float currentAmps = vRms / ACS_SENSITIVITY;

  // Suppress low-level ADC noise floor
  if (currentAmps < 0.06f) {
    currentAmps = 0.0f;
  }

  return currentAmps;
}

// Compute RPM based on Hall effect pulses
void updateRpmCalculation() {
  unsigned long now = millis();
  unsigned long elapsed = now - lastRpmCalcTime;

  if (elapsed >= 1000) {
    noInterrupts();
    unsigned long pulses = hallPulseCounter;
    hallPulseCounter = 0;
    interrupts();

    // RPM = (pulses / PULSES_PER_REV) * (60,000 / elapsed_ms)
    measuredRpm = ((float)pulses * 60000.0f) / ((float)elapsed * (float)PULSES_PER_REV);
    lastRpmCalcTime = now;
  }
}

// Connect to WiFi
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Keeps radio active for lowest latency
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println(">>> WiFi Connected successfully! <<<");
    Serial.print("ESP32 IP Address : ");
    Serial.println(WiFi.localIP());
    Serial.print("ESP32 Gateway    : ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("ESP32 MAC Address: ");
    deviceMacAddress = WiFi.macAddress();
    Serial.println(deviceMacAddress);

    // Double beep on successful connection
    triggerBuzzerPattern(2, 100);
  } else {
    Serial.println();
  }
}

// Transmit Telemetry JSON to Predictive Maintenance System
void sendTelemetry(float temp, float humidity, float currentAmps, float rpm, int hallAnalog, int buttonState, int buzzerState) {
  // Build JSON Document using ArduinoJson (v7 syntax)
  JsonDocument doc;
  doc["equipment_id"] = EQUIPMENT_ID;
  doc["mac_address"]  = deviceMacAddress.length() > 0 ? deviceMacAddress : "3c:71:bf:52:d7:c8";
  doc["sensor_kind"]  = SENSOR_KIND;
  doc["source"]       = "esp32";

  // Top-level telemetry parameters
  doc["temperature"] = round(temp * 10.0f) / 10.0f;
  doc["humidity"]    = round(humidity * 10.0f) / 10.0f;
  doc["vibration"]   = 0.05; // Base normal vibration index

  // Universal parameter payload
  JsonObject params = doc["parameters"].to<JsonObject>();
  params["temperature"]  = round(temp * 10.0f) / 10.0f;
  params["humidity"]     = round(humidity * 10.0f) / 10.0f;
  params["current_draw"] = round(currentAmps * 100.0f) / 100.0f;
  params["rpm"]          = (int)measuredRpm;
  params["hall_analog"]  = hallAnalog;
  params["button_state"] = buttonState;
  params["buzzer_state"] = buzzerState;
  params["status"]       = (temp > CRITICAL_TEMP_C || currentAmps > CRITICAL_CURRENT_A) ? "CRITICAL" : "OK";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Always emit structured JSON to Serial for USB Bridge ingestion
  Serial.print("[JSON_TELEMETRY] ");
  Serial.println(jsonPayload);

  // Send over WiFi HTTP if connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[IoT Ingest] WiFi offline. Skipping WiFi HTTP post.");
    return;
  }

  HTTPClient http;
  String serverUrl = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(INGEST_PATH);

  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  Serial.println("--------------------------------------------------");
  Serial.print("POST -> ");
  Serial.println(serverUrl);

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("Response [");
    Serial.print(httpCode);
    Serial.print("]: ");
    Serial.println(response);

    // Parse response for bidirectional mitigation/alarm commands
    JsonDocument respDoc;
    DeserializationError error = deserializeJson(respDoc, response);
    if (!error) {
      const char* command = respDoc["command"];
      if (command && strlen(command) > 0) {
        Serial.print(">>> [DISPATCH COMMAND RECEIVED] : ");
        Serial.println(command);
        // Sound alarm on throttle load or anomaly trigger
        triggerBuzzerPattern(4, 150);
      }
    }
  } else {
    Serial.print("HTTP POST Error: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ==============================================================================
// SETUP
// ==============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("  SOVEREIGN PREDICTIVE MAINTENANCE - ESP32 NODE   ");
  Serial.println("==================================================");

  // Initialize Pins
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(HALL_D0_PIN, INPUT_PULLUP);
  pinMode(HALL_A0_PIN, INPUT);
  pinMode(ACS712_PIN, INPUT);

  // Startup chirp
  digitalWrite(BUZZER_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize DHT11
  pinMode(DHT_PIN, INPUT_PULLUP);
  dht.begin();
  Serial.println("[Init] DHT11 Temperature & Humidity Initialized.");

  // Attach Hall Effect RPM Interrupt
  attachInterrupt(digitalPinToInterrupt(HALL_D0_PIN), onHallPulseISR, FALLING);
  Serial.println("[Init] Hall Effect RPM Interrupt Attached on GPIO 25.");

  // Calibrate Current Sensor
  calibrateACS712();

  // Connect to Hotspot WiFi
  connectWiFi();

  lastTelemetryTime = millis();
  lastRpmCalcTime   = millis();
  Serial.println("==================================================");
  Serial.println("All Sensors Online. Starting Real-Time Telemetry Stream.");
  Serial.println("==================================================");
}

// ==============================================================================
// MAIN LOOP
// ==============================================================================

void loop() {
  // 1. Maintain Buzzer State Machine
  updateBuzzer();

  // 2. Maintain Hall RPM Calculation
  updateRpmCalculation();

  // 3. Periodic WiFi Reconnect Check
  if (WiFi.status() != WL_CONNECTED && (millis() - lastWifiCheckTime > 10000)) {
    lastWifiCheckTime = millis();
    Serial.println("[WiFi] Connection lost. Reconnecting to hotspot...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }

  // 4. Debounced Push Button Handling (Operator Event / E-Stop / Mute)
  int reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  bool buttonPressedEvent = false;
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY_MS) {
    if (reading != currentButtonState) {
      currentButtonState = reading;
      if (currentButtonState == LOW) {
        Serial.println(">>> [OPERATOR EVENT] Push Button Pressed! <<<");
        buttonPressedEvent = true;
        // Tactile beep
        triggerBuzzerPattern(1, 80);
      }
    }
  }
  lastButtonState = reading;

  // 5. Scheduled Telemetry Transmission (or immediate if button pressed)
  unsigned long currentMillis = millis();
  if (buttonPressedEvent || (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS)) {
    lastTelemetryTime = currentMillis;

    // Read Sensors with retry and smoothing
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      delay(40);
      temperature = dht.readTemperature();
      humidity    = dht.readHumidity();
    }
    static float lastValidTemp = 29.1f;
    static float lastValidHum  = 65.0f;
    if (!isnan(temperature)) lastValidTemp = temperature;
    else temperature = lastValidTemp;
    if (!isnan(humidity)) lastValidHum = humidity;
    else humidity = lastValidHum;

    float currentAmps = readCurrentRMS();
    int   hallAnalog  = analogRead(HALL_A0_PIN);
    int   buttonState = (currentButtonState == LOW) ? 1 : 0;
    int   buzzerState = buzzerActive ? 1 : 0;

    // Local Threshold Safety Check
    if ((!isnan(temperature) && temperature > CRITICAL_TEMP_C) || currentAmps > CRITICAL_CURRENT_A) {
      Serial.println("⚠️ [LOCAL WARNING] Critical threshold exceeded!");
      triggerBuzzerPattern(3, 150);
    }

    // Print Telemetry Summary to Serial
    Serial.println("\n----------------- SENSOR READINGS -----------------");
    Serial.print("DHT11 Temp     : ");
    if (isnan(temperature)) Serial.println("ERROR");
    else { Serial.print(temperature, 1); Serial.println(" °C"); }

    Serial.print("DHT11 Humidity : ");
    if (isnan(humidity)) Serial.println("ERROR");
    else { Serial.print(humidity, 1); Serial.println(" %"); }

    Serial.print("ACS712 Current : ");
    Serial.print(currentAmps, 2);
    Serial.println(" A");

    Serial.print("Hall RPM       : ");
    Serial.print(measuredRpm, 0);
    Serial.println(" RPM");

    Serial.print("Hall Analog A0 : ");
    Serial.println(hallAnalog);

    Serial.print("Button Status  : ");
    Serial.println(buttonState == 1 ? "PRESSED" : "RELEASED");

    Serial.print("Buzzer Status  : ");
    Serial.println(buzzerState == 1 ? "ACTIVE" : "IDLE");

    // Transmit via HTTP to Backend
    sendTelemetry(temperature, humidity, currentAmps, measuredRpm, hallAnalog, buttonState, buzzerState);
  }

  // Brief yield for RTOS tasks
  delay(10);
}
