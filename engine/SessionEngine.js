/**
 * Sesión de juego extendida (todos los mundos):
 * banco ≥50 preguntas, 10 aciertos para pasar, dificultad creciente.
 */

export const ACIERTOS_PARA_PASAR = 10;
export const FALLOS_MAX_FASE_FINAL = 5;
export const TAMANO_BANCO_MINIMO = 50;
export const MUNDO_LEGACY = "unicornios";

/** Todos los mundos usan sesión extendida (incluido unicornios). */
export function usaSesionExtendida(_mundoId) {
  return true;
}

/** Fase final: avanzada o una de las dos últimas del mundo. */
export function esFaseFinal(indice, fase, totalFases) {
  if (fase?.tipo === "avanzada") return true;
  return indice >= Math.max(0, totalFases - 2);
}

export function calcularProgresoRevelado(aciertos, requeridos = ACIERTOS_PARA_PASAR) {
  return Math.min(100, Math.floor((aciertos / requeridos) * 100));
}

/** 0 = fácil, 1 = medio, 2 = difícil según avance en la sesión. */
export function nivelDificultadSesion(aciertosSesion, fallosSesion = 0) {
  const progreso = aciertosSesion + Math.floor(fallosSesion / 2);
  if (progreso < 3) return 0;
  if (progreso < 7) return 1;
  return 2;
}

export function elegirPreguntaDelBanco(banco, nivel) {
  if (!banco?.length) return null;
  const tercio = Math.max(1, Math.floor(banco.length / 3));
  const inicio = Math.min(nivel, 2) * tercio;
  const fin = Math.min(banco.length, inicio + tercio);
  const slice = banco.slice(inicio, fin);
  const pool = slice.length ? slice : banco;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function faseSuperada(aciertosSesion, requeridos = ACIERTOS_PARA_PASAR) {
  return aciertosSesion >= requeridos;
}

export function debeReiniciarFase(fallos, esFinal, maxFallos = FALLOS_MAX_FASE_FINAL) {
  return esFinal && fallos >= maxFallos;
}
