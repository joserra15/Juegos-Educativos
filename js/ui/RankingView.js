/**
 * Fase F — Ranking amigable y panel global narrativo.
 */

import { formatearTiempo } from "../../engine/QuestionGenerator.js";
import {
  calcularMejorasPersonales,
  obtenerHitoHechizo,
  OBJETIVO_GLOBAL,
} from "../../engine/PanelStats.js";
import { getFaseLabel } from "../../engine/ContentLoader.js";

const SNAPSHOT_KEY = "recordSnapshotTiempos";

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
