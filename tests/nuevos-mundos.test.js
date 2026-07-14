import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { etiquetaArea } from "../engine/PanelStats.js";
import { generarOperacionesLectura } from "../engine/QuestionGenerator.js";

const ROOT = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "content/manifest.json"), "utf8"));

const NUEVOS = [
  "ingles-3",
  "ingles-4",
  "logica-3",
  "logica-4",
  "visoespacial-3",
  "visoespacial-4",
];

describe("Mundos nuevos — inglés, lógica y visoespacial", () => {
  it("están registrados y disponibles en el manifiesto", () => {
    for (const id of NUEVOS) {
      const entry = manifest.mundos.find((m) => m.id === id);
      expect(entry, id).toBeTruthy();
      expect(entry.disponible).toBe(true);
      expect(entry.contentFile).toBe(`${id}.json`);
      expect(entry.totalFases).toBeGreaterThan(0);
    }
  });

  it("tienen área etiquetada y contenido coherente por curso", () => {
    for (const id of NUEVOS) {
      const entry = manifest.mundos.find((m) => m.id === id);
      const content = JSON.parse(
        readFileSync(join(ROOT, "content", entry.contentFile), "utf8")
      );
      expect(content.id).toBe(id);
      expect(content.curso).toBe(entry.curso);
      expect(content.area).toBe(entry.area);
      expect(content.tipoMundo).toBe("lectura");
      expect(content.fases.length).toBe(entry.totalFases);
      expect(content.bancoLectura.length).toBeGreaterThanOrEqual(20);
      expect(["Inglés", "Lógica", "Visoespacial"]).toContain(etiquetaArea(entry.area));

      for (const fase of content.fases) {
        const ops = generarOperacionesLectura(fase, { bancoLectura: content.bancoLectura });
        expect(ops.length, `${id}/${fase.id}`).toBe(fase.total);
        for (const op of ops) {
          expect(op.opciones.length).toBeGreaterThanOrEqual(2);
          expect(op.r).toBeGreaterThanOrEqual(0);
          expect(op.r).toBeLessThan(op.opciones.length);
        }
      }
    }
  });

  it("adapta el contenido: 3º más básico que 4º en inglés", () => {
    const i3 = JSON.parse(readFileSync(join(ROOT, "content/ingles-3.json"), "utf8"));
    const i4 = JSON.parse(readFileSync(join(ROOT, "content/ingles-4.json"), "utf8"));
    expect(i3.bancoLectura.some((p) => p.etiquetas.includes("vocab-colores"))).toBe(true);
    expect(i4.bancoLectura.some((p) => p.etiquetas.includes("grammar-4"))).toBe(true);
    expect(i4.bancoLectura.some((p) => p.etiquetas.includes("reading-4"))).toBe(true);
  });
});
