/**
 * Fase D — Onboarding: hero, tutorial interactivo y tarjeta de personaje.
 */

export const AVATARES = ["🧒", "👧", "🧑", "👦", "🦸", "🧙", "🦄", "🐉", "🌟", "🦊", "🐱", "🐻"];

/**
 * Pasos del tutorial guiado.
 * `accion` se resuelve en app.js (abrirSelector, abrirMapaDemo, abrirMochila)
 * para que cada paso muestre contenido real, no pantallas vacías.
 */
export const TUTORIAL_PASOS = [
  {
    id: "mundos",
    titulo: "1. Elige tu mundo",
    texto:
      "Estas son las aventuras disponibles. En cada tarjeta verás el curso y la asignatura. Cuando termines el tutorial, pulsa una para empezar.",
    target: "#tarjetasMundos",
    accion: "abrirSelector",
  },
  {
    id: "mapa",
    titulo: "2. Supera un reto",
    texto:
      "Así se ve el mapa de un mundo: cada botón es una fase. Responde bien para liberar criaturas y desbloquear la siguiente.",
    target: "#botonesFases",
    accion: "abrirMapaDemo",
  },
  {
    id: "mochila",
    titulo: "3. Tu mochila",
    texto:
      "En la mochila eliges un mundo para ver dónde estás, tus logros y las criaturas que has liberado — sin mezclar información entre mundos.",
    target: "#mochilaListaMundos",
    accion: "abrirMochila",
  },
  {
    id: "pin",
    titulo: "4. Tu PIN secreto",
    texto:
      "¡Memoriza tu PIN! Si cambias de dispositivo o de navegador y quieres continuar tu partida, tendrás que escribir el mismo nombre (o alias) y este PIN. Sin el PIN no podrás recuperar tu progreso.",
    target: ".mochila-pin-panel",
    accion: "abrirMochila",
  },
];

function leerStorage(clave) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(clave) : null;
  } catch {
    return null;
  }
}

function escribirStorage(clave, valor) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(clave, valor);
  } catch {
    /* ignorar */
  }
}

let avatarSeleccionado = leerStorage("avatarJugador") || AVATARES[0];
let pasoTutorial = 0;

export function getAvatarJugador() {
  return avatarSeleccionado;
}

export function setAvatarJugador(emoji) {
  avatarSeleccionado = emoji;
  escribirStorage("avatarJugador", emoji);
}

export function initTarjetaPersonaje() {
  const grid = document.getElementById("gridAvatares");
  const preview = document.getElementById("avatarPreview");
  if (!grid) return;

  grid.innerHTML = "";
  AVATARES.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "avatar-opcion" + (emoji === avatarSeleccionado ? " seleccionado" : "");
    btn.textContent = emoji;
    btn.setAttribute("aria-label", `Avatar ${emoji}`);
    btn.onclick = () => {
      setAvatarJugador(emoji);
      grid.querySelectorAll(".avatar-opcion").forEach((b) => b.classList.remove("seleccionado"));
      btn.classList.add("seleccionado");
      if (preview) preview.textContent = emoji;
      actualizarAvatarHeader();
    };
    grid.appendChild(btn);
  });

  if (preview) preview.textContent = avatarSeleccionado;
  actualizarAvatarHeader();
}

export function actualizarAvatarHeader() {
  const el = document.getElementById("avatarJugadorHeader");
  if (el) el.textContent = getAvatarJugador();
}

export function renderHeroBienvenida(nombreJugador) {
  const hero = document.getElementById("heroBienvenida");
  if (!hero) return;
  const nombre = nombreJugador || "Explorador";
  hero.innerHTML = `
    <div class="hero-contenido">
      <span class="hero-emoji">${getAvatarJugador()}</span>
      <div>
        <p class="hero-saludo">¡Hola, <strong>${nombre}</strong>!</p>
        <p class="hero-texto">Los mundos mágicos te esperan. Elige una aventura y libera criaturas con tus respuestas.</p>
      </div>
    </div>
  `;
  hero.style.display = "block";
}

export function tutorialCompletado() {
  return leerStorage("tutorialCompletado") === "true";
}

export function marcarTutorialCompletado() {
  escribirStorage("tutorialCompletado", "true");
  ocultarTutorial();
}

export function ocultarTutorial() {
  const overlay = document.getElementById("tutorialOverlay");
  if (overlay) overlay.style.display = "none";
  document.querySelectorAll(".tutorial-highlight").forEach((el) => {
    el.classList.remove("tutorial-highlight");
  });
}

export function getPasoTutorialActual() {
  return pasoTutorial;
}

export function iniciarTutorialSiNecesario(acciones) {
  if (tutorialCompletado()) return;
  pasoTutorial = 0;
  mostrarPasoTutorial(acciones);
}

function pintarContenidoPaso(paso) {
  const overlay = document.getElementById("tutorialOverlay");
  const titulo = document.getElementById("tutorialTitulo");
  const texto = document.getElementById("tutorialTexto");
  const indicador = document.getElementById("tutorialIndicador");
  const btnSiguiente = document.getElementById("tutorialBtnSiguiente");

  if (titulo) titulo.textContent = paso.titulo;
  if (texto) texto.textContent = paso.texto;
  if (indicador) {
    indicador.textContent = `Paso ${pasoTutorial + 1} de ${TUTORIAL_PASOS.length}`;
  }
  if (btnSiguiente) {
    const esUltimo = pasoTutorial >= TUTORIAL_PASOS.length - 1;
    btnSiguiente.textContent = esUltimo ? "¡Entendido!" : "Siguiente";
  }
  if (overlay) overlay.style.display = "flex";
  resaltarTarget(paso.target);
}

function mostrarPasoTutorial(acciones = {}) {
  if (pasoTutorial >= TUTORIAL_PASOS.length) {
    marcarTutorialCompletado();
    return;
  }

  const paso = TUTORIAL_PASOS[pasoTutorial];
  const accionFn = paso.accion && typeof acciones[paso.accion] === "function"
    ? acciones[paso.accion]
    : null;

  const continuar = () => pintarContenidoPaso(paso);

  if (accionFn) {
    Promise.resolve(accionFn())
      .then(continuar)
      .catch((err) => {
        console.error("Error en acción del tutorial", err);
        continuar();
      });
  } else {
    continuar();
  }
}

function resaltarTarget(selector) {
  document.querySelectorAll(".tutorial-highlight").forEach((el) => {
    el.classList.remove("tutorial-highlight");
  });
  if (!selector) return;
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("tutorial-highlight");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function avanzarTutorial(acciones) {
  pasoTutorial += 1;
  if (pasoTutorial >= TUTORIAL_PASOS.length) {
    marcarTutorialCompletado();
  } else {
    mostrarPasoTutorial(acciones);
  }
}

export function saltarTutorial() {
  marcarTutorialCompletado();
}

/** Texto de bienvenida adaptado a todos los mundos del manifiesto. */
export function renderHistoriaBienvenida(manifest, containerId = "contenidoHistoria") {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  const mundos = (manifest?.mundos || []).filter((m) => m.disponible !== false);
  const porCurso = {};
  mundos.forEach((m) => {
    const curso = m.curso || "?";
    if (!porCurso[curso]) porCurso[curso] = [];
    porCurso[curso].push(m);
  });

  const bloquesCurso = Object.keys(porCurso)
    .sort((a, b) => Number(a) - Number(b))
    .map((curso) => {
      const lista = porCurso[curso]
        .map((m) => `<li><span aria-hidden="true">${m.emoji}</span> ${m.nombre}</li>`)
        .join("");
      return `
        <div class="historia-curso">
          <h3>${curso}º de Primaria</h3>
          <ul class="historia-lista-mundos">${lista}</ul>
        </div>
      `;
    })
    .join("");

  cont.innerHTML = `
    <p>
      Hace mucho tiempo, criaturas y tesoros mágicos vivían libres en muchos mundos,
      pero un hechizo los ha atrapado 😢
    </p>
    <p>
      ✨ Solo alguien valiente y con ganas de aprender puede liberarlos.
      Hay aventuras de <strong>matemáticas</strong>, <strong>lengua</strong>,
      <strong>ciencias</strong> y <strong>sociales</strong> para 3º y 4º de Primaria.
    </p>
    <p class="historia-intro-mundos">Estos son los mundos que puedes explorar:</p>
    <div class="historia-mundos-wrap">
      ${bloquesCurso || "<p class='texto-ayuda'>Los mundos se cargarán en un momento…</p>"}
    </div>
    <p>
      🏆 Compara tus avances, mejora tus tiempos y suma magia con tus compañeros.
    </p>
    <p>
      💫 ¿Nos ayudas a devolver la magia a <strong>todos</strong> los mundos?
    </p>
  `;
}

export function mensajeBienvenidaMural(nombre) {
  return `✨ ${nombre} se ha unido a Mundos Mágicos`;
}
