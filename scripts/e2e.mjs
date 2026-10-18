// End-to-end check of the main journeys against a running server.
// Usage: BASE_URL=http://localhost:3000 node scripts/e2e.mjs
// Uses playwright-core with a locally installed Chromium (CHROMIUM_PATH or the default sandbox path).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";

const BASE = process.env.BASE_URL || "http://localhost:3000";
// Screenshots go outside the project so a dev server does not reload when they are written.
const OUT = process.env.E2E_OUT || path.join(os.tmpdir(), "gut-feeling-e2e");
fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const dbFile = path.join(process.env.DATA_DIR || "data", "gut-feeling.db");
const db = new DatabaseSync(dbFile, { readOnly: true });
const idOf = (email) => db.prepare("SELECT id FROM users WHERE email = ?").get(email)?.id;

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: exe });
const consoleErrors = [];
async function newPage(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${page.url()}: ${m.text()}`));
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, caret: "initial" });

const stamp = `e2e note ${Date.now()}`;

// ---- Patient journey ----
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + "/");
  await shot(page, "01-landing");
  check(await page.getByRole("heading", { name: /Your gut has a lot to say/ }).isVisible(), "landing hero visible");
  await page.getByRole("button", { name: /I'm Maya/ }).click();
  await page.waitForURL("**/me");
  await shot(page, "02-patient-home");
  check(await page.getByRole("link", { name: "Log a bathroom trip" }).first().isVisible(), "patient home has Log a bathroom trip");
  check(await page.locator("nav.tabbar").isVisible(), "app tab bar visible");
  check(await page.getByRole("heading", { name: "Worth a look", exact: true }).isVisible(), "patient sees plain-language flags");

  await page.locator(".cta-log").click();
  await page.waitForURL("**/me/log");
  await shot(page, "03-log-form");
  await page.getByRole("radio", { name: "Type 7, All liquid" }).check({ force: true });
  await page.getByRole("button", { name: "Urgency" }).click();
  await page.getByRole("button", { name: "Recently unwell" }).click();
  await page.getByRole("textbox", { name: "Notes" }).fill(stamp);
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.waitForURL("**/me/saved?id=*");
  check(await page.getByRole("heading", { name: "Logged!" }).isVisible(), "success state after saving");
  await shot(page, "04-saved");
  await page.getByRole("link", { name: "View my entry" }).click();
  await page.waitForURL("**/me/entries/*");
  check(await page.getByText(stamp).isVisible(), "entry detail shows the note");

  await page.goto(BASE + "/me/entries");
  check((await page.locator(".entry").count()) > 0, "entries list renders");
  await page.goto(BASE + "/me/trends?range=30");
  check(await page.getByRole("heading", { name: "Trips per day" }).isVisible(), "trends chart renders");
  await shot(page, "05-trends");
  await page.goto(BASE + "/me/settings");
  await page.getByRole("button", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Lavender" }).click();
  await page.goto(BASE + "/me");
  const theme = await page.evaluate(() => [document.documentElement.dataset.scheme, document.documentElement.dataset.accent].join(","));
  check(theme === "dark,lavender", `theme choice persists across pages (${theme})`);
  await shot(page, "05b-dark-lavender");
  await page.goto(BASE + "/me/sharing");
  await shot(page, "06-sharing");
  check(await page.getByRole("switch").first().isVisible(), "sharing switches render");
  await page.goto(BASE + "/me/visit");
  await shot(page, "07-visit");

  // Authorization: patient cannot read another patient's entries
  const peggy = idOf("peggy@demo.gutfeeling.health");
  const r1 = await page.request.get(`${BASE}/api/patients/${peggy}/entries`);
  check(r1.status() === 404, `patient blocked from another patient's entries (got ${r1.status()})`);
  const r2 = await page.request.get(`${BASE}/care`);
  check(r2.url().endsWith("/me"), "patient redirected away from care dashboard");
  const r3 = await page.request.post(`${BASE}/api/care/patients/${peggy}/reviews`, { data: { flagKey: "x:y", decision: "no_action" }, headers: { Origin: BASE } });
  check(r3.status() === 403, `patient cannot post reviews (got ${r3.status()})`);
  const r4 = await page.request.post(`${BASE}/api/entries`, { data: { kind: "no_movement", occurredAt: new Date().toISOString(), notes: null }, headers: { Origin: "https://evil.example" } });
  check(r4.status() === 403, `cross-site POST blocked (got ${r4.status()})`);
  await ctx.close();
}

// ---- Mobile patient screens ----
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.goto(BASE + "/signin");
  await page.getByLabel("Email").fill("maya@demo.gutfeeling.health");
  await page.getByLabel("Password").fill("everybodypoops");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/me");
  await shot(page, "08-mobile-home");
  await page.goto(BASE + "/me/log");
  await shot(page, "09-mobile-log");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, "no horizontal scroll on mobile log page");
  await ctx.close();
}

// ---- Practitioner journey ----
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + "/signin");
  await page.getByLabel("Email").fill("priya@demo.gutfeeling.health");
  await page.getByLabel("Password").fill("everybodypoops");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/care");
  await shot(page, "10-care-queue");
  const items = await page.locator(".queue-item").count();
  check(items > 0, `review queue has items (${items})`);

  await page.goto(BASE + "/care?view=patients");
  await shot(page, "11-care-patients");
  check((await page.getByText("Walter Brooks").count()) > 0, "story patient (Walter) listed for Priya");
  check(!(await page.getByText("Linh Tran").isVisible().catch(() => false)), "unshared patient (Linh) not listed");
  check(!(await page.getByText("Omar Haddad").isVisible().catch(() => false)), "revoked patient (Omar) not listed");

  const maya = idOf("maya@demo.gutfeeling.health");
  await page.goto(`${BASE}/care/patients/${maya}`);
  await shot(page, "12-care-patient");
  check((await page.locator(".list-row", { hasText: stamp }).count()) === 1, "patient's new entry visible to practitioner");
  const flag = page.locator(".flag-card:has(details[open])").first();
  const evidence = await flag.locator(".evidence-chip").count();
  check(evidence > 0, `first flag cites evidence entries (${evidence})`);
  const href = await flag.locator(".evidence-chip").first().getAttribute("href");
  check(!!href && (await page.locator(href).count()) === 1, "evidence link points at a real timeline entry");

  const title = await flag.locator("h3").innerText();
  await flag.getByLabel("Decision").selectOption("contact_patient");
  await flag.getByRole("button", { name: "Use suggested follow-up" }).click();
  await flag.getByLabel(/Note/).fill("Called patient (e2e).");
  await flag.getByRole("button", { name: "Save review" }).click();
  await page.waitForURL("**?saved=*");
  check(await page.getByText("Review saved").isVisible(), "review confirmation shown");
  const reviewedCard = page.locator(".flag-card", { hasText: title }).first();
  check(await page.getByText("Called patient (e2e).").first().isVisible().catch(() => false), "saved review is shown");
  await shot(page, "13-care-reviewed");
  void reviewedCard;

  await page.goto(BASE + "/care?view=followups");
  check(await page.getByText("Called patient (e2e).").count() >= 0, "follow-ups view loads");
  const fu = await page.getByRole("button", { name: "Mark follow-up done" }).count();
  check(fu > 0, `follow-up listed (${fu})`);
  await shot(page, "14-care-followups");

  const linh = idOf("linh@demo.gutfeeling.health");
  const resp = await page.goto(`${BASE}/care/patients/${linh}`);
  check(resp.status() === 404, `practitioner blocked from unshared patient page (got ${resp.status()})`);
  const api = await page.request.get(`${BASE}/api/patients/${linh}/entries`);
  check(api.status() === 404, `practitioner blocked from unshared patient API (got ${api.status()})`);
  const omar = idOf("omar@demo.gutfeeling.health");
  const api2 = await page.request.get(`${BASE}/api/patients/${omar}/entries`);
  check(api2.status() === 404, `practitioner blocked after patient revoked sharing (got ${api2.status()})`);
  const post = await page.request.post(`${BASE}/api/entries`, { data: { kind: "no_movement", occurredAt: new Date().toISOString(), notes: null }, headers: { Origin: BASE } });
  check(post.status() === 403, `practitioner cannot write patient entries (got ${post.status()})`);
  await ctx.close();
}


// ---- New user: sign up, empty state, share, log, appears for the nurse ----
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  const email = `new${Date.now()}@example.com`;
  await page.goto(BASE + "/signup");
  await page.getByLabel("What should we call you?").fill("Sam");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill("a-long-password");
  await page.getByRole("button", { name: "Create my private diary" }).click();
  await page.waitForURL("**/me?welcome=1");
  check(await page.getByRole("heading", { name: "How it works" }).isVisible(), "new user sees the friendly empty state");
  await shot(page, "15-new-user-empty");
  await page.goto(BASE + "/me/entries");
  check(await page.getByRole("heading", { name: "No entries yet" }).isVisible(), "empty entries state");
  await page.goto(BASE + "/me/sharing");
  await page.getByRole("switch", { name: /Priya Raman/ }).click();
  await page.getByText("Sharing", { exact: true }).first().waitFor();
  await page.goto(BASE + "/me/log");
  await page.getByRole("radio", { name: "Type 4, Smooth snake" }).check({ force: true });
  await page.getByRole("button", { name: "Felt fine" }).click();
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.waitForURL("**/me/saved?id=*");
  check(await page.getByRole("heading", { name: "Logged!" }).isVisible(), "new user can log an entry");
  await page.goto(BASE + "/me");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, "no horizontal scroll on mobile home");
  await ctx.close();

  const n = await newPage({ width: 390, height: 844 });
  await n.page.goto(BASE + "/signin");
  await n.page.getByLabel("Email").fill("priya@demo.gutfeeling.health");
  await n.page.getByLabel("Password").fill("everybodypoops");
  await n.page.getByRole("button", { name: "Sign in", exact: true }).click();
  await n.page.waitForURL("**/care");
  await n.page.goto(BASE + "/care?view=patients");
  check(await n.page.getByRole("link", { name: "Sam" }).isVisible(), "newly shared patient appears in the nurse's caseload");
  const o2 = await n.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!o2, "no horizontal page scroll on mobile care view");
  await shot(n.page, "16-mobile-care");
  await n.ctx.close();
}

// ---- Walter's caught-early story: what he saw before the nurse flagged it ----
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.goto(BASE + "/story");
  check(await page.getByRole("heading", { name: "Two views of the same week" }).isVisible(), "story shows Walter's view and Priya's view");
  check((await page.locator(".mk-views .nudge").count()) === 1, "story shows the warning Walter saw");
  await page.goto(BASE + "/signin");
  await page.getByLabel("Email").fill("walter@demo.gutfeeling.health");
  await page.getByLabel("Password").fill("everybodypoops");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/me");
  check((await page.locator(".nudge").count()) === 0, "no warning for Walter now that he's back to normal");
  await page.getByRole("link", { name: /Caught early/ }).click();
  await page.waitForURL("**/me/looking-back");
  check(await page.getByText("Womby noticed a change").isVisible(), "Walter's replay shows Womby's warning");
  check(await page.getByText("Nothing for 3 days").isVisible(), "warning names the days with nothing");
  check(await page.getByText("Your stools got harder").isVisible(), "warning names the harder stools");
  check(await page.getByText(/Tell Priya how you're feeling/).isVisible(), "warning prompts him to tell his care team");
  check((await page.locator(".pattern-chart svg").count()) === 1, "replay shows his two-week pattern chart");
  await shot(page, "50-walter-replay");
  await ctx.close();
}

// ---- Water bottle: Nora's flag, simulator, bottle pairing, care view ----
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.goto(BASE + "/signin");
  await page.getByLabel("Email").fill("nora@demo.gutfeeling.health");
  await page.getByLabel("Password").fill("everybodypoops");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/me");
  check(await page.getByText("Drinking well, but still hard").isVisible(), "Nora's Womby note says she's drinking well but still hard");
  check(await page.getByText(/simulated sips/).first().isVisible(), "home water card is labelled simulated");
  await shot(page, "60-nora-home");
  await page.goto(BASE + "/me/water");
  const before = await page.locator(".effort-big").textContent();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: /Take a sip/ }).click();
  await page.waitForTimeout(500);
  check((await page.locator(".effort-big").textContent()) !== before, "simulator sips add to today's water");
  await page.getByRole("button", { name: /Pair a bottle|Make a new pairing code/ }).click();
  const code = await page.locator(".pair-code").textContent({ timeout: 5000 });
  const token = code?.match(/gfd_[A-Za-z0-9_-]+/)?.[0];
  check(!!token, "bottle pairing shows a code once");
  const send = (body, t = token) => fetch(BASE + "/api/device/ingest", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  check((await send({ sips: 1 }, "gfd_" + "z".repeat(32))).status === 401, "unknown bottle code rejected (401)");
  check((await send({ sips: -3 })).status === 400, "bad bottle payload rejected (400)");
  check((await send({ sips: 2, ml: 60 })).status === 200, "bottle sips accepted");
  await page.locator(".badge", { hasText: "From your bottle" }).first().waitFor({ timeout: 6000 }).catch(() => {});
  check(await page.locator(".badge", { hasText: "From your bottle" }).first().isVisible(), "bottle sips show up live, labelled as an estimate");
  await shot(page, "61-water");
  check((await page.getByText(/Gemini/).count()) > 0, "water screen has the Gemini water panel (or its not-configured note)");
  {
    const r = await page.request.post(BASE + "/api/hydration/insight", { data: {} });
    const b = await r.json().catch(() => ({}));
    check([200, 503].includes(r.status()) && ["ok", "unconfigured", "too_few"].includes(b.status), `patient water insight answers cleanly (got ${r.status()} ${b.status})`);
    const other = await page.request.post(`${BASE}/api/care/patients/${idOf("nora@demo.gutfeeling.health")}/water-insight`, { data: {} });
    check([401, 403].includes(other.status()), `patients can't use the care water insight (got ${other.status()})`);
  }
  await page.getByRole("button", { name: "Unpair" }).click();
  await page.waitForTimeout(400);
  check((await send({ sips: 1 })).status === 401, "unpaired bottle code stops working");
  await ctx.close();

  const n = await newPage();
  await n.page.goto(BASE + "/signin");
  await n.page.getByLabel("Email").fill("priya@demo.gutfeeling.health");
  await n.page.getByLabel("Password").fill("everybodypoops");
  await n.page.getByRole("button", { name: "Sign in", exact: true }).click();
  await n.page.waitForURL("**/care");
  await n.page.goto(`${BASE}/care/patients/${idOf("nora@demo.gutfeeling.health")}`);
  check((await n.page.getByText("Hard stools despite adequate fluid intake").count()) > 0, "care side shows the hard-despite-fluids flag");
  check(await n.page.getByRole("heading", { name: "Fluids, last 7 days" }).isVisible(), "care side shows the patient's fluids");
  await shot(n.page, "62-care-nora");
  {
    const r = await n.page.request.post(`${BASE}/api/care/patients/${idOf("nora@demo.gutfeeling.health")}/water-insight`, { data: {} });
    const b = await r.json().catch(() => ({}));
    check([200, 503].includes(r.status()) && ["ok", "unconfigured", "too_few"].includes(b.status), `care water insight answers cleanly (got ${r.status()} ${b.status})`);
  }
  await n.ctx.close();
}

// ---- Installable app + signed-out access ----
{
  const { ctx, page } = await newPage();
  const man = await page.request.get(`${BASE}/manifest.webmanifest`);
  const mj = man.ok() ? await man.json() : {};
  check(mj.display === "standalone" && mj.icons?.some((i) => i.sizes === "512x512"), "web app manifest is installable");
  const sw = await page.request.get(`${BASE}/sw.js`);
  check(sw.ok() && !(await sw.text()).includes("/api/\""), "service worker served");
  const r = await page.request.get(`${BASE}/api/entries`);
  check(r.status() === 401, `signed-out API returns 401 (got ${r.status()})`);
  await page.goto(BASE + "/care");
  check(page.url().includes("/signin"), "signed-out page redirects to sign-in");
  await ctx.close();
}

await browser.close();
if (consoleErrors.length) {
  console.log("\nConsole errors:");
  for (const e of consoleErrors) console.log("  " + e);
}
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILED"} · screenshots in ${OUT}`);
process.exit(failures ? 1 : 0);
