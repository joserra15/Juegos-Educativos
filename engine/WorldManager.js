/**
 * Gestión de mundos: tematización, metadatos y navegación.
 */

const TEMA_DEFAULT = {
  colorPrimario: "#ff80ab",
  colorSecundario: "#ce93d8",
  fondo: "fondo-magico.jpg",
  criatura: "criatura",
  recompensaLabel: "recompensa",
};

export function getMundoEntry(manifest, mundoId) {
  return manifest?.mundos?.find((m) => m.id === mundoId) || null;
}

export function getMundosDisponibles(manifest) {
  return manifest?.mundos || [];
}

export function aplicarTemaMundo(contenido, entry) {
  const tema = {
    ...TEMA_DEFAULT,
    ...(entry?.tema || {}),
    ...(contenido?.tema || {}),
  };

  const root = document.documentElement;
  root.style.setProperty("--color-primario", tema.colorPrimario);
  root.style.setProperty("--color-secundario", tema.colorSecundario);
  root.style.setProperty("--theme-color", tema.colorPrimario);
  root.style.setProperty(
    "--mm-gradient-magic",
    `linear-gradient(135deg, ${tema.colorPrimario} 0%, ${tema.colorSecundario} 55%, #80deea 100%)`
  );
  root.style.setProperty("--color-acento", tema.colorSecundario);

  document.body.dataset.mundo = contenido?.id || entry?.id || "default";

  const overlay = "linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55))";
  document.body.style.backgroundImage = `${overlay}, url("${tema.fondo}")`;

  const manifestLink = document.querySelector('meta[name="theme-color"]');
  if (!manifestLink) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = tema.colorPrimario;
    document.head.appendChild(meta);
  } else {
    manifestLink.content = tema.colorPrimario;
  }

  return tema;
}

export function getEtiquetaRecompensa(contenido) {
  return contenido?.tema?.recompensaLabel || "recompensa";
}

export function getProgresoMundo(state, totalFases) {
  const liberadas = state?.liberadas || [];
  return {
    completadas: liberadas.length,
    total: totalFases || 0,
    puntosMundo: state?.puntosMundo || 0,
  };
}

export function calcularPuntosGlobales(mundosStates) {
  return Object.values(mundosStates || {}).reduce(
    (acc, state) => acc + (state?.puntosMundo || 0),
    0
  );
}
