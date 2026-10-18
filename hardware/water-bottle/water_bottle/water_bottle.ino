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

  To send sips to the app: keep the board plugged into the laptop with USB and run usb-bridge.mjs
  (see the guide). The board prints a "GF boot=... total=... ml=..." line for each sip, and the
  laptop script sends it to the app. No Wi-Fi is used.

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

// ---------------- Reporting to the laptop (usb-bridge.mjs) ----------------
// Each line is the running total since power-on plus a random boot id, so the app never counts a sip twice
// even if a line is sent again. It's repeated every minute so the app shows the bottle as online.
int sips = 0;  // sips counted since power-on
char bootId[9] = "0";
unsigned long lastReport = 0;
void reportTotal() {
  Serial.print("GF boot="); Serial.print(bootId); Serial.print(" total="); Serial.print(sips); Serial.print(" ml="); Serial.println(sips * ML_PER_SIP);
  lastReport = millis();
}

// ---------------- Sip detection ----------------
float restX, restY, restZ;
float tiltSmooth = 0;
bool tipped = false;
unsigned long tipStart = 0, lastSipAt = 0, lastRemind = 0, lastSample = 0;

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
  reportTotal();  // tells the laptop script the board just started (total=0)
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
          reportTotal();
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

  // Repeat the total every minute so the laptop script can keep the app's "Online" status fresh.
  if (!tipped && now - lastReport > 60000UL) reportTotal();
}
