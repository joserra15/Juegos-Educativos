/**
 * Persistencia local y sincronización Firebase con namespace por mundo.
 */

export const MUNDO_ACTUAL = "unicornios";

const LEGACY_KEYS = {
  puntos: "puntos",
  fasesLiberadas: "fasesLiberadas",
  tablasDominadas: "tablasDominadas",
  logros: "logros",
  intentosTotales: "intentosTotales",
  tiemposMejores: "tiemposMejores",
  fallosPorOperacion: "fallosPorOperacion",
  mundos: "mundos",
};

export function createDefaultMundoState() {
  return {
    liberadas: [0],
    tiemposMejores: {},
    fallosPorOperacion: {},
    tablasDominadas: [],
    logros: [],
  };
}

export function loadMundoState(mundoId = MUNDO_ACTUAL) {
  const mundosRaw = localStorage.getItem(LEGACY_KEYS.mundos);
  let mundos = {};

  try {
    mundos = mundosRaw ? JSON.parse(mundosRaw) : {};
  } catch {
    mundos = {};
  }

  if (mundos[mundoId]) {
    return {
      ...createDefaultMundoState(),
      ...mundos[mundoId],
    };
  }

  return migrateLegacyLocalState(mundoId);
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

  saveMundoState(mundoId, state);
  return state;
}

export function saveMundoState(mundoId, state) {
  const mundosRaw = localStorage.getItem(LEGACY_KEYS.mundos);
  let mundos = {};
  try {
    mundos = mundosRaw ? JSON.parse(mundosRaw) : {};
  } catch {
    mundos = {};
  }

  mundos[mundoId] = state;
  localStorage.setItem(LEGACY_KEYS.mundos, JSON.stringify(mundos));

  // Mantener claves legacy para compatibilidad con versiones anteriores
  localStorage.setItem(LEGACY_KEYS.fasesLiberadas, JSON.stringify(state.liberadas));
  localStorage.setItem(LEGACY_KEYS.tiemposMejores, JSON.stringify(state.tiemposMejores));
  localStorage.setItem(LEGACY_KEYS.fallosPorOperacion, JSON.stringify(state.fallosPorOperacion));
  localStorage.setItem(LEGACY_KEYS.tablasDominadas, JSON.stringify(state.tablasDominadas));
  localStorage.setItem(LEGACY_KEYS.logros, JSON.stringify(state.logros));
}

export function loadGlobalState() {
  return {
    puntos: +localStorage.getItem(LEGACY_KEYS.puntos) || 0,
    intentosTotales: +localStorage.getItem(LEGACY_KEYS.intentosTotales) || 0,
  };
}

export function saveGlobalState({ puntos, intentosTotales }) {
  localStorage.setItem(LEGACY_KEYS.puntos, puntos);
  localStorage.setItem(LEGACY_KEYS.intentosTotales, intentosTotales);
}

export function buildFirebasePayload(nombreJugador, globalState, mundoState, mundoId = MUNDO_ACTUAL, pin = null) {
  const pinValue = pin ?? (typeof localStorage !== "undefined" ? localStorage.getItem("pinJugador") : null);
  return {
    nombre: nombreJugador,
    pin: pinValue,
    puntos: globalState.puntos,
    mundos: {
      [mundoId]: {
        liberadas: mundoState.liberadas,
        tiemposMejores: mundoState.tiemposMejores,
        fallosPorOperacion: mundoState.fallosPorOperacion,
        tablasDominadas: mundoState.tablasDominadas,
        logros: mundoState.logros,
      },
    },
    // Campos legacy para clientes antiguos
    liberadas: mundoState.liberadas,
    tiemposMejores: mundoState.tiemposMejores,
    fallosPorOperacion: mundoState.fallosPorOperacion,
    ultimaActualizacion: Date.now(),
  };
}

export function parseFirebaseData(data, mundoId = MUNDO_ACTUAL) {
  const mundoRemoto = data.mundos?.[mundoId];
  const mundoState = createDefaultMundoState();

  if (mundoRemoto) {
    Object.assign(mundoState, mundoRemoto);
  } else {
    mundoState.liberadas = data.liberadas || mundoState.liberadas;
    mundoState.tiemposMejores = data.tiemposMejores || {};
    mundoState.fallosPorOperacion = data.fallosPorOperacion || {};
  }

  return {
    puntos: data.puntos || 0,
    mundoState,
  };
}

export function mergeRemoteIfNewer(localPuntos, remotePuntos, localState, remoteState) {
  if ((remotePuntos || 0) > localPuntos) {
    return { puntos: remotePuntos, mundoState: remoteState, merged: true };
  }
  return { puntos: localPuntos, mundoState: localState, merged: false };
}
