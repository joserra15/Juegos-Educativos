/**
 * PWA installable: detección de dispositivo, prompt nativo e instrucciones.
 */

export const PWA_DISMISS_KEY = "mm_pwa_install_dismissed";
export const PWA_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

/** @typedef {"ios" | "android" | "desktop" | "unknown"} PlatformKind */
/** @typedef {"safari" | "chrome" | "edge" | "firefox" | "samsung" | "other"} BrowserKind */

/**
 * @param {string} [ua]
 * @param {{ maxTouchPoints?: number, platform?: string, standalone?: boolean }} [nav]
 * @param {{ matchMedia?: (q: string) => { matches: boolean } }} [win]
 */
export function detectDevice(ua, nav, win) {
  const userAgent =
    ua ||
    (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");
  const n = nav || (typeof navigator !== "undefined" ? navigator : {});
  const w = win || (typeof window !== "undefined" ? window : {});

  const uaLower = userAgent.toLowerCase();
  const maxTouch = Number(n.maxTouchPoints || 0);
  const platformStr = String(n.platform || "");

  const isIPadOS =
    /ipad|ipod|iphone/.test(uaLower) ||
    (platformStr === "MacIntel" && maxTouch > 1);
  const isAndroid = /android/.test(uaLower);
  const isMobileUa = /mobile|iphone|ipod|android/.test(uaLower) || isIPadOS;

  /** @type {PlatformKind} */
  let platform = "unknown";
  if (isIPadOS) platform = "ios";
  else if (isAndroid) platform = "android";
  else if (!isMobileUa) platform = "desktop";
  else if (isMobileUa) platform = isAndroid ? "android" : "unknown";

  /** @type {BrowserKind} */
  let browser = "other";
  if (/crios/.test(uaLower)) browser = "chrome";
  else if (/fxios/.test(uaLower)) browser = "firefox";
  else if (/edg\//.test(uaLower)) browser = "edge";
  else if (/samsungbrowser/.test(uaLower)) browser = "samsung";
  else if (/firefox\//.test(uaLower)) browser = "firefox";
  else if (/chrome\//.test(uaLower) && !/edg\//.test(uaLower)) browser = "chrome";
  else if (/safari/.test(uaLower) && !/chrome|crios|android/.test(uaLower))
    browser = "safari";

  const displayStandalone =
    typeof w.matchMedia === "function" &&
    w.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean(n.standalone);
  const isInstalled = displayStandalone || iosStandalone;

  const canNativePrompt = platform !== "ios";

  return {
    platform,
    browser,
    isMobile: isMobileUa || platform === "ios" || platform === "android",
    isInstalled,
    canNativePrompt,
    isIosSafari: platform === "ios" && browser === "safari",
    label: labelDispositivo(platform, browser),
  };
}

/**
 * @param {PlatformKind} platform
 * @param {BrowserKind} browser
 */
export function labelDispositivo(platform, browser) {
  const browserLabel = {
    safari: "Safari",
    chrome: "Chrome",
    edge: "Edge",
    firefox: "Firefox",
    samsung: "Samsung Internet",
    other: "tu navegador",
  }[browser];

  if (platform === "ios") return `iPhone/iPad · ${browserLabel}`;
  if (platform === "android") return `Android · ${browserLabel}`;
  if (platform === "desktop") return `Ordenador · ${browserLabel}`;
  return browserLabel;
}

/**
 * Instrucciones de instalación según dispositivo/navegador.
 * @param {{ platform: PlatformKind, browser: BrowserKind, canNativePrompt?: boolean }} device
 * @param {{ hasNativePrompt?: boolean }} [opts]
 */
export function getInstallInstructions(device, opts = {}) {
  const { platform, browser } = device;
  const hasNative = Boolean(opts.hasNativePrompt);

  if (platform === "ios") {
    if (browser !== "safari") {
      return {
        title: "Instalar en iPhone o iPad",
        summary: "En iOS la instalación funciona mejor desde Safari.",
        steps: [
          "Abre esta web en Safari (el navegador de Apple).",
          "Pulsa el botón Compartir (cuadrado con flecha hacia arriba).",
          "Elige «Añadir a pantalla de inicio».",
          "Confirma con «Añadir».",
        ],
        showInstallButton: false,
      };
    }
    return {
      title: "Instalar en iPhone o iPad",
      summary: "Así tendrás Mundos Mágicos como una app en tu pantalla de inicio.",
      steps: [
        "Pulsa el botón Compartir (cuadrado con flecha hacia arriba).",
        "Desplázate y elige «Añadir a pantalla de inicio».",
        "Confirma con «Añadir».",
      ],
      showInstallButton: false,
    };
  }

  if (platform === "android") {
    if (hasNative) {
      return {
        title: "Instalar en Android",
        summary: "Puedes instalar Mundos Mágicos y usarla como una app.",
        steps: [
          "Pulsa «Instalar app».",
          "Confirma en el diálogo del navegador.",
        ],
        showInstallButton: true,
      };
    }
    if (browser === "firefox") {
      return {
        title: "Instalar en Android (Firefox)",
        summary: "Puedes añadir la app desde el menú del navegador.",
        steps: [
          "Abre el menú (⋮) de Firefox.",
          "Elige «Instalar» o «Añadir a pantalla de inicio».",
          "Confirma la instalación.",
        ],
        showInstallButton: false,
      };
    }
    return {
      title: "Instalar en Android",
      summary: "Si no ves el botón de instalar, usa el menú del navegador.",
      steps: [
        "Abre el menú (⋮) del navegador.",
        "Elige «Instalar aplicación», «Añadir a la pantalla de inicio» o «Instalar app».",
        "Confirma la instalación.",
      ],
      showInstallButton: false,
    };
  }

  // Desktop / unknown
  if (hasNative) {
    return {
      title: "Instalar en el ordenador",
      summary: "Instala Mundos Mágicos para abrirla como una ventana propia.",
      steps: [
        "Pulsa «Instalar app».",
        "Confirma en el diálogo del navegador.",
      ],
      showInstallButton: true,
    };
  }

  if (browser === "safari") {
    return {
      title: "Instalar en Mac (Safari)",
      summary: "En Safari puedes añadir la web al Dock.",
      steps: [
        "Abre el menú Archivo.",
        "Elige «Añadir al Dock» (macOS Sequoia+) o «Añadir a la pantalla de inicio».",
      ],
      showInstallButton: false,
    };
  }

  if (browser === "firefox") {
    return {
      title: "Instalar desde Firefox",
      summary: "Firefox no ofrece el mismo instalador que Chrome o Edge.",
      steps: [
        "Para instalar como app, abre esta web en Chrome o Edge.",
        "También puedes marcar la página como favorita para acceso rápido.",
      ],
      showInstallButton: false,
    };
  }

  return {
    title: "Instalar Mundos Mágicos",
    summary: "Busca la opción de instalar en la barra de direcciones o en el menú.",
    steps: [
      "Mira el icono de instalar (⊕ o monitor) en la barra de direcciones.",
      "O abre el menú del navegador y elige «Instalar Mundos Mágicos» / «Instalar aplicación».",
      "Si no aparece, prueba con Chrome o Edge actualizados y con conexión HTTPS.",
    ],
    showInstallButton: false,
  };
}

export function isDismissed(now = Date.now()) {
  try {
    const raw = localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < PWA_DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissPrompt(now = Date.now()) {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, String(now));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearDismiss() {
  try {
    localStorage.removeItem(PWA_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {ReturnType<typeof detectDevice>} device
 * @param {{ hasNativePrompt?: boolean, force?: boolean }} [opts]
 */
export function shouldShowInstallUi(device, opts = {}) {
  if (device.isInstalled) return false;
  if (opts.force) return true;
  if (isDismissed()) return false;
  if (opts.hasNativePrompt) return true;
  // iOS y navegadores sin prompt nativo: mostrar instrucciones
  if (device.platform === "ios") return true;
  if (device.platform === "android") return true;
  // En escritorio sin evento beforeinstallprompt, no molestar con banner
  // (sí se puede abrir desde el botón manual "Cómo instalar")
  return false;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renderiza el contenido del modal/banner según el dispositivo.
 * @param {HTMLElement} root
 * @param {{
 *   device: ReturnType<typeof detectDevice>,
 *   hasNativePrompt?: boolean,
 *   mode?: "banner" | "modal",
 * }} opts
 */
export function renderInstallUi(root, opts) {
  if (!root) return;
  const { device, hasNativePrompt = false, mode = "modal" } = opts;
  const info = getInstallInstructions(device, { hasNativePrompt });
  const isBanner = mode === "banner";

  const stepsHtml = info.steps
    .map((step, i) => `<li><span class="pwa-step-num">${i + 1}</span>${escapeHtml(step)}</li>`)
    .join("");

  let primaryBtn = "";
  if (info.showInstallButton && hasNativePrompt) {
    primaryBtn = `<button type="button" class="pwa-btn-instalar" data-pwa-action="install">📲 Instalar app</button>`;
  } else if (isBanner) {
    primaryBtn = `<button type="button" class="pwa-btn-instalar" data-pwa-action="open-modal">📲 Cómo instalar</button>`;
  }

  const secondaryBtn = isBanner
    ? `<button type="button" class="pwa-btn-texto" data-pwa-action="dismiss">Ahora no</button>`
    : `<button type="button" class="pwa-btn-secundario" data-pwa-action="close">Entendido</button>
        <button type="button" class="pwa-btn-texto" data-pwa-action="dismiss">Ahora no</button>`;

  const summary = isBanner
    ? "Instálala en tu dispositivo para jugar a pantalla completa, también sin conexión."
    : info.summary;

  root.innerHTML = `
    <div class="pwa-install-caja ${isBanner ? "pwa-install-banner-caja" : ""}" role="document">
      <div class="pwa-install-cabecera">
        <img src="icon-192.png" alt="" class="pwa-install-icon" width="48" height="48">
        <div>
          <h3 id="pwaInstallTitulo">${escapeHtml(isBanner ? "Lleva Mundos Mágicos contigo" : info.title)}</h3>
          <p class="pwa-install-device">${escapeHtml(device.label)}</p>
        </div>
      </div>
      <p class="pwa-install-summary">${escapeHtml(summary)}</p>
      ${isBanner ? "" : `<ol class="pwa-install-steps">${stepsHtml}</ol>`}
      <div class="pwa-install-acciones">
        ${primaryBtn}
        ${secondaryBtn}
      </div>
    </div>
  `;
}

/**
 * Inicializa listeners de instalación PWA y UI.
 * @param {{
 *   bannerId?: string,
 *   modalId?: string,
 *   triggerId?: string,
 *   autoShowDelayMs?: number,
 * }} [config]
 */
export function initPwaInstall(config = {}) {
  const bannerId = config.bannerId || "pwaInstallBanner";
  const modalId = config.modalId || "pwaInstallModal";
  const triggerId = config.triggerId || "btnInstalarPwa";
  const delay = config.autoShowDelayMs ?? 2500;

  const device = detectDevice();
  /** @type {Event | null} */
  let deferredPrompt = null;
  let uiReady = false;

  const banner = document.getElementById(bannerId);
  const modal = document.getElementById(modalId);
  const trigger = document.getElementById(triggerId);

  function hasNativePrompt() {
    return Boolean(deferredPrompt);
  }

  function hideBanner() {
    if (banner) {
      banner.hidden = true;
      banner.setAttribute("aria-hidden", "true");
    }
  }

  function hideModal() {
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.style.display = "none";
    }
  }

  function showModal(force = false) {
    if (!modal) return;
    if (device.isInstalled && !force) return;
    renderInstallUi(modal, {
      device,
      hasNativePrompt: hasNativePrompt(),
      mode: "modal",
    });
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "flex";
    bindActions(modal);
  }

  function showBanner() {
    if (!banner) return;
    if (!shouldShowInstallUi(device, { hasNativePrompt: hasNativePrompt() })) {
      hideBanner();
      return;
    }
    renderInstallUi(banner, {
      device,
      hasNativePrompt: hasNativePrompt(),
      mode: "banner",
    });
    banner.hidden = false;
    banner.setAttribute("aria-hidden", "false");
    bindActions(banner);
  }

  /**
   * @param {HTMLElement} root
   */
  function bindActions(root) {
    root.querySelectorAll("[data-pwa-action]").forEach((el) => {
      el.addEventListener("click", onActionClick);
    });
  }

  /**
   * @param {Event} ev
   */
  async function onActionClick(ev) {
    const target = /** @type {HTMLElement} */ (ev.currentTarget);
    const action = target.getAttribute("data-pwa-action");
    if (action === "install") {
      await promptInstall();
      return;
    }
    if (action === "open-modal") {
      hideBanner();
      showModal(true);
      return;
    }
    if (action === "dismiss") {
      dismissPrompt();
      hideBanner();
      hideModal();
      return;
    }
    if (action === "close") {
      hideBanner();
      hideModal();
    }
  }

  async function promptInstall() {
    if (!deferredPrompt) {
      showModal(true);
      return false;
    }
    const promptEvent = /** @type {any} */ (deferredPrompt);
    deferredPrompt = null;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      hideBanner();
      hideModal();
      return choice?.outcome === "accepted";
    } catch {
      showModal(true);
      return false;
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (uiReady && !device.isInstalled && !isDismissed()) {
        showBanner();
      }
      if (trigger) trigger.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      hideBanner();
      hideModal();
      if (trigger) {
        trigger.hidden = true;
        trigger.setAttribute("aria-label", "App instalada");
      }
    });
  }

  if (trigger) {
    trigger.hidden = device.isInstalled;
    trigger.addEventListener("click", () => showModal(true));
  }

  uiReady = true;

  if (!device.isInstalled) {
    if (trigger) trigger.hidden = false;
    window.setTimeout(() => {
      if (shouldShowInstallUi(device, { hasNativePrompt: hasNativePrompt() })) {
        showBanner();
      }
    }, delay);
  } else {
    hideBanner();
    if (trigger) trigger.hidden = true;
  }

  return {
    device,
    showModal,
    showBanner,
    hideBanner,
    hideModal,
    promptInstall,
    getDeferredPrompt: () => deferredPrompt,
  };
}
