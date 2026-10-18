#!/usr/bin/env node
// Gut Feeling water bottle: reads sips from the Arduino over USB and sends them to the app.
// No extra packages. Needs Node 18+ on a Mac or Linux. Close the Arduino Serial Monitor first.
//
//   GF_SERVER=your-app.onrender.com GF_TOKEN=gfd_... node usb-bridge.mjs
//   (optional) GF_PORT=/dev/cu.usbmodemXXXX if more than one board is plugged in
//
// The board prints lines like "GF boot=1a2b3c4d total=3 ml=90". The bridge sends the running total,
// so a resend never double counts. It prints every line it reads and every reply from the app.
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const LINE = /^GF boot=([A-Za-z0-9]{1,16}) total=(\d+) ml=(\d+)$/;

function exit(msg) {
  console.error("\n" + msg + "\n");
  process.exit(1);
}

function findPorts() {
  try {
    return readdirSync("/dev")
      .filter((f) => /^(cu\.usbmodem|cu\.usbserial|ttyACM|ttyUSB)/.test(f))
      .map((f) => "/dev/" + f);
  } catch {
    return [];
  }
}

let server = (process.env.GF_SERVER || "").trim().replace(/\/+$/, "");
if (server && !/^https?:\/\//.test(server)) server = (/^(localhost|127\.|192\.168\.|10\.)/.test(server) ? "http://" : "https://") + server;
const token = (process.env.GF_TOKEN || "").trim();
if (!server) exit("Set GF_SERVER to the app's address, e.g. GF_SERVER=gut-feeling.onrender.com");
if (!/^gfd_[A-Za-z0-9_-]{20,60}$/.test(token)) exit("Set GF_TOKEN to the pairing code from the app (Water > Pair a bottle). It starts with gfd_.");

function pickPort() {
  if (process.env.GF_PORT) return process.env.GF_PORT;
  const ports = findPorts();
  if (ports.length > 1) console.log(`Found several boards: ${ports.join(", ")}. Using ${ports[0]}. Set GF_PORT to choose another.`);
  return ports[0] || "";
}

// ---------------- Sending to the app ----------------
let last = null; // latest { boot, total, ml } from the board
let sending = false;
let again = false;
let retryTimer = null;
let failures = 0;

async function send() {
  if (!last) return;
  if (sending) return void (again = true);
  sending = true;
  clearTimeout(retryTimer);
  const body = { boot: last.boot, total: last.total, totalMl: last.ml };
  let retry = false;
  try {
    const res = await fetch(server + "/api/device/ingest", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000), // the free server can take ~50 s to wake up
    });
    const text = await res.text();
    let r = {};
    try {
      r = JSON.parse(text);
    } catch {}
    if (res.ok) {
      failures = 0;
      const added = r.recorded?.sips ? `+${r.recorded.sips} new sip${r.recorded.sips === 1 ? "" : "s"} (${r.recorded.ml} ml) saved` : "nothing new, app is up to date";
      console.log(`  app: ${res.status} OK, ${added}. Total since power-on: ${body.total} sip${body.total === 1 ? "" : "s"}, ${body.totalMl} ml.`);
    } else if (res.status === 401) {
      console.log(`  app: 401, the app doesn't know this pairing code. Make a new one in the app (the server resets on every deploy) and restart with the new GF_TOKEN.`);
    } else {
      console.log(`  app: ${res.status} ${(r.error || text).toString().slice(0, 200)}`);
      retry = res.status >= 500 || res.status === 429;
    }
  } catch (e) {
    console.log(`  app: couldn't reach ${server} (${e.cause?.code || e.name || e.message}). Is the laptop online? The free server may be waking up.`);
    retry = true;
  }
  sending = false;
  if (retry) {
    failures++;
    const wait = Math.min(60, 5 * 2 ** Math.min(failures - 1, 4));
    console.log(`  Trying again in ${wait} s.`);
    retryTimer = setTimeout(send, wait * 1000);
  }
  if (again) {
    again = false;
    send();
  }
}

// ---------------- Reading the board ----------------
// stty and cat share one open port, so the speed setting sticks (on a Mac it resets if they open it separately).
function listen() {
  const port = pickPort();
  if (!port || !existsSync(port)) {
    console.log(`No Arduino found${port ? ` at ${port}` : ""}. Plug it in with USB (a data cable, not charge-only). Checking again in 3 s...`);
    return setTimeout(listen, 3000);
  }
  console.log(`Listening to ${port} at 115200 baud, sending to ${server}. Press Ctrl+C to stop.`);
  const child = spawn("sh", ["-c", `(stty 115200 raw -echo || echo "couldn't set the speed" >&2; exec cat) < "$GF_PORT"`], {
    env: { ...process.env, GF_PORT: port },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let buf = "";
  let gotData = false;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    if (!gotData) {
      gotData = true;
      console.log("Connected. Reading from the board:");
    }
    buf += chunk.replace(/\r/g, "");
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      console.log("board: " + line);
      const m = line.match(LINE);
      if (m) {
        last = { boot: m[1], total: Number(m[2]), ml: Number(m[3]) };
        send();
      }
    }
  });
  let err = "";
  child.stderr.on("data", (d) => (err += d));
  child.on("exit", () => {
    const busy = /busy|denied|not permitted/i.test(err);
    console.log(
      busy
        ? `Couldn't open ${port}: it's in use. Close the Arduino IDE Serial Monitor (or the Arduino IDE) and it will connect.`
        : `Lost the USB connection to ${port}${err.trim() ? ` (${err.trim().split("\n").pop()})` : ""}.`,
    );
    console.log("Trying again in 3 s...");
    setTimeout(listen, 3000);
  });
  setTimeout(() => {
    if (!gotData && child.exitCode === null)
      console.log("No lines from the board yet. It prints one when it starts and then every minute, so wait up to a minute, or press the board's RESET button.");
  }, 8000);
}

console.log(`Gut Feeling USB bridge. App: ${server}`);
listen();
setInterval(send, 4 * 60_000); // check in so the app keeps showing "Online"
