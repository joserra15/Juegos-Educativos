import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { etiquetaArea, etiquetaCurso } from "../engine/PanelStats.js";
import { generarOperacionesLectura, generarBancoFase } from "../engine/QuestionGenerator.js";

const ROOT = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "content/manifest.json"), "utf8"));
const content = JSON.parse(readFileSync(join(ROOT, "content/bosque-luna.json"), "utf8"));

describe("Mundo Infantil — El Bosque de Luna", () => {
  it("está registrado en el manifiesto como curso 0 (Infantil)", () => {
    const entry = manifest.mundos.find((m) => m.id === "bosque-luna");
    expect(entry).toBeTruthy();
    expect(entry.disponible).toBe(true);
    expect(entry.curso).toBe(0);
    expect(entry.area).toBe("infantil");
    expect(entry.totalFases).toBe(8);
    expect(entry.contentFile).toBe("bosque-luna.json");
    expect(etiquetaArea(entry.area)).toBe("Infantil");
    expect(etiquetaCurso(0)).toBe("Último curso de Infantil");
    expect(etiquetaCurso(0, { corto: true })).toBe("Infantil");
  });

  it("cubre conteo, suma y lectura inicial", () => {
    expect(content.tipoMundo).toBe("lectura");
    expect(content.curso).toBe(0);
    expect(content.fases.length).toBe(8);
    expect(content.bancoLectura.length).toBeGreaterThanOrEqual(60);

    const tags = new Set(content.bancoLectura.flatMap((p) => p.etiquetas || []));
    for (const t of ["conteo-5", "conteo-10", "suma-5", "suma-10", "vocales", "silabas", "palabras"]) {
      expect(tags.has(t), t).toBe(true);
    }

    const idsFase = content.fases.map((f) => f.id);
    expect(idsFase).toContain("claro-conteo");
    expect(idsFase).toContain("puente-sumas");
    expect(idsFase).toContain("claro-vocales");
    expect(idsFase).toContain("fiesta-bosque");
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
        expect(new Set(op.opciones.map(String)).size).toBe(op.opciones.length);
      }

      const banco = generarBancoFase(fase, { bancoLectura: content.bancoLectura, tipoMundo: "lectura" });
      expect(banco.length, `banco ${fase.id}`).toBeGreaterThanOrEqual(fase.total);
    }
  });
});
