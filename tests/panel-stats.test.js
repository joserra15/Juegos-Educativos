import { describe, it, expect } from "vitest";
import {
  calcularProgresoPorArea,
  obtenerHitoHechizo,
  calcularMejorasPersonales,
  generarResumenExportable,
  etiquetaArea,
  etiquetaCurso,
  OBJETIVO_GLOBAL,
} from "../engine/PanelStats.js";

const manifestMock = {
  mundos: [
    { id: "unicornios", area: "matematicas", totalFases: 8, emoji: "🦄", nombre: "Unicornios" },
    { id: "biblioteca", area: "lengua", totalFases: 6, emoji: "📚", nombre: "Biblioteca" },
  ],
};

describe("PanelStats", () => {
  it("calcula progreso por área curricular", () => {
    const areas = calcularProgresoPorArea(manifestMock, {
      unicornios: { liberadas: [0, 1], puntosMundo: 30 },
      biblioteca: { liberadas: [0], puntosMundo: 10 },
    });
    const mat = areas.find((a) => a.area === "matematicas");
    const len = areas.find((a) => a.area === "lengua");
    expect(mat.porcentaje).toBe(25);
    expect(len.porcentaje).toBeGreaterThan(0);
  });

  it("obtiene hito del hechizo colectivo", () => {
    const bajo = obtenerHitoHechizo(5000);
    expect(bajo.actual.titulo).toContain("velo");
    const alto = obtenerHitoHechizo(OBJETIVO_GLOBAL);
    expect(alto.actual.titulo).toContain("Hechizo");
    expect(alto.siguiente).toBeNull();
  });

  it("detecta mejoras personales de tiempo", () => {
    const mejoras = calcularMejorasPersonales(
      { "prado-rosa": 40 },
      { "prado-rosa": 55 },
      [{ id: "prado-rosa", nombre: "Prado Rosa" }]
    );
    expect(mejoras[0].mejoro).toBe(true);
    expect(mejoras[0].delta).toBe(15);
  });

  it("genera resumen exportable con datos del jugador", () => {
    const texto = generarResumenExportable({
      nombreJugador: "Lucía",
      puntos: 120,
      intentosTotales: 45,
      manifest: manifestMock,
      mundosStates: { unicornios: { liberadas: [0], puntosMundo: 120 } },
      ciudad: "Córdoba",
      colegio: "CEIP Sol",
    });
    expect(texto).toContain("Lucía");
    expect(texto).toContain("120");
    expect(texto).toContain("Matemáticas");
    expect(texto).toContain("Córdoba");
    expect(texto).toContain("CEIP Sol");
  });

  it("etiqueta áreas en español", () => {
    expect(etiquetaArea("matematicas")).toBe("Matemáticas");
    expect(etiquetaArea("lengua")).toBe("Lengua");
    expect(etiquetaArea("ciencias")).toBe("Ciencias");
    expect(etiquetaArea("sociales")).toBe("Sociales");
    expect(etiquetaArea("ingles")).toBe("Inglés");
    expect(etiquetaArea("logica")).toBe("Lógica");
    expect(etiquetaArea("visoespacial")).toBe("Visoespacial");
    expect(etiquetaArea("infantil")).toBe("Infantil");
  });

  it("etiqueta cursos de Infantil y Primaria", () => {
    expect(etiquetaCurso(0)).toBe("Último curso de Infantil");
    expect(etiquetaCurso(0, { corto: true })).toBe("Infantil");
    expect(etiquetaCurso(3)).toBe("3º de Primaria");
    expect(etiquetaCurso(4, { corto: true })).toBe("4º");
  });
});
