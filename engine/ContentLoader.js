/**
 * Carga contenido de mundos desde JSON externos.
 */

export async function loadManifest() {
  const res = await fetch("./content/manifest.json");
  if (!res.ok) throw new Error("No se pudo cargar el manifiesto de mundos");
  return res.json();
}

export async function loadMundoContent(mundoId) {
  const manifest = await loadManifest();
  const entry = manifest.mundos.find((m) => m.id === mundoId);
  if (!entry) throw new Error(`Mundo desconocido: ${mundoId}`);

  const res = await fetch(`./content/${entry.contentFile || `${mundoId}.json`}`);
  if (!res.ok) throw new Error(`No se pudo cargar el contenido de ${mundoId}`);
  return res.json();
}

/** Etiqueta visible: emoji + nombre */
export function getFaseLabel(fase) {
  if (!fase) return "";
  return fase.emoji ? `${fase.emoji} ${fase.nombre}` : fase.nombre;
}

/** Migra claves antiguas (emoji+nombre) a IDs estables */
export function migrateTiempoKeys(tiempos, fases) {
  if (!tiempos || !fases) return tiempos || {};

  const labelToId = {};
  fases.forEach((f) => {
    labelToId[getFaseLabel(f)] = f.id;
    labelToId[f.nombre] = f.id;
  });

  const migrated = {};
  for (const [key, value] of Object.entries(tiempos)) {
    const newKey = labelToId[key] || key;
    if (migrated[newKey] === undefined || value < migrated[newKey]) {
      migrated[newKey] = value;
    }
  }
  return migrated;
}
