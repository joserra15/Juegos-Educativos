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
    expect(entry.totalFases).toBe(5);
    expect(entry.contentFile).toBe("bosque-luna.json");
    expect(etiquetaArea(entry.area)).toBe("Infantil");
    expect(etiquetaCurso(0)).toBe("Último curso de Infantil");
    expect(etiquetaCurso(0, { corto: true })).toBe("Infantil");
  });

  it("cubre solo lectura inicial, no matemáticas", () => {
    expect(content.tipoMundo).toBe("lectura");
    expect(content.curso).toBe(0);
    expect(content.fases.length).toBe(5);
    expect(content.bancoLectura.length).toBeGreaterThanOrEqual(30);

    const tags = new Set(content.bancoLectura.flatMap((p) => p.etiquetas || []));
    for (const t of ["vocales", "silabas", "palabras"]) {
      expect(tags.has(t), t).toBe(true);
    }
    for (const t of ["conteo-5", "suma-5", "resta"]) {
      expect(tags.has(t), t).toBe(false);
    }

    const idsFase = content.fases.map((f) => f.id);
    expect(idsFase).toContain("claro-vocales");
    expect(idsFase).toContain("camino-silabas");
    expect(idsFase).toContain("cueva-palabras");
    expect(idsFase).toContain("fiesta-bosque");
    expect(idsFase).not.toContain("claro-conteo");
    expect(idsFase).not.toContain("puente-sumas");
  });

  it("incluye metadatos mínimos para abrir el mundo en la app", () => {
    expect(content.mensajes?.acierto?.length).toBeGreaterThan(0);
    expect(content.mensajes?.error?.length).toBeGreaterThan(0);
    expect(content.puntosPorFase).toBeTruthy();
    expect(content.configMural).toBeTruthy();
    expect(content.leerEnVozAlta).toBe(true);
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
