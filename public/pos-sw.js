// BizHub POS — lets the POS open and work with no internet.
// Pages under /pos (/pos/restaurant…) load from the network when online, from this saved copy when offline.
// Script, style, font and menu-photo files are saved the first time they load.
const CACHE = "bizhub-pos-v1";
const MATCH = { ignoreVary: true };
const HOME = "/pos/restaurant"; // the saved app page (/pos/restaurant, its customer display, later other POS kinds) // a script asked with an Origin header still finds its saved copy

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// the page sends the files it already loaded, so they work offline from the very first visit
self.addEventListener("message", (e) => {
  if (e.data?.type !== "cache") return;
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        (e.data.urls || []).map((url) =>
          fetch(url, { mode: url.startsWith(self.location.origin) ? "same-origin" : "no-cors" })
            .then((res) => (res.ok || res.type === "opaque" ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      ),
    ),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/api/")) return; // live data: never from the cache

  // the POS page itself: network first, saved copy when offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(HOME, copy));
          return res;
        })
        // every POS address is the same app page: the saved copy opens any of them
        .catch(() => caches.match(HOME, MATCH).then((r) => r || caches.match("/pos", MATCH)).then((r) => r || caches.match(req, MATCH))),
    );
    return;
  }

  // files: from the cache when saved (their names change with each release), else network + save
  const savable = url.origin === self.location.origin || /fonts\.(googleapis|gstatic)\.com|res\.cloudinary\.com/.test(url.host);
  if (!savable) return;
  e.respondWith(
    caches.match(req, MATCH).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
