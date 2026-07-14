/**
 * Sesión de juego extendida (todos los mundos):
 * banco ≥50 preguntas (cuando hay materia prima), 10 aciertos para pasar,
 * dificultad creciente y sin repetir hasta agotar el repertorio único.
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

/**
 * Clave canónica: agrupa variantes cosméticas (-vN, opciones reordenadas)
 * para no volver a mostrar la misma pregunta "de fondo".
 */
export function claveCanonica(op) {
  if (!op) return "";
  if (op.claveCanonica) return String(op.claveCanonica);

  if (op.tipo === "fraccion" || (op.numerador != null && op.denominador != null && op.tipo !== "lectura")) {
    return `${op.numerador}/${op.denominador}`;
  }
  if (op.tipo === "division" && op.a != null && op.b != null) {
    return `${op.a}div${op.b}`;
  }
  if (op.tipo === "combinada" && op.clave) {
    return String(op.clave).replace(/-v\d+$/i, "");
  }
  if (op.a != null && op.b != null && op.tipo !== "lectura") {
    return `${op.a}x${op.b}`;
  }

  const raw = op.clave || op.id || op.texto || "";
  return String(raw)
    .replace(/-v\d+$/i, "")
    .trim();
}

function pickAleatorio(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Elige la siguiente pregunta.
 * - Prioriza el tercio de dificultad actual.
 * - No repite claves canónicas ya usadas en la sesión hasta agotarlas.
 * - Si el repertorio único se agota, reutiliza evitando las recientes.
 *
 * @param {object[]} banco
 * @param {number} nivel 0|1|2
 * @param {string[]} recientes claves canónicas recientes (ventana corta)
 * @param {string[]} usadas claves canónicas ya salidas en la sesión
 */
export function elegirPreguntaDelBanco(banco, nivel, recientes = [], usadas = []) {
  if (!banco?.length) return null;

  const tercio = Math.max(1, Math.floor(banco.length / 3));
  const inicio = Math.min(nivel, 2) * tercio;
  const fin = Math.min(banco.length, inicio + tercio);
  const slice = banco.slice(inicio, fin);
  const pool = slice.length ? slice : banco;

  const usadasSet = new Set(usadas.map(String));
  const recientesSet = new Set(recientes.map(String));

  const noUsadasEnPool = pool.filter((op) => !usadasSet.has(claveCanonica(op)));
  if (noUsadasEnPool.length) return pickAleatorio(noUsadasEnPool);

  // Mejor subir/bajar de dificultad que repetir una ya salida.
  const noUsadasGlobal = banco.filter((op) => !usadasSet.has(claveCanonica(op)));
  if (noUsadasGlobal.length) return pickAleatorio(noUsadasGlobal);

  // Ciclo completo: espaciar repeticiones con la ventana de recientes.
  const frescasPool = pool.filter((op) => !recientesSet.has(claveCanonica(op)));
  if (frescasPool.length) return pickAleatorio(frescasPool);

  const frescasGlobal = banco.filter((op) => !recientesSet.has(claveCanonica(op)));
  if (frescasGlobal.length) return pickAleatorio(frescasGlobal);

  return pickAleatorio(pool);
}

export function faseSuperada(aciertosSesion, requeridos = ACIERTOS_PARA_PASAR) {
  return aciertosSesion >= requeridos;
}

export function debeReiniciarFase(fallos, esFinal, maxFallos = FALLOS_MAX_FASE_FINAL) {
  return esFinal && fallos >= maxFallos;
}
