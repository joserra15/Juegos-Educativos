import { describe, it, expect } from "vitest";
import { calcularDondeEstas } from "../js/ui/MochilaView.js";
import {
  obtenerPuntosRanking,
  ordenarJugadoresRanking,
} from "../js/ui/RankingView.js";

describe("Mochila — dónde estás por mundo", () => {
  const fases = [
    { id: "f1", nombre: "Fase 1", emoji: "1️⃣" },
    { id: "f2", nombre: "Fase 2", emoji: "2️⃣" },
    { id: "f3", nombre: "Fase 3", emoji: "3️⃣" },
  ];

  it("indica la fase actual sin mezclar otros mundos", () => {
    const donde = calcularDondeEstas(
      { liberadas: [0], puntosMundo: 10, tiemposMejores: { f1: 40 } },
      fases
    );
    expect(donde.completadas).toBe(1);
    expect(donde.completado).toBe(false);
    expect(donde.faseActualIndex).toBe(1);
    expect(donde.mensaje).toContain("Fase 2");
  });

  it("marca el mundo como completado", () => {
    const donde = calcularDondeEstas({ liberadas: [0, 1, 2] }, fases);
    expect(donde.completado).toBe(true);
    expect(donde.mensaje).toMatch(/completado/i);
  });

  it("muestra sin empezar cuando no hay liberadas", () => {
    const donde = calcularDondeEstas({ liberadas: [] }, fases);
    expect(donde.completadas).toBe(0);
    expect(donde.faseActualIndex).toBe(0);
    expect(donde.mensaje).toContain("Fase 1");
  });
});

describe("Ranking — puntos globales vs por mundo", () => {
  const players = [
    { nombre: "Ana", puntos: 100, puntosPorMundo: { unicornios: 40, dinosaurios: 60 } },
    { nombre: "Luis", puntos: 90, puntosPorMundo: { unicornios: 80, dinosaurios: 10 } },
    { nombre: "Mia", puntos: 50, mundos: { unicornios: { puntosMundo: 50 } } },
  ];

  it("usa puntos totales en modo global", () => {
    expect(obtenerPuntosRanking(players[0], "global")).toBe(100);
    expect(obtenerPuntosRanking(players[1], "global")).toBe(90);
  });

  it("usa puntos del mundo sin mezclar otros", () => {
    expect(obtenerPuntosRanking(players[0], "unicornios")).toBe(40);
    expect(obtenerPuntosRanking(players[1], "unicornios")).toBe(80);
    expect(obtenerPuntosRanking(players[2], "unicornios")).toBe(50);
  });

  it("usa puntos top-level legacy en unicornios si no hay desglose", () => {
    const legacy = { nombre: "Old", puntos: 150, liberadas: [0, 1, 2] };
    expect(obtenerPuntosRanking(legacy, "unicornios")).toBe(150);
    expect(obtenerPuntosRanking(legacy, "global")).toBe(150);
    expect(obtenerPuntosRanking(legacy, "dinosaurios")).toBe(0);
  });

  it("no pisa un puntosMundo 0 explícito con el total global de otro mundo", () => {
    const multi = {
      nombre: "Nueva",
      puntos: 70,
      puntosPorMundo: { unicornios: 0, dinosaurios: 70 },
    };
    expect(obtenerPuntosRanking(multi, "unicornios")).toBe(0);
    expect(obtenerPuntosRanking(multi, "dinosaurios")).toBe(70);
  });

  it("ordena ranking por mundo seleccionado", () => {
    const top = ordenarJugadoresRanking(players, "unicornios", 10);
    expect(top.map((p) => p.nombre)).toEqual(["Luis", "Mia", "Ana"]);
    expect(top[0].puntosRanking).toBe(80);
  });

  it("ordena ranking global por puntos totales", () => {
    const top = ordenarJugadoresRanking(players, "global", 10);
    expect(top.map((p) => p.nombre)).toEqual(["Ana", "Luis", "Mia"]);
  });

  it("mete jugadores legacy en el ranking de unicornios con sus puntos", () => {
    const mezcla = [
      ...players,
      { nombre: "Legacy", puntos: 200, liberadas: [0] },
    ];
    const top = ordenarJugadoresRanking(mezcla, "unicornios", 10);
    expect(top[0].nombre).toBe("Legacy");
    expect(top[0].puntosRanking).toBe(200);
  });
});
