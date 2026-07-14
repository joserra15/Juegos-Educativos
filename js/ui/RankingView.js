/**
 * Ranking: vista global de puntos + filtro por mundo (puntos y tiempos medios).
 */

import { formatearTiempo } from "../../engine/QuestionGenerator.js";
import {
  calcularMejorasPersonales,
  obtenerHitoHechizo,
  OBJETIVO_GLOBAL,
} from "../../engine/PanelStats.js";
import { MUNDO_LEGACY } from "../../engine/ProgressStore.js";

const SNAPSHOT_KEY = "recordSnapshotTiempos";

/** Filtro UI: "global" o id de mundo */
let rankingFiltro = "global";

export function getRankingFiltro() {
  return rankingFiltro;
}

export function setRankingFiltro(filtro) {
  rankingFiltro = filtro || "global";
}

export function guardarSnapshotRecords(tiemposMejores) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(tiemposMejores || {}));
  } catch {
    /* ignorar quota */
  }
}

export function cargarSnapshotRecords() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function renderMejoraPersonal(containerId, fases, tiemposActuales) {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  const anteriores = cargarSnapshotRecords();
  const mejoras = calcularMejorasPersonales(tiemposActuales, anteriores, fases);
  cont.innerHTML = "";

  const conMarca = mejoras.filter((m) => m.tiempoActual !== undefined);
  if (!conMarca.length) {
    cont.innerHTML = "<p class='texto-ayuda'>Completa fases para registrar tus marcas personales.</p>";
    return;
  }

  const mejoradas = conMarca.filter((m) => m.mejoro);
  if (mejoradas.length) {
    const banner = document.createElement("p");
    banner.className = "ranking-mejora-banner";
    banner.textContent = `🎉 ¡Has mejorado ${mejoradas.length} marca${mejoradas.length > 1 ? "s" : ""} desde la última visita!`;
    cont.appendChild(banner);
  }

  conMarca.slice(0, 6).forEach((m) => {
    const row = document.createElement("div");
    row.className = "ranking-mejora-item" + (m.mejoro ? " mejoro" : "");
    const delta =
      m.delta !== null && m.delta > 0
        ? ` (−${m.delta}s)`
        : m.tiempoAnterior === undefined
          ? " · nueva marca"
          : "";
    row.innerHTML = `
      <span>${m.label}</span>
      <strong>${formatearTiempo(m.tiempoActual)}${delta}</strong>
    `;
    cont.appendChild(row);
  });
}

export function renderNarrativaHechizo(containerId, puntosTotales) {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  const { actual, siguiente } = obtenerHitoHechizo(puntosTotales);
  const pct = Math.min(100, Math.round((puntosTotales / OBJETIVO_GLOBAL) * 100));

  let progresoSiguiente = "";
  if (siguiente) {
    const falta = siguiente.puntos - puntosTotales;
    progresoSiguiente = `<p class="hechizo-siguiente">Siguiente hito: <strong>${siguiente.titulo}</strong> (faltan ${falta.toLocaleString()} ⭐)</p>`;
  }

  cont.innerHTML = `
    <div class="hechizo-narrativa">
      <h4>${actual.titulo}</h4>
      <p>${actual.texto}</p>
      <div class="hechizo-barra">
        <div class="hechizo-barra-fill" style="width:${pct}%"></div>
      </div>
      <p class="hechizo-pct">${puntosTotales.toLocaleString()} / ${OBJETIVO_GLOBAL.toLocaleString()} ⭐ (${pct}%)</p>
      ${progresoSiguiente}
    </div>
  `;
}

export function renderRankingConMarcas(listaEl, snapshot, nombreJugador, fases, tiemposLocales) {
  if (!listaEl) return;
  const nota = document.getElementById("notaRankingPersonal");
  if (!nota) return;

  const mejoras = calcularMejorasPersonales(tiemposLocales, snapshot, fases);
  const n = mejoras.filter((m) => m.mejoro).length;
  if (n > 0) {
    nota.textContent = `💪 Has batido ${n} récord${n > 1 ? "s" : ""} personal${n > 1 ? "es" : ""} en este mundo. ¡Sigue así!`;
    nota.style.display = "block";
  } else if (mejoras.some((m) => m.tiempoActual !== undefined)) {
    nota.textContent = "⭐ Repite fases para mejorar tus tiempos y superarte.";
    nota.style.display = "block";
  } else {
    nota.style.display = "none";
  }
}

export function actualizarSnapshotAlSalir(tiemposMejores) {
  guardarSnapshotRecords(tiemposMejores);
}

/**
 * Puntos a mostrar en ranking según filtro.
 * Global → puntos totales; mundo → puntosPorMundo[id] (o state del mundo).
 * Jugadores antiguos solo tenían `puntos` top-level del mundo unicornios:
 * si el filtro es ese mundo y no hay desglose, usamos esos puntos.
 */
export function obtenerPuntosRanking(data, filtro) {
  if (!data) return 0;
  if (!filtro || filtro === "global") {
    return data.puntos || 0;
  }
  const porMundo = data.puntosPorMundo?.[filtro];
  if (porMundo !== undefined && porMundo !== null) return Number(porMundo) || 0;

  const estadoMundo = data.mundos?.[filtro];
  if (estadoMundo && typeof estadoMundo.puntosMundo === "number") {
    return estadoMundo.puntosMundo;
  }

  // Legacy: progreso solo en el primer mundo (unicornios), sin mundos.*
  if (filtro === MUNDO_LEGACY) {
    return Number(data.puntos) || 0;
  }
  return 0;
}

/**
 * Ordena jugadores por puntos del filtro y limita a top N.
 */
export function ordenarJugadoresRanking(players, filtro, limite = 20) {
  return [...(players || [])]
    .map((p) => ({
      ...p,
      puntosRanking: obtenerPuntosRanking(p, filtro),
    }))
    .sort((a, b) => b.puntosRanking - a.puntosRanking)
    .slice(0, limite);
}

export function renderSelectorRanking({
  container,
  manifest,
  filtroActual,
  onCambiar,
}) {
  if (!container) return;

  container.innerHTML = "";
  container.setAttribute("role", "tablist");
  container.setAttribute("aria-label", "Elegir ranking global o por mundo");

  const mkChip = (id, label, emoji = "") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ranking-chip" + (filtroActual === id ? " activa" : "");
    btn.dataset.filtro = id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", filtroActual === id ? "true" : "false");
    btn.textContent = emoji ? `${emoji} ${label}` : label;
    btn.onclick = () => onCambiar?.(id);
    return btn;
  };

  container.appendChild(mkChip("global", "Global", "🌍"));

  (manifest?.mundos || [])
    .filter((m) => m.disponible !== false)
    .forEach((m) => {
      container.appendChild(mkChip(m.id, m.nombre.replace(/^El |^La |^Los |^Las /, ""), m.emoji));
    });
}

export function renderListaRankingPuntos({
  listaEl,
  players,
  filtro,
  nombreJugador,
  etiquetaMundo = "",
}) {
  if (!listaEl) return;

  const ordenados = ordenarJugadoresRanking(players, filtro, 20);
  listaEl.innerHTML = "";

  if (!ordenados.length) {
    listaEl.innerHTML = "<li>Aún no hay datos</li>";
    return;
  }

  ordenados.forEach((data, idx) => {
    const puesto = idx + 1;
    const li = document.createElement("li");
    const esActual = data.nombre === nombreJugador;
    const pts = data.puntosRanking ?? obtenerPuntosRanking(data, filtro);

    if (filtro === "global") {
      li.textContent = esActual
        ? `👉 ${puesto}. ${data.nombre} — ${pts} ⭐`
        : `${puesto}. ${data.nombre} — ${pts} ⭐`;
    } else {
      const extraGlobal =
        data.puntos !== undefined ? ` · ${data.puntos} ⭐ totales` : "";
      li.textContent = esActual
        ? `👉 ${puesto}. ${data.nombre} — ${pts} ⭐${etiquetaMundo ? ` en ${etiquetaMundo}` : ""}${extraGlobal}`
        : `${puesto}. ${data.nombre} — ${pts} ⭐`;
    }

    if (esActual) li.classList.add("jugador-actual");
    listaEl.appendChild(li);
  });
}

/** Muestra u oculta bloques específicos del mundo seleccionado. */
export function aplicarVisibilidadRanking(filtro) {
  const esGlobal = !filtro || filtro === "global";
  const bloqueMundo = document.getElementById("bloqueRankingPorMundo");
  const tituloPuntos = document.getElementById("tituloRankingPuntos");

  if (bloqueMundo) bloqueMundo.hidden = esGlobal;

  if (tituloPuntos) {
    tituloPuntos.textContent = esGlobal
      ? "🏆 Ranking global de puntos"
      : "🏆 Ranking de puntos del mundo";
  }
}
