/*
  Gut Feeling water bottle: FULL SKETCH
  Board: Arduino UNO R4 WiFi

  The accelerometer is taped to the bottle. When you tip the bottle to drink and put it back
  upright, that counts as one sip. Sips x ML_PER_SIP gives an ESTIMATE of how much you drank
  (a fixed 30 ml per sip, no calibration needed). The red LED grid shows your sip count. If you go REMIND_MS
  without a sip, the water drop flashes on the LED grid to remind you to drink.

  LED grid hidden under a Grove shield? Everything still works: the small "L" LED on the
  board blinks once per sip, 3 times for a reminder, and fast if the sensor isn't found,
  and the Serial Monitor (115200 baud) prints every sip.

  Step 1: run it with SEND_TO_APP 0 (the default). Everything works without Wi-Fi.
  Step 2: set SEND_TO_APP 1, fill in WIFI_SSID / WIFI_PASS, and paste the 4 pairing lines.

  No extra libraries needed. Guide: WATER-BOTTLE-GUIDE.md
*/

#include <Wire.h>
#include "Arduino_LED_Matrix.h"

// ---------------- Settings you can change ----------------
#define ML_PER_SIP    30       // fixed estimate of ml per sip
#define TILT_SIP      50       // degrees: tipping past this starts a sip
#define TILT_UPRIGHT  25       // degrees: coming back under this ends it
#define MIN_SIP_MS    600      // shorter tips are bumps, not sips
#define MAX_SIP_MS    15000    // longer than this = bottle lying down, not a sip
#define REMIND_MS     (30UL * 60UL * 1000UL)  // remind after 30 min with no sip. For a demo try (60UL * 1000UL) = 1 min.
#define USE_LED_GRID  1        // the red LED grid. Fine to leave at 1 even if a shield covers it.

// ---------------- Sending to the app (set to 1 to send sips) ----------------
#define SEND_TO_APP   0

// Your phone hotspot (2.4 GHz). Keep these two lines when you paste the pairing code below.
// Don't commit this file after filling these in: they are secrets.
#define WIFI_SSID    "your-hotspot-name"
#define WIFI_PASS    "your-hotspot-password"

// The 4 lines from the app (More > Water bottle > Pair a bottle). Paste over just these 4.
#define SERVER_HOST  "your-app.onrender.com"   // no https:// and no slash
#define SERVER_PORT  443
#define USE_TLS      1
#define DEVICE_TOKEN "gfd_paste-your-pairing-code-here"

#if SEND_TO_APP
#include <WiFiS3.h>
#if !defined(WIFI_SSID) || !defined(WIFI_PASS)
#error "WIFI_SSID / WIFI_PASS are missing. Add them back near the top: #define WIFI_SSID \"your-hotspot-name\" and #define WIFI_PASS \"your-hotspot-password\""
#endif
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

// ---------------- LED grid and the small L LED ----------------
void draw() {
#if USE_LED_GRID
  matrix.renderBitmap(frame, 8, 12);
#endif
}
// Blink the onboard L LED (pin 13): visible even when the grid is covered
void blinkL(int times, int ms) {
  for (int i = 0; i < times; i++) { digitalWrite(LED_BUILTIN, HIGH); delay(ms); digitalWrite(LED_BUILTIN, LOW); delay(ms); }
}
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
  draw();
}
const char* DROP[8] = {".....##.....", "....####....", "...######...", "..########..", "..########..", "..########..", "...######...", "....####...."};
void showDrop() {
  for (int r = 0; r < 8; r++) for (int c = 0; c < 12; c++) frame[r][c] = DROP[r][c] == '#';
  draw();
}
// Big X = something is wrong (accelerometer not found)
void showError() {
  clearFrame();
  for (int i = 0; i < 8; i++) { frame[i][i + 2] = 1; frame[i][9 - i] = 1; }
  draw();
}
// Flash the drop a few times (the reminder)
void flashDrop(int times) {
  for (int i = 0; i < times; i++) {
    showDrop(); delay(400);
    clearFrame(); draw(); delay(300);
  }
}

// ---------------- Sending (only when SEND_TO_APP is 1) ----------------
// The bottle sends its running total since power-on plus a random boot id. If a reply gets lost and it
// sends the same total again, the app counts nothing new, so sips are never counted twice.
// Sips made while Wi-Fi is down stay in the total and go out with the next send.
int sentTotal = 0;
bool lastSendFailed = false;
char bootId[9] = "0";
unsigned long lastSendTry = 0, lastHeartbeat = 0;

#if SEND_TO_APP
const char* wifiStatusText(uint8_t s) {
  switch (s) {
    case WL_CONNECTED: return "connected";
    case WL_NO_SSID_AVAIL: return "can't see that network name (check WIFI_SSID, and that the hotspot is on and 2.4 GHz)";
    case WL_CONNECT_FAILED: return "the network refused it (usually a wrong WIFI_PASS)";
    case WL_CONNECTION_LOST: return "connection lost";
    case WL_DISCONNECTED: return "not connected yet";
    case WL_IDLE_STATUS: return "idle, still trying";
    case WL_NO_MODULE: return "the Wi-Fi chip isn't answering (press RESET; update its firmware if it keeps happening)";
    default: return "unknown";
  }
}

bool scannedOnce = false;

// Lists the networks the board can see, once, so you can check the hotspot shows up at all.
void scanWifi() {
  Serial.println("Networks the board can see:");
  int n = WiFi.scanNetworks();
  if (n <= 0) Serial.println("  none. Bring the hotspot closer and make sure it's switched on (keep the hotspot screen open on iPhone).");
  for (int i = 0; i < n; i++) { Serial.print("  "); Serial.print(WiFi.SSID(i)); Serial.print("  (signal "); Serial.print(WiFi.RSSI(i)); Serial.println(" dBm)"); }
  Serial.print("Looking for exactly: \""); Serial.print(WIFI_SSID); Serial.println("\" (capitals and spaces must match)");
}

// attempts x about 5 s. At boot it tries harder; in the loop it tries once so sip counting keeps going.
void connectWifi(int attempts) {
  if (WiFi.status() == WL_CONNECTED) return;
  static bool checkedFirmware = false;
  if (!checkedFirmware) {
    checkedFirmware = true;
    if (WiFi.status() == WL_NO_MODULE) Serial.println("The Wi-Fi chip isn't answering. Unplug USB, plug it back in, and try again.");
    String fv = WiFi.firmwareVersion();
    Serial.print("Wi-Fi firmware "); Serial.print(fv); Serial.print(" (latest the library knows: "); Serial.print(WIFI_FIRMWARE_LATEST_VERSION); Serial.println(")");
    if (fv < WIFI_FIRMWARE_LATEST_VERSION) Serial.println("Update it: close the Serial Monitor, then Tools > Firmware Updater > UNO R4 WiFi > Check Updates > Install. Then upload this sketch again.");
  }
  Serial.print("Connecting to Wi-Fi \""); Serial.print(WIFI_SSID); Serial.println("\"");
  for (int i = 1; i <= attempts && WiFi.status() != WL_CONNECTED; i++) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 5000) delay(250);
    uint8_t st = WiFi.status();
    Serial.print("  try "); Serial.print(i); Serial.print("/"); Serial.print(attempts); Serial.print(": "); Serial.println(wifiStatusText(st));
  }
  if (WiFi.status() == WL_CONNECTED) { Serial.println("Wi-Fi OK"); return; }
  Serial.println("Wi-Fi failed. Sips are kept and sent when it connects (it retries every 30 s).");
  if (!scannedOnce) { scannedOnce = true; scanWifi(); }
}

bool sendTotals(int total) {
  connectWifi(1);
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!client.connect(SERVER_HOST, SERVER_PORT)) { Serial.println("Couldn't reach the app. Open the site in a browser to wake it, then try again."); return false; }
  String body = String("{\"boot\":\"") + bootId + "\",\"total\":" + total + ",\"totalMl\":" + (total * ML_PER_SIP) + "}";
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
  else { Serial.print("Sent to the app (total today since power-on: "); Serial.print(total); Serial.println(" sips)"); }
  return code == 200;
}
#endif

// ---------------- Sip detection ----------------
float restX, restY, restZ;
float tiltSmooth = 0;
bool tipped = false;
unsigned long tipStart = 0, lastSipAt = 0, lastRemind = 0, lastSample = 0;
int sips = 0;

void learnUpright() {
  Serial.println("Getting ready: keep the bottle upright and still for 2 seconds...");
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
  pinMode(LED_BUILTIN, OUTPUT);
#if USE_LED_GRID
  matrix.begin();
#endif
  Wire.begin();
  showDrop();

  findAccel();
  if (accel == ACC_NONE) {
    Serial.println("Accelerometer not found. Check: black GND, red 5V, white SDA, yellow SCL (or that it's in an I2C port on the shield). Run bottle_test first.");
    showError();  // a big X on the LED grid
    while (true) blinkL(1, 100);  // L LED blinks fast
  }
  learnUpright();
  randomSeed(micros() ^ (unsigned long)analogRead(A0));
  snprintf(bootId, sizeof(bootId), "%08lx", (unsigned long)random(0x7FFFFFFF));
  // Wired mode: the laptop script (usb-bridge.mjs) reads these GF lines and sends them to the app.
  Serial.print("GF boot="); Serial.print(bootId); Serial.println(" total=0 ml=0");
#if SEND_TO_APP
  connectWifi(8);  // at power-on, try harder (about 40 s) and explain what's wrong
  sendTotals(0);  // check in now, so the app shows "Online" straight away
  lastHeartbeat = millis();
#endif
  blinkL(2, 150);
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
          lastSipAt = lastRemind = now;
          blinkL(1, 150);
          Serial.print("Sip #"); Serial.print(sips);
          Serial.print(" (held "); Serial.print(held / 1000.0, 1);
          Serial.print(" s). Estimated total: "); Serial.print(sips * ML_PER_SIP); Serial.println(" ml");
          Serial.print("GF boot="); Serial.print(bootId); Serial.print(" total="); Serial.print(sips); Serial.print(" ml="); Serial.println(sips * ML_PER_SIP);
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
    blinkL(3, 200);
    flashDrop(5);
    showCount(sips);
  }

#if SEND_TO_APP
  // New sips to send? Retry every 3 s, or every 30 s while Wi-Fi or the app is unreachable.
  if (sips != sentTotal && !tipped && now - lastSendTry > (lastSendFailed ? 30000UL : 3000UL)) {
    lastSendTry = lastHeartbeat = now;
    int total = sips;
    lastSendFailed = !sendTotals(total);
    if (!lastSendFailed) sentTotal = total;
  }
  // Check in every 5 minutes so the app shows "Online" (sends the same total, so nothing is double counted).
  if (!tipped && now - lastHeartbeat > 5UL * 60UL * 1000UL) {
    lastHeartbeat = now;
    int total = sips;
    if (sendTotals(total)) sentTotal = total;
  }
#endif
}
