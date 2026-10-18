# Gut Feeling water bottle: beginner build guide

You'll tape a small motion sensor (the accelerometer) to a water bottle. Each time the bottle tips up for a drink and comes back down, the Arduino counts a sip. The red LEDs on the Arduino show how many sips you've had, and the buzzer beeps if you haven't had any for a while. The app later uses sips × ml-per-sip as an **estimate** of how much you drank. It's not a precise measurement, so the app always labels it as an estimate.

## ✅ What to do next

You've got the Arduino software installed and the board connected, so **Step 1 is done**. From here:

- [ ] **Step 2: Wire it up** (15–20 min, USB unplugged)
- [ ] **Step 3: Upload `bottle_test.ino`** and check you get a beep, four corner LEDs, `Accelerometer: …` and `tilt` going from 0 to about 90 when you tip it (15 min)
- [ ] **Step 4: Tape the sensor to the bottle** (10 min)
- [ ] **Step 5: Upload `water_bottle.ino`** and see the sip count go up when you drink (15–20 min)
- [ ] **Step 6: Calibrate** ml per sip (15 min)
- [ ] Optional: **Step 8: Go wireless** with a power bank (10 min)
- [ ] Later: **Step 7: Send sips to the app** (once we push the app side)

**Time left: about 1½ hours**, including a buffer for things going wrong.

---

## What you need

| Part | Used for |
| --- | --- |
| Arduino UNO R4 WiFi (blue board with the red LED grid) | The brain, the LED display, and Wi-Fi later |
| USB-C cable | Power and uploading code from a laptop |
| Grove 3-axis accelerometer | Senses when the bottle tips |
| Grove buzzer | Reminder beeps |
| 2 Grove jumper cables (Grove plug on one end, 4 loose pins on the other) | Connect the Grove boards to the Arduino |
| Breadboard + 2 male-to-male wires | Lets both Grove boards share the Arduino's single 5V pin |
| Water bottle, tape (electrical or duct), a small zip bag, a rubber band | Mounting |
| USB power bank (optional) | Runs it without a laptop (Step 8) |

You **don't** need the temperature/barometer sensor or the DC motor.

---

## Step 1: Install the Arduino software ✅ done

You've already done this. It's kept here in case you set up another laptop.

1. On a laptop, go to **arduino.cc/en/software** and download **Arduino IDE 2** for your computer. Install it and open it.
2. Plug the Arduino into the laptop with the USB-C cable. A few red LEDs may light up. That's normal.
3. In the IDE, click **Tools > Board > Boards Manager…** (or the second icon on the left sidebar).
4. In the search box type **UNO R4**. Find **Arduino UNO R4 Boards** and click **Install**. Wait for it to finish (a few minutes; it's a big download).
5. Click **Tools > Board > Arduino UNO R4 Boards > Arduino UNO R4 WiFi**.
6. Click **Tools > Port** and pick the one that mentions **UNO R4 WiFi** (on a Mac it looks like `/dev/cu.usbmodem…`, on Windows `COM3` or similar).
   - No port listed? Try a different USB-C cable. Some cables only charge and can't carry data.

**Check it works:** click **File > Examples > 01.Basics > Blink**, then the **Upload** button (the right-pointing arrow at the top left). After "Done uploading", a small orange LED on the board blinks once a second. 🎉

No extra libraries are needed. The sketches talk to the accelerometer directly.

---

## Step 2: Wire it up (15–20 min)

**Unplug the USB cable while you wire.**

Every Grove cable has four colours. On both of your Grove boards they mean:

| Grove wire | Accelerometer | Buzzer |
| --- | --- | --- |
| **Black** | GND | GND |
| **Red** | 5V power | 5V power |
| **White** | SDA (data) | not used |
| **Yellow** | SCL (clock) | SIG (on/off signal) |

The Arduino has only one **5V** pin, so the two Grove boards share it through the breadboard.

### 2a. Make a 5V row and a GND row on the breadboard

The long strips along the edges of the breadboard (marked **+** red and **−** blue) are connected all the way along.

1. Male-to-male wire from the Arduino's **5V** pin (on the "POWER" header, bottom edge) to the breadboard's **red + strip**.
2. Male-to-male wire from any Arduino **GND** pin (there are two next to 5V) to the breadboard's **blue − strip**.

### 2b. Accelerometer

Plug a Grove cable into the accelerometer's Grove socket. Then the loose pins:

- **Black** → blue − strip
- **Red** → red + strip
- **White** → the Arduino pin labelled **SDA** (top header, the left end past pin 13 and AREF). It's the same pin as A4.
- **Yellow** → the Arduino pin labelled **SCL** (right next to SDA, the very last pin at that end). It's the same pin as A5.

Use the SDA/SCL pins on the **header**, not the small white Qwiic plug on the board. The Qwiic plug is a separate 3.3V connection and the sketches don't use it.

### 2c. Buzzer

Plug a Grove cable into the buzzer. Then:

- **Black** → blue − strip
- **Red** → red + strip
- **Yellow** → Arduino pin **6** (top header, labelled `~6`)
- **White** → leave it unplugged

```
 Arduino UNO R4 WiFi                     Breadboard
 ┌───────────────────┐
 │ 5V  ──────────────┼──────────────── + strip ── red of accelerometer, red of buzzer
 │ GND ──────────────┼──────────────── − strip ── black of accelerometer, black of buzzer
 │ SDA (A4) ─────────┼──────────────────────────── white of accelerometer
 │ SCL (A5) ─────────┼──────────────────────────── yellow of accelerometer
 │ D6  ──────────────┼──────────────────────────── yellow of buzzer
 └───────────────────┘
```

**Double-check before plugging in:** red never touches black or blue. Swapped power wires are the one mistake that can damage a part.

---

## Step 3: First test (about 15 min)

1. Plug the USB cable back in.
2. In the IDE: **File > Open…** and open `bottle_test/bottle_test.ino`. (The `.ino` must be inside a folder with the same name. If the IDE offers to make that folder, click OK.)
3. Click **Upload**.
4. Click **Tools > Serial Monitor**. In its bottom-right corner set the speed to **115200 baud**.
5. Press the small **RESET** button on the Arduino (next to the USB plug) so you see the start messages.

You should get:

- **One short beep.** That means the buzzer works.
- **The four corner LEDs light up.** That means the LED grid works.
- A line like `found 0x19` and `Accelerometer: LIS3DHTR` (or ADXL345 / MMA7660, depending on which Grove model you have; all three work).
- Then lines like `x:0.01 y:-0.02 z:1.00 tilt:2`. Tip the accelerometer slowly: **tilt** should climb from about 0 to about 90 when it's on its side.

If any of that doesn't happen, see **Troubleshooting** at the bottom before moving on.

---

## Step 4: Mount it on the bottle (about 10 min)

1. Put the accelerometer board in the small zip bag with the cable coming out of the zip, so splashes can't reach it. Close the zip around the cable.
2. Tape it flat against the **side of the bottle**, near the top, with the cable running down the bottle. A rubber band over the tape helps it stay put.
3. Tape the cable down the bottle so it doesn't tug on the sensor.
4. Put the Arduino and breadboard on the table next to the bottle. The Grove cable is short (about 20 cm), so the bottle needs to stay close. That's fine for a demo. Keep the Arduino plugged into the laptop for power.

**Which way round doesn't matter.** When the sketch starts it learns what "upright" looks like, so just stand the bottle upright and keep it still for 2 seconds after each reset.

---

## Step 5: Upload the full sketch (15–20 min)

1. **File > Open…** and open `water_bottle/water_bottle.ino`.
2. Leave `SEND_TO_APP` at `0` for now. Everything works without Wi-Fi.
3. **For a demo**, change the reminder line to one minute so judges hear it:
   ```
   #define REMIND_MS     (60UL * 1000UL)
   ```
4. Click **Upload**, open the Serial Monitor, and press **RESET** with the bottle standing upright and still.
5. You'll see a water-drop on the LEDs, then `Ready. Drink away!` and a `0`.
6. Pick up the bottle, tip it like you're drinking (about a second or more), and put it back down upright. You should get:
   - a tiny beep,
   - the LED number goes up by 1,
   - `Sip #1 … Estimated total: 30 ml` in the Serial Monitor.
7. Leave it alone for the reminder time. It beeps three times and shows the drop.

---

## Step 6: Calibrate how much a sip is (about 15 min)

The default guess is 30 ml per sip. To make yours more accurate:

1. Fill the bottle and measure how much is in it (or fill it to a mark).
2. Press RESET, then take **10 normal sips**.
3. Measure how much water is gone, for example 280 ml.
4. Divide by 10 (here 28) and set `#define ML_PER_SIP 28`. Upload again.

You can also tune what counts as a sip:

| If… | Change |
| --- | --- |
| Small sips aren't counted | Lower `TILT_SIP` (e.g. 40) or `MIN_SIP_MS` (e.g. 400) |
| Moving or carrying the bottle counts as a sip | Raise `TILT_SIP` (e.g. 60) or `MIN_SIP_MS` (e.g. 900) |
| Laying the bottle down counts | Lower `MAX_SIP_MS` (e.g. 8000) |

---

## Step 7 (later): Send sips to the app (20–30 min)

Do this once the app side is ready (it's built but not published yet; we'll tell you when).

1. In the app, sign in and go to **More > Water bottle > Pair a bottle**. Copy the four lines it shows.
2. In `water_bottle.ino`, set `#define SEND_TO_APP 1`, then paste the four lines over the matching ones and fill in `WIFI_SSID` and `WIFI_PASS`. The UNO R4 only joins **2.4 GHz** Wi-Fi. A phone hotspot works well (on iPhone, turn on "Maximise Compatibility").
3. Upload. Each sip now appears in the app within a few seconds.

**Don't commit the sketch after filling in Wi-Fi and the pairing code.** They're secrets.

---

## Step 8 (optional): Go wireless with a power bank (about 10 min)

The UNO R4 WiFi doesn't need a laptop once the sketch is uploaded. The sketch stays on the board, and it runs as soon as it gets power.

1. **Power:** plug the Arduino's USB-C into a **USB power bank** instead of the laptop. Any phone power bank works. (Some power banks switch off when very little power is drawn. If the LEDs go dark after a minute, press the power bank's button, or try a different one.)
2. **Mount everything on the bottle:** put the Arduino and the breadboard in a zip bag (keep it away from water), then strap it to the side of the bottle with rubber bands and tape. The accelerometer stays taped to the bottle as in Step 4. The power bank can go in the same bag or in your pocket with a longer cable.
3. **Start it upright:** after plugging in the power bank, stand the bottle upright and still for 2 seconds while it calibrates (you'll see the water drop, then `0`).
4. **Wi-Fi (only for sending to the app, Step 7):** the board joins Wi-Fi on its own. At a hackathon the venue Wi-Fi often blocks devices or needs a login page, which the Arduino can't do. Use a **phone hotspot** instead: 2.4 GHz, and on iPhone turn on **Maximise Compatibility**. Put that hotspot's name and password in `WIFI_SSID` / `WIFI_PASS`.

Without Wi-Fi it still counts sips, shows the count and beeps reminders. It just doesn't send them anywhere.

---

## Troubleshooting

| What you see | Try |
| --- | --- |
| Boards Manager fails with `dial tcp: lookup downloads.arduino.cc: no such host` | Your laptop can't reach Arduino's download server, usually because of the network (venue Wi-Fi often blocks it). Switch the laptop to a **phone hotspot** and click Install again. Still failing? Restart the Arduino IDE, or set your laptop's DNS to `8.8.8.8` (Google) and retry. It's a big download (a few hundred MB), so keep the laptop awake until it finishes. |
| No port in Tools > Port | Different USB-C cable (data, not charge-only), or another USB port |
| Upload fails | Check Tools > Board says UNO R4 WiFi and the right port is picked. Press RESET twice quickly, then upload again. |
| Serial Monitor shows gibberish | Set the speed to 115200 baud |
| `Accelerometer: NOT FOUND`, and the I2C scan shows nothing | White and yellow are probably swapped or loose. White → SDA, yellow → SCL. Check red/black reach the + and − strips. |
| The scan finds something, but it says NOT FOUND | You may have a different accelerometer model. Send us the address the scan printed. |
| No beep | Buzzer yellow must be on pin 6. Check its red/black. |
| Sips count when I just pick the bottle up | Raise `TILT_SIP` or `MIN_SIP_MS` (Step 6) |
| Count is wrong after moving the bottle around | Stand it upright and press RESET to recalibrate |
| Wi-Fi fails (Step 7) | 2.4 GHz only. Check the name and password; try a phone hotspot. |
| On a power bank the LEDs turn off after a while | The power bank went to sleep because the board uses so little power. Try another power bank, or one with an "always on" or low-current mode. |
| "Couldn't reach the app" | The free server sleeps. Open the site in a browser to wake it, wait a minute, then sip again. |

---

## Time summary

| Step | Time |
| --- | --- |
| 1. Install Arduino software and test Blink | ✅ done |
| 2. Wiring | 15–20 min |
| 3. First test sketch | 15 min |
| 4. Mount on the bottle | 10 min |
| 5. Full sketch | 15–20 min |
| 6. Calibrate | 15 min |
| Buffer for problems | 30 min |
| **Left to do** | **about 1½ hours** |
| 8. Go wireless (optional) | 10 min |
| 7. Connect to the app (later) | 20–30 min |

Sources checked for the wiring: [Seeed Grove 3-axis accelerometer (LIS3DHTR) wiki](https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-LIS3DHTR) (I2C address 0x19, 3–5V), [Seeed Grove buzzer wiki](https://wiki.seeedstudio.com/Grove-Buzzer/) (sounds when SIG is HIGH, D6 example, 3.3–5V), [UNO R4 WiFi pinout](https://lastminuteengineers.com/arduino-uno-r4-wifi-pinout-reference/) (SDA/SCL = A4/A5 on the 5V header; the Qwiic plug is a separate 3.3V bus).
