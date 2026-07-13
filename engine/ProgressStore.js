/**
 * Persistencia local y sincronización Firebase con namespace por mundo.
 */

export const MUNDO_LEGACY = "unicornios";

const LEGACY_KEYS = {
  puntos: "puntos",
  fasesLiberadas: "fasesLiberadas",
  tablasDominadas: "tablasDominadas",
  logros: "logros",
  intentosTotales: "intentosTotales",
  tiemposMejores: "tiemposMejores",
  fallosPorOperacion: "fallosPorOperacion",
  mundos: "mundos",
  mundoActivo: "mundoActivo",
};

export function createDefaultMundoState() {
  return {
    liberadas: [],
    tiemposMejores: {},
    fallosPorOperacion: {},
    tablasDominadas: [],
    logros: [],
    puntosMundo: 0,
    historiaVista: false,
  };
}

function readMundosStore() {
  const mundosRaw = localStorage.getItem(LEGACY_KEYS.mundos);
  try {
    return mundosRaw ? JSON.parse(mundosRaw) : {};
  } catch {
    return {};
  }
}

function writeMundosStore(mundos) {
  localStorage.setItem(LEGACY_KEYS.mundos, JSON.stringify(mundos));
}

export function loadAllMundosStates() {
  const mundos = readMundosStore();
  if (Object.keys(mundos).length > 0) return mundos;
  return { [MUNDO_LEGACY]: migrateLegacyLocalState(MUNDO_LEGACY) };
}

export function loadMundoState(mundoId = MUNDO_LEGACY) {
  const mundos = loadAllMundosStates();
  if (mundos[mundoId]) {
    return { ...createDefaultMundoState(), ...mundos[mundoId] };
  }
  if (mundoId === MUNDO_LEGACY) {
    return migrateLegacyLocalState(mundoId);
  }
  return createDefaultMundoState();
}

function migrateLegacyLocalState(mundoId) {
  const state = createDefaultMundoState();

  const liberadasRaw = localStorage.getItem(LEGACY_KEYS.fasesLiberadas);
  if (liberadasRaw) {
    try {
      state.liberadas = JSON.parse(liberadasRaw);
    } catch {
      /* mantener default */
    }
  }

  const tiemposRaw = localStorage.getItem(LEGACY_KEYS.tiemposMejores);
  if (tiemposRaw) {
    try {
      state.tiemposMejores = JSON.parse(tiemposRaw);
    } catch {
      /* mantener default */
    }
  }

  const fallosRaw = localStorage.getItem(LEGACY_KEYS.fallosPorOperacion);
  if (fallosRaw) {
    try {
      state.fallosPorOperacion = JSON.parse(fallosRaw);
    } catch {
      /* mantener default */
    }
  }

  const tablasRaw = localStorage.getItem(LEGACY_KEYS.tablasDominadas);
  if (tablasRaw) {
    try {
      state.tablasDominadas = JSON.parse(tablasRaw);
    } catch {
      /* mantener default */
    }
  }

  const logrosRaw = localStorage.getItem(LEGACY_KEYS.logros);
  if (logrosRaw) {
    try {
      state.logros = JSON.parse(logrosRaw);
    } catch {
      /* mantener default */
    }
  }

  if (localStorage.getItem("historiaVista") === "true") {
    state.historiaVista = true;
  }

  const puntosGlobal = +localStorage.getItem(LEGACY_KEYS.puntos) || 0;
  state.puntosMundo = puntosGlobal;

  saveMundoState(mundoId, state);
  return state;
}

export function saveMundoState(mundoId, state) {
  const mundos = loadAllMundosStates();
  mundos[mundoId] = state;
  writeMundosStore(mundos);

  if (mundoId === MUNDO_LEGACY) {
    localStorage.setItem(LEGACY_KEYS.fasesLiberadas, JSON.stringify(state.liberadas));
    localStorage.setItem(LEGACY_KEYS.tiemposMejores, JSON.stringify(state.tiemposMejores));
    localStorage.setItem(LEGACY_KEYS.fallosPorOperacion, JSON.stringify(state.fallosPorOperacion));
    localStorage.setItem(LEGACY_KEYS.tablasDominadas, JSON.stringify(state.tablasDominadas));
    localStorage.setItem(LEGACY_KEYS.logros, JSON.stringify(state.logros));
  }
}

export function loadGlobalState() {
  const mundos = loadAllMundosStates();
  const puntosPorMundo = {};
  let puntos = 0;
  for (const [id, state] of Object.entries(mundos)) {
    puntosPorMundo[id] = state?.puntosMundo || 0;
    puntos += state?.puntosMundo || 0;
  }

  const legacyPuntos = +localStorage.getItem(LEGACY_KEYS.puntos) || 0;
  if (puntos === 0 && legacyPuntos > 0) {
    puntos = legacyPuntos;
  }

  return {
    puntos,
    puntosPorMundo,
    intentosTotales: +localStorage.getItem(LEGACY_KEYS.intentosTotales) || 0,
  };
}

export function saveGlobalState({ puntos, intentosTotales, puntosPorMundo }) {
  localStorage.setItem(LEGACY_KEYS.puntos, puntos);
  localStorage.setItem(LEGACY_KEYS.intentosTotales, intentosTotales);
  if (puntosPorMundo) {
    const mundos = loadAllMundosStates();
    for (const [id, value] of Object.entries(puntosPorMundo)) {
      mundos[id] = { ...createDefaultMundoState(), ...mundos[id], puntosMundo: value };
    }
    writeMundosStore(mundos);
  }
}

export function buildFirebasePayload(
  nombreJugador,
  globalState,
  allMundosStates,
  mundoActivo = MUNDO_LEGACY,
  pin = null
) {
  const pinValue = pin ?? (typeof localStorage !== "undefined" ? localStorage.getItem("pinJugador") : null);
  const legacy = allMundosStates[MUNDO_LEGACY] || createDefaultMundoState();

  return {
    nombre: nombreJugador,
    pin: pinValue,
    puntos: globalState.puntos,
    puntosPorMundo: globalState.puntosPorMundo || {},
    mundoActivo,
    mundos: allMundosStates,
    liberadas: legacy.liberadas,
    tiemposMejores: legacy.tiemposMejores,
    fallosPorOperacion: legacy.fallosPorOperacion,
    ultimaActualizacion: Date.now(),
  };
}

export function parseFirebaseData(data, mundoId = MUNDO_LEGACY) {
  const allMundos = { ...(data.mundos || {}) };

  if (!allMundos[MUNDO_LEGACY] && (data.liberadas || data.tiemposMejores)) {
    allMundos[MUNDO_LEGACY] = {
      ...createDefaultMundoState(),
      liberadas: data.liberadas || [0],
      tiemposMejores: data.tiemposMejores || {},
      fallosPorOperacion: data.fallosPorOperacion || {},
      puntosMundo: data.puntos || 0,
    };
  }

  if (data.puntosPorMundo) {
    for (const [id, value] of Object.entries(data.puntosPorMundo)) {
      allMundos[id] = { ...createDefaultMundoState(), ...allMundos[id], puntosMundo: value };
    }
  }

  const mundoState = {
    ...createDefaultMundoState(),
    ...(allMundos[mundoId] || {}),
  };

  const puntosPorMundo = {};
  let puntos = data.puntos || 0;
  for (const [id, state] of Object.entries(allMundos)) {
    puntosPorMundo[id] = state?.puntosMundo || 0;
  }
  if (Object.keys(puntosPorMundo).length > 0) {
    const suma = Object.values(puntosPorMundo).reduce((a, b) => a + b, 0);
    if (suma > 0) puntos = suma;
  }

  return {
    puntos,
    puntosPorMundo,
    mundoActivo: data.mundoActivo || MUNDO_LEGACY,
    allMundosStates: allMundos,
    mundoState,
  };
}

export function mergeRemoteIfNewer(localPuntos, remotePuntos, localAllStates, remoteAllStates) {
  if ((remotePuntos || 0) > localPuntos) {
    return { puntos: remotePuntos, allMundosStates: remoteAllStates, merged: true };
  }
  return { puntos: localPuntos, allMundosStates: localAllStates, merged: false };
}

export function getTiemposMundoFromFirebase(data, mundoId = MUNDO_LEGACY, clavesPermitidas = null) {
  let raw = data?.mundos?.[mundoId]?.tiemposMejores;
  if ((!raw || Object.keys(raw).length === 0) && mundoId === MUNDO_LEGACY && data?.tiemposMejores) {
    raw = data.tiemposMejores;
  }
  if (!raw) return {};

  if (!clavesPermitidas?.size) return raw;

  const filtrado = {};
  for (const [clave, valor] of Object.entries(raw)) {
    if (clavesPermitidas.has(clave)) filtrado[clave] = valor;
  }
  return filtrado;
}

export function normalizarLiberadas(state) {
  const liberadas = Array.isArray(state?.liberadas) ? [...state.liberadas] : [];
  if (liberadas.length === 1 && liberadas[0] === 0) {
    const tieneProgreso =
      (state?.puntosMundo || 0) > 0 ||
      Object.keys(state?.tiemposMejores || {}).length > 0 ||
      (state?.logros || []).length > 0;
    if (!tieneProgreso) return [];
  }
  return liberadas;
}

export function getMundoActivoId() {
  return localStorage.getItem(LEGACY_KEYS.mundoActivo) || MUNDO_LEGACY;
}

export function setMundoActivoId(mundoId) {
  localStorage.setItem(LEGACY_KEYS.mundoActivo, mundoId);
}
