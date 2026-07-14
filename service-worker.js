const CACHE_NAME = "mundos-magicos-v16";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/ui/Onboarding.js",
  "./js/ui/SelectorMundos.js",
  "./js/ui/PanelFamilias.js",
  "./js/ui/RankingView.js",
  "./js/ui/MochilaView.js",
  "./js/ui/LazyAssets.js",
  "./manifest.json",
  "./content/manifest.json",
  "./content/unicornios.json",
  "./content/dinosaurios.json",
  "./content/fracciones.json",
  "./content/biblioteca.json",
  "./content/calculo-4.json",
  "./content/fracciones-4.json",
  "./content/lengua-4.json",
  "./content/ciencias-3.json",
  "./content/sociales-3.json",
  "./content/ciencias-4.json",
  "./content/sociales-4.json",
  "./engine/ContentLoader.js",
  "./engine/QuestionGenerator.js",
  "./engine/Scoring.js",
  "./engine/Hints.js",
  "./engine/ProgressStore.js",
  "./engine/WorldManager.js",
  "./engine/PhaseProgress.js",
  "./engine/SessionEngine.js",
  "./engine/PanelStats.js",
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
