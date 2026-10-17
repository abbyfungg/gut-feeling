# Handoff notes

## Layout
- `src/lib/rules/` deterministic rules (`engine.ts`), thresholds (`config.ts`), trends (`trends.ts`). Pure functions, heavily tested.
- `src/lib/records.ts` all data access and authorisation (`assertCanViewPatient`), reviews, sharing.
- `src/lib/ai/` Gemini client, JSON schemas, response validation, upload sniffing.
- `src/lib/auth.ts`, `src/lib/session.ts` passwords, sessions, API wrapper (`withApi`) with same-origin check.
- `src/lib/seed.ts` fictional demo data (relative to now).
- `src/app/me/*` patient pages, `src/app/care/*` care-team pages, `src/app/api/*` JSON routes.
- `src/components/` Mascot (Pip), Bristol illustrations, timeline, chart, forms.

## Verified
- Typecheck, lint, 66 vitest tests, production build.
- `scripts/e2e.mjs`: 32 browser checks covering sign-up, empty state, sharing, logging, saving, practitioner view of the new entry, evidence links, review + follow-up, cross-patient and revoked access, cross-site POST blocking, mobile overflow.

## Not verified
- Live Gemini calls (no key during the build). Add a key and run `scripts/check-gemini.mjs`, then try a photo on `/me/log`.
- Docker image build (no Docker daemon in the build sandbox); the standalone server it packages was run and checked.
- Real hosting.

## Next
1. Add `GEMINI_API_KEY`, verify photo analysis on clay/synthetic photos in different lighting.
2. Deploy (docs/DEPLOY.md) and point the GoDaddy domain at it.
3. Nice-to-haves: camera framing/brightness guidance before upload, clinic invite flow, CSV export for clinicians.
