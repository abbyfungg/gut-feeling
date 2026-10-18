# Squeeze ball: build guide

The squeeze ball adds a hands-on way to log. You squeeze a stress ball while you're on the toilet, and Gut Feeling records how hard and how long you squeezed. When you're done, the app has a draft entry waiting with that "squeeze effort" attached. You confirm it and add the details.

**Squeeze effort is a personal comfort log, from 0 to 100, compared with your own ball at rest. It is not a medical measurement of straining.** The app labels it that way everywhere.

No ball? The app has a simulator (More > Squeeze ball > "Hold to squeeze") that sends readings through the same path, clearly marked "Simulated".

## How it works

1. A pressure sensor (BMP280) sits inside a sealed zip bag with the stress ball.
2. Squeezing the ball squeezes the air in the bag, so the air pressure goes up a little.
3. The Arduino turns that rise into effort (0 to 100), shows it as a bar on its red LED grid and beeps when a session starts and ends.
4. It sends readings over Wi-Fi to the app about once a second. The app shows them live.
5. After 15 seconds with no squeezing (or two quick shakes, if the accelerometer is connected) the session ends and becomes a draft entry in the app.

## Parts

| Part | Used for |
| --- | --- |
| Arduino UNO R4 WiFi | The brain, Wi-Fi and the 12×8 LED grid |
| Grove Temperature and Barometer Sensor (BMP280) | Measures the squeeze |
| Grove buzzer | Beeps on start and end |
| Grove 3-axis accelerometer | Optional: shake twice to finish early |
| Grove jumper wires (Grove plug to male pins) | Connect Grove boards to the Arduino or breadboard |
| Breadboard, male-to-male wires | Share 5V, GND, SDA and SCL between the two I2C boards |
| Stress ball | The thing you squeeze |
| A small zip-lock bag and tape | Seals the sensor and ball together |
| USB-C cable | Power and uploading |

The 130 DC motor isn't needed.

## Wiring

The UNO R4 WiFi has no Grove sockets, so use the Grove-to-male jumper cables. Every Grove cable has the same four colours:

| Grove wire | Means |
| --- | --- |
| Black | GND |
| Red | Power (5V) |
| White | SDA (data) or second signal |
| Yellow | SCL (clock) or signal |

### 1. Make power and I2C rails on the breadboard

The pressure sensor and accelerometer both talk over I2C, so they share four wires. Use male-to-male wires:

- Arduino **5V** → breadboard **red (+) rail**
- Arduino **GND** → breadboard **blue (−) rail**
- Arduino **SDA** pin (top-left header, next to AREF) → an empty breadboard row, call it **row SDA**
- Arduino **SCL** pin (next to SDA) → another empty row, call it **row SCL**

(SDA and SCL are also on A4 and A5. Either works, they're the same pins.)

### 2. Pressure sensor (BMP280)

Plug a Grove cable into the sensor, then:

- Black → blue (−) rail
- Red → red (+) rail
- White → row SDA
- Yellow → row SCL

### 3. Accelerometer (optional)

Same as the sensor: black → −, red → +, white → row SDA, yellow → row SCL. The sketch finds the common Grove accelerometers (LIS3DHTR, ADXL345, MMA7660) on its own. If yours isn't found, the Serial Monitor says so and everything else still works.

### 4. Buzzer

- Black → blue (−) rail
- Red → red (+) rail
- Yellow → Arduino pin **D6**
- White → not connected

```
 Arduino UNO R4 WiFi             Breadboard
 ┌──────────────┐
 │ 5V  ─────────┼──────────────── + rail ── red of BMP280, accel, buzzer
 │ GND ─────────┼──────────────── − rail ── black of BMP280, accel, buzzer
 │ SDA ─────────┼──────────────── row SDA ─ white of BMP280, accel
 │ SCL ─────────┼──────────────── row SCL ─ yellow of BMP280, accel
 │ D6  ─────────┼──────────────── yellow of buzzer
 └──────────────┘
```

### 5. Seal the sensor with the ball

1. Put the stress ball and the BMP280 board (still wired) into a small zip-lock bag. Smaller is better: less air means a bigger pressure change.
2. Let the Grove cable come out through one corner of the zip. Close the zip right up to the cable.
3. Wrap tape tightly around the corner where the cable comes out so air can't escape.
4. Press out a bit of the extra air before sealing, so the bag is snug around the ball, but leave some air inside.
5. Check: squeeze the bag. It should feel firm and not hiss.

Keep the sensor's small metal can away from your fingers so you squeeze the air, not the sensor.

## Software

1. Install the **Arduino IDE** (2.x) from arduino.cc.
2. **Tools > Board > Boards Manager**: search "UNO R4" and install **Arduino UNO R4 Boards**.
3. **Tools > Manage Libraries**: search "Adafruit BMP280" and install **Adafruit BMP280 Library**. Say yes to installing its dependencies.
4. Open `hardware/squeeze-ball/squeeze-ball.ino` from this repo.

### Pair the ball with your account

1. Sign in to Gut Feeling as the patient. Go to **More > Squeeze ball** and tap **Pair a squeeze ball**.
2. The app shows four lines (`SERVER_HOST`, `SERVER_PORT`, `USE_TLS`, `DEVICE_TOKEN`). Copy them over the matching lines at the top of the sketch. The pairing code is shown only once. If you lose it, tap "Make a new pairing code" (the old one stops working).
3. Fill in `WIFI_SSID` and `WIFI_PASS`. The UNO R4 only joins **2.4 GHz** Wi-Fi. Phone hotspots work well (turn on "maximise compatibility" on iPhone).

**Don't commit the sketch after filling it in.** The Wi-Fi password and pairing code are secrets. The pairing code can only add squeeze readings to your diary, and you can cancel it any time with **Unpair**.

### Upload

1. Plug in the Arduino. **Tools > Port**: pick the UNO R4 WiFi.
2. Click **Upload** (the right arrow).
3. Open **Tools > Serial Monitor** at **115200** baud. You should see the sensor found, Wi-Fi connected and "Resting pressure".
4. Don't touch the ball for the first two seconds after it starts: that's when it learns the resting pressure. A smiley appears on the LED grid when it's ready.

### Try it

1. Open **More > Squeeze ball** in the app.
2. Squeeze the ball. It beeps once, the LED grid fills up and the app's bar moves within a second or two. The badge says "From the squeeze ball".
3. Stop for 15 seconds (or shake it twice). It beeps twice and shows a tick.
4. The app shows **Session ready to log**. Tap **Log this trip**, add the details and save. The entry shows the squeeze effort, and so does the care team's timeline if you share with them.

## Calibrate

Bags and balls differ, so tune `FULL_SCALE_PA` (the pressure rise that counts as 100):

1. Open **Tools > Serial Plotter** (or Serial Monitor).
2. Squeeze as hard as you comfortably can a few times and watch `delta_pa`.
3. Set `FULL_SCALE_PA` to about that number and upload again.

If tiny touches start sessions, raise `SQUEEZE_ON`. If firm squeezes don't register, lower `FULL_SCALE_PA`.

## Troubleshooting

| What you see | Try |
| --- | --- |
| "BMP280 not found", "!" on the grid, long beeps | Check the four Grove wires, especially white to SDA and yellow to SCL. Make sure the rails really connect to 5V and GND. |
| Wi-Fi icon stays on | Wrong name or password, or a 5 GHz network. Try a phone hotspot. |
| "Couldn't reach the server" | `SERVER_HOST` must be just the host, like `my-app.onrender.com`, no `https://`. The free Render server sleeps: open the site in a browser first to wake it, then squeeze again. |
| "pairing code is unknown" (401) | Pair again in the app and paste the new `DEVICE_TOKEN`. |
| Effort creeps up on its own | The bag is leaking or warming in your hand. Re-tape the corner. The sketch also slowly re-learns the resting pressure when you're not squeezing. |
| Effort barely moves | Use a smaller bag with less air, or lower `FULL_SCALE_PA`. |
| Testing against a laptop | Run the app on your laptop, use your laptop's local IP as `SERVER_HOST`, its port (e.g. 3000) as `SERVER_PORT` and `USE_TLS 0`. The laptop and Arduino must be on the same Wi-Fi. |

## Testing without the Arduino

- In the app: **More > Squeeze ball > Hold to squeeze**. Readings are marked "Simulated", never shown as device data.
- From a computer: `node scripts/fake-ball.mjs <app-url> <pairing-code>` sends readings exactly like the Arduino does (same route, same token), so you can check pairing and the live screen. Sessions from this script count as device data, so only use it for testing.

## What the ball sends

`POST /api/device/ingest` with header `Authorization: Bearer <pairing code>` and JSON:

```json
{ "session": "b1a2b3c", "readings": [0, 12, 48, 71, 65], "squeezes": 2, "done": false }
```

- `session`: a short id the ball makes up for each session.
- `readings`: up to 60 effort values (0 to 100), five per second.
- `squeezes`: squeezes so far in this session.
- `done`: `true` on the last batch.

The server stores only a hash of the pairing code, accepts nothing else with it, and limits how fast a ball can send.
