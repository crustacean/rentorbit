const shellCacheName = "rentorbit-shell-v3";
const staticCacheName = "rentorbit-static-v3";
const currentCaches = new Set([shellCacheName, staticCacheName]);

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !currentCaches.has(key)).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(shellCacheName).then((cache) =>
      cache.addAll(["/", "/icon.svg"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  const isStaticAsset =
    requestUrl.pathname.startsWith("/_next/static/") ||
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "font" ||
    event.request.destination === "manifest" ||
    requestUrl.pathname === "/icon.svg";

  if (isStaticAsset) {
    event.respondWith(
      caches.open(staticCacheName).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }

          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }

            return response;
          });
        })
      )
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/"))
      )
    );
  }
});
