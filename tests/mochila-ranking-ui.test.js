/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { calcularDondeEstas } from "../js/ui/MochilaView.js";
import {
  obtenerPuntosRanking,
  ordenarJugadoresRanking,
  formatearFilaRanking,
  renderListaRankingPuntos,
  renderSelectorRanking,
} from "../js/ui/RankingView.js";
import { OBJETIVO_GLOBAL } from "../engine/PanelStats.js";

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

  it("formatea filas con un solo número y sin totales redundantes", () => {
    expect(formatearFilaRanking({ puesto: 1, nombre: "Ismael", puntos: 16397 }))
      .toBe("1. Ismael — 16397 ⭐");
    expect(formatearFilaRanking({ puesto: 3, nombre: "Lucía", puntos: 9381, esActual: true }))
      .toBe("👉 3. Lucía — 9381 ⭐");
    expect(formatearFilaRanking({ puesto: 3, nombre: "Lucía", puntos: 9381, esActual: true }))
      .not.toMatch(/totales|en 🦄/);
  });

  it("al filtrar por mundo muestra solo puntos del mundo (sin totales globales)", () => {
    document.body.innerHTML = '<ol id="lista"></ol>';
    const listaEl = document.getElementById("lista");
    renderListaRankingPuntos({
      listaEl,
      players,
      filtro: "unicornios",
      nombreJugador: "Ana",
    });
    const mio = [...listaEl.querySelectorAll("li")].find((li) => li.classList.contains("jugador-actual"));
    expect(mio.textContent).toBe("👉 3. Ana — 40 ⭐");
    expect(mio.textContent).not.toMatch(/totales/);
    expect(listaEl.children[0].textContent).toBe("1. Luis — 80 ⭐");
  });

  it("renderiza la selección de mundos como combo", () => {
    document.body.innerHTML = '<div id="selector"></div>';
    const container = document.getElementById("selector");
    let elegido = null;
    renderSelectorRanking({
      container,
      manifest: {
        mundos: [
          { id: "unicornios", nombre: "El Mundo de los Unicornios", emoji: "🦄", disponible: true },
          { id: "dinosaurios", nombre: "Valle de los Dinosaurios", emoji: "🦕", disponible: true },
        ],
      },
      filtroActual: "unicornios",
      onCambiar: (id) => { elegido = id; },
    });
    const select = container.querySelector("#comboRankingMundo");
    expect(select).toBeTruthy();
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("unicornios");
    expect([...select.options].map((o) => o.value)).toEqual(["global", "unicornios", "dinosaurios"]);
    select.value = "global";
    select.dispatchEvent(new Event("change"));
    expect(elegido).toBe("global");
  });
});

describe("Objetivo global colectivo", () => {
  it("está fijado en 500.000 puntos", () => {
    expect(OBJETIVO_GLOBAL).toBe(500000);
  });
});
