const CACHE_NAME = "mundos-magicos-v3";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./js/app.js",
  "./manifest.json",
  "./content/manifest.json",
  "./content/unicornios.json",
  "./engine/ContentLoader.js",
  "./engine/QuestionGenerator.js",
  "./engine/Scoring.js",
  "./engine/Hints.js",
  "./engine/ProgressStore.js",
  "./engine/WorldManager.js",
  "./avatar.png",
  "./unicornios.png",
  "./unicornio1.png",
  "./unicornio2.png",
  "./unicornio3.png",
  "./unicornio4.png",
  "./unicornio5.png",
  "./unicornio6.png",
  "./unicornio7.png",
  "./unicornio8.png",
  "./fondo-magico.jpg",
  "./icon-192.png",
  "./icon-512.png",
  "./service-worker.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
