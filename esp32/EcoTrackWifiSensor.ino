#include <WiFi.h>
#include <WebServer.h>

const char* WIFI_NAME = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

WebServer server(80);

const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

const float EMPTY_DISTANCE_CM = 50.0;
const float COLLECTION_DISTANCE_CM = 5.0;
const float ALERT_PERCENT = 80.0;
bool sensorUrlPrinted = false;

float readOneDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(3);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  const unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return -1.0;

  const float distanceCm = (duration * 0.0343) / 2.0;
  if (distanceCm < 2.0 || distanceCm > 400.0) return -1.0;
  return distanceCm;
}

float readStableDistanceCm() {
  float values[5];
  int count = 0;

  for (int i = 0; i < 5; i++) {
    const float value = readOneDistanceCm();
    if (value > 0) values[count++] = value;
    delay(60);
  }
  if (count < 3) return -1.0;

  for (int i = 0; i < count - 1; i++) {
    for (int j = i + 1; j < count; j++) {
      if (values[j] < values[i]) {
        const float temp = values[i];
        values[i] = values[j];
        values[j] = temp;
      }
    }
  }

  return values[count / 2];
}

float calculateFillPercent(float distanceCm) {
  const float percent =
      ((EMPTY_DISTANCE_CM - distanceCm) /
       (EMPTY_DISTANCE_CM - COLLECTION_DISTANCE_CM)) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendReading() {
  const float distanceCm = readStableDistanceCm();
  addCorsHeaders();

  if (distanceCm < 0) {
    server.send(503, "application/json",
                "{\"ok\":false,\"bin\":\"bin-01\",\"error\":\"No stable sensor echo\"}");
    return;
  }

  const float fillPercent = calculateFillPercent(distanceCm);
  String json = "{\"ok\":true,\"bin\":\"bin-01\",\"distanceCm\":";
  json += String(distanceCm, 1);
  json += ",\"fillPercent\":";
  json += String(fillPercent, 0);
  json += ",\"alert\":";
  json += fillPercent >= ALERT_PERCENT ? "true" : "false";
  json += "}";

  server.send(200, "application/json", json);
  Serial.println(json);
}

void sendOptions() {
  addCorsHeaders();
  server.send(204);
}

void sendNotFound() {
  addCorsHeaders();
  server.send(404, "application/json",
              "{\"ok\":false,\"error\":\"Not found. Use /reading\"}");
}

void printSensorUrl() {
  Serial.print("EcoTrack sensor server: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/reading");
  sensorUrlPrinted = true;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  const unsigned long connectStartedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - connectStartedAt < 30000UL) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  server.on("/reading", HTTP_GET, sendReading);
  server.on("/reading", HTTP_OPTIONS, sendOptions);
  server.onNotFound(sendNotFound);
  server.begin();

  if (WiFi.status() == WL_CONNECTED) {
    printSensorUrl();
  } else {
    Serial.println("Wi-Fi not connected yet; the ESP32 will keep retrying.");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!sensorUrlPrinted) printSensorUrl();
    server.handleClient();
  }
  delay(2);
}
