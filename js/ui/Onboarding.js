/**
 * Fase D — Onboarding: hero, tutorial interactivo y tarjeta de personaje.
 */

export const AVATARES = ["🧒", "👧", "🧑", "👦", "🦸", "🧙", "🦄", "🐉", "🌟", "🦊", "🐱", "🐻"];

const TUTORIAL_PASOS = [
  {
    titulo: "1. Elige tu mundo",
    texto: "Pulsa una tarjeta del mapa de mundos para empezar tu aventura.",
    target: "#tarjetasMundos",
    pantalla: "selectorMundos",
  },
  {
    titulo: "2. Supera un reto",
    texto: "En el mapa, elige una fase y responde bien para liberar criaturas.",
    target: "#botonesFases",
    pantalla: "mapa",
  },
  {
    titulo: "3. Revisa tu mochila",
    texto: "En la mochila elige un mundo para ver dónde estás, tus logros y criaturas de ese mundo.",
    target: ".bottom-nav button[title='Mochila']",
    pantalla: null,
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
}

export function iniciarTutorialSiNecesario(mostrarFn) {
  if (tutorialCompletado()) return;
  pasoTutorial = 0;
  mostrarPasoTutorial(mostrarFn);
}

function mostrarPasoTutorial(mostrarFn) {
  const overlay = document.getElementById("tutorialOverlay");
  const titulo = document.getElementById("tutorialTitulo");
  const texto = document.getElementById("tutorialTexto");
  const indicador = document.getElementById("tutorialIndicador");
  if (!overlay || pasoTutorial >= TUTORIAL_PASOS.length) {
    marcarTutorialCompletado();
    return;
  }

  const paso = TUTORIAL_PASOS[pasoTutorial];
  if (paso.pantalla && mostrarFn) mostrarFn(paso.pantalla);

  if (titulo) titulo.textContent = paso.titulo;
  if (texto) texto.textContent = paso.texto;
  if (indicador) {
    indicador.textContent = `Paso ${pasoTutorial + 1} de ${TUTORIAL_PASOS.length}`;
  }

  overlay.style.display = "flex";
  resaltarTarget(paso.target);
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

export function avanzarTutorial(mostrarFn) {
  pasoTutorial += 1;
  if (pasoTutorial >= TUTORIAL_PASOS.length) {
    marcarTutorialCompletado();
  } else {
    mostrarPasoTutorial(mostrarFn);
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
      <strong>ciencias</strong>, <strong>sociales</strong>, <strong>inglés</strong>,
      <strong>lógica</strong> y <strong>visoespacial</strong> para 3º y 4º de Primaria.
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
