self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("rentorbit-shell-v1").then((cache) =>
      cache.addAll(["/", "/icon.svg"])
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});
