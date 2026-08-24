/* Call Sheet service worker — v6
   Precaches the app so it launches with no signal, and caches fonts on first online run. */
const CACHE = "callsheet-v6";
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

  // App shell: serve from cache first so it opens offline, refresh in the background.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then(hit => {
        const net = fetch(req)
          .then(res => { caches.open(CACHE).then(c => c.put("./index.html", res.clone())); return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Everything else (fonts, etc): cache first, then network, and keep a copy.
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
