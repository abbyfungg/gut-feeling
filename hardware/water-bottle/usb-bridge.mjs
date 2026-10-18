#!/usr/bin/env node
// Wired mode for the Gut Feeling water bottle: reads sips from the Arduino over USB and sends them to the app.
// No extra packages. Needs Node 18+ on a Mac (uses `stty`). Close the Arduino Serial Monitor first.
//
//   GF_PORT=/dev/cu.usbmodemXXXX GF_SERVER=https://your-app.onrender.com GF_TOKEN=gfd_... node usb-bridge.mjs
//
// The board prints lines like "GF boot=1a2b3c4d total=3 ml=90". The bridge sends the running total,
// so a resend never double counts. It also checks in every 4 minutes so the app shows "Online".
import { execFileSync } from "node:child_process";
import { createReadStream, readdirSync } from "node:fs";

const port = process.env.GF_PORT || (readdirSync("/dev").find((f) => f.startsWith("cu.usbmodem")) ? "/dev/" + readdirSync("/dev").find((f) => f.startsWith("cu.usbmodem")) : "");
const server = (process.env.GF_SERVER || "").replace(/\/+$/, "");
const token = process.env.GF_TOKEN || "";
if (!port) exit("No Arduino found. Plug it in, or set GF_PORT (run: ls /dev/cu.usbmodem*).");
if (!/^https?:\/\//.test(server)) exit("Set GF_SERVER to your app's address, e.g. https://your-app.onrender.com");
if (!/^gfd_[A-Za-z0-9_-]{20,60}$/.test(token)) exit("Set GF_TOKEN to the DEVICE_TOKEN from More > Water bottle > Pair a bottle (starts with gfd_).");

function exit(msg) {
  console.error(msg);
  process.exit(1);
}

let last = null; // { boot, total, ml }
let sending = false;
let queued = false;

async function send() {
  if (!last) return;
  if (sending) return void (queued = true);
  sending = true;
  const body = { boot: last.boot, total: last.total, totalMl: last.ml };
  try {
    const res = await fetch(server + "/api/device/ingest", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) console.log("The app doesn't know this pairing code. Make a new one in the app and restart with the new GF_TOKEN.");
    else if (!res.ok) console.log(`App replied ${res.status}. Will try again.`);
    else {
      const r = await res.json().catch(() => ({}));
      console.log(`Sent: total ${body.total} sips since power-on${r.recorded?.sips ? `, +${r.recorded.sips} new (${r.recorded.ml} ml)` : ""}`);
    }
  } catch {
    console.log("Couldn't reach the app (is the laptop online? the free server may be waking up). Will try again.");
    setTimeout(send, 10_000);
  }
  sending = false;
  if (queued) {
    queued = false;
    send();
  }
}

try {
  execFileSync("stty", ["-f", port, "115200", "raw", "-echo"], { stdio: "ignore" });
} catch {
  try {
    execFileSync("stty", ["-F", port, "115200", "raw", "-echo"], { stdio: "ignore" }); // Linux
  } catch {
    exit(`Couldn't open ${port}. Close the Arduino Serial Monitor, check the port name, and try again.`);
  }
}
console.log(`Listening to ${port}, sending to ${server}. Press Ctrl+C to stop.`);

let buf = "";
createReadStream(port, { encoding: "utf8" })
  .on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const m = line.match(/^GF boot=([A-Za-z0-9]{1,16}) total=(\d+) ml=(\d+)$/);
      if (m) {
        last = { boot: m[1], total: Number(m[2]), ml: Number(m[3]) };
        send();
      } else console.log("  board: " + line);
    }
  })
  .on("error", (e) => exit(`Lost the USB connection (${e.code ?? e.message}). Plug it back in and run this again.`));

setInterval(send, 4 * 60_000); // check in so the app shows "Online"
