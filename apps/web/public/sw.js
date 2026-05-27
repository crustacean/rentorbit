self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== "rentorbit-shell-v2").map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("rentorbit-shell-v2").then((cache) =>
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

  if (requestUrl.origin !== self.location.origin || event.request.destination === "image") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) =>
        cached || (event.request.mode === "navigate" ? caches.match("/") : undefined)
      )
    )
  );
});
