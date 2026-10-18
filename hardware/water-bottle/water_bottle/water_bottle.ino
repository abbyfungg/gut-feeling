/*
  Gut Feeling water bottle: FULL SKETCH
  Board: Arduino UNO R4 WiFi

  The accelerometer is taped to the bottle. When you tip the bottle to drink and put it back
  upright, that counts as one sip. Sips x ML_PER_SIP gives an ESTIMATE of how much you drank
  (calibrate it, see the guide). The red LED grid shows your sip count. If you go REMIND_MS
  without a sip, the water drop flashes on the LED grid to remind you to drink.

  Step 1: run it with SEND_TO_APP 0 (the default). Everything works without Wi-Fi.
  Step 2 (later, once the app side is ready): set SEND_TO_APP 1 and fill in the Wi-Fi lines.

  No extra libraries needed. Guide: WATER-BOTTLE-GUIDE.md
*/

#include <Wire.h>
#include "Arduino_LED_Matrix.h"

// ---------------- Settings you can change ----------------
#define ML_PER_SIP    30       // average ml per sip. Calibrate: see the guide.
#define TILT_SIP      50       // degrees: tipping past this starts a sip
#define TILT_UPRIGHT  25       // degrees: coming back under this ends it
#define MIN_SIP_MS    600      // shorter tips are bumps, not sips
#define MAX_SIP_MS    15000    // longer than this = bottle lying down, not a sip
#define REMIND_MS     (30UL * 60UL * 1000UL)  // remind after 30 min with no sip. For a demo try (60UL * 1000UL) = 1 min.

// ---------------- Sending to the app (leave at 0 for now) ----------------
#define SEND_TO_APP   0
#if SEND_TO_APP
#include <WiFiS3.h>
// Don't commit this file after filling these in: they are secrets.
#define WIFI_SSID    "your-wifi-name"
#define WIFI_PASS    "your-wifi-password"
#define SERVER_HOST  "your-app.onrender.com"   // no https:// and no slash
#define SERVER_PORT  443
#define USE_TLS      1
#define DEVICE_TOKEN "gfd_paste-your-pairing-code-here"
#if USE_TLS
WiFiSSLClient client;
#else
WiFiClient client;
#endif
#endif

ArduinoLEDMatrix matrix;
uint8_t frame[8][12];

// ---------------- Accelerometer (finds the common Grove ones by itself) ----------------
enum Accel { ACC_NONE, ACC_LIS3DH, ACC_ADXL345, ACC_MMA7660 };
Accel accel = ACC_NONE;
uint8_t addr = 0;

bool present(uint8_t a) { Wire.beginTransmission(a); return Wire.endTransmission() == 0; }
void writeReg(uint8_t a, uint8_t r, uint8_t v) { Wire.beginTransmission(a); Wire.write(r); Wire.write(v); Wire.endTransmission(); }
bool readRegs(uint8_t a, uint8_t r, uint8_t* b, uint8_t n) {
  Wire.beginTransmission(a); Wire.write(r);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(a, n) != n) return false;
  for (uint8_t i = 0; i < n; i++) b[i] = Wire.read();
  return true;
}

void findAccel() {
  uint8_t who = 0;
  const uint8_t lis[] = {0x19, 0x18};
  for (uint8_t a : lis) if (present(a) && readRegs(a, 0x0F, &who, 1) && who == 0x33) {
    accel = ACC_LIS3DH; addr = a; writeReg(a, 0x20, 0x57); writeReg(a, 0x23, 0x08); return;
  }
  const uint8_t adxl[] = {0x53, 0x1D};
  for (uint8_t a : adxl) if (present(a) && readRegs(a, 0x00, &who, 1) && who == 0xE5) {
    accel = ACC_ADXL345; addr = a; writeReg(a, 0x31, 0x08); writeReg(a, 0x2D, 0x08); return;
  }
  if (present(0x4C)) { accel = ACC_MMA7660; addr = 0x4C; writeReg(0x4C, 0x07, 0x00); writeReg(0x4C, 0x08, 0x00); writeReg(0x4C, 0x07, 0x01); }
}

bool readG(float& x, float& y, float& z) {
  uint8_t b[6];
  switch (accel) {
    case ACC_LIS3DH:
      if (!readRegs(addr, 0x28 | 0x80, b, 6)) return false;
      x = ((int16_t)(b[1] << 8 | b[0]) >> 4) * 0.001; y = ((int16_t)(b[3] << 8 | b[2]) >> 4) * 0.001; z = ((int16_t)(b[5] << 8 | b[4]) >> 4) * 0.001;
      return true;
    case ACC_ADXL345:
      if (!readRegs(addr, 0x32, b, 6)) return false;
      x = (int16_t)(b[1] << 8 | b[0]) * 0.0039; y = (int16_t)(b[3] << 8 | b[2]) * 0.0039; z = (int16_t)(b[5] << 8 | b[4]) * 0.0039;
      return true;
    case ACC_MMA7660: {
      if (!readRegs(addr, 0x00, b, 3)) return false;
      int v[3];
      for (int i = 0; i < 3; i++) { v[i] = b[i] & 0x3F; if (v[i] & 0x20) v[i] -= 64; }
      x = v[0] / 21.33; y = v[1] / 21.33; z = v[2] / 21.33;
      return true;
    }
    default: return false;
  }
}

// ---------------- LED grid ----------------
// 3x5 digits for the sip count
const uint8_t DIGITS[10][5] = {
  {7, 5, 5, 5, 7}, {2, 6, 2, 2, 7}, {7, 1, 7, 4, 7}, {7, 1, 7, 1, 7}, {5, 5, 7, 1, 1},
  {7, 4, 7, 1, 7}, {7, 4, 7, 5, 7}, {7, 1, 1, 1, 1}, {7, 5, 7, 5, 7}, {7, 5, 7, 1, 7},
};
void clearFrame() { memset(frame, 0, sizeof(frame)); }
void drawDigit(int d, int col) {
  for (int r = 0; r < 5; r++)
    for (int c = 0; c < 3; c++) frame[r + 2][col + c] = (DIGITS[d][r] >> (2 - c)) & 1;
}
void showCount(int n) {
  clearFrame();
  n = n % 100;
  if (n >= 10) { drawDigit(n / 10, 2); drawDigit(n % 10, 7); }
  else drawDigit(n, 5);
  frame[0][0] = 1;  // small dot = running
  matrix.renderBitmap(frame, 8, 12);
}
const char* DROP[8] = {".....##.....", "....####....", "...######...", "..########..", "..########..", "..########..", "...######...", "....####...."};
void showDrop() {
  for (int r = 0; r < 8; r++) for (int c = 0; c < 12; c++) frame[r][c] = DROP[r][c] == '#';
  matrix.renderBitmap(frame, 8, 12);
}
// Big X = something is wrong (accelerometer not found)
void showError() {
  clearFrame();
  for (int i = 0; i < 8; i++) { frame[i][i + 2] = 1; frame[i][9 - i] = 1; }
  matrix.renderBitmap(frame, 8, 12);
}
// Flash the drop a few times (the reminder)
void flashDrop(int times) {
  for (int i = 0; i < times; i++) {
    showDrop(); delay(400);
    clearFrame(); matrix.renderBitmap(frame, 8, 12); delay(300);
  }
}

// ---------------- Sending (only when SEND_TO_APP is 1) ----------------
int pendingSips = 0;
unsigned long lastSendTry = 0, lastHeartbeat = 0;

#if SEND_TO_APP
void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to Wi-Fi "); Serial.println(WIFI_SSID);
  for (int i = 0; i < 3 && WiFi.status() != WL_CONNECTED; i++) { WiFi.begin(WIFI_SSID, WIFI_PASS); delay(4000); }
  Serial.println(WiFi.status() == WL_CONNECTED ? "Wi-Fi OK" : "Wi-Fi failed (2.4 GHz networks only). Sips are kept and sent later.");
}

bool sendSips(int sips) {
  connectWifi();
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!client.connect(SERVER_HOST, SERVER_PORT)) { Serial.println("Couldn't reach the app. Open the site in a browser to wake it, then try again."); return false; }
  String body = String("{\"sips\":") + sips + ",\"ml\":" + (sips * ML_PER_SIP) + "}";
  client.print("POST /api/device/ingest HTTP/1.1\r\nHost: "); client.print(SERVER_HOST);
  client.print("\r\nAuthorization: Bearer "); client.print(DEVICE_TOKEN);
  client.print("\r\nContent-Type: application/json\r\nContent-Length: "); client.print(body.length());
  client.print("\r\nConnection: close\r\n\r\n"); client.print(body);
  unsigned long start = millis();
  String status = "";
  while (millis() - start < 8000 && status.length() < 12) {
    if (client.available()) status += (char)client.read();
    else if (!client.connected()) break;
  }
  client.stop();
  int code = status.length() >= 12 ? status.substring(9, 12).toInt() : -1;
  if (code == 401) Serial.println("The app doesn't know this pairing code. Pair again in the app.");
  else if (code != 200) { Serial.print("App replied "); Serial.println(code); }
  return code == 200;
}
#endif

// ---------------- Sip detection ----------------
float restX, restY, restZ;
float tiltSmooth = 0;
bool tipped = false;
unsigned long tipStart = 0, lastSipAt = 0, lastRemind = 0, lastSample = 0;
int sips = 0;

void calibrate() {
  Serial.println("Calibrating: keep the bottle upright and still for 2 seconds...");
  float sx = 0, sy = 0, sz = 0, x, y, z;
  int n = 0;
  for (int i = 0; i < 40; i++) { if (readG(x, y, z)) { sx += x; sy += y; sz += z; n++; } delay(50); }
  restX = sx / n; restY = sy / n; restZ = sz / n;
  Serial.println("Ready. Drink away!");
}

float tiltDegrees(float x, float y, float z) {
  float dot = x * restX + y * restY + z * restZ;
  float mags = sqrt(x * x + y * y + z * z) * sqrt(restX * restX + restY * restY + restZ * restZ);
  return mags > 0 ? acos(constrain(dot / mags, -1.0, 1.0)) * 180.0 / PI : 0;
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  matrix.begin();
  Wire.begin();
  showDrop();

  findAccel();
  if (accel == ACC_NONE) {
    Serial.println("Accelerometer not found. Check: black GND, red 5V, white SDA, yellow SCL. Run bottle_test first.");
    showError();  // a big X on the LED grid
    while (true) delay(1000);
  }
#if SEND_TO_APP
  connectWifi();
#endif
  calibrate();
  lastSipAt = lastRemind = millis();
  showCount(0);
}

void loop() {
  unsigned long now = millis();

  if (now - lastSample >= 50) {
    lastSample = now;
    float x, y, z;
    if (readG(x, y, z)) {
      tiltSmooth = tiltSmooth * 0.7 + tiltDegrees(x, y, z) * 0.3;

      if (!tipped && tiltSmooth > TILT_SIP) {
        tipped = true;
        tipStart = now;
        showDrop();
      } else if (tipped && tiltSmooth < TILT_UPRIGHT) {
        tipped = false;
        unsigned long held = now - tipStart;
        if (held >= MIN_SIP_MS && held <= MAX_SIP_MS) {
          sips++;
          pendingSips++;
          lastSipAt = lastRemind = now;
          Serial.print("Sip #"); Serial.print(sips);
          Serial.print(" (held "); Serial.print(held / 1000.0, 1);
          Serial.print(" s). Estimated total: "); Serial.print(sips * ML_PER_SIP); Serial.println(" ml");
        } else {
          Serial.print("Not counted (tipped for "); Serial.print(held / 1000.0, 1); Serial.println(" s)");
        }
        showCount(sips);
      }
    }
  }

  // Reminder: flash the water drop if you haven't had a sip in a while.
  if (!tipped && now - lastSipAt >= REMIND_MS && now - lastRemind >= REMIND_MS) {
    lastRemind = now;
    Serial.println("Reminder: time for a sip of water.");
    flashDrop(5);
    showCount(sips);
  }

#if SEND_TO_APP
  if (pendingSips > 0 && !tipped && now - lastSendTry > 3000) {
    lastSendTry = now;
    if (sendSips(pendingSips)) pendingSips = 0;
  }
  if (now - lastHeartbeat > 5UL * 60UL * 1000UL) {  // lets the app show "online"
    lastHeartbeat = now;
    if (pendingSips == 0) sendSips(0);
  }
#endif
}
