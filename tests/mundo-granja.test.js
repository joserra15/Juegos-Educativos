import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { etiquetaArea, etiquetaCurso } from "../engine/PanelStats.js";
import { generarOperacionesLectura, generarBancoFase } from "../engine/QuestionGenerator.js";

const ROOT = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "content/manifest.json"), "utf8"));
const content = JSON.parse(readFileSync(join(ROOT, "content/granja-numeros.json"), "utf8"));

describe("Mundo Infantil — La Granja de los Números", () => {
  it("está registrado y disponible para Infantil", () => {
    const entry = manifest.mundos.find((m) => m.id === "granja-numeros");
    expect(entry).toBeTruthy();
    expect(entry.disponible).toBe(true);
    expect(entry.curso).toBe(0);
    expect(entry.area).toBe("infantil");
    expect(entry.totalFases).toBe(9);
    expect(entry.contentFile).toBe("granja-numeros.json");
    expect(etiquetaArea(entry.area)).toBe("Infantil");
    expect(etiquetaCurso(0, { corto: true })).toBe("Infantil");
  });

  it("cubre matemáticas de Infantil y no mezcla lectura", () => {
    expect(content.tipoMundo).toBe("lectura");
    expect(content.leerEnVozAlta).toBe(true);
    expect(content.curso).toBe(0);
    expect(content.fases.length).toBe(9);
    expect(content.bancoLectura.length).toBeGreaterThanOrEqual(80);

    const tags = new Set(content.bancoLectura.flatMap((p) => p.etiquetas || []));
    for (const t of ["conteo-5", "conteo-10", "suma-5", "suma-10", "comparar-mas", "comparar-menos", "resta"]) {
      expect(tags.has(t), t).toBe(true);
    }
    for (const t of ["vocales", "silabas", "palabras"]) {
      expect(tags.has(t), t).toBe(false);
    }

    expect(content.bancoLectura.every((p) => p.textoVoz && p.textoVoz.length > 8)).toBe(true);
    expect(content.mensajes?.acierto?.length).toBeGreaterThan(0);
  });

  it("genera preguntas válidas de opción múltiple por fase", () => {
    for (const fase of content.fases) {
      const ops = generarOperacionesLectura(fase, { bancoLectura: content.bancoLectura });
      expect(ops.length, fase.id).toBe(fase.total);
      for (const op of ops) {
        expect(op.opciones.length).toBeGreaterThanOrEqual(2);
        expect(op.r).toBeGreaterThanOrEqual(0);
        expect(op.r).toBeLessThan(op.opciones.length);
        expect(op.textoCorrecto).toBe(op.opciones[op.r]);
        expect(op.textoVoz == null || typeof op.textoVoz === "string").toBe(true);
      }
      const banco = generarBancoFase(fase, { bancoLectura: content.bancoLectura, tipoMundo: "lectura" });
      expect(banco.length, `banco ${fase.id}`).toBeGreaterThanOrEqual(fase.total);
    }
  });
});
