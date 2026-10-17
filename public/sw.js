// Gut Feeling service worker.
// Privacy rule: only public, static build assets are cached. Pages, API responses
// and anything with diary data always go to the network and are never stored.
const CACHE = "gf-static-v1";
const OFFLINE_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Gut Feeling</title><body style="font-family:system-ui;background:#faf6f1;color:#1d1714;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><div style="font-size:56px">📴</div><h1 style="margin:8px 0">You're offline</h1><p style="color:#574c45">Gut Feeling needs a connection to load your diary. Your data isn't stored on this device.</p><button onclick="location.reload()" style="margin-top:12px;padding:12px 20px;border-radius:14px;border:0;background:#1d1714;color:#fff;font-weight:700">Try again</button></div></body>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic = url.pathname.startsWith("/_next/static/") || /^\/(icon[\w-]*\.(png|svg)|apple-touch-icon\.png)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
  }
});
