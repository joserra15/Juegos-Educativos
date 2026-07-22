import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  normalizarYBarajarOpciones,
  barajarOpcionesOperacion,
  esSeleccionCorrecta,
  generarOperacionesLectura,
  generarBancoFase,
  generarOpcionesFraccion,
} from "../engine/QuestionGenerator.js";
import {
  elegirPreguntaDelBanco,
  claveCanonica,
  ACIERTOS_PARA_PASAR,
} from "../engine/SessionEngine.js";

const ROOT = join(import.meta.dirname, "..");
const CONTENT_DIR = join(ROOT, "content");

function mundosConBancoLectura() {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".json") && f !== "manifest.json" && !f.startsWith("_"))
    .map((f) => {
      const content = JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf8"));
      return { file: f, content };
    })
    .filter(({ content }) => Array.isArray(content.bancoLectura) && content.bancoLectura.length > 0);
}

/** Genera una operación de lectura a través de la API pública. */
function crearOpLectura(pregunta) {
  const [op] = generarOperacionesLectura({ total: 1 }, { bancoLectura: [pregunta] });
  return op;
}

describe("Opciones de selección — aleatoriedad y unicidad", () => {
  it("baraja opciones y mantiene una sola correcta", () => {
    const posiciones = new Set();
    for (let i = 0; i < 40; i++) {
      const { opciones, r, textoCorrecto } = normalizarYBarajarOpciones(
        ["Correcta", "Falsa1", "Falsa2"],
        0
      );
      expect(textoCorrecto).toBe("Correcta");
      expect(opciones[r]).toBe("Correcta");
      expect(new Set(opciones).size).toBe(3);
      expect(esSeleccionCorrecta({ opciones, r, textoCorrecto }, r)).toBe(true);
      for (let j = 0; j < opciones.length; j++) {
        if (j !== r) {
          expect(esSeleccionCorrecta({ opciones, r, textoCorrecto }, j)).toBe(false);
        }
      }
      posiciones.add(r);
    }
    expect(posiciones.size).toBeGreaterThan(1);
  });

  it("elimina duplicados y conserva la respuesta correcta", () => {
    const { opciones, r, textoCorrecto } = normalizarYBarajarOpciones(
      ["Blue", "blue", "Green", "Black", "Blue"],
      0,
      { barajar: false }
    );
    expect(textoCorrecto.toLowerCase()).toBe("blue");
    expect(opciones.filter((o) => o.toLowerCase() === "blue")).toHaveLength(1);
    expect(opciones[r].toLowerCase()).toBe("blue");
    expect(opciones.length).toBe(3);
  });

  it("rechaza selección nula o fuera de rango (evita el bug del input 0)", () => {
    const op = { opciones: ["A", "B", "C"], r: 0, textoCorrecto: "A", tipo: "lectura" };
    expect(esSeleccionCorrecta(op, null)).toBe(false);
    expect(esSeleccionCorrecta(op, undefined)).toBe(false);
    expect(esSeleccionCorrecta(op, -1)).toBe(false);
    expect(esSeleccionCorrecta(op, 3)).toBe(false);
    expect(esSeleccionCorrecta(op, 0)).toBe(true);
    expect(esSeleccionCorrecta(op, 1)).toBe(false);
  });

  it("rebaraja una operación sin perder la correcta", () => {
    const op = {
      tipo: "lectura",
      opciones: ["Sí", "No", "Quizá"],
      r: 0,
      textoCorrecto: "Sí",
    };
    const vistas = new Set();
    for (let i = 0; i < 30; i++) {
      barajarOpcionesOperacion(op);
      expect(op.opciones[op.r]).toBe("Sí");
      expect(op.textoCorrecto).toBe("Sí");
      expect(esSeleccionCorrecta(op, op.r)).toBe(true);
      vistas.add(op.r);
    }
    expect(vistas.size).toBeGreaterThan(1);
  });

  it("fracciones generan opciones únicas con una sola correcta en posición variable", () => {
    const posiciones = new Set();
    for (let i = 0; i < 30; i++) {
      const { opciones, r, textoCorrecto } = generarOpcionesFraccion(1, 2);
      expect(textoCorrecto).toBe("1/2");
      expect(opciones[r]).toBe("1/2");
      expect(new Set(opciones).size).toBe(opciones.length);
      expect(opciones.filter((o) => o === "1/2")).toHaveLength(1);
      for (let j = 0; j < opciones.length; j++) {
        expect(esSeleccionCorrecta({ opciones, r, textoCorrecto, tipo: "fraccion" }, j)).toBe(j === r);
      }
      posiciones.add(r);
    }
    expect(posiciones.size).toBeGreaterThan(1);
  });
});

describe("Regresión contenido — todos los mundos de selección (actuales y futuros)", () => {
  const mundos = mundosConBancoLectura();

  it("hay al menos un mundo con banco de lectura", () => {
    expect(mundos.length).toBeGreaterThan(0);
  });

  it("cada pregunta del banco tiene opciones válidas y una sola correcta", () => {
    for (const { file, content } of mundos) {
      for (const p of content.bancoLectura) {
        expect(Array.isArray(p.opciones), `${file}/${p.id}`).toBe(true);
        expect(p.opciones.length, `${file}/${p.id}`).toBeGreaterThanOrEqual(2);

        const unicas = new Set(p.opciones.map((o) => String(o).trim().toLowerCase()));
        expect(unicas.size, `${file}/${p.id} opciones duplicadas`).toBe(p.opciones.length);

        expect(Number.isInteger(p.correcta), `${file}/${p.id}`).toBe(true);
        expect(p.correcta, `${file}/${p.id}`).toBeGreaterThanOrEqual(0);
        expect(p.correcta, `${file}/${p.id}`).toBeLessThan(p.opciones.length);

        const { opciones, r, textoCorrecto } = normalizarYBarajarOpciones(p.opciones, p.correcta);
        expect(opciones[r]).toBe(textoCorrecto);
        expect(opciones.filter((o) => o === textoCorrecto)).toHaveLength(1);

        let aciertos = 0;
        for (let i = 0; i < opciones.length; i++) {
          if (esSeleccionCorrecta({ opciones, r, textoCorrecto, tipo: "lectura" }, i)) aciertos++;
        }
        expect(aciertos, `${file}/${p.id} debe tener exactamente 1 correcta`).toBe(1);
      }
    }
  });

  it("al generar operaciones, la correcta no queda siempre en la primera posición", () => {
    for (const { file, content } of mundos) {
      const muestra = content.bancoLectura.slice(0, Math.min(8, content.bancoLectura.length));
      for (const p of muestra) {
        const posiciones = new Set();
        const textoEsperado = String(p.opciones[p.correcta]);
        for (let i = 0; i < 24; i++) {
          const op = crearOpLectura(p);
          expect(op.opciones[op.r], `${file}/${p.id}`).toBe(textoEsperado);
          expect(op.textoCorrecto, `${file}/${p.id}`).toBe(textoEsperado);
          posiciones.add(op.r);
        }
        expect(posiciones.size, `${file}/${p.id} no aleatoriza posición`).toBeGreaterThan(1);
      }
    }
  });

  it("en una sesión de fase no se repiten preguntas hasta agotar el banco filtrado", () => {
    for (const { file, content } of mundos) {
      for (const fase of content.fases || []) {
        if ((fase.mecanica || content.tipoMundo) !== "lectura") continue;
        const banco = generarBancoFase(
          fase,
          { bancoLectura: content.bancoLectura, tipoMundo: "lectura" },
          50
        );
        const unicas = new Set(banco.map(claveCanonica));
        expect(unicas.size, `${file}/${fase.id}`).toBe(banco.length);

        const usadas = [];
        const recent = [];
        const objetivo = Math.min(ACIERTOS_PARA_PASAR, banco.length);
        for (let i = 0; i < objetivo; i++) {
          const op = elegirPreguntaDelBanco(banco, Math.min(2, Math.floor(i / 3)), recent, usadas);
          const k = claveCanonica(op);
          expect(usadas, `${file}/${fase.id} repite ${k}`).not.toContain(k);
          usadas.push(k);
          recent.push(k);
          if (recent.length > 5) recent.shift();

          barajarOpcionesOperacion(op);
          expect(esSeleccionCorrecta(op, op.r)).toBe(true);
          let correctas = 0;
          for (let j = 0; j < op.opciones.length; j++) {
            if (esSeleccionCorrecta(op, j)) correctas++;
          }
          expect(correctas).toBe(1);
        }
      }
    }
  });

  it("inglés: solo una opción es correcta aunque correcta en JSON sea 0", () => {
    const ingles = mundos.find((m) => m.content.id === "ingles-3" || m.file === "ingles-3.json");
    expect(ingles).toBeTruthy();
    for (const p of ingles.content.bancoLectura) {
      const op = crearOpLectura(p);
      let correctas = 0;
      for (let i = 0; i < op.opciones.length; i++) {
        if (esSeleccionCorrecta(op, i)) correctas++;
      }
      expect(correctas, `ingles ${p.id}`).toBe(1);
      expect(esSeleccionCorrecta(op, null)).toBe(false);
    }
  });
});
