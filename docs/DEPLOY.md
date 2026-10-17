# Deploying Gut Feeling

The app is one Node server plus one SQLite file. Any host works if it gives you **Node 22.5+ (or Docker)**, **HTTPS**, and a **persistent disk** mounted at `DATA_DIR`. Serverless hosts without a disk (for example Vercel) are a poor fit: the database would reset.

Nothing has been deployed yet. Each option below needs your own account and login.

## Option A: Render (simplest; paid)

1. Push this repo to GitHub (done: `abbyfungg/gut-feeling`).
2. In Render, create a **Web Service** from the repo, runtime **Docker** (uses the `Dockerfile`).
3. Add a **Disk**: mount path `/data`, 1 GB. Disks need a paid instance type (Starter at the time of writing; check Render's pricing).
4. Environment: `DATA_DIR=/data`, `SEED_DEMO_DATA=true`, optionally `GEMINI_API_KEY` and `GEMINI_MODEL`.
5. Health check path: `/api/health`.

## Option B: Fly.io

1. Install `flyctl`, `fly auth login`.
2. `fly launch --no-deploy` (it detects the Dockerfile; internal port 3000).
3. `fly volumes create gutdata --size 1` and add to `fly.toml`:
   ```toml
   [mounts]
     source = "gutdata"
     destination = "/data"
   ```
4. `fly secrets set GEMINI_API_KEY=...` (optional), then `fly deploy`.
5. Keep one machine running (`min_machines_running = 1`), since SQLite lives on one volume.

## Option C: a small VM (e.g. Vultr, with MLH hackathon credits)

```bash
# on the VM (Ubuntu), after installing Docker
git clone https://github.com/abbyfungg/gut-feeling && cd gut-feeling
docker build -t gut-feeling .
docker run -d --name gut -p 3000:3000 -v gutdata:/data \
  -e GEMINI_API_KEY=... --restart unless-stopped gut-feeling
```
Put Caddy or nginx in front for HTTPS (Caddy: `your.domain { reverse_proxy localhost:3000 }`). Session cookies are `Secure` in production, so sign-in needs HTTPS.

## Custom domain

Point your GoDaddy domain's DNS at the host (CNAME for Render/Fly, A record for a VM) and add the domain in the host's dashboard so it issues a certificate.

## Before judging

- Reset demo data so the histories are fresh: delete the DB file on the disk (or run `npm run reset-demo` locally) and restart.
- Visit `/api/health`: `"ai":"configured"` confirms Gemini is on.
