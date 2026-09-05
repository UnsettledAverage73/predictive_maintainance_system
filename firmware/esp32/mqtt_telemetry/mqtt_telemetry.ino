#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// -------------------------------------------------------------
// REPLACE WITH YOUR NETWORK & SYSTEM CREDENTIALS
// -------------------------------------------------------------
const char* ssid        = "YOUR_WIFI_SSID";
const char* password    = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100"; // e.g., "192.168.1.100"
// -------------------------------------------------------------

#define DHTPIN 4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    String clientId = String("ESP32_") + WiFi.macAddress();
    if (client.connect(clientId.c_str())) {
      Serial.println("connected!");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void setup() {
  dht.begin();
  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  static unsigned long lastMsg = 0;
  unsigned long now = millis();

  // Publish telemetry every 3 seconds
  if (now - lastMsg > 3000) {
    lastMsg = now;

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    // Build JSON payload
    JsonDocument doc;
    doc["device_id"]   = WiFi.macAddress();
    doc["node_name"]   = "esp32_node";
    doc["temperature"] = temp;
    doc["humidity"]    = hum;
    doc["status"]      = "OK";

    char buffer[256];
    serializeJson(doc, buffer);

    client.publish("sensor/telemetry", buffer);
    Serial.print("Published: ");
    Serial.println(buffer);
  }
}

