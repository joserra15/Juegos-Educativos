const APP_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_NAME = `mundos-magicos-v${APP_VERSION}`;

function withVersion(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${APP_VERSION}`;
}

const VERSIONED_FILES = [
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/ui/Onboarding.js",
  "./js/ui/SelectorMundos.js",
  "./js/ui/PanelFamilias.js",
  "./js/ui/RankingView.js",
  "./js/ui/MochilaView.js",
  "./js/ui/LazyAssets.js",
  "./js/ui/PwaInstall.js",
  "./manifest.json",
  "./content/manifest.json",
  "./content/bosque-luna.json",
  "./content/granja-numeros.json",
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
  "./content/ingles-3.json",
  "./content/ingles-4.json",
  "./content/logica-3.json",
  "./content/logica-4.json",
  "./content/visoespacial-3.json",
  "./content/visoespacial-4.json",
  "./engine/ContentLoader.js",
  "./engine/QuestionGenerator.js",
  "./engine/Scoring.js",
  "./engine/Hints.js",
  "./engine/ProgressStore.js",
  "./engine/WorldManager.js",
  "./engine/PhaseProgress.js",
  "./engine/SessionEngine.js",
  "./engine/PanelStats.js",
  "./engine/Speech.js",
  "./service-worker.js",
].map(withVersion);

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  withVersion("./index.html"),
  ...VERSIONED_FILES,
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
  "./apple-touch-icon.png",
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

  const request = event.request;
  const isNavigation = request.mode === "navigate" || request.destination === "document";

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(withVersion("./index.html")) || caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
