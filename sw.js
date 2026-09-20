/* Call Sheet service worker — v11
   Network-first for the app itself, so a new upload shows up as soon as you're online.
   Cache is the fallback, so it still opens with no signal. */
const CACHE = "callsheet-v11";
const CORE = ["./", "./index.html"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // The app shell: try the network first (3s), fall back to cache when offline or slow.
  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([
        fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        }),
        new Promise(resolve => setTimeout(() => resolve(null), 3000))
      ])
      .then(res => res || caches.match("./index.html"))
      .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Fonts and everything else: cache first, then network.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
