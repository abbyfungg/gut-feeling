/*
  Gut Feeling water bottle: FIRST TEST
  Board: Arduino UNO R4 WiFi

  What it does:
    1. Lights the 4 corner LEDs of the red grid and blinks the small L LED 3 times.
       (If a Grove shield covers the grid, that's fine: the Serial Monitor is the real test.)
    2. Looks for the accelerometer and tells you which kind it found.
    3. Prints the tilt of the bottle 5 times a second.

  Open Tools > Serial Monitor and set it to 115200 baud.
  Tip the accelerometer slowly. "tilt" should go from about 0 (upright) to about 90 (on its side).

  No extra libraries needed.
*/

#include <Wire.h>
#include "Arduino_LED_Matrix.h"

ArduinoLEDMatrix matrix;
uint8_t frame[8][12];

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

// Acceleration in g on each axis. Returns false if it can't read.
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

float restX, restY, restZ;

void setup() {
  Serial.begin(115200);
  delay(1500);
  pinMode(LED_BUILTIN, OUTPUT);
  matrix.begin();
  Wire.begin();

  Serial.println("LED test: the 4 corners of the red grid light up (hidden if a shield covers it).");
  frame[0][0] = frame[0][11] = frame[7][0] = frame[7][11] = 1;
  matrix.renderBitmap(frame, 8, 12);
  for (int i = 0; i < 3; i++) { digitalWrite(LED_BUILTIN, HIGH); delay(200); digitalWrite(LED_BUILTIN, LOW); delay(200); }

  Serial.println("I2C scan (devices found on SDA/SCL):");
  for (uint8_t a = 1; a < 127; a++) if (present(a)) { Serial.print("  found 0x"); Serial.println(a, HEX); }

  findAccel();
  const char* names[] = {"NOT FOUND", "LIS3DHTR", "ADXL345", "MMA7660"};
  Serial.print("Accelerometer: ");
  Serial.println(names[accel]);
  if (accel == ACC_NONE) {
    Serial.println("Check the Grove wires: black GND, red 5V, white SDA, yellow SCL. On a Grove shield, use a port labelled I2C and set its switch to 5V. Then press the reset button.");
    while (true) delay(1000);
  }
  Serial.println("Hold it still and upright for 1 second...");
  delay(1000);
  readG(restX, restY, restZ);
  Serial.println("Now tip it slowly.");
}

void loop() {
  float x, y, z;
  if (!readG(x, y, z)) { Serial.println("read failed"); delay(500); return; }
  float dot = x * restX + y * restY + z * restZ;
  float mags = sqrt(x * x + y * y + z * z) * sqrt(restX * restX + restY * restY + restZ * restZ);
  float tilt = mags > 0 ? acos(constrain(dot / mags, -1.0, 1.0)) * 180.0 / PI : 0;
  Serial.print("x:"); Serial.print(x, 2);
  Serial.print(" y:"); Serial.print(y, 2);
  Serial.print(" z:"); Serial.print(z, 2);
  Serial.print(" tilt:"); Serial.println(tilt, 0);
  delay(200);
}
