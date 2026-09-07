/* Little Forest — service worker: offline app shell + notifications */
const CACHE = "little-forest-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    )
  );
});

/* Focus or open the app when a notification is tapped */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

/* Best-effort daily nudge (Chrome installed PWAs) */
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "forest-reminder") {
    e.waitUntil(
      self.registration.showNotification("Little Forest", {
        body: "🌙 Time for a little forest check-in.",
        icon: "./icon.svg", badge: "./icon.svg", tag: "forest-daily",
      })
    );
  }
});

/* Web Push (only fires if you add a push server later) */
self.addEventListener("push", (e) => {
  let data = { title: "Little Forest", body: "🌿 A little nudge from your forest." };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: "./icon.svg", badge: "./icon.svg", tag: "little-forest",
    })
  );
});

/* Let the page ask the SW to show a notification immediately (test button) */
self.addEventListener("message", (e) => {
  const m = e.data || {};
  if (m.type === "show") {
    self.registration.showNotification(m.title || "Little Forest", {
      body: m.body || "", icon: "./icon.svg", badge: "./icon.svg", tag: "little-forest", renotify: true,
    });
  }
});
