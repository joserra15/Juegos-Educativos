/**
 * Reglas de desbloqueo de fases y filtrado de tiempos por mundo.
 * Extraído de app.js para tests de regresión funcionales.
 */

import { getFaseLabel } from "@engine/ContentLoader";

/** Fase secuencial disponible si su índice ≤ número de fases ya completadas. */
export function indiceFaseDisponible(liberadas, indice) {
  return indice <= (liberadas?.length ?? 0);
}

/** Fases avanzadas requieren la anterior completada y puntos globales del grupo. */
export function esFaseAvanzadaDesbloqueada(liberadas, indice, puntosClase, desbloqueoClase = Infinity) {
  const faseAnteriorSuperada = liberadas.includes(indice - 1);
  const puntosSuficientes = puntosClase >= (desbloqueoClase ?? Infinity);
  return faseAnteriorSuperada && puntosSuficientes;
}

/**
 * Evalúa si una fase del mapa está jugable.
 * `siempreActiva` no salta el orden: solo omite requisitos de puntos de clase
 * (reto colectivo), pero exige completar las fases anteriores.
 */
export function evaluarEstadoFase(fase, indice, liberadas, puntosClase = 0) {
  if (fase.siempreActiva) {
    const previaCompletada = indice === 0 || liberadas.includes(indice - 1);
    const secuencial = indiceFaseDisponible(liberadas, indice);
    const disponible = previaCompletada && secuencial;
    return {
      disponible,
      motivo: disponible ? "siempre-activa-desbloqueada" : "siempre-activa-bloqueada",
    };
  }
  if (fase.tipo === "avanzada") {
    const desbloqueada = esFaseAvanzadaDesbloqueada(
      liberadas,
      indice,
      puntosClase,
      fase.desbloqueoClase
    );
    return {
      disponible: desbloqueada,
      motivo: desbloqueada ? "avanzada-desbloqueada" : "avanzada-bloqueada",
    };
  }
  return {
    disponible: indiceFaseDisponible(liberadas, indice),
    motivo: "secuencial",
  };
}

export function clavesPermitidasFases(fases, labelFn = getFaseLabel) {
  const claves = new Set();
  fases.forEach((fase) => {
    claves.add(fase.id);
    claves.add(labelFn(fase));
    claves.add(fase.nombre);
  });
  return claves;
}

export function filtrarTiemposPorMundo(tiempos, clavesOFases) {
  const claves =
    clavesOFases instanceof Set
      ? clavesOFases
      : clavesPermitidasFases(clavesOFases);
  const filtrado = {};
  for (const [clave, valor] of Object.entries(tiempos || {})) {
    if (claves.has(clave)) filtrado[clave] = valor;
  }
  return filtrado;
}

export function crearContextoRanking(mundoId, fases, labelFn = getFaseLabel) {
  const fasesRef = [...fases];
  return {
    mundoRef: mundoId,
    fasesRef,
    clavesPermitidas: clavesPermitidasFases(fasesRef, labelFn),
  };
}

export function combinarTiemposJugador({
  firebaseTiempos,
  localTiempos,
  esJugadorActual,
  fases,
  labelFn = getFaseLabel,
}) {
  let tiempos = firebaseTiempos || {};
  if (esJugadorActual && localTiempos) {
    const claves = clavesPermitidasFases(fases, labelFn);
    const localFiltrado = filtrarTiemposPorMundo(localTiempos, claves);
    tiempos = { ...tiempos, ...localFiltrado };
  }
  return tiempos;
}

export function obtenerTiempoFase(tiempos, fase, labelFn = getFaseLabel) {
  if (!tiempos || !fase) return undefined;
  return tiempos[fase.id] ?? tiempos[labelFn(fase)];
}

export function liberarFase(liberadas, indice) {
  if (liberadas.includes(indice)) return [...liberadas];
  return [...liberadas, indice].sort((a, b) => a - b);
}
