/**
 * Fase D — Selector de mundos con tarjetas animadas y badges.
 */

import { getProgresoMundo } from "../../engine/WorldManager.js";
import { etiquetaArea, etiquetaCurso } from "../../engine/PanelStats.js";

export function getBadgeMundo(state, totalFases) {
  const completadas = state?.liberadas?.length || 0;
  if (totalFases > 0 && completadas >= totalFases) return { tipo: "completado", texto: "Completado" };
  if (completadas > 0) return { tipo: "iniciado", texto: `${completadas} fases` };
  return { tipo: "nuevo", texto: "Nuevo" };
}

export function renderTarjetasMundos({
  container,
  manifest,
  allStates,
  fasesActuales,
  mundoId,
  onEntrar,
}) {
  if (!container || !manifest) return;

  container.innerHTML = "";
  const cursos = [...new Set(manifest.mundos.map((m) => m.curso))].sort();

  cursos.forEach((curso) => {
    const titulo = document.createElement("h2");
    titulo.className = "titulo-curso-selector";
    titulo.textContent = etiquetaCurso(curso);
    container.appendChild(titulo);

    manifest.mundos
      .filter((m) => m.curso === curso)
      .forEach((entry) => {
        const state = allStates[entry.id] || {};
        const totalFases = entry.totalFases || (entry.id === mundoId ? fasesActuales : 8);
        const progreso = getProgresoMundo(state, totalFases);
        const badge = getBadgeMundo(state, totalFases);
        const pct = totalFases ? Math.round((progreso.completadas / totalFases) * 100) : 0;

        const card = document.createElement("button");
        card.type = "button";
        card.className = "tarjeta-mundo tarjeta-mundo-animada" + (entry.disponible ? "" : " bloqueada");
        card.style.setProperty("--card-delay", `${(entry.id?.length || 0) % 5 * 0.08}s`);

        card.innerHTML = `
          <span class="badge-mundo badge-${badge.tipo}">${badge.texto}</span>
          <span class="emoji-mundo emoji-parallax">${entry.emoji}</span>
          <strong>${entry.nombre}</strong>
          <p class="meta-mundo">${etiquetaCurso(entry.curso, { corto: true })} · ${etiquetaArea(entry.area)}</p>
          <div class="tarjeta-progreso-mini">
            <div class="tarjeta-progreso-fill" style="width:${pct}%"></div>
          </div>
          <p class="meta-mundo">${entry.disponible ? `${progreso.completadas}/${totalFases} fases · ${progreso.puntosMundo} ⭐` : "Próximamente"}</p>
        `;

        card.onclick = () => onEntrar(entry.id);
        container.appendChild(card);
      });
  });
}
