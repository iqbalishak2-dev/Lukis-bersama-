const CACHE_NAME = "lukis-bersama-pwa-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) await cache.put(url, response);
      } catch (_) {
        // Optional resources may be unavailable during installation.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key.startsWith("lukis-bersama-pwa-") && key !== CACHE_NAME) {
        return caches.delete(key);
      }
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept cross-origin, non-GET, API, room, or event-stream requests.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (["/events", "/send", "/baru", "/cek"].includes(url.pathname)) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(req)) ||
               (await cache.match("/")) ||
               new Response("Anda offline. Sambungan internet diperlukan untuk bermain bersama.", {
                 status: 503,
                 headers: { "Content-Type": "text/plain; charset=utf-8" }
               });
      }
    })());
    return;
  }

  if (/\\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname) ||
      url.pathname === "/manifest.webmanifest") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      try {
        const response = await fetch(req);
        if (response && response.ok) cache.put(req, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        if (cached) return cached;
        throw _;
      }
    })());
  }
});
