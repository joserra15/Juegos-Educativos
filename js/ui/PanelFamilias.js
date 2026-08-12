/**
 * Fase F — Panel familias: gráficos por área y exportación de resumen.
 */

import {
  calcularProgresoPorArea,
  etiquetaArea,
  generarResumenExportable,
} from "@engine/PanelStats";

export function renderGraficosArea(manifest, allStates, containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  const areas = calcularProgresoPorArea(manifest, allStates);
  cont.innerHTML = "";

  if (!areas.length) {
    cont.innerHTML = "<p class='texto-ayuda'>Aún no hay datos por área.</p>";
    return;
  }

  areas.forEach((a) => {
    const item = document.createElement("div");
    item.className = "grafico-area-item";
    item.innerHTML = `
      <div class="grafico-area-cabecera">
        <span class="grafico-area-nombre">${etiquetaArea(a.area)}</span>
        <span class="grafico-area-pct">${a.porcentaje}%</span>
      </div>
      <div class="grafico-area-track">
        <div class="grafico-area-fill" style="width:${a.porcentaje}%"></div>
      </div>
      <p class="grafico-area-meta">${a.fasesCompletadas} fases · ${a.puntos} ⭐ · ${a.mundos} mundos</p>
    `;
    cont.appendChild(item);
  });
}

export function descargarResumen(texto, nombreArchivo = "resumen-mundos-magicos.txt") {
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarResumenJugador({
  nombreJugador,
  puntos,
  mundosStates,
  manifest,
  intentosTotales,
  ciudad = "",
  colegio = "",
}) {
  const texto = generarResumenExportable({
    nombreJugador,
    puntos,
    mundosStates: mundosStates,
    manifest,
    intentosTotales,
    ciudad,
    colegio,
  });
  const slug = (nombreJugador || "jugador").replace(/\s+/g, "-").toLowerCase();
  descargarResumen(texto, `resumen-${slug}.txt`);
}
