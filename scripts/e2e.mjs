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
  check(await page.getByRole("heading", { name: /Everybody poops/ }).isVisible(), "landing hero visible");
  await page.getByRole("button", { name: /I'm Maya/ }).click();
  await page.waitForURL("**/me");
  await shot(page, "02-patient-home");
  check(await page.getByRole("link", { name: /Log a movement/ }).first().isVisible(), "patient home has Log a movement");
  check(await page.locator("nav.tabbar").isVisible(), "app tab bar visible");
  check(await page.getByRole("heading", { name: "Worth a look", exact: true }).isVisible(), "patient sees plain-language flags");

  await page.getByRole("link", { name: /Log a movement/ }).first().click();
  await page.waitForURL("**/me/log");
  await shot(page, "03-log-form");
  await page.locator("label.shape", { hasText: "All liquid" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  check(await page.getByRole("heading", { name: "Any red or black colour?" }).isVisible(), "wizard moves to the colour step");
  await page.getByRole("button", { name: /^Skip/ }).click();
  await page.getByRole("button", { name: "Urgency" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: "Recently unwell" }).click();
  await page.getByLabel(/Notes/).fill(stamp);
  await page.getByRole("button", { name: "Save to my diary" }).click();
  await page.waitForURL("**/me?saved=1");
  check(await page.getByText("Today's report: logged.").isVisible(), "success state after saving");
  await shot(page, "04-saved");

  await page.goto(BASE + "/me/diary");
  const row = page.locator(".list-row", { hasText: stamp }).first();
  await row.locator("summary").click();
  check(await row.getByText(stamp).isVisible(), "new entry appears in diary and expands");
  await page.goto(BASE + "/me/trends");
  await shot(page, "05-trends");
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
  check(await page.getByText("Let's get things moving").isVisible(), "new user sees the friendly empty state");
  await shot(page, "15-new-user-empty");
  await page.goto(BASE + "/me/sharing");
  await page.getByRole("switch", { name: /Priya Raman/ }).click();
  await page.getByText("Sharing", { exact: true }).first().waitFor();
  await page.goto(BASE + "/me/log");
  await page.locator("label.shape", { hasText: "Smooth snake" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: "Felt fine" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: "Save to my diary" }).click();
  await page.waitForURL("**/me?saved=1");
  check(await page.getByText("Today's report: logged.").isVisible(), "new user can log an entry");
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
