import { describe, it, expect } from "vitest";
import { getFaseLabel, migrateTiempoKeys } from "../engine/ContentLoader.js";
import {
  generarOperacionesFase,
  generarOperacionesRepaso,
  generarOperacionesTabla,
  crearModeloRectangular,
  getDificultadLabel,
  formatearTiempo,
  generarBancoHechizo,
  generarBancoGigantes,
  generarOperacionesDivision,
  generarOperacionesFraccion,
  generarOperacionesLectura,
  getClaveOperacion,
} from "../engine/QuestionGenerator.js";
import {
  puntosPorFase,
  calcularPenalizacion,
  calcularNivelAdaptativo,
  calcularProporcionesDificultad,
} from "../engine/Scoring.js";
import { getHint } from "../engine/Hints.js";
import {
  createDefaultMundoState,
  parseFirebaseData,
  buildFirebasePayload,
  mergeRemoteIfNewer,
  getMundoActivoId,
  setMundoActivoId,
  getTiemposMundoFromFirebase,
  normalizarLiberadas,
} from "../engine/ProgressStore.js";
import {
  getMundoEntry,
  getProgresoMundo,
  calcularPuntosGlobales,
} from "../engine/WorldManager.js";

const fasesMock = [
  { id: "prado-rosa", nombre: "Prado Rosa", emoji: "🌸", tablas: [1, 2, 3], total: 8, recompensa: { asset: "u1.png", nombre: "Rosita" } },
  { id: "torre-hechizo", nombre: "Torre del Hechizo", emoji: "🌀", total: 5, tipo: "avanzada", recompensa: { asset: "u7.png", nombre: "Arcano" } },
];

const textos = ["Hay {a} cofres con {b} gemas."];

describe("ContentLoader", () => {
  it("genera etiqueta con emoji", () => {
    expect(getFaseLabel(fasesMock[0])).toBe("🌸 Prado Rosa");
  });

  it("migra claves antiguas a IDs", () => {
    const migrated = migrateTiempoKeys({ "🌸 Prado Rosa": 42 }, fasesMock);
    expect(migrated["prado-rosa"]).toBe(42);
  });
});

describe("QuestionGenerator", () => {
  it("genera operaciones estándar con respuestas correctas", () => {
    const ops = generarOperacionesFase(fasesMock[0], {
      textos,
      bancoAvanzado: [],
      fallosPorOperacion: {},
      nivelAdaptativo: 0,
    });
    expect(ops).toHaveLength(8);
    ops.forEach((op) => expect(op.r).toBe(op.a * op.b));
  });

  it("genera repaso desde fallos", () => {
    const ops = generarOperacionesRepaso({ "3x7": 2, "2x4": 1 }, textos, 5);
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].r).toBe(ops[0].a * ops[0].b);
  });

  it("genera práctica de una sola tabla", () => {
    const ops = generarOperacionesTabla(10, textos, 10);
    expect(ops).toHaveLength(10);
    expect(new Set(ops.map((op) => op.a))).toEqual(new Set([10]));
  });

  it("crea un modelo rectangular cuando el total es manejable", () => {
    const modelo = crearModeloRectangular({ a: 3, b: 4 });
    expect(modelo.total).toBe(12);
    expect(modelo.celdas).toHaveLength(12);
  });

  it("etiqueta dificultad por multiplicador", () => {
    expect(getDificultadLabel({ b: 3 })).toContain("fácil");
    expect(getDificultadLabel({ b: 8 })).toContain("difícil");
  });

  it("formatea tiempo mm:ss", () => {
    expect(formatearTiempo(65)).toBe("1:05");
  });

  it("genera bancos procedimentales", () => {
    const hechizo = generarBancoHechizo();
    expect(hechizo.facil.length + hechizo.media.length + hechizo.dificil.length).toBeGreaterThan(0);
    const gigantes = generarBancoGigantes();
    expect(gigantes.dificil.length).toBeGreaterThan(0);
  });
});

describe("Scoring", () => {
  it("devuelve puntos por fase", () => {
    expect(puntosPorFase(fasesMock[0], { "prado-rosa": 10 })).toBe(10);
    expect(puntosPorFase({ id: "x" }, {})).toBe(10);
  });

  it("calcula penalización mínima", () => {
    expect(calcularPenalizacion(10)).toBe(5);
    expect(calcularPenalizacion(4)).toBe(3);
  });

  it("sube nivel adaptativo con buen rendimiento", () => {
    const nivel = calcularNivelAdaptativo({
      liberadas: [0, 1],
      fases: fasesMock,
      tiemposMejores: { "prado-rosa": 20 },
      fallosPorOperacion: {},
    });
    expect(nivel).toBeGreaterThan(0);
  });

  it("ajusta proporciones de dificultad", () => {
    const { numFaciles, numMedias, numDificiles } = calcularProporcionesDificultad(12, 2);
    expect(numFaciles + numMedias + numDificiles).toBe(12);
  });
});

describe("Hints", () => {
  it("da pista conceptual en primer fallo", () => {
    expect(getHint({ a: 3, b: 4 }, 1, fasesMock[0])).toContain("grupos");
  });

  it("usa pista avanzada si existe", () => {
    expect(getHint({ pista: "descomposición" }, 1, fasesMock[1])).toContain("descomposición");
  });

  it("da pistas específicas para las tablas del 1 y del 10", () => {
    expect(getHint({ a: 1, b: 7 }, 2, fasesMock[0])).toContain("mismo número");
    expect(getHint({ a: 10, b: 4 }, 2, fasesMock[0])).toContain("añades un cero");
  });
});

describe("ProgressStore", () => {
  it("crea estado por defecto", () => {
    const state = createDefaultMundoState();
    expect(state.liberadas).toEqual([]);
  });

  it("parsea datos Firebase con namespace mundos", () => {
    const parsed = parseFirebaseData({
      puntos: 100,
      mundos: { unicornios: { liberadas: [0, 1], tiemposMejores: {}, fallosPorOperacion: {} } },
    });
    expect(parsed.puntos).toBe(100);
    expect(parsed.mundoState.liberadas).toEqual([0, 1]);
  });

  it("migra datos legacy de Firebase", () => {
    const parsed = parseFirebaseData({ puntos: 50, liberadas: [0, 2] });
    expect(parsed.mundoState.liberadas).toEqual([0, 2]);
  });

  it("construye payload con mundos y campos legacy", () => {
    const allMundosStates = {
      unicornios: {
        liberadas: [0],
        tiemposMejores: {},
        fallosPorOperacion: {},
        tablasDominadas: [],
        logros: [],
        puntosMundo: 10,
      },
    };
    const payload = buildFirebasePayload(
      "Lucia",
      { puntos: 10, puntosPorMundo: { unicornios: 10 }, intentosTotales: 5 },
      allMundosStates,
      "unicornios",
      "1234"
    );
    expect(payload.mundos.unicornios).toBeDefined();
    expect(payload.liberadas).toEqual([0]);
    expect(payload.puntosPorMundo.unicornios).toBe(10);
  });

  it("fusiona si remoto tiene más puntos", () => {
    const local = { unicornios: createDefaultMundoState() };
    const remote = { unicornios: { ...createDefaultMundoState(), liberadas: [0, 1, 2] } };
    const merged = mergeRemoteIfNewer(10, 50, local, remote);
    expect(merged.merged).toBe(true);
    expect(merged.puntos).toBe(50);
  });
});

describe("WorldManager", () => {
  const manifestMock = {
    mundos: [
      { id: "unicornios", nombre: "Unicornios", disponible: true },
      { id: "dinosaurios", nombre: "Dinosaurios", disponible: false },
    ],
  };

  it("obtiene entrada de mundo por id", () => {
    expect(getMundoEntry(manifestMock, "unicornios")?.nombre).toBe("Unicornios");
    expect(getMundoEntry(manifestMock, "inexistente")).toBeNull();
  });

  it("calcula progreso de un mundo", () => {
    const progreso = getProgresoMundo({ liberadas: [0, 1, 2], puntosMundo: 42 }, 8);
    expect(progreso.completadas).toBe(3);
    expect(progreso.puntosMundo).toBe(42);
    expect(progreso.total).toBe(8);
  });

  it("suma puntos globales de todos los mundos", () => {
    const total = calcularPuntosGlobales({
      unicornios: { puntosMundo: 30 },
      dinosaurios: { puntosMundo: 20 },
    });
    expect(total).toBe(50);
  });
});

describe("QuestionGenerator mundos ampliados", () => {
  const textosDivision = ["Reparte {total} entre {grupos} grupos."];

  it("genera operaciones de división con cociente correcto", () => {
    const ops = generarOperacionesDivision(
      { total: 6, divisores: [2, 3] },
      { textos: textosDivision, nivelAdaptativo: 0 }
    );
    expect(ops.length).toBe(6);
    expect(ops[0].tipo).toBe("division");
    expect(ops[0].a).toBe(ops[0].b * ops[0].r);
  });

  it("genera operaciones de fracciones con numerador", () => {
    const ops = generarOperacionesFraccion(
      { total: 4, denominadores: [2, 4] },
      {}
    );
    expect(ops[0].tipo).toBe("fraccion");
    expect(ops[0].r).toBe(ops[0].numerador);
  });

  it("genera preguntas de lectura con opciones", () => {
    const ops = generarOperacionesLectura(
      { total: 2 },
      {
        bancoLectura: [
          {
            texto: "¿Cuál es correcto?",
            opciones: ["A", "B", "C"],
            correcta: 1,
            pista: "B",
          },
        ],
      }
    );
    expect(ops[0].tipo).toBe("lectura");
    expect(ops[0].opciones).toHaveLength(3);
    expect(ops[0].r).toBe(1);
  });

  it("genera claves estables por tipo de operación", () => {
    expect(getClaveOperacion({ tipo: "division", a: 12, b: 3, r: 4 })).toBe("12div3");
    expect(getClaveOperacion({ tipo: "fraccion", numerador: 2, denominador: 5, r: 2 })).toBe("2/5");
    expect(getClaveOperacion({ a: 3, b: 4, r: 12 })).toBe("3x4");
  });
});

describe("ProgressStore récords multi-mundo", () => {
  it("lee tiempos del namespace del mundo activo", () => {
    const tiempos = getTiemposMundoFromFirebase({
      mundos: {
        dinosaurios: { tiemposMejores: { "pradera-inicial": 54 } },
        unicornios: { tiemposMejores: { "prado-rosa": 31 } },
      },
    }, "dinosaurios");
    expect(tiempos["pradera-inicial"]).toBe(54);
  });

  it("normaliza liberadas iniciales sin progreso", () => {
    expect(normalizarLiberadas({ liberadas: [0] })).toEqual([]);
    expect(normalizarLiberadas({
      liberadas: [0],
      tiemposMejores: { "prado-rosa": 40 },
    })).toEqual([0]);
  });
});

describe("ProgressStore mundo activo", () => {
  it("guarda y recupera el mundo activo", () => {
    const storage = {};
    const original = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, value) => { storage[key] = value; },
      removeItem: (key) => { delete storage[key]; },
    };

    setMundoActivoId("unicornios");
    expect(getMundoActivoId()).toBe("unicornios");

    globalThis.localStorage = original;
  });
});
