# Gut Feeling

**Everybody poops. Nobody should have to feel embarrassed about it.**

Gut Feeling is a friendly bowel-health diary with a care-team view. People log a movement in a few taps (optionally with a photo that Gemini classifies on the Bristol scale). Transparent rules spot changes from the person's own normal, and an authorised nurse or doctor sees what changed, when, and the exact entries behind it, then records a decision.

Built at Hack the Valley 11 for PointClickCare's *Catch It Early* challenge. **Prototype, not a medical device.** All demo people are fictional.

## What works

**Patient app** (`/me`)
- Warm dashboard with Pip the mascot, a big "Log a movement" button and a "No movement today" check-in.
- Logging: time, Bristol type 1–7 (illustrated picker, or skip), optional photo help, red/black colour question, symptoms, context, notes. Skipped answers stay empty; they are never turned into "no symptoms".
- Optional Gemini photo analysis with structured output, confidence, limitations, and a "can't classify" path. The person always confirms or changes the type. Photos are never stored.
- Diary timeline, pattern page (week vs previous week, shape distribution, symptoms), plain-language "worth a look" notes linked to their entries.
- Sharing and privacy page: per-clinician consent switches (revocable, timestamped), who reviewed my diary, account deletion.
- Printable visit notes for appointments.

**Care-team app** (`/care`)
- Review queue sorted by priority and recency, with the reason in one line.
- Patient view: every flag shows *what changed*, *when*, *supporting entries* (clickable to the timeline), timing-only context, the rule in words, and caveats. No risk scores.
- Record a review (decision, note, follow-up). Rule-template follow-ups are suggestions the clinician must accept or edit. Follow-ups list with "mark done". New entries after a review reopen the item.
- Optional Gemini handoff summary that explains the rule flags and cites entry ids; any item citing a non-existent entry or flag is dropped.
- Data-gap notices that say missing logs are unknown, not symptoms.

**Rules** (`src/lib/rules`) are deterministic and configurable in `config.ts`: repeated loose stools, repeated hard stools, consecutive days *explicitly* confirmed with no movement, patient-reported possible blood, patient-reported severe pain or fever, sustained shift from personal baseline. Thresholds are prototype defaults, **not validated clinical guidance**.

**Security**: scrypt password hashes, httpOnly session cookies (hashed server-side), same-origin checks on every write, server-side authorisation on every read (patients see only themselves; clinicians see only patients actively sharing with them; unknown and forbidden records both return 404), login rate limiting, upload validation by file signature and size, zod validation of all inputs and model outputs, security headers.

## Run it locally

Needs **Node 22.5+** (uses the built-in `node:sqlite`).

```bash
npm install
npm run dev            # http://localhost:3000
```

The database is created in `./data` and seeded with fictional demo data on first start. On the landing or sign-in page, use the demo buttons, or sign in with password `everybodypoops`:

| Account | Role |
|---|---|
| maya@demo.gutfeeling.health | Patient (Maya) |
| priya@demo.gutfeeling.health | Home-care nurse (sees 5 patients) |
| okafor@demo.gutfeeling.health | Gastroenterologist (sees Maya and Linh) |

Demo histories are generated relative to the time of seeding. Before a demo: stop the server, run `npm run reset-demo`, start again.

Production mode: `npm run build && npm start`.

## Environment variables

Copy `.env.example` to `.env.local`. Everything is optional.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | empty | Turns on photo analysis and AI handoff drafts. Server-side only. |
| `GEMINI_MODEL` | `gemini-flash-latest` | Any multimodal Gemini model your key can use. |
| `DATA_DIR` | `./data` | Folder for the SQLite file. Must be persistent when hosted. |
| `SEED_DEMO_DATA` | `true` | Seed fictional data into an empty database and show demo sign-in buttons. |
| `APP_TIMEZONE` | `America/Toronto` | Timezone used to group entries into days. |
| `COOKIE_SECURE` | `true` in production | Set `false` only to test production mode over plain HTTP. |

Check your Gemini setup with `node --env-file=.env.local scripts/check-gemini.mjs`.

## Tests

```bash
npm run typecheck
npm run lint
npm test                                   # 66 unit/integration tests (vitest)
BASE_URL=http://localhost:3000 npm run test:e2e   # 27 browser checks against a running server
```

The e2e script needs `playwright-core` (a dev dependency) and a Chromium binary; set `CHROMIUM_PATH` if yours isn't at the default sandbox path. It also needs `DATA_DIR` to point at the running server's data folder.

## AI status

- **No key configured:** the app is fully usable. Photo help shows a clear "switched off" message, manual entry works, and the care view says AI drafting is off. Seeded entries labelled "Simulated AI" are demo data, not model output.
- **Key configured:** `/api/analyze` sends the photo inline to Gemini with a JSON schema, validates the result, and stores only the structured estimate (never the photo). `/api/care/patients/[id]/summary` drafts an evidence-cited summary that is validated against real entry ids.
- The Gemini code paths are unit-tested with fake models. **They have not yet been run against the live API** (no key was available while building). Run `scripts/check-gemini.mjs` once you add a key.

## Limitations

- Prototype: not a medical device, not clinically validated, not audited for health-privacy law (PHIPA/HIPAA). Use fictional data only.
- SQLite on one server; the database file isn't encrypted by the app. Single-instance in-memory rate limiting.
- Care-team accounts are seeded, not self-registered; there is no clinic admin or invite flow.
- Rule thresholds are illustrative and need clinical review.
- Photo colour is unreliable, so AI never flags blood; only the person's own answer does.

See [docs/DEPLOY.md](docs/DEPLOY.md) to host it and [docs/HANDOFF.md](docs/HANDOFF.md) for where the code lives and what's next.
