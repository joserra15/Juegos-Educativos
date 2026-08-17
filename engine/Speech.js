/**
 * Lectura en voz alta (Web Speech API) para Infantil y accesibilidad.
 */

export const VOZ_ALTA_KEY = "mm_leer_voz_alta";

/** Quita emojis y símbolos visuales para que la síntesis no los deletree. */
export function limpiarTextoParaVoz(texto) {
  if (texto == null) return "";
  return String(texto)
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, " ")
    .replace(/[★☆●○■□▲△◆◇♥♡•·∅]/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/[\n\r]+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!])/g, "$1")
    .replace(/^[.\s]+/, "")
    .replace(/\s+$/, "")
    .trim();
}

/** Pregunta + opciones numeradas, listas para escuchar. */
export function textoPreguntaParaVoz(op) {
  const pregunta = op?.textoVoz ? limpiarTextoParaVoz(op.textoVoz) : limpiarTextoParaVoz(op?.texto);
  if (!pregunta) return "";
  const opciones = Array.isArray(op?.opciones) ? op.opciones : [];
  if (!opciones.length) return pregunta;
  const lista = opciones
    .map((o, i) => `Opción ${i + 1}: ${limpiarTextoParaVoz(o)}`)
    .filter((linea) => !linea.endsWith(":"))
    .join(". ");
  return lista ? `${pregunta}. ${lista}` : pregunta;
}

/**
 * Preferencia efectiva:
 * - si el usuario ha guardado un valor, manda
 * - si no, se activa en Infantil (curso 0) o si el mundo lo pide
 */
export function leerVozAltaActivada({ curso, mundo, stored } = {}) {
  if (stored === true) return true;
  if (stored === false) return false;
  if (mundo?.leerEnVozAlta === true) return true;
  if (mundo?.leerEnVozAlta === false) return false;
  return Number(curso) === 0;
}

export function cargarPreferenciaVoz(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(VOZ_ALTA_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* quota / modo privado */
  }
  return null;
}

export function guardarPreferenciaVoz(valor, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(VOZ_ALTA_KEY, String(!!valor));
  } catch {
    /* ignorar */
  }
}

export function vozDisponible(synth = globalThis.speechSynthesis) {
  return Boolean(
    synth &&
      typeof globalThis.SpeechSynthesisUtterance === "function"
  );
}

export function elegirVozEspanol(voices = []) {
  const lista = Array.isArray(voices) ? voices : [];
  const es = lista.filter(
    (v) => /^es([-_]|$)/i.test(v.lang || "") || /spanish|español/i.test(v.name || "")
  );
  return es.find((v) => /es-ES/i.test(v.lang || "")) || es[0] || null;
}

let vozDesbloqueada = false;

/** iOS/Safari: un utterance silencioso tras un gesto desbloquea speechSynthesis. */
export function desbloquearVoz({
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
} = {}) {
  if (!vozDisponible(synth) || vozDesbloqueada) return false;
  try {
    const u = new Utterance(" ");
    u.volume = 0;
    synth.speak(u);
    synth.cancel();
    vozDesbloqueada = true;
    return true;
  } catch {
    return false;
  }
}

export function resetDesbloqueoVozParaTests() {
  vozDesbloqueada = false;
}

export function detenerLectura(synth = globalThis.speechSynthesis) {
  try {
    synth?.cancel?.();
  } catch {
    /* ignorar */
  }
}

export function leerEnVozAlta(texto, {
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  voices,
  lang = "es-ES",
  rate = 0.9,
} = {}) {
  const limpio = limpiarTextoParaVoz(texto);
  if (!limpio || !vozDisponible(synth) || typeof Utterance !== "function") return false;
  detenerLectura(synth);
  const utter = new Utterance(limpio);
  utter.lang = lang;
  utter.rate = rate;
  const lista = voices ?? (typeof synth.getVoices === "function" ? synth.getVoices() : []);
  const voz = elegirVozEspanol(lista);
  if (voz) utter.voice = voz;
  synth.speak(utter);
  return true;
}
