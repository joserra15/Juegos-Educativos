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

  it("guarda progreso independiente por mundo", () => {
    const restore = mockLocalStorage();
    Object.keys(storage).forEach((k) => delete storage[k]);

    // Evitar migración legacy en store vacío (recursión save → load → migrate)
    storage.mundos = JSON.stringify({ unicornios: createDefaultMundoState() });

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
