# Gut Feeling water bottle: beginner build guide

You'll tape a small motion sensor (the accelerometer) to a water bottle. Each time the bottle tips up for a drink and comes back down, the Arduino counts a sip. The red LEDs on the Arduino show how many sips you've had, and a water drop flashes on them if you haven't had any for a while. The app later uses sips × ml-per-sip as an **estimate** of how much you drank. It's not a precise measurement, so the app always labels it as an estimate.

## ✅ What to do next

The bottle is built and counting sips. 🎉

**Can't see the red LED grid because a Grove shield is stacked on top?** Either take the shield off and wire the accelerometer straight to the Arduino (recommended, see Step 2), or keep it and use the Serial Monitor and the app as your display. See **"Using a Grove shield instead"** in Step 2.

- [x] **Step 1: Install the Arduino software**
- [x] **Step 2: Wire it up**
- [x] **Step 3: Upload `bottle_test.ino`**
- [x] **Step 4: Tape the sensor to the bottle**
- [x] **Step 5: Upload `water_bottle.ino`**
- [ ] Next: **Step 6: Send sips to the app** over USB with `usb-bridge.mjs` (about 5 min, no Wi-Fi)
- [ ] Optional: **Step 7: Go wireless** with a power bank (10 min)

No calibration needed: every sip counts as a fixed **30 ml**, and the app labels the total as an estimate.

---

## What you need

| Part | Used for |
| --- | --- |
| Arduino UNO R4 WiFi (blue board with the red LED grid) | The brain, the LED display, and Wi-Fi later |
| USB-C cable | Power and uploading code from a laptop |
| Grove 3-axis accelerometer | Senses when the bottle tips |
| 1 Grove jumper cable (Grove plug on one end, 4 loose pins on the other) | Connects the accelerometer to the Arduino |
| Water bottle, tape (electrical or duct), a small zip bag, a rubber band | Mounting |
| USB power bank (optional) | Runs it without a laptop (Step 7) |

You **don't** need the buzzer, the breadboard, the temperature/barometer sensor or the DC motor.

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

## Step 2: Wire it up (5–10 min)

**Unplug the USB cable while you wire.**

Plug the Grove cable into the accelerometer's Grove socket. The other end has four loose pins, one per colour. Push each straight into the Arduino's header:

| Grove wire | Goes to Arduino pin | What it is |
| --- | --- | --- |
| **Black** | **GND** (bottom "POWER" header, next to 5V) | Ground |
| **Red** | **5V** (bottom "POWER" header) | Power |
| **White** | **SDA** (top header, the left end past pin 13 and AREF; same pin as A4) | Data |
| **Yellow** | **SCL** (right next to SDA, the very last pin at that end; same pin as A5) | Clock |

Use the SDA/SCL pins on the **header**, not the small white Qwiic plug on the board. The Qwiic plug is a separate 3.3V connection and the sketches don't use it.

```
 Arduino UNO R4 WiFi              Grove accelerometer
 ┌───────────────────┐
 │ GND ──────────────┼──────────── black
 │ 5V  ──────────────┼──────────── red
 │ SDA (A4) ─────────┼──────────── white
 │ SCL (A5) ─────────┼──────────── yellow
 └───────────────────┘
```

**Double-check before plugging in:** red is on 5V and black is on GND, never swapped. Swapped power wires are the one mistake that can damage a part.

### Using a Grove shield instead

If a Grove Base Shield (the board with lots of white Grove sockets) is stacked on the Arduino, it covers the red LED grid. You have two options:

1. **Recommended: take the shield off.** Unplug USB, pull the shield straight up off the Arduino's headers, and wire the accelerometer's four loose pins straight in as in the table above. Now you can see the LED grid.
2. **Keep the shield.** Plug the accelerometer's Grove cable into any of the 4 sockets labelled **I2C** (below the digital ports D2–D8). Set the shield's power switch to **5V**. Those I2C sockets connect to the Arduino's SDA/SCL (A4/A5), so the sketches work unchanged. You won't see the LED grid, so watch the **Serial Monitor** (and later the app's Water screen) instead. The small **L** LED on the Arduino also blinks once per sip, if you can see it past the shield.

Don't use the A0–A3 or D2–D8 sockets for the accelerometer: they aren't I2C.

---

## Step 3: First test (about 15 min)

1. Plug the USB cable back in.
2. In the IDE: **File > Open…** and open `bottle_test/bottle_test.ino`. (The `.ino` must be inside a folder with the same name. If the IDE offers to make that folder, click OK.)
3. Click **Upload**.
4. Click **Tools > Serial Monitor**. In its bottom-right corner set the speed to **115200 baud**.
5. Press the small **RESET** button on the Arduino (next to the USB plug) so you see the start messages.

You should get:

- **The four corner LEDs light up** and the small **L** LED blinks 3 times. (Covered by a shield? Skip this one; the lines below are the real test.)
- A line like `found 0x19` and `Accelerometer: LIS3DHTR` (or ADXL345 / MMA7660, depending on which Grove model you have; all three work).
- Then lines like `x:0.01 y:-0.02 z:1.00 tilt:2`. Tip the accelerometer slowly: **tilt** should climb from about 0 to about 90 when it's on its side.

If any of that doesn't happen, see **Troubleshooting** at the bottom before moving on.

---

## Step 4: Mount it on the bottle (about 10 min)

1. Put the accelerometer board in the small zip bag with the cable coming out of the zip, so splashes can't reach it. Close the zip around the cable.
2. Tape it flat against the **side of the bottle**, near the top, with the cable running down the bottle. A rubber band over the tape helps it stay put.
3. Tape the cable down the bottle so it doesn't tug on the sensor.
4. Put the Arduino on the table next to the bottle. The Grove cable is short (about 20 cm), so the bottle needs to stay close. That's fine for a demo. Keep the Arduino plugged into the laptop for power.

**Which way round doesn't matter.** When the sketch starts it learns what "upright" looks like, so just stand the bottle upright and keep it still for 2 seconds after each reset.

---

## Step 5: Upload the full sketch (15–20 min)

1. **File > Open…** and open `water_bottle/water_bottle.ino`.
2. Leave `SEND_TO_APP` at `0` for now. Everything works without Wi-Fi.
3. **For a demo**, change the reminder line to one minute so judges see it:
   ```
   #define REMIND_MS     (60UL * 1000UL)
   ```
4. Click **Upload**, open the Serial Monitor, and press **RESET** with the bottle standing upright and still.
5. You'll see `Ready. Drink away!` in the Serial Monitor, a water drop then a `0` on the LED grid, and the **L** LED blinks twice.
6. Pick up the bottle, tip it like you're drinking (about a second or more), and put it back down upright. You should get:
   - the LED grid number goes up by 1 and the **L** LED blinks once,
   - `Sip #1 … Estimated total: 30 ml` in the Serial Monitor.
7. Leave it alone for the reminder time. The Serial Monitor prints `Reminder: time for a sip of water.`, the **L** LED blinks 3 times, and the water drop flashes on the grid.

---

## Step 6 (wired, recommended): Send sips to the app over USB (about 5 min)

No Wi-Fi needed. The bottle stays plugged into your Mac, and a small script on the Mac sends each sip to the app.

1. Upload `water_bottle.ino` as usual (leave `SEND_TO_APP` at `0`). **Close the Serial Monitor** afterwards, because only one program can use the USB port.
2. In the app: **More > Water bottle > Pair a bottle**. Keep the screen open; you need the `DEVICE_TOKEN` (starts with `gfd_`) and the `SERVER_HOST` it shows.
3. Open **Terminal** (Cmd+Space, type Terminal, Enter) and go to this folder, for example:
   ```
   cd ~/Downloads/gut-feeling/hardware/water-bottle
   ```
   (Or type `cd `, drag the `water-bottle` folder into the Terminal window, press Enter.)
4. Check Node is installed: `node -v` should print v18 or higher. If not, install the LTS from nodejs.org.
5. Run it, pasting your own values:
   ```
   GF_SERVER=https://SERVER_HOST_FROM_THE_APP GF_TOKEN=gfd_YOUR_CODE node usb-bridge.mjs
   ```
   It finds the Arduino by itself. If it says "No Arduino found", run `ls /dev/cu.usbmodem*` and add `GF_PORT=/dev/cu.usbmodemXXXX` at the front.
6. You should see `Listening to /dev/cu.usbmodem…`, then `Sent: total 0 sips` (the app now says **Online**). Take a sip: `Sent: total 1 sips … +1 new (30 ml)`, and it appears in the app within a few seconds.

Stop it with **Ctrl+C**. Restarting the script restarts the board, which is fine: nothing is double counted. Don't paste the code in chat or save it in a file you commit.

## Step 6 (Wi-Fi, optional): Send sips to the app (20–30 min)

The app side is live on main. After a redeploy, pair again (a redeploy wipes pairings).

1. In the app, sign in and go to **More > Water bottle > Pair a bottle**. Copy the four lines it shows.
2. In `water_bottle.ino`, set `#define SEND_TO_APP 1`. Paste the four lines over **only** the 4 matching lines (`SERVER_HOST`, `SERVER_PORT`, `USE_TLS`, `DEVICE_TOKEN`). Keep the `WIFI_SSID` and `WIFI_PASS` lines and fill them in with your hotspot's name and password. The UNO R4 only joins **2.4 GHz** Wi-Fi. A phone hotspot works well (on iPhone, turn on "Maximise Compatibility").
3. Upload. Each sip now appears in the app within a few seconds.

**Don't commit the sketch after filling in Wi-Fi and the pairing code.** They're secrets.

---

## Step 7 (optional): Go wireless with a power bank (about 10 min)

The UNO R4 WiFi doesn't need a laptop once the sketch is uploaded. The sketch stays on the board, and it runs as soon as it gets power.

1. **Power:** plug the Arduino's USB-C into a **USB power bank** instead of the laptop. Any phone power bank works. (Some power banks switch off when very little power is drawn. If the LEDs go dark after a minute, press the power bank's button, or try a different one.)
2. **Mount everything on the bottle:** put the Arduino in a zip bag (keep it away from water), then strap it to the side of the bottle with rubber bands and tape. The accelerometer stays taped to the bottle as in Step 4. The power bank can go in the same bag or in your pocket with a longer cable.
3. **Start it upright:** after plugging in the power bank, stand the bottle upright and still for 2 seconds while it gets ready (you'll see the water drop, then `0`).
4. **Wi-Fi (only for sending to the app, Step 6):** the board joins Wi-Fi on its own. At a hackathon the venue Wi-Fi often blocks devices or needs a login page, which the Arduino can't do. Use a **phone hotspot** instead: 2.4 GHz, and on iPhone turn on **Maximise Compatibility**. Put that hotspot's name and password in `WIFI_SSID` / `WIFI_PASS`.

Without Wi-Fi it still counts sips, shows the count and flashes reminders. It just doesn't send them anywhere.

---

## Wi-Fi keeps failing

With `SEND_TO_APP 1`, the Serial Monitor (115200 baud) now explains each try. Press RESET and read it:

| It says | What it means and what to do |
| --- | --- |
| `can't see that network name` | The board can't find your hotspot. Check the list under **Networks the board can see**. If your hotspot isn't there: on iPhone turn on **Maximise Compatibility** (Settings > Personal Hotspot) and keep that screen open; on Android set the hotspot band to **2.4 GHz**. Move the phone next to the board. |
| Your hotspot is in the list but it still fails | `WIFI_SSID` must match the name in the list exactly, including capitals, spaces and apostrophes. Easiest: rename the hotspot to something plain like `gutbottle` (on iPhone, rename the phone in Settings > General > About > Name). |
| `the network refused it` | Wrong `WIFI_PASS`. Retype it; use a simple password with no special characters. |
| `the Wi-Fi chip isn't answering` | Unplug USB, plug it back in. If it keeps happening, update the firmware (next row). |
| `Update it: … Firmware Updater` | The Wi-Fi chip's firmware is older than the library expects. Use Arduino IDE 2.2.1 or newer: close the Serial Monitor, then **Tools > Firmware Updater**, pick **UNO R4 WiFi**, click **Check Updates**, choose the newest version, click **Install**, wait for "Firmware successfully installed", then unplug and replug the board and upload `water_bottle.ino` again (installing the firmware wipes the sketch). |

At power-on it tries for about 40 seconds. After that it keeps counting sips and retries every 30 seconds, so sips made while Wi-Fi is down are sent once it connects, and never counted twice.

---

## Troubleshooting

| What you see | Try |
| --- | --- |
| Boards Manager fails with `dial tcp: lookup downloads.arduino.cc: no such host` | Your laptop can't reach Arduino's download server, usually because of the network (venue Wi-Fi often blocks it). Switch the laptop to a **phone hotspot** and click Install again. Still failing? Restart the Arduino IDE, or set your laptop's DNS to `8.8.8.8` (Google) and retry. It's a big download (a few hundred MB), so keep the laptop awake until it finishes. |
| No port in Tools > Port | Different USB-C cable (data, not charge-only), or another USB port |
| Upload fails | Check Tools > Board says UNO R4 WiFi and the right port is picked. Press RESET twice quickly, then upload again. |
| Serial Monitor shows gibberish | Set the speed to 115200 baud |
| `Accelerometer: NOT FOUND` (or a big X on the LEDs), and the I2C scan shows nothing | White and yellow are probably swapped or loose. White → SDA, yellow → SCL. Check red is on 5V and black on GND. |
| The scan finds something, but it says NOT FOUND | You may have a different accelerometer model. Send us the address the scan printed. |
| Corner LEDs don't light up | A Grove shield on top hides them (see Step 2, "Using a Grove shield instead"). Otherwise check Tools > Board says UNO R4 WiFi and upload again. |
| On a shield, `Accelerometer: NOT FOUND` | Use a socket labelled **I2C**, not A0–A3 or D2–D8, and set the shield's switch to **5V**. |
| Small sips aren't counted | Lower `TILT_SIP` (e.g. 40) or `MIN_SIP_MS` (e.g. 400) in `water_bottle.ino` |
| Sips count when I just pick the bottle up | Raise `TILT_SIP` (e.g. 60) or `MIN_SIP_MS` (e.g. 900) |
| Laying the bottle down counts as a sip | Lower `MAX_SIP_MS` (e.g. 8000) |
| Count is wrong after moving the bottle around | Stand it upright and press RESET so it re-learns which way is up |
| `'WIFI_SSID' was not declared in this scope` | The Wi-Fi lines got deleted when pasting the pairing code. Add `#define WIFI_SSID "your-hotspot-name"` and `#define WIFI_PASS "your-hotspot-password"` back under `#define SEND_TO_APP 1`. |
| Wi-Fi fails (Step 6) | See **Wi-Fi keeps failing** above. |
| On a power bank the LEDs turn off after a while | The power bank went to sleep because the board uses so little power. Try another power bank, or one with an "always on" or low-current mode. |
| "Couldn't reach the app" | The free server sleeps. Open the site in a browser to wake it, wait a minute, then sip again. |

---

## Time summary

| Step | Time |
| --- | --- |
| 1–5. Build the bottle | ✅ done |
| 6. Connect to the app | 20–30 min |
| 7. Go wireless (optional) | 10 min |

Sources checked for the wiring: [Seeed Grove 3-axis accelerometer (LIS3DHTR) wiki](https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-LIS3DHTR) (I2C address 0x19, 3–5V), [Seeed Grove Base Shield V2 wiki](https://wiki.seeedstudio.com/Base_Shield_V2/) (4 I2C ports; set the switch to 5V with an UNO), [Cirkit Designer Base Shield V2 reference](https://docs.cirkitdesigner.com/component/970281f8-3f5b-4db5-bd0c-88e0889d3bf4/grove-base-shield-v2) (I2C ports use A4 SDA / A5 SCL), [Arduino: update the UNO R4 WiFi connectivity firmware](https://support.arduino.cc/hc/en-us/articles/9670986058780-Update-the-connectivity-module-firmware-on-UNO-R4-WiFi), [UNO R4 WiFi pinout](https://lastminuteengineers.com/arduino-uno-r4-wifi-pinout-reference/) (SDA/SCL = A4/A5 on the 5V header; the Qwiic plug is a separate 3.3V bus).
