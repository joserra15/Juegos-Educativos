/**
 * Estadísticas para panel familias y panel global narrativo.
 */

export const HITOS_HECHIZO = [
  {
    puntos: 0,
    titulo: "🌑 El velo del hechizo",
    texto: "Una niebla mágica cubre los mundos. Cada respuesta correcta debilita el hechizo.",
  },
  {
    puntos: 10000,
    titulo: "✨ Primera grieta",
    texto: "¡La magia vuelve a brillar! Los primeros portales se abren entre mundos.",
  },
  {
    puntos: 25000,
    titulo: "🌈 Puentes de luz",
    texto: "El grupo ha tejido puentes de conocimiento. Las criaturas empiezan a despertar.",
  },
  {
    puntos: 40000,
    titulo: "🔮 Torre despierta",
    texto: "Los retos avanzados parpadean. Solo los más valientes los alcanzan.",
  },
  {
    puntos: 60000,
    titulo: "🦄 Hechizo roto",
    texto: "¡Hazaña colectiva! El hechizo se rompe y nuevos retos mágicos aparecen.",
  },
];

export const OBJETIVO_GLOBAL = 60000;

/** Progreso agregado por área curricular (matematicas, lengua…). */
export function calcularProgresoPorArea(manifest, allStates) {
  const areas = {};
  for (const entry of manifest?.mundos || []) {
    const area = entry.area || "general";
    if (!areas[area]) {
      areas[area] = { area, fasesCompletadas: 0, fasesTotales: 0, puntos: 0, mundos: 0 };
    }
    const state = allStates[entry.id] || {};
    const completadas = state.liberadas?.length || 0;
    areas[area].fasesCompletadas += completadas;
    areas[area].fasesTotales += entry.totalFases || state.liberadas?.length || 1;
    areas[area].puntos += state.puntosMundo || 0;
    areas[area].mundos += 1;
  }
  return Object.values(areas).map((a) => ({
    ...a,
    porcentaje: a.fasesTotales
      ? Math.min(100, Math.round((a.fasesCompletadas / a.fasesTotales) * 100))
      : 0,
  }));
}

export function obtenerHitoHechizo(puntosTotales) {
  let actual = HITOS_HECHIZO[0];
  for (const hito of HITOS_HECHIZO) {
    if (puntosTotales >= hito.puntos) actual = hito;
  }
  const siguiente = HITOS_HECHIZO.find((h) => h.puntos > puntosTotales) || null;
  return { actual, siguiente };
}

export function etiquetaArea(area) {
  const mapa = {
    matematicas: "Matemáticas",
    lengua: "Lengua",
    ciencias: "Ciencias",
    sociales: "Sociales",
    general: "General",
  };
  return mapa[area] || area;
}

/** Compara tiempos actuales vs snapshot anterior por fase. */
export function calcularMejorasPersonales(tiemposActuales, tiemposAnteriores, fases) {
  const mejoras = [];
  for (const fase of fases || []) {
    const actual = tiemposActuales[fase.id];
    const anterior = tiemposAnteriores[fase.id];
    if (actual === undefined) continue;
    mejoras.push({
      faseId: fase.id,
      label: fase.nombre,
      tiempoActual: actual,
      tiempoAnterior: anterior,
      mejoro: anterior !== undefined && actual < anterior,
      delta: anterior !== undefined ? anterior - actual : null,
    });
  }
  return mejoras;
}

export function generarResumenExportable({
  nombreJugador,
  puntos,
  mundosStates,
  manifest,
  intentosTotales,
  fecha = new Date(),
}) {
  const lineas = [
    "═══════════════════════════════════════",
    "  MUNDOS MÁGICOS EDUCATIVOS — Resumen",
    "═══════════════════════════════════════",
    "",
    `Jugador: ${nombreJugador}`,
    `Fecha: ${fecha.toLocaleDateString("es-ES")} ${fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
    `Puntos totales: ${puntos} ⭐`,
    `Intentos: ${intentosTotales}`,
    "",
    "── Progreso por mundo ──",
  ];

  for (const entry of manifest?.mundos || []) {
    const st = mundosStates[entry.id] || {};
    const fases = st.liberadas?.length || 0;
    lineas.push(
      `${entry.emoji} ${entry.nombre}: ${fases} fases · ${st.puntosMundo || 0} ⭐`
    );
  }

  const areas = calcularProgresoPorArea(manifest, mundosStates);
  if (areas.length) {
    lineas.push("", "── Por área curricular ──");
    for (const a of areas) {
      lineas.push(`${etiquetaArea(a.area)}: ${a.porcentaje}% (${a.fasesCompletadas} fases)`);
    }
  }

  lineas.push("", "¡Sigue practicando y mejorando tus marcas! 🌈", "");
  return lineas.join("\n");
}
