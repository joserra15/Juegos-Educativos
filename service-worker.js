const CACHE_NAME = "unicornios-lucia-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./avatar.jpg",
  "./unicornios.png",
  "./unicornio1.png",
  "./unicornio2.png",
  "./unicornio3.png",
  "./unicornio4.png",
  "./unicornio5.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});