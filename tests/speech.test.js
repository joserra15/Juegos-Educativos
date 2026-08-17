import { describe, it, expect, beforeEach } from "vitest";
import {
  limpiarTextoParaVoz,
  textoPreguntaParaVoz,
  leerVozAltaActivada,
  cargarPreferenciaVoz,
  guardarPreferenciaVoz,
  VOZ_ALTA_KEY,
  vozDisponible,
  elegirVozEspanol,
  leerEnVozAlta,
  detenerLectura,
  desbloquearVoz,
  resetDesbloqueoVozParaTests,
} from "../engine/Speech.js";

describe("Speech — limpieza y preferencias", () => {
  it("quita emojis y saltos de línea para la síntesis", () => {
    expect(limpiarTextoParaVoz("🍎🍎\n¿Cuántas manzanas hay?")).toBe("¿Cuántas manzanas hay?");
    expect(limpiarTextoParaVoz("Tienes 2 ⭐ y encuentras 3 ⭐ más.")).toBe(
      "Tienes 2 y encuentras 3 más."
    );
  });

  it("compone pregunta y opciones numeradas", () => {
    const texto = textoPreguntaParaVoz({
      texto: "🐷🐷    🐔\n¿Dónde hay más?",
      opciones: ["Cerdos", "Gallinas", "Igual"],
    });
    expect(texto).toContain("¿Dónde hay más?");
    expect(texto).toContain("Opción 1: Cerdos");
    expect(texto).toContain("Opción 3: Igual");
    expect(texto).not.toMatch(/🐷/);
  });

  it("respeta textoVoz explícito", () => {
    const texto = textoPreguntaParaVoz({
      texto: "🐱🐱",
      textoVoz: "Hay dos gatos. ¿Cuántos hay?",
      opciones: ["2", "1"],
    });
    expect(texto.startsWith("Hay dos gatos. ¿Cuántos hay?")).toBe(true);
  });

  it("activa la voz por defecto en Infantil y si el mundo lo pide", () => {
    expect(leerVozAltaActivada({ curso: 0 })).toBe(true);
    expect(leerVozAltaActivada({ curso: 3 })).toBe(false);
    expect(leerVozAltaActivada({ curso: 3, mundo: { leerEnVozAlta: true } })).toBe(true);
    expect(leerVozAltaActivada({ curso: 0, stored: false })).toBe(false);
    expect(leerVozAltaActivada({ curso: 3, stored: true })).toBe(true);
  });

  it("guarda y carga la preferencia en storage", () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
    };
    expect(cargarPreferenciaVoz(storage)).toBeNull();
    guardarPreferenciaVoz(true, storage);
    expect(mem.get(VOZ_ALTA_KEY)).toBe("true");
    expect(cargarPreferenciaVoz(storage)).toBe(true);
    guardarPreferenciaVoz(false, storage);
    expect(cargarPreferenciaVoz(storage)).toBe(false);
  });
});

describe("Speech — Web Speech API", () => {
  class FakeUtterance {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.volume = 1;
      this.voice = null;
    }
  }

  function fakeSynth(voices = [{ lang: "es-ES", name: "Spanish Spain" }]) {
    const spoken = [];
    return {
      spoken,
      cancel() {
        spoken.push("cancel");
      },
      speak(u) {
        spoken.push(u.text);
      },
      getVoices() {
        return voices;
      },
    };
  }

  beforeEach(() => {
    resetDesbloqueoVozParaTests();
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
  });

  it("detecta síntesis disponible y elige voz es-ES", () => {
    const synth = fakeSynth();
    expect(vozDisponible(synth)).toBe(true);
    expect(elegirVozEspanol(synth.getVoices()).lang).toBe("es-ES");
  });

  it("habla el texto limpio y cancela la lectura anterior", () => {
    const synth = fakeSynth();
    expect(leerEnVozAlta("🍎 ¿Cuántas hay?", { synth, Utterance: FakeUtterance })).toBe(true);
    expect(synth.spoken[0]).toBe("cancel");
    expect(synth.spoken[1]).toBe("¿Cuántas hay?");
    detenerLectura(synth);
    expect(synth.spoken.at(-1)).toBe("cancel");
  });

  it("desbloquea la voz con un utterance silencioso", () => {
    const synth = fakeSynth();
    expect(desbloquearVoz({ synth, Utterance: FakeUtterance })).toBe(true);
    expect(desbloquearVoz({ synth, Utterance: FakeUtterance })).toBe(false);
  });
});
