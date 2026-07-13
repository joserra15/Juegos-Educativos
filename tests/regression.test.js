import { describe, it, expect } from "vitest";
import { getFaseLabel } from "../engine/ContentLoader.js";
import {
  createDefaultMundoState,
  loadMundoState,
  saveMundoState,
  loadAllMundosStates,
  getTiemposMundoFromFirebase,
  normalizarLiberadas,
  parseFirebaseData,
} from "../engine/ProgressStore.js";
import { getProgresoMundo } from "../engine/WorldManager.js";
import {
  indiceFaseDisponible,
  esFaseAvanzadaDesbloqueada,
  evaluarEstadoFase,
  clavesPermitidasFases,
  filtrarTiemposPorMundo,
  crearContextoRanking,
  combinarTiemposJugador,
  obtenerTiempoFase,
  liberarFase,
} from "../engine/PhaseProgress.js";
import {
  usaSesionExtendida,
  esFaseFinal,
  ACIERTOS_PARA_PASAR,
  FALLOS_MAX_FASE_FINAL,
  calcularProgresoRevelado,
  nivelDificultadSesion,
  elegirPreguntaDelBanco,
  faseSuperada,
  debeReiniciarFase,
} from "../engine/SessionEngine.js";
import { generarBancoFase } from "../engine/QuestionGenerator.js";

const fasesUnicornios = [
  { id: "prado-rosa", nombre: "Prado Rosa", emoji: "🌸", total: 8 },
  { id: "bosque-luna", nombre: "Bosque de Luna", emoji: "🌙", total: 8 },
  { id: "torre-hechizo", nombre: "Torre del Hechizo", emoji: "🌀", tipo: "avanzada", desbloqueoClase: 60000 },
];

const fasesDinos = [
  { id: "pradera-inicial", nombre: "Pradera Inicial", emoji: "🌿", total: 6 },
  { id: "valle-fosiles", nombre: "Valle de Fósiles", emoji: "🦴", total: 6 },
];

describe("Regresión: desbloqueo secuencial de fases", () => {
  it("solo la fase 0 está disponible al empezar", () => {
    const liberadas = normalizarLiberadas(createDefaultMundoState());
    expect(liberadas).toEqual([]);
    expect(indiceFaseDisponible(liberadas, 0)).toBe(true);
    expect(indiceFaseDisponible(liberadas, 1)).toBe(false);
    expect(indiceFaseDisponible(liberadas, 2)).toBe(false);
  });

  it("desbloquea la siguiente fase al completar la anterior", () => {
    let liberadas = [];
    liberadas = liberarFase(liberadas, 0);
    expect(indiceFaseDisponible(liberadas, 1)).toBe(true);
    expect(indiceFaseDisponible(liberadas, 2)).toBe(false);

    liberadas = liberarFase(liberadas, 1);
    expect(indiceFaseDisponible(liberadas, 2)).toBe(true);
  });

  it("no duplica fases al repetir una ya completada", () => {
    const una = liberarFase([0], 0);
    expect(una).toEqual([0]);
    const dos = liberarFase([0, 1], 1);
    expect(dos).toEqual([0, 1]);
  });
});

describe("Regresión: fases avanzadas y colectivas", () => {
  it("bloquea fase avanzada sin puntos globales suficientes", () => {
    const estado = evaluarEstadoFase(fasesUnicornios[2], 2, [0, 1], 1000);
    expect(estado.disponible).toBe(false);
    expect(estado.motivo).toBe("avanzada-bloqueada");
  });

  it("desbloquea fase avanzada con requisitos cumplidos", () => {
    expect(
      esFaseAvanzadaDesbloqueada([0, 1], 2, 65000, 60000)
    ).toBe(true);
    const estado = evaluarEstadoFase(fasesUnicornios[2], 2, [0, 1], 65000);
    expect(estado.disponible).toBe(true);
  });

  it("respeta fases siempre activas", () => {
    const fase = { id: "repaso", siempreActiva: true };
    expect(evaluarEstadoFase(fase, 5, [], 0).disponible).toBe(true);
  });
});

describe("Regresión: aislamiento multi-mundo", () => {
  const storage = {};

  function mockLocalStorage() {
    const original = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, value) => { storage[key] = value; },
      removeItem: (key) => { delete storage[key]; },
    };
    return () => { globalThis.localStorage = original; };
  }

  it("migra legacy sin recursión cuando el store está vacío", () => {
    const restore = mockLocalStorage();
    Object.keys(storage).forEach((k) => delete storage[k]);
    storage.fasesLiberadas = JSON.stringify([0, 1]);
    storage.puntos = "42";

    const mundos = loadAllMundosStates();
    expect(mundos.unicornios.liberadas).toEqual([0, 1]);
    expect(mundos.unicornios.puntosMundo).toBe(42);
    expect(JSON.parse(storage.mundos).unicornios.liberadas).toEqual([0, 1]);
    restore();
  });

  it("guarda progreso independiente por mundo", () => {
    const restore = mockLocalStorage();
    Object.keys(storage).forEach((k) => delete storage[k]);

    saveMundoState("unicornios", {
      ...createDefaultMundoState(),
      liberadas: [0, 1],
      puntosMundo: 25,
    });
    saveMundoState("dinosaurios", {
      ...createDefaultMundoState(),
      liberadas: [0],
      puntosMundo: 10,
    });

    const uni = loadMundoState("unicornios");
    const dino = loadMundoState("dinosaurios");
    expect(uni.liberadas).toEqual([0, 1]);
    expect(dino.liberadas).toEqual([0]);
    expect(uni.puntosMundo).toBe(25);
    expect(dino.puntosMundo).toBe(10);

    const todos = loadAllMundosStates();
    expect(Object.keys(todos)).toContain("unicornios");
    expect(Object.keys(todos)).toContain("dinosaurios");
    restore();
  });

  it("calcula progreso por mundo sin mezclar fases", () => {
    const pUni = getProgresoMundo({ liberadas: [0, 1, 2], puntosMundo: 30 }, 8);
    const pDino = getProgresoMundo({ liberadas: [0], puntosMundo: 10 }, 6);
    expect(pUni.completadas).toBe(3);
    expect(pDino.completadas).toBe(1);
  });
});

describe("Regresión: tiempos y ranking por mundo", () => {
  it("filtra claves de tiempo al mundo activo", () => {
    const claves = clavesPermitidasFases(fasesDinos);
    const firebase = {
      mundos: {
        dinosaurios: {
          tiemposMejores: {
            "pradera-inicial": 42,
            "prado-rosa": 99,
          },
        },
        unicornios: {
          tiemposMejores: { "prado-rosa": 31 },
        },
      },
      tiemposMejores: { "prado-rosa": 120 },
    };

    const tiempos = getTiemposMundoFromFirebase(firebase, "dinosaurios", claves);
    expect(tiempos["pradera-inicial"]).toBe(42);
    expect(tiempos["prado-rosa"]).toBeUndefined();
  });

  it("no filtra tiempos de otro mundo en ranking local", () => {
    const ctx = crearContextoRanking("dinosaurios", fasesDinos);
    const mezclados = {
      "pradera-inicial": 40,
      "prado-rosa": 25,
      "🌸 Prado Rosa": 30,
    };
    const filtrado = filtrarTiemposPorMundo(mezclados, ctx.clavesPermitidas);
    expect(filtrado["pradera-inicial"]).toBe(40);
    expect(filtrado["prado-rosa"]).toBeUndefined();
  });

  it("combina tiempos Firebase y locales solo para el jugador actual", () => {
    const ctx = crearContextoRanking("unicornios", fasesUnicornios.slice(0, 2));
    const firebase = { "prado-rosa": 50 };
    const local = { "prado-rosa": 35, "bosque-luna": 44 };

    const ajeno = combinarTiemposJugador({
      firebaseTiempos: firebase,
      localTiempos: local,
      esJugadorActual: false,
      fases: ctx.fasesRef,
    });
    expect(ajeno).toEqual({ "prado-rosa": 50 });

    const propio = combinarTiemposJugador({
      firebaseTiempos: firebase,
      localTiempos: local,
      esJugadorActual: true,
      fases: ctx.fasesRef,
    });
    expect(propio["prado-rosa"]).toBe(35);
    expect(propio["bosque-luna"]).toBe(44);
  });

  it("lee tiempo por id o etiqueta con emoji", () => {
    const tiempos = { "prado-rosa": 33 };
    expect(obtenerTiempoFase(tiempos, fasesUnicornios[0])).toBe(33);
    expect(obtenerTiempoFase({ [getFaseLabel(fasesUnicornios[0])]: 28 }, fasesUnicornios[0])).toBe(28);
  });

  it("crea contexto de ranking con snapshot de fases del mundo", () => {
    const ctx = crearContextoRanking("fracciones", fasesUnicornios);
    expect(ctx.mundoRef).toBe("fracciones");
    expect(ctx.fasesRef).toHaveLength(3);
    expect(ctx.clavesPermitidas.has("torre-hechizo")).toBe(true);
  });
});

describe("Regresión: sesión extendida (todos los mundos)", () => {
  it("activa sesión extendida en todos los mundos", () => {
    expect(usaSesionExtendida("dinosaurios")).toBe(true);
    expect(usaSesionExtendida("unicornios")).toBe(true);
    expect(usaSesionExtendida("fracciones")).toBe(true);
  });

  it("genera banco de al menos 50 preguntas para tablas (unicornios)", () => {
    const banco = generarBancoFase(
      { tablas: [1, 2, 3, 4, 5], total: 8 },
      {
        textos: ["Hay {a} grupos de {b} estrellas."],
        tipoMundo: "multiplicacion",
        bancoAvanzado: [],
      },
      50
    );
    expect(banco.length).toBeGreaterThanOrEqual(50);
    expect(banco[0].r).toBe(banco[0].a * banco[0].b);
  });

  it("genera banco de al menos 50 preguntas para división", () => {
    const banco = generarBancoFase(
      { mecanica: "division", divisores: [2, 3, 4, 5] },
      { textos: ["Reparte {total} entre {grupos}."], tipoMundo: "division" },
      50
    );
    expect(banco.length).toBeGreaterThanOrEqual(50);
    expect(banco[0]._dificultad).toBeLessThanOrEqual(banco[banco.length - 1]._dificultad);
  });

  it("genera banco de fracciones con opciones múltiples", () => {
    const banco = generarBancoFase(
      { mecanica: "fraccion", denominadores: [2, 3, 4] },
      { tipoMundo: "fraccion" },
      50
    );
    expect(banco.length).toBeGreaterThanOrEqual(50);
    expect(banco[0].opciones?.length).toBeGreaterThanOrEqual(4);
  });

  it("requiere 10 aciertos para superar fase", () => {
    expect(faseSuperada(9)).toBe(false);
    expect(faseSuperada(ACIERTOS_PARA_PASAR)).toBe(true);
    expect(calcularProgresoRevelado(5)).toBe(50);
    expect(calcularProgresoRevelado(10)).toBe(100);
  });

  it("reinicia fase final tras 5 fallos", () => {
    expect(esFaseFinal(4, { tipo: "avanzada" }, 6)).toBe(true);
    expect(debeReiniciarFase(4, true)).toBe(false);
    expect(debeReiniciarFase(FALLOS_MAX_FASE_FINAL, true)).toBe(true);
  });

  it("aumenta dificultad según avance en sesión", () => {
    expect(nivelDificultadSesion(0, 0)).toBe(0);
    expect(nivelDificultadSesion(5, 0)).toBe(1);
    expect(nivelDificultadSesion(8, 0)).toBe(2);
  });

  it("elige preguntas del tercio correcto del banco", () => {
    const banco = Array.from({ length: 60 }, (_, i) => ({ id: i, _dificultad: i }));
    const facil = elegirPreguntaDelBanco(banco, 0);
    const dificil = elegirPreguntaDelBanco(banco, 2);
    expect(facil._dificultad).toBeLessThan(20);
    expect(dificil._dificultad).toBeGreaterThanOrEqual(40);
  });
});

describe("Regresión: normalización legacy Firebase", () => {
  it("convierte liberadas [0] sin progreso a estado inicial vacío", () => {
    expect(normalizarLiberadas({ liberadas: [0] })).toEqual([]);
  });

  it("parsea namespace mundos sin perder mundo activo", () => {
    const parsed = parseFirebaseData({
      puntos: 80,
      mundoActivo: "dinosaurios",
      mundos: {
        dinosaurios: { liberadas: [0], tiemposMejores: {}, fallosPorOperacion: {} },
      },
    }, "dinosaurios");
    expect(parsed.mundoActivo).toBe("dinosaurios");
    expect(parsed.mundoState.liberadas).toEqual([0]);
  });
});
