/**
 * Mochila por mundos: la información no se mezcla.
 * Vista lista → detalle del mundo elegido (progreso, tiempos, recompensas).
 */

import { getProgresoMundo } from "../../engine/WorldManager.js";
import { etiquetaArea, etiquetaCurso } from "../../engine/PanelStats.js";
import { getFaseLabel, migrateTiempoKeys } from "../../engine/ContentLoader.js";
import { formatearTiempo } from "../../engine/QuestionGenerator.js";
import { normalizarLiberadas } from "../../engine/ProgressStore.js";

/** Estado de navegación de la mochila (solo UI). */
let mochilaMundoSeleccionado = null;

export function getMochilaMundoSeleccionado() {
  return mochilaMundoSeleccionado;
}

export function setMochilaMundoSeleccionado(mundoId) {
  mochilaMundoSeleccionado = mundoId || null;
}

/**
 * Calcula dónde está el jugador en un mundo (sin mezclar otros).
 */
export function calcularDondeEstas(state, fases = []) {
  const liberadas = normalizarLiberadas(state || {});
  const total = fases.length || 0;
  const completadas = liberadas.length;

  if (total === 0) {
    return {
      completadas: 0,
      total: 0,
      faseActualIndex: null,
      faseActual: null,
      completado: false,
      mensaje: "Este mundo aún no tiene fases cargadas.",
    };
  }

  if (completadas >= total) {
    return {
      completadas,
      total,
      faseActualIndex: null,
      faseActual: null,
      completado: true,
      mensaje: "¡Has completado todas las fases de este mundo!",
    };
  }

  const faseActualIndex = completadas;
  const faseActual = fases[faseActualIndex] || null;
  const label = faseActual ? getFaseLabel(faseActual) : `Fase ${faseActualIndex + 1}`;

  return {
    completadas,
    total,
    faseActualIndex,
    faseActual,
    completado: false,
    mensaje: `Estás en: ${label}`,
  };
}

export function renderPinMochila(pinEl, pin) {
  if (!pinEl) return;
  pinEl.textContent = pin || "—";
}

/**
 * Lista de mundos: el usuario elige cuál abrir (sin mezclar datos).
 */
export function renderListaMundosMochila({
  container,
  manifest,
  allStates,
  onAbrirMundo,
}) {
  if (!container || !manifest) return;

  container.innerHTML = "";

  const intro = document.createElement("p");
  intro.className = "texto-ayuda mochila-intro";
  intro.textContent = "Elige un mundo para ver tus detalles sin mezclar información.";
  container.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "mochila-grid-mundos";
  grid.setAttribute("role", "list");

  (manifest.mundos || []).forEach((entry) => {
    const state = allStates[entry.id] || {};
    const totalFases = entry.totalFases || 0;
    const progreso = getProgresoMundo(state, totalFases);
    const pct = totalFases ? Math.round((progreso.completadas / totalFases) * 100) : 0;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "mochila-card-mundo" + (entry.disponible === false ? " bloqueada" : "");
    card.setAttribute("role", "listitem");
    card.dataset.mundoId = entry.id;
    card.style.setProperty("--card-color", entry.tema?.colorPrimario || "#ce93d8");
    card.style.setProperty("--card-color-2", entry.tema?.colorSecundario || "#b388ff");

    const ubicacion =
      progreso.completadas >= totalFases && totalFases > 0
        ? "Completado"
        : progreso.completadas === 0
          ? "Sin empezar"
          : `Fase ${progreso.completadas + 1} de ${totalFases}`;

    card.innerHTML = `
      <span class="mochila-card-emoji">${entry.emoji}</span>
      <span class="mochila-card-body">
        <strong>${entry.nombre}</strong>
        <span class="mochila-card-meta">${etiquetaCurso(entry.curso, { corto: true })} · ${etiquetaArea(entry.area)}</span>
        <span class="mochila-card-donde">${ubicacion} · ${progreso.puntosMundo} ⭐</span>
        <span class="mochila-card-barra" aria-hidden="true">
          <span class="mochila-card-barra-fill" style="width:${pct}%"></span>
        </span>
      </span>
      <span class="mochila-card-chevron" aria-hidden="true">›</span>
    `;

    card.disabled = entry.disponible === false;
    card.onclick = () => onAbrirMundo?.(entry.id);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

/**
 * Detalle de un solo mundo: progreso, logros, tiempos y recompensas de ese mundo.
 */
export function renderDetalleMochilaMundo({
  container,
  entry,
  contenido,
  state,
  onVolver,
  setImagen,
}) {
  if (!container || !entry) return;

  const fases = contenido?.fases || [];
  const liberadas = normalizarLiberadas(state || {});
  const tiempos = migrateTiempoKeys(state?.tiemposMejores || {}, fases);
  const logrosMundo = state?.logros || [];
  const donde = calcularDondeEstas(state, fases);
  const progreso = getProgresoMundo(state, fases.length || entry.totalFases || 0);
  const pct = donde.total ? Math.round((donde.completadas / donde.total) * 100) : 0;
  const color = entry.tema?.colorPrimario || "#ce93d8";
  const color2 = entry.tema?.colorSecundario || "#b388ff";

  container.innerHTML = `
    <button type="button" class="mochila-volver" id="btnMochilaVolver">← Mundos de la mochila</button>

    <header class="mochila-detalle-header" style="--card-color:${color}; --card-color-2:${color2}">
      <span class="mochila-detalle-emoji">${entry.emoji}</span>
      <div>
        <h3>${entry.nombre}</h3>
        <p class="mochila-card-meta">${etiquetaCurso(entry.curso, { corto: true })} · ${etiquetaArea(entry.area)}</p>
      </div>
    </header>

    <section class="mochila-bloque mochila-donde-estas">
      <h4>📍 Dónde estás</h4>
      <p class="mochila-donde-mensaje">${donde.mensaje}</p>
      <p class="mochila-donde-stats">
        <strong>${progreso.completadas}/${donde.total || entry.totalFases || 0}</strong> fases ·
        <strong>${progreso.puntosMundo}</strong> ⭐ en este mundo
      </p>
      <div class="mochila-card-barra mochila-barra-grande" aria-hidden="true">
        <span class="mochila-card-barra-fill" style="width:${pct}%"></span>
      </div>
      ${
        donde.completado
          ? '<p class="mochila-badge-ok">🌈 Mundo completado</p>'
          : donde.faseActual
            ? `<p class="texto-ayuda">Siguiente reto: <strong>${getFaseLabel(donde.faseActual)}</strong></p>`
            : ""
      }
    </section>

    <section class="mochila-bloque">
      <h4>🏅 Logros de este mundo</h4>
      <ul id="listaLogrosMundo" class="lista-logros-mundo"></ul>
    </section>

    <section class="mochila-bloque">
      <h4>⏱️ Mejores tiempos</h4>
      <table class="tabla-mochila-tiempos" id="tablaTiemposMundo">
        <thead>
          <tr>
            <th>Fase</th>
            <th>Recompensa</th>
            <th>Mejor tiempo</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <section class="mochila-bloque">
      <h4>🎁 Recompensas liberadas</h4>
      <div id="galeriaRecompensasMundo" class="galeria-unicornios"></div>
    </section>
  `;

  const btnVolver = container.querySelector("#btnMochilaVolver");
  if (btnVolver) btnVolver.onclick = () => onVolver?.();

  const ul = container.querySelector("#listaLogrosMundo");
  if (ul) {
    if (!logrosMundo.length) {
      ul.innerHTML = "<li class='texto-ayuda'>Aún no hay logros en este mundo.</li>";
    } else {
      logrosMundo.forEach((l) => {
        const li = document.createElement("li");
        li.textContent = l;
        ul.appendChild(li);
      });
    }
  }

  const tbody = container.querySelector("#tablaTiemposMundo tbody");
  if (tbody) {
    if (!fases.length) {
      tbody.innerHTML = "<tr><td colspan='3'>Cargando fases…</td></tr>";
    } else {
      fases.forEach((fase) => {
        const tr = document.createElement("tr");
        const tdFase = document.createElement("td");
        tdFase.textContent = getFaseLabel(fase);
        const tdRec = document.createElement("td");
        tdRec.textContent = fase.recompensa?.nombre || "—";
        const tdTiempo = document.createElement("td");
        const tiempo = tiempos[fase.id];
        tdTiempo.textContent = tiempo ? `${formatearTiempo(tiempo)} m:s` : "—";
        tr.appendChild(tdFase);
        tr.appendChild(tdRec);
        tr.appendChild(tdTiempo);
        tbody.appendChild(tr);
      });
    }
  }

  const galeria = container.querySelector("#galeriaRecompensasMundo");
  if (galeria) {
    galeria.innerHTML = "";
    if (!liberadas.length) {
      const etiqueta = contenido?.tema?.recompensaLabel || "recompensa";
      galeria.innerHTML = `<p class="texto-ayuda">🔒 Aún no has liberado ninguna ${etiqueta} en este mundo.</p>`;
    } else {
      liberadas.forEach((i) => {
        const fase = fases[i];
        if (!fase?.recompensa) return;
        const div = document.createElement("div");
        div.className = "recompensa-item";
        const rec = fase.recompensa;
        if (rec.asset) {
          const img = document.createElement("img");
          img.alt = rec.nombre;
          if (typeof setImagen === "function") {
            setImagen(img, rec.asset);
          } else {
            img.src = rec.asset;
          }
          div.appendChild(img);
          const span = document.createElement("span");
          span.textContent = rec.nombre;
          div.appendChild(span);
        } else {
          div.innerHTML = `
            <span class="emoji-recompensa-mochila">${rec.emoji || "🎁"}</span>
            <span>${rec.nombre}</span>
          `;
        }
        galeria.appendChild(div);
      });
    }
  }
}

export function mostrarVistaMochila(modo) {
  const lista = document.getElementById("mochilaVistaLista");
  const detalle = document.getElementById("mochilaVistaDetalle");
  if (!lista || !detalle) return;

  if (modo === "detalle") {
    lista.hidden = true;
    detalle.hidden = false;
  } else {
    lista.hidden = false;
    detalle.hidden = true;
  }
}
