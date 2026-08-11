/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  detectDevice,
  getInstallInstructions,
  shouldShowInstallUi,
  dismissPrompt,
  clearDismiss,
  isDismissed,
  renderInstallUi,
  initPwaInstall,
  PWA_DISMISS_KEY,
} from "../js/ui/PwaInstall.js";

describe("PWA — detección de dispositivo", () => {
  it("detecta iPhone Safari", () => {
    const d = detectDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      { maxTouchPoints: 5, platform: "iPhone", standalone: false },
      { matchMedia: () => ({ matches: false }) }
    );
    expect(d.platform).toBe("ios");
    expect(d.browser).toBe("safari");
    expect(d.isIosSafari).toBe(true);
    expect(d.isInstalled).toBe(false);
    expect(d.label).toMatch(/iPhone|iPad/);
  });

  it("detecta iPadOS con UA de Mac y multitouch", () => {
    const d = detectDevice(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      { maxTouchPoints: 5, platform: "MacIntel", standalone: false },
      { matchMedia: () => ({ matches: false }) }
    );
    expect(d.platform).toBe("ios");
    expect(d.browser).toBe("safari");
  });

  it("detecta Android Chrome", () => {
    const d = detectDevice(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      { maxTouchPoints: 5, platform: "Linux armv8l" },
      { matchMedia: () => ({ matches: false }) }
    );
    expect(d.platform).toBe("android");
    expect(d.browser).toBe("chrome");
    expect(d.canNativePrompt).toBe(true);
  });

  it("detecta escritorio Edge y modo instalado", () => {
    const d = detectDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      { maxTouchPoints: 0, platform: "Win32" },
      { matchMedia: (q) => ({ matches: q.includes("standalone") }) }
    );
    expect(d.platform).toBe("desktop");
    expect(d.browser).toBe("edge");
    expect(d.isInstalled).toBe(true);
  });
});

describe("PWA — instrucciones de instalación", () => {
  it("da pasos de Compartir en iOS Safari", () => {
    const info = getInstallInstructions({ platform: "ios", browser: "safari" });
    expect(info.showInstallButton).toBe(false);
    expect(info.steps.join(" ")).toMatch(/Compartir|pantalla de inicio/i);
  });

  it("pide abrir Safari si iOS usa Chrome", () => {
    const info = getInstallInstructions({ platform: "ios", browser: "chrome" });
    expect(info.steps.join(" ")).toMatch(/Safari/i);
    expect(info.showInstallButton).toBe(false);
  });

  it("muestra botón nativo en Android cuando hay prompt", () => {
    const info = getInstallInstructions(
      { platform: "android", browser: "chrome" },
      { hasNativePrompt: true }
    );
    expect(info.showInstallButton).toBe(true);
  });

  it("explica el menú en Firefox Android sin prompt", () => {
    const info = getInstallInstructions(
      { platform: "android", browser: "firefox" },
      { hasNativePrompt: false }
    );
    expect(info.showInstallButton).toBe(false);
    expect(info.steps.join(" ")).toMatch(/menú|Instalar|pantalla/i);
  });
});

describe("PWA — visibilidad y dismiss", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("no muestra UI si ya está instalada", () => {
    expect(
      shouldShowInstallUi({
        platform: "android",
        browser: "chrome",
        isInstalled: true,
      }, { hasNativePrompt: true })
    ).toBe(false);
  });

  it("muestra UI en iOS aunque no haya prompt nativo", () => {
    expect(
      shouldShowInstallUi({
        platform: "ios",
        browser: "safari",
        isInstalled: false,
      })
    ).toBe(true);
  });

  it("respeta el dismiss temporal", () => {
    dismissPrompt(1_000);
    expect(isDismissed(1_000 + 1000)).toBe(true);
    clearDismiss();
    expect(localStorage.getItem(PWA_DISMISS_KEY)).toBeNull();
    expect(isDismissed()).toBe(false);
  });

  it("en escritorio sin prompt no muestra banner automático", () => {
    expect(
      shouldShowInstallUi({
        platform: "desktop",
        browser: "chrome",
        isInstalled: false,
      }, { hasNativePrompt: false })
    ).toBe(false);
  });
});

describe("PWA — render e init", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <button id="btnInstalarPwa" hidden>Instalar</button>
      <div id="pwaInstallBanner" hidden></div>
      <div id="pwaInstallModal" hidden style="display:none"></div>
    `;
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      get: () => false,
    });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("renderiza instrucciones iOS en el modal", () => {
    const root = document.getElementById("pwaInstallModal");
    renderInstallUi(root, {
      device: {
        platform: "ios",
        browser: "safari",
        label: "iPhone/iPad · Safari",
        isInstalled: false,
      },
      mode: "modal",
    });
    expect(root.textContent).toMatch(/pantalla de inicio/i);
    expect(root.querySelector("[data-pwa-action='install']")).toBeNull();
  });

  it("en banner iOS ofrece abrir el modal de instrucciones", () => {
    const root = document.getElementById("pwaInstallBanner");
    renderInstallUi(root, {
      device: {
        platform: "ios",
        browser: "safari",
        label: "iPhone/iPad · Safari",
        isInstalled: false,
      },
      mode: "banner",
    });
    expect(root.querySelector("[data-pwa-action='open-modal']")).toBeTruthy();
  });

  it("init muestra el trigger y el banner en iOS tras el delay", async () => {
    vi.useFakeTimers();
    const api = initPwaInstall({ autoShowDelayMs: 100 });
    expect(api.device.platform).toBe("ios");
    expect(document.getElementById("btnInstalarPwa").hidden).toBe(false);

    vi.advanceTimersByTime(150);
    const banner = document.getElementById("pwaInstallBanner");
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toMatch(/Mundos Mágicos/i);
  });

  it("el trigger abre el modal con pasos", () => {
    initPwaInstall({ autoShowDelayMs: 60_000 });
    document.getElementById("btnInstalarPwa").click();
    const modal = document.getElementById("pwaInstallModal");
    expect(modal.hidden).toBe(false);
    expect(modal.textContent).toMatch(/Compartir|pantalla de inicio/i);
  });
});
