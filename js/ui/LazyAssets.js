/**
 * Carga diferida de imágenes de criaturas y assets pesados.
 */

const prefetched = new Set();

export function prefetchAsset(src) {
  if (!src || prefetched.has(src)) return;
  prefetched.add(src);
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "image";
  link.href = src;
  document.head.appendChild(link);
}

export function lazyLoadImage(img, src) {
  if (!img) return;
  const url = src || img.dataset.src;
  if (!url) return;

  if ("loading" in HTMLImageElement.prototype) {
    img.loading = "lazy";
  }

  if (img.src === url || img.getAttribute("src") === url) return;

  const cargar = () => {
    img.src = url;
    img.removeAttribute("data-src");
  };

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          cargar();
          obs.disconnect();
        }
      },
      { rootMargin: "80px" }
    );
    obs.observe(img);
  } else {
    cargar();
  }
}

export function aplicarLazyEnContenedor(container) {
  if (!container) return;
  container.querySelectorAll("img[data-src], img[loading='lazy']").forEach((img) => {
    if (img.dataset.src) lazyLoadImage(img);
  });
}

export function setImagenConLazy(img, src) {
  if (!img || !src) return;
  img.dataset.src = src;
  img.alt = img.alt || "Recompensa";
  lazyLoadImage(img, src);
}
