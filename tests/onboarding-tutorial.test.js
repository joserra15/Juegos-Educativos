/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TUTORIAL_PASOS,
  iniciarTutorialSiNecesario,
  avanzarTutorial,
  saltarTutorial,
  tutorialCompletado,
  marcarTutorialCompletado,
  getPasoTutorialActual,
} from "../js/ui/Onboarding.js";

describe("Onboarding — tutorial guiado", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="tarjetasMundos"></div>
      <div id="botonesFases"></div>
      <div id="mochilaListaMundos"></div>
      <div class="mochila-pin-panel"></div>
      <div id="tutorialOverlay" style="display:none">
        <p id="tutorialIndicador"></p>
        <h3 id="tutorialTitulo"></h3>
        <p id="tutorialTexto"></p>
        <button id="tutorialBtnSiguiente">Siguiente</button>
      </div>
    `;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("incluye un paso de PIN que pide memorizarlo para otros dispositivos", () => {
    const pasoPin = TUTORIAL_PASOS.find((p) => p.id === "pin");
    expect(pasoPin).toBeTruthy();
    expect(pasoPin.texto.toLowerCase()).toMatch(/pin/);
    expect(pasoPin.texto.toLowerCase()).toMatch(/memoriz/);
    expect(pasoPin.texto.toLowerCase()).toMatch(/dispositivo|navegador/);
    expect(pasoPin.texto.toLowerCase()).toMatch(/nombre|alias/);
    expect(pasoPin.target).toBe(".mochila-pin-panel");
    expect(pasoPin.accion).toBe("abrirMochila");
  });

  it("define acciones reales para abrir selector, mapa y mochila", () => {
    const acciones = TUTORIAL_PASOS.map((p) => p.accion);
    expect(acciones).toContain("abrirSelector");
    expect(acciones).toContain("abrirMapaDemo");
    expect(acciones).toContain("abrirMochila");
    expect(acciones.every(Boolean)).toBe(true);
  });

  it("ejecuta la acción del paso y resalta un target con contenido", async () => {
    const abrirSelector = vi.fn(() => {
      document.getElementById("tarjetasMundos").innerHTML = "<button>Mundo demo</button>";
    });

    iniciarTutorialSiNecesario({ abrirSelector });
    await vi.waitFor(() => {
      expect(abrirSelector).toHaveBeenCalledOnce();
      expect(document.getElementById("tutorialOverlay").style.display).toBe("flex");
    });

    expect(document.getElementById("tutorialTitulo").textContent).toContain("mundo");
    expect(document.querySelector("#tarjetasMundos.tutorial-highlight")).toBeTruthy();
    expect(getPasoTutorialActual()).toBe(0);
  });

  it("abre la mochila en el paso de PIN y marca el tutorial completado al acabar", async () => {
    const abrirSelector = vi.fn();
    const abrirMapaDemo = vi.fn();
    const abrirMochila = vi.fn();
    const acciones = { abrirSelector, abrirMapaDemo, abrirMochila };

    iniciarTutorialSiNecesario(acciones);
    await vi.waitFor(() => expect(abrirSelector).toHaveBeenCalled());

    for (let i = 0; i < TUTORIAL_PASOS.length; i++) {
      avanzarTutorial(acciones);
      await Promise.resolve();
    }

    await vi.waitFor(() => expect(tutorialCompletado()).toBe(true));
    expect(abrirMochila).toHaveBeenCalled();
    expect(document.getElementById("tutorialOverlay").style.display).toBe("none");
  });

  it("permite saltar el tutorial", () => {
    iniciarTutorialSiNecesario({ abrirSelector: vi.fn() });
    saltarTutorial();
    expect(tutorialCompletado()).toBe(true);
    expect(document.getElementById("tutorialOverlay").style.display).toBe("none");
  });

  it("no reinicia el tutorial si ya estaba completado", () => {
    marcarTutorialCompletado();
    const abrirSelector = vi.fn();
    iniciarTutorialSiNecesario({ abrirSelector });
    expect(abrirSelector).not.toHaveBeenCalled();
  });
});
