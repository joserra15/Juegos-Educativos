import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  elegirPreguntaDelBanco,
  claveCanonica,
  ACIERTOS_PARA_PASAR,
} from "../engine/SessionEngine.js";
import { generarBancoFase } from "../engine/QuestionGenerator.js";

const ROOT = join(import.meta.dirname, "..");

describe("Anti-repetición de preguntas", () => {
  it("unifica variantes -vN en la clave canónica", () => {
    expect(claveCanonica({ clave: "3x4-v12", a: 3, b: 4, tipo: "multiplicacion" })).toBe("3x4");
    expect(claveCanonica({ clave: "12div3-v2", a: 12, b: 3, tipo: "division" })).toBe("12div3");
    expect(claveCanonica({ numerador: 1, denominador: 2, tipo: "fraccion", clave: "1/2-v9" })).toBe("1/2");
    expect(claveCanonica({ tipo: "lectura", clave: "cuento-1-v3", claveCanonica: "cuento-1" })).toBe("cuento-1");
  });

  it("no repite claves canónicas hasta agotar el repertorio", () => {
    const banco = Array.from({ length: 12 }, (_, i) => ({
      texto: `P${i}`,
      clave: `p${i}`,
      claveCanonica: `p${i}`,
      _dificultad: i,
    }));
    const usadas = [];
    const vistas = [];
    for (let i = 0; i < 12; i++) {
      const op = elegirPreguntaDelBanco(banco, 0, [], usadas);
      const k = claveCanonica(op);
      expect(vistas).not.toContain(k);
      vistas.push(k);
      usadas.push(k);
    }
    expect(new Set(vistas).size).toBe(12);
  });

  it("en lectura no inventa clones: banco = preguntas únicas filtradas", () => {
    const bancoLectura = Array.from({ length: 8 }, (_, i) => ({
      id: `lec-${i}`,
      etiquetas: ["tag"],
      texto: `Pregunta única ${i}?`,
      opciones: ["A", "B", "C"],
      correcta: 0,
    }));
    const banco = generarBancoFase(
      { mecanica: "lectura", etiquetasLectura: ["tag"], total: 6 },
      { bancoLectura, tipoMundo: "lectura" },
      50
    );
    expect(banco.length).toBe(8);
    const canonic = banco.map(claveCanonica);
    expect(new Set(canonic).size).toBe(banco.length);
  });

  it("simula 10 aciertos de sesión lectura sin repetir si hay ≥10 únicas", () => {
    const bancoLectura = Array.from({ length: 14 }, (_, i) => ({
      id: `s-${i}`,
      etiquetas: ["mix"],
      texto: `Sesión pregunta ${i}`,
      opciones: ["A", "B", "C"],
      correcta: 0,
    }));
    const banco = generarBancoFase(
      { mecanica: "lectura", etiquetasLectura: ["mix"] },
      { bancoLectura, tipoMundo: "lectura" },
      50
    );
    const usadas = [];
    const recent = [];
    for (let i = 0; i < ACIERTOS_PARA_PASAR; i++) {
      const op = elegirPreguntaDelBanco(banco, Math.min(2, Math.floor(i / 3)), recent, usadas);
      const k = claveCanonica(op);
      expect(usadas).not.toContain(k);
      usadas.push(k);
      recent.push(k);
      if (recent.length > 5) recent.shift();
    }
    expect(usadas.length).toBe(ACIERTOS_PARA_PASAR);
  });

  it("cada etiqueta de cada mundo lectura tiene ≥12 preguntas únicas", () => {
    const files = readdirSync(join(ROOT, "content")).filter(
      (f) => f.endsWith(".json") && f !== "manifest.json" && !f.startsWith("_")
    );
    for (const f of files) {
      const c = JSON.parse(readFileSync(join(ROOT, "content", f), "utf8"));
      if (!c.bancoLectura) continue;
      const tags = new Set();
      for (const p of c.bancoLectura) for (const t of p.etiquetas || []) tags.add(t);
      for (const fase of c.fases || []) for (const t of fase.etiquetasLectura || []) tags.add(t);
      for (const t of tags) {
        const n = c.bancoLectura.filter((p) => p.etiquetas?.includes(t)).length;
        expect(n, `${f} / ${t}`).toBeGreaterThanOrEqual(12);
      }
    }
  });
});
