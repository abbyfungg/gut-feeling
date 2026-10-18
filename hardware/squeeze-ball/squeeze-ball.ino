/*
  Gut Feeling squeeze ball
  Board: Arduino UNO R4 WiFi

  A Grove BMP280 pressure sensor sits in a sealed zip bag with a stress ball. Squeezing the ball
  squeezes the air in the bag, the pressure goes up, and we turn that into "squeeze effort" from 0 to 100.
  The first firm squeeze starts a session. The session ends after 15 seconds of no squeezing, or when
  you shake the ball twice. Readings go to the Gut Feeling app over Wi-Fi, where they show up live and
  as a draft entry you confirm.

  Squeeze effort is a personal comfort log. It is NOT a medical measurement of straining.

  Wiring, parts and setup: docs/HARDWARE.md

  Libraries (Arduino IDE > Tools > Manage Libraries):
    - "Adafruit BMP280 Library" by Adafruit (say yes to installing its dependencies)
  Already included with the UNO R4 board package: WiFiS3, Arduino_LED_Matrix, Wire.
*/

#include <WiFiS3.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include "Arduino_LED_Matrix.h"

// ---------------- Fill these in (the app shows the last four when you pair) ----------------
// Don't commit this file after filling it in: the Wi-Fi password and pairing code are secrets.
#define WIFI_SSID    "your-wifi-name"
#define WIFI_PASS    "your-wifi-password"
#define SERVER_HOST  "your-app.onrender.com"   // no https:// and no slash
#define SERVER_PORT  443                       // 443 for https, or e.g. 3000 for a laptop on your Wi-Fi
#define USE_TLS      1                         // 1 for https, 0 for plain http on your own network
#define DEVICE_TOKEN "gfd_paste-your-pairing-code-here"

// ---------------- Tuning ----------------
#define BUZZER_PIN      6       // Grove buzzer signal (yellow wire) on D6
#define FULL_SCALE_PA   1500.0  // pressure rise (in pascals) that counts as effort 100. See "Calibrate" in the guide.
#define SQUEEZE_ON      15      // effort that counts as a squeeze
#define SQUEEZE_OFF     8       // effort that counts as let go
#define IDLE_END_MS     15000   // end the session after this long with no squeeze
#define SAMPLE_MS       50      // read the sensor 20 times a second
#define READING_MS      200     // keep the highest value every 200 ms (5 readings a second)
#define SEND_MS         1000    // send a batch about once a second
#define PRINT_DEBUG     1       // 1 = print pressure and effort to the Serial Monitor

Adafruit_BMP280 bmp;
ArduinoLEDMatrix matrix;
#if USE_TLS
WiFiSSLClient client;
#else
WiFiClient client;
#endif

float baselinePa = 0;
float smoothPa = 0;
int effort = 0;

bool inSession = false;
bool squeezing = false;
char sessionKey[20];
int squeezes = 0;
unsigned long lastSqueezeAt = 0;

int batch[40];
int batchLen = 0;
int windowMax = 0;
unsigned long lastSample = 0, lastReading = 0, lastSend = 0;

// ---------------- Accelerometer (optional: double shake ends a session) ----------------
// Grove sells several 3-axis accelerometers. We detect the common ones by I2C address.
enum Accel { ACC_NONE, ACC_LIS3DH, ACC_ADXL345, ACC_MMA7660 };
Accel accel = ACC_NONE;
uint8_t accelAddr = 0;
unsigned long lastShakeAt = 0;
bool shakeHigh = false;

bool i2cPresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}
void i2cWrite(uint8_t addr, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}
bool i2cRead(uint8_t addr, uint8_t reg, uint8_t* buf, uint8_t n) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(addr, n) != n) return false;
  for (uint8_t i = 0; i < n; i++) buf[i] = Wire.read();
  return true;
}

void setupAccel() {
  uint8_t who = 0;
  const uint8_t lisAddrs[] = {0x19, 0x18};
  for (uint8_t a : lisAddrs) {
    if (i2cPresent(a) && i2cRead(a, 0x0F, &who, 1) && who == 0x33) {
      accel = ACC_LIS3DH; accelAddr = a;
      i2cWrite(a, 0x20, 0x57);  // 100 Hz, x/y/z on
      i2cWrite(a, 0x23, 0x08);  // high resolution, +-2 g
      Serial.println("Accelerometer: LIS3DHTR");
      return;
    }
  }
  const uint8_t adxlAddrs[] = {0x53, 0x1D};
  for (uint8_t a : adxlAddrs) {
    if (i2cPresent(a) && i2cRead(a, 0x00, &who, 1) && who == 0xE5) {
      accel = ACC_ADXL345; accelAddr = a;
      i2cWrite(a, 0x31, 0x08);  // full resolution, +-2 g
      i2cWrite(a, 0x2D, 0x08);  // measure
      Serial.println("Accelerometer: ADXL345");
      return;
    }
  }
  if (i2cPresent(0x4C)) {
    accel = ACC_MMA7660; accelAddr = 0x4C;
    i2cWrite(0x4C, 0x07, 0x00);  // standby
    i2cWrite(0x4C, 0x08, 0x00);  // 120 samples a second
    i2cWrite(0x4C, 0x07, 0x01);  // active
    Serial.println("Accelerometer: MMA7660");
    return;
  }
  Serial.println("Accelerometer: not found (that's fine, shake-to-finish is just off)");
}

// Returns acceleration size in g, or -1 if unavailable.
float accelG() {
  uint8_t b[6];
  float x, y, z;
  switch (accel) {
    case ACC_LIS3DH:
      if (!i2cRead(accelAddr, 0x28 | 0x80, b, 6)) return -1;
      x = ((int16_t)(b[1] << 8 | b[0]) >> 4) * 0.001;
      y = ((int16_t)(b[3] << 8 | b[2]) >> 4) * 0.001;
      z = ((int16_t)(b[5] << 8 | b[4]) >> 4) * 0.001;
      break;
    case ACC_ADXL345:
      if (!i2cRead(accelAddr, 0x32, b, 6)) return -1;
      x = (int16_t)(b[1] << 8 | b[0]) * 0.0039;
      y = (int16_t)(b[3] << 8 | b[2]) * 0.0039;
      z = (int16_t)(b[5] << 8 | b[4]) * 0.0039;
      break;
    case ACC_MMA7660: {
      if (!i2cRead(accelAddr, 0x00, b, 3)) return -1;
      int v[3];
      for (int i = 0; i < 3; i++) { v[i] = b[i] & 0x3F; if (v[i] & 0x20) v[i] -= 64; }
      x = v[0] / 21.33; y = v[1] / 21.33; z = v[2] / 21.33;
      break;
    }
    default:
      return -1;
  }
  return sqrt(x * x + y * y + z * z);
}

// Two sharp shakes within a second = "I'm done".
bool doubleShake() {
  float g = accelG();
  if (g < 0) return false;
  bool high = fabs(g - 1.0) > 0.9;
  bool result = false;
  if (high && !shakeHigh) {
    unsigned long now = millis();
    if (now - lastShakeAt > 150 && now - lastShakeAt < 1000) result = true;
    lastShakeAt = now;
  }
  shakeHigh = high;
  return result;
}

// ---------------- Buzzer and LED grid ----------------
void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

uint8_t frame[8][12];

// Effort bar across the 12 columns, the same picture the app shows.
void showEffort(int e) {
  int cols = (e * 12 + 50) / 100;
  for (int r = 0; r < 8; r++)
    for (int c = 0; c < 12; c++) frame[r][c] = (c < cols && r >= 7 - (c * 8) / 12) ? 1 : 0;
  matrix.renderBitmap(frame, 8, 12);
}

void showIcon(const char* rows[8]) {
  for (int r = 0; r < 8; r++)
    for (int c = 0; c < 12; c++) frame[r][c] = rows[r][c] == '#';
  matrix.renderBitmap(frame, 8, 12);
}

const char* ICON_READY[8] = {"............", "....####....", "...#....#...", "..#.#..#.#..", "..#......#..", "..#.#..#.#..", "...#.##.#...", "....####...."};
const char* ICON_WIFI[8] = {"............", "...######...", "..#......#..", ".#..####..#.", "...#....#...", ".....##.....", ".....##.....", "............"};
const char* ICON_ERROR[8] = {"............", ".....##.....", ".....##.....", ".....##.....", ".....##.....", "............", ".....##.....", "............"};
const char* ICON_SENT[8] = {"............", "..........#.", ".........#..", "........#...", "..#....#....", "...#..#.....", "....##......", "............"};

// ---------------- Wi-Fi and sending ----------------
void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  showIcon(ICON_WIFI);
  Serial.print("Connecting to Wi-Fi ");
  Serial.println(WIFI_SSID);
  for (int tries = 0; tries < 5 && WiFi.status() != WL_CONNECTED; tries++) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    delay(4000);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi OK, IP ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi failed. Check WIFI_SSID / WIFI_PASS (2.4 GHz networks only).");
    showIcon(ICON_ERROR);
  }
}

// Sends one batch. Keeps the connection open between batches so each send is quick.
int sendBatch(bool done) {
  connectWifi();
  if (WiFi.status() != WL_CONNECTED) return -1;
  if (!client.connected()) {
    client.stop();
    if (!client.connect(SERVER_HOST, SERVER_PORT)) {
      Serial.println("Couldn't reach the server. Is SERVER_HOST right? (Render's free tier can take a minute to wake up.)");
      return -1;
    }
  }

  String body = "{\"session\":\"";
  body += sessionKey;
  body += "\",\"readings\":[";
  for (int i = 0; i < batchLen; i++) {
    if (i) body += ',';
    body += batch[i];
  }
  body += "],\"squeezes\":";
  body += squeezes;
  body += ",\"done\":";
  body += done ? "true" : "false";
  body += "}";
  batchLen = 0;

  client.print("POST /api/device/ingest HTTP/1.1\r\nHost: ");
  client.print(SERVER_HOST);
  client.print("\r\nAuthorization: Bearer ");
  client.print(DEVICE_TOKEN);
  client.print("\r\nContent-Type: application/json\r\nContent-Length: ");
  client.print(body.length());
  client.print("\r\nConnection: keep-alive\r\n\r\n");
  client.print(body);

  // Read the status line, skip headers, then read the body so the connection can be reused.
  unsigned long start = millis();
  String line = "";
  int status = -1;
  long contentLength = 0;
  bool chunked = false;
  while (millis() - start < 8000) {
    if (!client.available()) { if (!client.connected()) break; delay(2); continue; }
    char ch = client.read();
    if (ch == '\r') continue;
    if (ch != '\n') { line += ch; continue; }
    if (status < 0 && line.startsWith("HTTP/")) status = line.substring(9, 12).toInt();
    String lower = line; lower.toLowerCase();
    if (lower.startsWith("content-length:")) contentLength = lower.substring(15).toInt();
    if (lower.startsWith("transfer-encoding:") && lower.indexOf("chunked") >= 0) chunked = true;
    if (line.length() == 0) break;  // end of headers
    line = "";
  }
  if (chunked) {
    client.stop();  // simplest safe option: drop the connection, reconnect next time
  } else {
    while (contentLength > 0 && millis() - start < 8000) {
      if (client.available()) { client.read(); contentLength--; } else if (!client.connected()) break;
    }
  }

  if (status == 401) Serial.println("The app says this pairing code is unknown. Pair again in the app (More > Squeeze ball).");
  else if (status != 200) { Serial.print("Server replied "); Serial.println(status); }
  if (status != 200) client.stop();
  return status;
}

// ---------------- Pressure to effort ----------------
void calibrate() {
  Serial.println("Calibrating. Don't touch the ball for 2 seconds...");
  float sum = 0;
  for (int i = 0; i < 40; i++) { sum += bmp.readPressure(); delay(50); }
  baselinePa = smoothPa = sum / 40.0;
  Serial.print("Resting pressure: ");
  Serial.print(baselinePa);
  Serial.println(" Pa");
}

void startSession() {
  inSession = true;
  squeezes = 0;
  batchLen = 0;
  snprintf(sessionKey, sizeof(sessionKey), "b%lx%lx", (unsigned long)millis(), (unsigned long)random(0xFFFFF));
  beep(60);
  Serial.println("Session started");
}

void endSession() {
  int status = sendBatch(true);
  inSession = false;
  squeezing = false;
  beep(60); delay(80); beep(60);
  showIcon(status == 200 ? ICON_SENT : ICON_ERROR);
  Serial.println(status == 200 ? "Session sent. Open the app to log it." : "Session ended but didn't send.");
  delay(1500);
  showIcon(ICON_READY);
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  matrix.begin();
  Wire.begin();
  randomSeed(analogRead(A0));

  if (!bmp.begin(0x77) && !bmp.begin(0x76)) {
    Serial.println("BMP280 not found. Check the Grove wires: black GND, red 5V, white SDA, yellow SCL.");
    showIcon(ICON_ERROR);
    while (true) { beep(300); delay(2000); }
  }
  // Fast, low-noise pressure readings.
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X1, Adafruit_BMP280::SAMPLING_X4,
                  Adafruit_BMP280::FILTER_X2, Adafruit_BMP280::STANDBY_MS_1);

  setupAccel();
  connectWifi();
  calibrate();
  showIcon(ICON_READY);
  beep(40);
}

void loop() {
  unsigned long now = millis();

  if (now - lastSample >= SAMPLE_MS) {
    lastSample = now;
    float p = bmp.readPressure();
    smoothPa = smoothPa * 0.6 + p * 0.4;
    float delta = smoothPa - baselinePa;
    effort = constrain((int)(delta * 100.0 / FULL_SCALE_PA), 0, 100);

    // Let the baseline follow slow changes (weather, warm hands) while the ball is resting.
    if (effort < 3) baselinePa = baselinePa * 0.995 + smoothPa * 0.005;

    if (!squeezing && effort >= SQUEEZE_ON) {
      squeezing = true;
      if (!inSession) startSession();
      squeezes++;
    } else if (squeezing && effort <= SQUEEZE_OFF) {
      squeezing = false;
    }
    if (squeezing) lastSqueezeAt = now;
    if (effort > windowMax) windowMax = effort;

    if (inSession || effort > 0) showEffort(effort);

#if PRINT_DEBUG
    static unsigned long lastPrint = 0;
    if (now - lastPrint > 250) {
      lastPrint = now;
      Serial.print("delta_pa:");
      Serial.print(delta, 0);
      Serial.print(" effort:");
      Serial.println(effort);
    }
#endif
  }

  if (!inSession) { windowMax = 0; return; }

  if (now - lastReading >= READING_MS) {
    lastReading = now;
    if (batchLen < 40) batch[batchLen++] = windowMax;
    windowMax = 0;
  }

  if (now - lastSend >= SEND_MS && batchLen > 0) {
    lastSend = now;
    sendBatch(false);
  }

  if ((!squeezing && now - lastSqueezeAt > IDLE_END_MS) || doubleShake()) endSession();
}
