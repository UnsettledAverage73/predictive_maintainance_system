#include <Arduino.h>

#if defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESPAsyncTCP.h>
  #include <ESPAsyncWebServer.h>
#elif defined(ESP32)
  #include <WiFi.h>
  #include <AsyncTCP.h>
  #include <ESPAsyncWebServer.h>
#else
  #error "ESP-DASH requires an ESP8266 or ESP32 class board for this sketch."
#endif

#include <DHT.h>
#include <ESPDash.h>

#define DHTPIN 4
#define DHTTYPE DHT11

/* WiFi credentials */
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

DHT dht(DHTPIN, DHTTYPE);
AsyncWebServer server(80);
ESPDash dashboard(server);

dash::TemperatureCard<float, 2> temperature(dashboard, "Temperature");
dash::HumidityCard<float, 2> humidity(dashboard, "Humidity");
dash::FeedbackCard<> connectionStatus(dashboard, "Connection");

unsigned long lastUpdate = 0;
const unsigned long updateIntervalMs = 2000;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }

  Serial.println();
  Serial.print("Connected. IP Address: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  connectWiFi();
  server.begin();

  connectionStatus.setStatus(dash::Status::SUCCESS);
  connectionStatus.setMessage("WiFi connected, dashboard ready");
  dashboard.sendUpdates(true);
}

void loop() {
  if (millis() - lastUpdate < updateIntervalMs) {
    return;
  }
  lastUpdate = millis();

  const float temp = dht.readTemperature();
  const float hum = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read from DHT sensor!");
    connectionStatus.setStatus(dash::Status::ERROR);
    connectionStatus.setMessage("DHT sensor read failed");
    dashboard.sendUpdates();
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temp);
  Serial.print(" C | Humidity: ");
  Serial.print(hum);
  Serial.println(" %");

  temperature.setValue(temp);
  humidity.setValue(hum);
  connectionStatus.setStatus(dash::Status::SUCCESS);
  connectionStatus.setMessage("Live sensor data updating");

  dashboard.sendUpdates();
}
