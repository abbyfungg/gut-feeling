#!/usr/bin/env node
// Pretends to be the squeeze ball: sends readings to /api/device/ingest the same way the Arduino does.
// Usage: node scripts/fake-ball.mjs <app-url> <pairing-code> [seconds]
// For testing pairing and the live screen only: these readings count as device data.

const [base, token, secondsArg] = process.argv.slice(2);
if (!base || !token) {
  console.error("Usage: node scripts/fake-ball.mjs <app-url> <pairing-code> [seconds]");
  process.exit(1);
}
const seconds = Number(secondsArg ?? 8);
const session = `fake${Date.now().toString(36)}`;
let squeezes = 0;
let wasSqueezing = false;

async function send(readings, done) {
  const res = await fetch(new URL("/api/device/ingest", base), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session, readings, squeezes, done }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(res.status, JSON.stringify(body));
  if (!res.ok) process.exit(1);
}

for (let s = 0; s < seconds; s++) {
  const readings = [];
  for (let i = 0; i < 5; i++) {
    const t = s + i / 5;
    const squeezing = t % 3 < 1.6; // squeeze for 1.6 s, rest for 1.4 s
    if (squeezing && !wasSqueezing) squeezes++;
    wasSqueezing = squeezing;
    readings.push(squeezing ? Math.round(55 + 25 * Math.sin((t % 3) * 2)) : 0);
  }
  await send(readings, false);
  await new Promise((r) => setTimeout(r, 1000));
}
await send([], true);
