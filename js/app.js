import {
  loadManifest,
  loadMundoContent,
  getFaseLabel,
  migrateTiempoKeys
} from "../engine/ContentLoader.js";
import {
  generarOperacionesFase,
  generarOperacionesRepaso,
  generarOperacionesTabla,
  crearModeloRectangular,
  getDificultadLabel,
  formatearTiempo,
  getClaveOperacion
} from "../engine/QuestionGenerator.js";
import {
  puntosPorFase,
  calcularPenalizacion,
  calcularNivelAdaptativo
} from "../engine/Scoring.js";
import { getHint } from "../engine/Hints.js";
import {
  MUNDO_LEGACY,
  loadMundoState,
  loadAllMundosStates,
  saveMundoState,
  loadGlobalState,
  saveGlobalState,
  buildFirebasePayload,
  parseFirebaseData,
  mergeRemoteIfNewer,
  getMundoActivoId,
  setMundoActivoId,
  getTiemposMundoFromFirebase,
  normalizarLiberadas,
} from "../engine/ProgressStore.js";
import {
  getMundoEntry,
  aplicarTemaMundo,
  getEtiquetaRecompensa,
  getProgresoMundo
} from "../engine/WorldManager.js";


let puntos = 0;
let faseActual = 0;
let indice = 0;
let operaciones = [];
let liberadas = [];
let intentosTotales = 0;
let tablasDominadas = [];
let logros = [];
let tiemposMejores = {};
let fallosPorOperacion = {};
let fases = [];
let textos = [];
let bancoAvanzado = [];
let puntosPorFaseMap = {};
let mensajesAcierto = [];
let mensajesError = [];
let mensajesUltima = [];
let mensajesPredefinidos = {};
let CONFIG_MURAL = { maxMensajesDia: 10, puntosPorMensaje: 250 };
let manifestCatalog = null;
let contenidoMundo = null;
let mundoId = getMundoActivoId();
let tipoMundo = "multiplicacion";
let bancoLectura = [];
let bancoFracciones = [];
let puntosMundo = 0;
let puntosPorMundoMap = {};
let modoPracticaTabla = false;
let erroresEnSesion = 0;
let tablaSeleccionada = Number(localStorage.getItem("tablaSeleccionada")) || 2;
let altoContraste = localStorage.getItem("altoContraste") === "true";
let fuenteGrande = localStorage.getItem("fuenteGrande") === "true";
let opcionSeleccionada = null;
const mundos = () => fases.map(f => getFaseLabel(f));

  
const TIEMPO_SYNC = 60 * 60 * 1000; // 1 día en ms

let puntosClase = 0;
let datosClaseCargados = false;



function necesitaSincronizar(){
  const ultimaSync = Number(localStorage.getItem("ultimaSyncFirebase")) || 0;
  return Date.now() - ultimaSync > TIEMPO_SYNC;
}


function sincronizarSiEsNecesario(){
  if(!db || !nombreJugador) return;
  if(!necesitaSincronizar()) return;
  db.collection("players").doc(nombreJugador).get()
    .then(doc => {
      if(!doc.exists) return;
      const parsed = parseFirebaseData(doc.data(), mundoId);
      const localAll = loadAllMundosStates();
      const merged = mergeRemoteIfNewer(puntos, parsed.puntos, localAll, parsed.allMundosStates);
      if(merged.merged){
        for(const [id, state] of Object.entries(merged.allMundosStates)){
          saveMundoState(id, state);
        }
        aplicarEstadoMundo(loadMundoState(mundoId));
        recalcularPuntosGlobales();
        guardarEstado();
        actualizarPuntosUI();
      }
      localStorage.setItem("ultimaSyncFirebase", Date.now());
    })
    .catch(err => { console.log("JA 😂 Error sincronizando"); console.error(err); });
}


function cerrarHistoria(){
  localStorage.setItem("historiaVista", "true");
  mostrarSelectorMundos();
}


function snapshotMundoState(){
  return {
    liberadas,
    tiemposMejores,
    fallosPorOperacion,
    tablasDominadas,
    logros,
    puntosMundo,
    historiaVista: localStorage.getItem("historiaVista") === "true"
  };
}

function aplicarEstadoMundo(state){
  liberadas = normalizarLiberadas(state);
  tiemposMejores = migrateTiempoKeys(state.tiemposMejores || {}, fases);
  fallosPorOperacion = state.fallosPorOperacion || {};
  tablasDominadas = state.tablasDominadas || [];
  logros = state.logros || [];
  puntosMundo = state.puntosMundo || 0;
}

function persistirMundoActual(){
  saveMundoState(mundoId, snapshotMundoState());
}

function recalcularPuntosGlobales(){
  const global = loadGlobalState();
  puntos = global.puntos;
  puntosPorMundoMap = global.puntosPorMundo || {};
}

async function cargarMundoContenido(id){
  mundoId = id;
  setMundoActivoId(id);
  contenidoMundo = await loadMundoContent(id);
  fases = contenidoMundo.fases;
  textos = contenidoMundo.textos;
  bancoAvanzado = contenidoMundo.bancoAvanzado;
  puntosPorFaseMap = contenidoMundo.puntosPorFase;
  mensajesAcierto = contenidoMundo.mensajes.acierto;
  mensajesError = contenidoMundo.mensajes.error;
  mensajesUltima = contenidoMundo.mensajes.ultima;
  mensajesPredefinidos = contenidoMundo.mensajesPredefinidos;
  CONFIG_MURAL = contenidoMundo.configMural;
  tipoMundo = contenidoMundo.tipoMundo || "multiplicacion";
  bancoLectura = contenidoMundo.bancoLectura || [];
  bancoFracciones = contenidoMundo.bancoFracciones || [];

  const entry = getMundoEntry(manifestCatalog, id);
  aplicarTemaMundo(contenidoMundo, entry);
  actualizarTextosRecompensa();

  const state = loadMundoState(id);
  aplicarEstadoMundo(state);
  recalcularPuntosGlobales();
}

function actualizarTextosRecompensa(){
  const label = getEtiquetaRecompensa(contenidoMundo);
  const tituloGaleria = document.getElementById("tituloGaleriaRecompensas");
  if(tituloGaleria) tituloGaleria.textContent = `${contenidoMundo?.tema?.criatura || "Recompensas"} liberados`;
  const nombreMundoFinal = document.getElementById("nombreMundoFinal");
  if(nombreMundoFinal) nombreMundoFinal.textContent = contenidoMundo?.nombre || "este mundo";
}

function actualizarHeaderMundo(){
  const entry = getMundoEntry(manifestCatalog, mundoId);
  const icono = document.getElementById("iconoMundoActivo");
  if(icono) icono.textContent = entry?.emoji || contenidoMundo?.tema?.criatura || "🌍";
  const titulo = document.getElementById("tituloMapaMundo");
  if(titulo) titulo.textContent = entry ? `${entry.emoji} ${entry.nombre}` : contenidoMundo?.nombre || "Mundo";
}

function mostrarSelectorMundos(){
  const cont = document.getElementById("tarjetasMundos");
  if(!cont || !manifestCatalog) return;

  persistirMundoActual();
  recalcularPuntosGlobales();

  cont.innerHTML = "";
  const allStates = loadAllMundosStates();
  const cursos = [...new Set(manifestCatalog.mundos.map(m => m.curso))].sort();

  cursos.forEach(curso => {
    const titulo = document.createElement("h2");
    titulo.className = "titulo-curso-selector";
    titulo.textContent = `${curso}º de Primaria`;
    cont.appendChild(titulo);

    manifestCatalog.mundos.filter(m => m.curso === curso).forEach(entry => {
    const card = document.createElement("button");
    card.className = "tarjeta-mundo" + (entry.disponible ? "" : " bloqueada");
    const state = allStates[entry.id] || {};
    const progreso = getProgresoMundo(state, entry.id === mundoId ? fases.length : state.liberadas?.length || 0);

    card.innerHTML = `
      <span class="emoji-mundo">${entry.emoji}</span>
      <strong>${entry.nombre}</strong>
      <p>${entry.descripcion}</p>
      <p class="meta-mundo">${entry.curso}º · ${entry.area}</p>
      <p class="meta-mundo">${entry.disponible ? `Progreso: ${progreso.completadas} fases · ${progreso.puntosMundo} ⭐` : "Próximamente"}</p>
    `;

    card.onclick = () => entrarMundo(entry.id);
    cont.appendChild(card);
    });
  });

  const puntosGlobales = document.getElementById("puntosGlobalesSelector");
  if(puntosGlobales) puntosGlobales.textContent = puntos;

  mostrar("selectorMundos");
}

async function entrarMundo(id){
  const entry = getMundoEntry(manifestCatalog, id);
  if(!entry) return;
  if(!entry.disponible){
    popup("🔒 Este mundo estará disponible muy pronto.\n\n¡Sigue practicando en los mundos abiertos!");
    return;
  }

  persistirMundoActual();
  await cargarMundoContenido(id);
  actualizarHeaderMundo();
  actualizarHeaderNombre();
  actualizarPuntosUI();
  mostrarMapa();
}


function applyAccessibilitySettings(){
  document.body.classList.toggle("high-contrast", altoContraste);
  document.body.classList.toggle("font-large", fuenteGrande);

  const contraste = document.getElementById("toggleContraste");
  const fuente = document.getElementById("selectorFuente");
  if(contraste) contraste.checked = altoContraste;
  if(fuente) fuente.value = fuenteGrande ? "large" : "normal";
}

function bindAccessibilityControls(){
  const contraste = document.getElementById("toggleContraste");
  const fuente = document.getElementById("selectorFuente");
  if(contraste){
    contraste.onchange = () => {
      altoContraste = contraste.checked;
      localStorage.setItem("altoContraste", String(altoContraste));
      applyAccessibilitySettings();
    };
  }
  if(fuente){
    fuente.onchange = () => {
      fuenteGrande = fuente.value === "large";
      localStorage.setItem("fuenteGrande", String(fuenteGrande));
      applyAccessibilitySettings();
    };
  }
}

function setRecompensaVisual(recompensa){
  const img = document.getElementById("imgRecompensa");
  const emoji = document.getElementById("emojiRecompensa");
  if(!img) return;

  if(recompensa?.asset){
    img.src = recompensa.asset;
    img.style.display = "block";
    if(emoji) emoji.style.display = "none";
  }else if(recompensa?.emoji){
    img.style.display = "none";
    if(emoji){
      emoji.textContent = recompensa.emoji;
      emoji.style.display = "flex";
    }
  }else{
    img.src = "unicornio1.png";
    img.style.display = "block";
    if(emoji) emoji.style.display = "none";
  }
}

function getContextoGenerador(){
  return {
    textos,
    bancoAvanzado,
    bancoLectura,
    bancoFracciones,
    fallosPorOperacion,
    tipoMundo,
    nivelAdaptativo: calcularNivelAdaptativo({ liberadas, fases, tiemposMejores, fallosPorOperacion }),
    tablaFocal: null,
  };
}

function actualizarPanelPractica(){
  const panel = document.querySelector(".panel-opciones");
  const titulo = panel?.querySelector("h3");
  const lista = contenidoMundo?.tablasDisponibles || contenidoMundo?.divisoresDisponibles || [];
  if(panel) panel.style.display = lista.length ? "block" : "none";
  if(titulo){
    titulo.textContent = tipoMundo === "division"
      ? "🎯 Practica un divisor concreto"
      : "🎯 Practica una tabla concreta";
  }
}

function poblarSelectorTabla(){
  const selector = document.getElementById("selectorTabla");
  const lista = contenidoMundo?.tablasDisponibles || contenidoMundo?.divisoresDisponibles;
  if(!selector || !lista?.length) return;
  selector.innerHTML = "";
  lista.forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = tipoMundo === "division"
      ? `Divisor ${valor}`
      : `Tabla del ${valor}`;
    if(valor === tablaSeleccionada) option.selected = true;
    selector.appendChild(option);
  });
  selector.onchange = () => {
    tablaSeleccionada = Number(selector.value);
    localStorage.setItem("tablaSeleccionada", String(tablaSeleccionada));
  };
}

function actualizarPanelCurricular(){
  const etiqueta = document.getElementById("etiquetaCurricular");
  const texto = document.getElementById("textoCurricularMapa");
  const chips = document.getElementById("chipsCurriculares");
  if(etiqueta) etiqueta.textContent = contenidoMundo?.etiquetaCurricular || "3º Primaria · Matemáticas";
  if(texto) texto.textContent = contenidoMundo?.textoCurricular || "";
  if(chips){
    chips.innerHTML = "";
    (contenidoMundo?.saberes || []).forEach(saber => {
      const span = document.createElement("span");
      span.className = "curriculo-chip";
      span.textContent = saber;
      chips.appendChild(span);
    });
  }
}

function pintarTagsFase(fase){
  const objetivo = document.getElementById("objetivoFase");
  const tags = document.getElementById("tagsFase");
  if(objetivo) objetivo.textContent = fase?.objetivo || "";
  if(tags){
    tags.innerHTML = "";
    (fase?.tags || []).forEach(tag => {
      const span = document.createElement("span");
      span.className = "tabla-chip";
      span.textContent = tag;
      tags.appendChild(span);
    });
  }
}

function actualizarReveladoRecompensa(porcentaje){
  const cubierta = document.getElementById("mascaraRecompensa");
  if(!cubierta) return;
  cubierta.style.height = `${Math.max(0, 100 - porcentaje)}%`;
}

function resetearReveladoRecompensa(){
  actualizarReveladoRecompensa(0);
}

function renderVisualRectangular(op){
  const panel = document.getElementById("visualRectangular");
  const texto = document.getElementById("textoModeloRectangular");
  const rejilla = document.getElementById("rejillaRectangular");
  if(!panel || !texto || !rejilla) return;

  const modelo = crearModeloRectangular(op);
  if(!modelo){
    panel.style.display = "none";
    rejilla.innerHTML = "";
    return;
  }

  panel.style.display = fallosActual > 0 ? "block" : "none";
  const etiqueta = modelo.etiqueta
    ? modelo.etiqueta
    : `${modelo.filas} filas × ${modelo.columnas} columnas = ${modelo.total}`;
  texto.textContent = etiqueta;
  rejilla.style.gridTemplateColumns = `repeat(${modelo.columnas}, 18px)`;
  rejilla.innerHTML = "";
  modelo.celdas.forEach(() => {
    const celda = document.createElement("div");
    celda.className = "celda-rectangular";
    rejilla.appendChild(celda);
  });
}

function iniciarPracticaTabla(){
  tablaSeleccionada = Number(document.getElementById("selectorTabla")?.value || tablaSeleccionada || 2);
  modoPracticaTabla = true;
  erroresEnSesion = 0;
  localStorage.setItem("tablaSeleccionada", String(tablaSeleccionada));
  modoRepaso = false;
  faseActual = 0;
  indice = 0;
  fallosActual = 0;
  operaciones = generarOperacionesTabla(tablaSeleccionada, textos, 10, tipoMundo);
  const etiquetaPractica = tipoMundo === "division"
    ? `🎯 Dominio del divisor ${tablaSeleccionada}`
    : `🎯 Dominio de la tabla del ${tablaSeleccionada}`;
  document.getElementById("tituloFase").textContent = etiquetaPractica;
  document.getElementById("contadorFallos").textContent = "";
  document.getElementById("pista").textContent = "";
  setRecompensaVisual(fases[0]?.recompensa || { emoji: "🎯" });
  resetearReveladoRecompensa();
  tiempoInicio = Date.now();
  iniciarTimer();
  mostrar("juego");
  mostrarOperacion();
}

function calcularProgresoTablas(){
  const lista = contenidoMundo?.tablasDisponibles || contenidoMundo?.divisoresDisponibles || [];
  return lista.map(tabla => {
    const opsTabla = Array.from({ length: 10 }, (_, idx) => {
      if(tipoMundo === "division") return `${tabla * (idx + 1)}div${tabla}`;
      return `${tabla}x${idx + 1}`;
    });
    const fallos = opsTabla.reduce((acc, key) => acc + (fallosPorOperacion[key] || 0), 0);
    let dominio = 100 - Math.min(100, fallos * 12);
    if(tablasDominadas.includes(tabla)) dominio = Math.max(dominio, 92);
    return { tabla, dominio };
  });
}

function pintarBarrasTablas(){
  const cont = document.getElementById("barrasTablas");
  if(!cont) return;
  cont.innerHTML = "";
  const lista = contenidoMundo?.tablasDisponibles || contenidoMundo?.divisoresDisponibles;
  if(!lista?.length){
    cont.innerHTML = "<p class='texto-ayuda'>Este mundo no usa práctica por tabla/divisor.</p>";
    return;
  }
  calcularProgresoTablas().forEach(({ tabla, dominio }) => {
    const row = document.createElement("div");
    row.className = "barra-tabla-item";
    const etiqueta = tipoMundo === "division" ? `Divisor ${tabla}` : `Tabla ${tabla}`;
    row.innerHTML = `
      <strong>${etiqueta}</strong>
      <div class="barra-tabla-track"><div class="barra-tabla-fill" style="width:${dominio}%"></div></div>
      <span>${Math.round(dominio)}%</span>
    `;
    cont.appendChild(row);
  });
}





  const firebaseConfig = {
    apiKey: "AIzaSyDGnZBWvHP_Ge_6c6XgjegGFnWlZwQPnQg",
    authDomain: "unicornios-clase.firebaseapp.com",
    projectId: "unicornios-clase",
    storageBucket: "unicornios-clase.firebasestorage.app",
    messagingSenderId: "451851893754",
    appId: "1:451851893754:web:e37ec6fc7b6dc45cd74243",
    measurementId: "G-T72Z57Z2G6"
  };

  // Initialize Firebase

let db = null;

try{
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore(); // 👈 SIN const
  console.log("Firebase inicializado ✅");
}catch(e){
  console.log("JA 😂 Firebase no disponible");
  console.error(e);
}





let modoRepaso = false;
let operacionesRepaso = [];
let nombreJugador=localStorage.getItem("nombreJugador");


function iniciarRepasoErrores(){

try{
  const entradas = Object.entries(fallosPorOperacion);

  if(entradas.length === 0){
    alert("No hay operaciones para repasar 🎉");
    return;
  }

  modoRepaso = true;
  modoPracticaTabla = false;
  indice = 0;
  fallosActual = 0;
  erroresEnSesion = 0;
  operaciones = generarOperacionesRepaso(fallosPorOperacion, textos, 8, tipoMundo);

  document.getElementById("tituloFase").textContent =
    "🔁 Repaso de operaciones difíciles";

  document.getElementById("contador").textContent =
    `Pregunta 1 de ${operaciones.length}`;

resetearReveladoRecompensa();
 
indice=0;
 fallosActual=0;
document.getElementById("contadorFallos").textContent = "";


document.getElementById("pista").textContent = "";

tiempoInicio=Date.now();
iniciarTimer();


setRecompensaVisual(fases[0]?.recompensa || { asset: "unicornio1.png" });

  mostrar("juego");
  mostrarOperacion();

}catch(err){
 alert(err);
}
}


/* === ESTADO, FASES Y LÓGICA === */
/* (por límite del mensaje, esta versión es funcional pero compactada;
   si quieres la versión comentada pedagógicamente, te la genero aparte) */

let tiempoInicio = 0;
let temporizador = null;
let fallosActual = 0;


/* =====================================================
   MENSAJES PERSONALIZADOS
===================================================== */

function conNombre(texto){
  return texto.replace("{nombre}", nombreJugador || "");
}


function mensajeAleatorio(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}



/* =====================================================
   MAPA
===================================================== */
function construirMapa(){
  const cont = document.getElementById("botonesFases");
  cont.innerHTML = "";

  fases.forEach((f, i) => {


    const b = document.createElement("button");
    b.textContent = getFaseLabel(f) + (liberadas.includes(i) ? " ✅" : "");

// ===== FASE SIEMPRE ACTIVA =====
if (f.siempreActiva) {
  b.disabled = false;
  b.onclick = () => iniciarFase(i);
  cont.appendChild(b);
  return;
}


// ===== FASES AVANZADAS (DESBLOQUEO COLECTIVO) =====
if (f.tipo === "avanzada") {

//para pruebas
//puntosClase=70000;

  const faseAnteriorSuperada = liberadas.includes(i - 1);
  const puntosNecesarios = f.desbloqueoClase || Infinity;
  const puntosSuficientes = puntosClase >= puntosNecesarios;


  if (faseAnteriorSuperada && puntosSuficientes) {
    // 🔓 Desbloqueada de verdad
    b.disabled = false;
    b.onclick = () => iniciarFase(i);
  } else {
    // 🔒 Bloqueada (aunque visible)
    b.disabled = true;
    b.classList.add("boton-colectivo");

    b.onclick = () => {
      popup(
        "🌟 Reto colectivo 🌟\n\n" +
        "Este mundo se desbloquea cuando:\n" +
        "✔️ completes el mundo anterior\n" +
        `⭐ el grupo global llegue a ${puntosNecesarios.toLocaleString()} puntos\n\n` +
        `Progreso actual: ${puntosClase.toLocaleString()} / ${puntosNecesarios.toLocaleString()}`
      );
    };
  }

  cont.appendChild(b);
  return;
}


    // ===== RESTO DE FASES =====
    b.disabled = i > liberadas.length;
    b.onclick = () => iniciarFase(i);

    cont.appendChild(b);
  });

  actualizarProgreso();
}

/* =====================================================
   AUDIO
===================================================== */
let audioCtx;
function sonido(freqs,dur=0.3){
 audioCtx ??= new (window.AudioContext||window.webkitAudioContext)();
 freqs.forEach((f,i)=>{
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.frequency.value=f;
  o.connect(g); g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.001,audioCtx.currentTime+i*0.05);
  g.gain.exponentialRampToValueAtTime(0.3,audioCtx.currentTime+i*0.05+0.05);
  g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+i*0.05+dur);
  o.start(audioCtx.currentTime+i*0.05);
  o.stop(audioCtx.currentTime+i*0.05+dur);
 });
}

/* =====================================================
   INICIAR FASE (orden creciente de dificultad)
===================================================== */
function iniciarFase(i){


if(fases[i].tipo === "avanzada" && !fases[i].siempreActiva){
  const puntosNecesarios = fases[i].desbloqueoClase || 0;
  const faseAnteriorSuperada = liberadas.includes(i - 1);
  if(!faseAnteriorSuperada || puntosClase < puntosNecesarios){
    popup("🔒 Este mundo se desbloqueará cuando:\n\n"+
      "✔️ completes el mundo anterior\n"+
      `⭐ la clase llegue a ${puntosNecesarios.toLocaleString()} puntos\n\n`+
      `Progreso actual: ${puntosClase.toLocaleString()} / ${puntosNecesarios.toLocaleString()}`);
    return;
  }
}

//alert("Entrando en fase " + i);
 modoPracticaTabla = false;
 faseActual=i;
 indice=0;
fallosActual = 0;
erroresEnSesion = 0;

// Mostrar contador de fallos en fases con límite (Castillo y Santuario)
if(!modoRepaso && i >= 4){
  document.getElementById("contadorFallos").textContent =
    "❌ Fallos: 0 / 6";
}else{
  document.getElementById("contadorFallos").textContent = "";
}

document.getElementById("pista").textContent = "";

 operaciones=[];
 tiempoInicio=Date.now();
 iniciarTimer();

 operaciones = [];


const nivelAdaptativo = calcularNivelAdaptativo({ liberadas, fases, tiemposMejores, fallosPorOperacion });
operaciones = generarOperacionesFase(fases[i], getContextoGenerador());

setRecompensaVisual(fases[i].recompensa);
resetearReveladoRecompensa();
document.getElementById("indicadorDificultad").textContent = "";
mostrar("juego");
mostrarOperacion();
}


/* =====================================================
   MOSTRAR OPERACIÓN
===================================================== */
function pintarOpcionesLectura(op){
  const cont = document.getElementById("opcionesLectura");
  const input = document.getElementById("respuesta");
  if(!cont) return;

  if(op?.tipo !== "lectura" || !op.opciones?.length){
    cont.style.display = "none";
    cont.innerHTML = "";
    if(input) input.style.display = "";
    opcionSeleccionada = null;
    return;
  }

  if(input) input.style.display = "none";
  cont.style.display = "flex";
  cont.innerHTML = "";
  opcionSeleccionada = null;

  op.opciones.forEach((texto, idx) => {
    const btn = document.createElement("button");
    btn.className = "opcion-lectura";
    btn.textContent = texto;
    btn.onclick = () => responderOpcion(idx);
    cont.appendChild(btn);
  });
}

function responderOpcion(idx){
  opcionSeleccionada = idx;
  responder();
}

function esRespuestaCorrecta(op, val){
  if(op?.tipo === "lectura") return opcionSeleccionada === op.r;
  return val === op.r;
}

function mostrarOperacion(){
 const esPracticaTabla = !modoRepaso && operaciones.length && tipoMundo !== "lectura" && operaciones.every(op => {
   if(tipoMundo === "division") return op.b === operaciones[0].b;
   return op.a === operaciones[0].a;
 });
 const faseVisual = modoRepaso
  ? { objetivo: "Repaso de las operaciones que más cuestan.", tags:["Refuerzo", "Memoria de trabajo"] }
  : esPracticaTabla
    ? {
        objetivo: tipoMundo === "division"
          ? `Practica intensiva del divisor ${operaciones[0].b}.`
          : `Practica intensiva de la tabla del ${operaciones[0].a}.`,
        tags: tipoMundo === "division"
          ? [`Divisor ${operaciones[0].b}`, "Reparto"]
          : [`Tabla del ${operaciones[0].a}`, "Cálculo mental", "Grupos iguales"]
      }
    : fases[faseActual];
 document.getElementById("tituloFase").textContent = modoRepaso
  ? "🔁 Repaso de operaciones difíciles"
  : esPracticaTabla
    ? (tipoMundo === "division"
        ? `🎯 Dominio del divisor ${operaciones[0].b}`
        : `🎯 Dominio de la tabla del ${operaciones[0].a}`)
    : getFaseLabel(fases[faseActual]);
 document.getElementById("contador").textContent=
  `Pregunta ${indice+1} de ${operaciones.length}`;
 document.getElementById("problema").textContent=
  operaciones[indice].texto;

actualizarIndicadorDificultad(operaciones[indice]);
 pintarTagsFase(faseVisual);
 renderVisualRectangular(operaciones[indice]);
 pintarOpcionesLectura(operaciones[indice]);
 document.getElementById("respuesta").value="";

setTimeout(() => {
  const input = document.getElementById("respuesta");
  if(input){
    input.focus();
    input.select();
  }
}, 100);
 
}

function actualizarIndicadorDificultad(op){
  document.getElementById("indicadorDificultad").textContent = getDificultadLabel(op);
}

function mostrarPista(op){
  document.getElementById("pista").textContent = getHint(op, fallosActual, fases[faseActual]);
  renderVisualRectangular(op);
}

/* =====================================================
   RESPONDER
===================================================== */
function responder(){
 const op=operaciones[indice];
 const val=+respuesta.value;
 intentosTotales++;

 if(esRespuestaCorrecta(op, val)){
  sonido([880,1320,1760]);
	document.getElementById("pista").textContent = "";
  document.getElementById("visualRectangular").style.display = "none";

if(!modoRepaso){
	
	// Sistema unificado de puntos por fase
const puntosGanados = puntosDelMundoActual();
puntos += puntosGanados;
puntosMundo += puntosGanados;


  // 🎯 GANAR MENSAJES PARA EL MURAL
  const totalGanados = Math.floor(puntos / CONFIG_MURAL.puntosPorMensaje);
  const maxPermitidos = CONFIG_MURAL.maxMensajesDia;

  mensajesDisponibles = Math.min(
    totalGanados - mensajesUsadosHoy,
    maxPermitidos - mensajesUsadosHoy
  );

  mensajesDisponibles = Math.max(0, mensajesDisponibles);

  localStorage.setItem("mensajesDisponibles", mensajesDisponibles);

actualizarContadorMensajes();

}

  indice++;
  fallosActual=0;

  const porcentaje=Math.floor((indice/operaciones.length)*100);


actualizarReveladoRecompensa(porcentaje);

if(porcentaje === 100){
  lanzarConfeti();
}



  if(indice>=operaciones.length){
//alert("LLAMANDO A FINALIZAR FASE");
// 🔊 Sonido final (permitido porque viene de un click)
  if (faseActual === fases.length - 1) {
    sonidoFinalMagico();
  }

  
   // Mostrar popup de final de fase
popup(
  fases[faseActual].tipo === "avanzada"
    ? "🌟 ¡Has superado el reto avanzado!\nEste reto es solo para mentes expertas."
    : `🎉 ¡Has conseguido a ${fases[faseActual].recompensa.nombre}!`,
  true
);

// 🔑 Dejar respirar al navegador para que pinte el popup
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    finalizarFase();
  });
});



  }else{
   // Mensaje especial si es la última pregunta
if(indice === operaciones.length - 1){
  popup(conNombre(mensajeAleatorio(mensajesUltima)));
}else{
  popup(conNombre(mensajeAleatorio(mensajesAcierto)));
}

  }
 }else{
  sonido([1720,1320,800]);
  erroresEnSesion++;

if(!modoRepaso){


const penalizacion = Math.max(3, Math.floor(puntosDelMundoActual() / 2));
puntos -= penalizacion;
puntosMundo = Math.max(0, puntosMundo - penalizacion);

  //puntos = Math.max(0, puntos-5);
}

  fallosActual++;

// Mostrar contador de fallos desde la fase 5 en adelante
if(!modoRepaso && faseActual >= 4){
  document.getElementById("contadorFallos").textContent =
    `❌ Fallos: ${fallosActual} / 6`;
}

// 🔑 SI LLEGA A 6 → CORTAR AQUÍ
if(!modoRepaso && faseActual >= 4 && fallosActual === 6){

  popup(
    "🚨 Has llegado al máximo de fallos permitidos.\nDebes repetir este reto."
  );

  // Reiniciar estado de la fase
  fallosActual = 0;
  modoRepaso = false;

  setTimeout(() => {
    document.getElementById("popup").style.display = "none";
    mostrarMapa();
    document.getElementById("contadorFallos").textContent = "";
  }, 4000);

  return; // ⛔ MUY IMPORTANTE
}



  const clave = getClaveOperacion(op);
  fallosPorOperacion[clave]=(fallosPorOperacion[clave]||0)+1;

  mostrarPista(op);
  popup(conNombre(mensajeAleatorio(mensajesError)));
 }

 guardarEstado();

guardarProgreso();

const puntosEl = document.getElementById("puntos");
//puntosEl.textContent = puntos;
puntosEl.classList.add("subiendo");

setTimeout(() => {
  puntosEl.classList.remove("subiendo");
}, 600);

}



function generarPIN(){
  return Math.floor(1000 + Math.random() * 9000).toString();
}


/* =====================================================
   FINALIZAR FASE
===================================================== */
function finalizarFase(){

try{

if(modoRepaso){
  modoRepaso = false;
  popup("🎉 ¡Repaso terminado!");
  mostrarMapa();
  return;
}

if(modoPracticaTabla){
  if(!tablasDominadas.includes(tablaSeleccionada) && erroresEnSesion <= 2){
    tablasDominadas.push(tablaSeleccionada);
    logros.push(`🎯 Tabla del ${tablaSeleccionada} dominada en práctica guiada`);
  }
  guardarEstado();
  guardarProgreso();
  popup(`🌟 ¡Práctica terminada! Has trabajado la tabla del ${tablaSeleccionada}.`);
  setTimeout(() => {
    document.getElementById("popup").style.display = "none";
    mostrarMapa();
  }, 2200);
  modoPracticaTabla = false;
  return;
}


 clearInterval(temporizador);
 sonido([660,880,1100],0.6);


const puntosGanados = puntosDelMundoActual() * 4;

puntos += puntosGanados;
puntosMundo += puntosGanados;
 //puntos+=50;


// ✅ Marcar fase como superada (todas, incluidas avanzadas)
if(!liberadas.includes(faseActual)){
  liberadas.push(faseActual);
}

agregarMensajeSistema(
  `🎉 ${nombreJugador} ha conseguido a ${fases[faseActual].recompensa.nombre}`
);

 if(fases[faseActual].tablas){
  
if (Array.isArray(fases[faseActual].tablas)) {
  fases[faseActual].tablas.forEach(t => {
    if (!tablasDominadas.includes(t)) {
      tablasDominadas.push(t);
    }
  });
}

}

 const tiempoFinal=Math.floor((Date.now()-tiempoInicio)/1000);
 const nombre=fases[faseActual].id;
 const nombreLabel=getFaseLabel(fases[faseActual]);

 if(!tiemposMejores[nombre] || tiempoFinal < tiemposMejores[nombre]){
  tiemposMejores[nombre]=tiempoFinal;
  logros.push(`⏱️ Mejor tiempo en ${nombreLabel}: ${formatearTiempo(tiempoFinal)}s`);

agregarMensajeSistema(
  `⏱️ ${nombreJugador} ha conseguido un nuevo récord personal en ${nombreLabel}`
);


 }

 if(fallosActual===0){
  logros.push(`🏅 Fase perfecta: ${nombreLabel}`);

agregarMensajeSistema(
  `🏅 ${nombreJugador} ha hecho una fase perfecta`
);

 }

 guardarEstado();

guardarProgreso();

// ===== POPUP DE FINALIZACIÓN DE FASE =====

// Mostrar siempre el popup de logro



actualizarReveladoRecompensa(100);
actualizarPuntosUI();



// ===== TRANSICIÓN TRAS POPUP DE FINALIZACIÓN =====

if(faseActual === fases.length - 1){

  // Dejar visible el popup antes de ir al final
  setTimeout(() => {
    document.getElementById("popup").style.display = "none";
    mostrar("final");
    sonidoFinalMagico();
  }, 3500);

}else{

  // Dejar visible el popup antes de volver al mapa
  setTimeout(() => {
    document.getElementById("popup").style.display = "none";
    mostrarMapa();

    if(calcularNivelAdaptativo({ liberadas, fases, tiemposMejores, fallosPorOperacion }) > 0){
      logros.push("🚀 ¡El juego ha subido el nivel porque lo estás haciendo genial!");
    }

  }, 2500);
}
 
}catch(err){

alert (err)
}


}

/* =====================================================
   TIMER
===================================================== */
function iniciarTimer(){
 clearInterval(temporizador);
 temporizador=setInterval(()=>{
  const s=Math.floor((Date.now()-tiempoInicio)/1000);
  document.getElementById("tiempo").textContent=`⏱️ ${s}s`;
 },1000);
}

/* =====================================================
   MOCHILA
===================================================== */
function mostrarMochila(){
 const ul=document.getElementById("listaLogros");
 ul.innerHTML="";
 logros.forEach(l=>{
  const li=document.createElement("li");
  li.textContent=l;
  ul.appendChild(li);
 });

// === Tabla de mejores tiempos ===
const tbody = document
  .querySelector("#tablaTiempos tbody");

tbody.innerHTML = "";

fases.forEach((fase, i) => {
  const tr = document.createElement("tr");

  const tdFase = document.createElement("td");
  tdFase.textContent = getFaseLabel(fase);

  const tdUni = document.createElement("td");
  tdUni.textContent = fase.recompensa.nombre;

  const tdTiempo = document.createElement("td");
  const tiempo = tiemposMejores[fase.id];
  tdTiempo.textContent = tiempo ? `${formatearTiempo(tiempo)} m:s` : "—";

  tr.appendChild(tdFase);
  tr.appendChild(tdUni);
  tr.appendChild(tdTiempo);

  tbody.appendChild(tr);
});

const pin = localStorage.getItem("pinJugador");
document.getElementById("pinJugadorUI").textContent =
  pin ? pin : "—";


 mostrar("mochila");

pintarRecompensasLiberadas();
pintarResumenMundosMochila();
}

/* =====================================================
   PANEL FAMILIAR
===================================================== */
function pintarResumenCursos(){
  const cont = document.getElementById("resumenCursosPanel");
  if(!cont || !manifestCatalog) return;
  cont.innerHTML = "";
  const allStates = loadAllMundosStates();
  const cursos = [...new Set(manifestCatalog.mundos.map(m => m.curso))].sort();

  cursos.forEach(curso => {
    const mundosCurso = manifestCatalog.mundos.filter(m => m.curso === curso);
    const puntosCurso = mundosCurso.reduce((acc, m) => acc + (allStates[m.id]?.puntosMundo || 0), 0);
    const fasesCurso = mundosCurso.reduce((acc, m) => {
      const lib = normalizarLiberadas(allStates[m.id] || {});
      return acc + lib.length;
    }, 0);
    const row = document.createElement("div");
    row.className = "resumen-curso-item";
    row.innerHTML = `<span>${curso}º Primaria</span><strong>${fasesCurso} fases · ${puntosCurso}⭐</strong>`;
    cont.appendChild(row);
  });
}

function mostrarPanel(){
 document.getElementById("panelFases").textContent=
  `${liberadas.length}/${fases.length}`;
 document.getElementById("panelTablas").textContent=
  tablasDominadas.length ? tablasDominadas.join(", ") : "Aún en progreso";
 document.getElementById("panelIntentos").textContent=
  intentosTotales;

 pintarBarrasTablas();
 pintarResumenCursos();

 const ul=document.getElementById("listaFallos");
 ul.innerHTML="";
 Object.entries(fallosPorOperacion)
  .sort((a,b)=>b[1]-a[1])
  .forEach(([op,c])=>{
   const li=document.createElement("li");
   li.textContent=`${op} → ${c} fallos`;
   ul.appendChild(li);
  });

 mostrar("panel");
}

/* =====================================================
   RESET TOTAL
===================================================== */


function resetearTodo(){

if(!confirm("¿Seguro que quieres reiniciar todo el juego?")) return;
  // Borrar datos
  localStorage.removeItem("puntos");
  localStorage.removeItem("fasesLiberadas");
  localStorage.removeItem("tiemposMejores");
  localStorage.removeItem("fallosPorOperacion");
  localStorage.removeItem("mundos");
  localStorage.removeItem("mundoActivo");

localStorage.removeItem("historiaVista");

  // Reiniciar estado en memoria
  puntos = 0;
  puntosMundo = 0;
  liberadas = [];
  tiemposMejores = {};
  fallosPorOperacion = {};
  tablasDominadas = [];
  logros = [];

  // Guardar estado inicial correcto
  localStorage.setItem("fasesLiberadas", JSON.stringify(liberadas));
  localStorage.setItem("puntos", puntos);

  // Actualizar interfaz
  document.getElementById("puntos").textContent = puntos;


guardarProgreso();


// Volver al inicio correcto según estado
if(!nombreJugador){
  mostrar("pantallaNombre");
}else{
  mostrarSelectorMundos();
}
 
}


/* =====================================================
   PROGRESO SUPERIOR
===================================================== */
function actualizarProgreso(){
 document.getElementById("progresoMundos").textContent=
  `${liberadas.length}/${fases.length}`;
 document.getElementById("avatarProgreso").textContent=
  ["🧍‍♀️","🚶‍♀️","🏃‍♀️","🦄","🌈"][liberadas.length] || "🌈";
}

/* =====================================================
   UTILIDADES
===================================================== */

function popup(texto, mostrarRecompensa=false){
  const rec = mostrarRecompensa ? fases[faseActual]?.recompensa : null;
  document.getElementById("popupTexto").textContent = rec?.emoji && !rec?.asset
    ? `${rec.emoji} ${texto}`
    : texto;

  const img = document.getElementById("popupRecompensa");

  if(mostrarRecompensa && rec?.asset){
    img.src = rec.asset;
    img.style.display = "block";
  }else{
    img.style.display = "none";
  }

  document.getElementById("popup").style.display = "flex";
}


function cerrarPopup(){
 document.getElementById("popup").style.display="none";
 if(indice<operaciones.length) mostrarOperacion();
}
function mostrar(id){
 document.querySelectorAll(".pantalla")
  .forEach(p=>p.classList.remove("activa"));
 document.getElementById(id).classList.add("activa");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

sincronizarSiEsNecesario();

}


function actualizarPuntosUI(){

const puntosEl = document.getElementById("puntos");
puntosEl.textContent = puntos;
puntosEl.classList.add("subiendo");

setTimeout(() => {
  puntosEl.classList.remove("subiendo");
}, 600);

}


/* =====================================================
   GUARDAR
===================================================== */
function guardarEstado(){
  persistirMundoActual();
  recalcularPuntosGlobales();
  saveGlobalState({ puntos, intentosTotales, puntosPorMundo: puntosPorMundoMap });
  document.getElementById("puntos").textContent = puntos;
  actualizarProgreso();
}

/* =====================================================
   INICIO
===================================================== */
function mostrarMapa(){
try{

cargarPuntosClase(() => {
		//cargarPanelClase();
      actualizarHeaderMundo();
      construirMapa();
      actualizarPanelCurricular();
      actualizarPanelPractica();
      poblarSelectorTabla();
      bindAccessibilityControls();
      applyAccessibilitySettings();
      actualizarPuntosUI();
      mostrar("mapa");
    });
  
}catch(err){
	alert(err);
}

}


function lanzarConfeti(){
  const cont = document.getElementById("confeti");
  cont.style.display = "block";
  cont.innerHTML = "";

  const colores = ["#ff80ab","#ce93d8","#80deea","#ffd54f","#a5d6a7"];

  for(let i=0;i<40;i++){
    const d = document.createElement("div");
    d.className = "confeti-pieza";
    d.style.left = Math.random()*100 + "vw";
    d.style.background =
      colores[Math.floor(Math.random()*colores.length)];
    d.style.animationDelay = (Math.random()*0.5) + "s";
    cont.appendChild(d);
  }

  setTimeout(()=>{
  cont.innerHTML = "";
  cont.style.display = "none";
},1600);

}


function guardarNombre(){
  const input = document.getElementById("inputNombre");
  const error = document.getElementById("errorNombre");

  const nombre = input.value.trim();
const id = nombre.toLowerCase();

  error.style.display = "none";

  if(nombre.length < 2){
    error.textContent = "Escribe un nombre un poco más largo 🙂";
    error.style.display = "block";
    return;
  }

  // Si Firebase no está disponible, dejamos pasar
  if(!db){
    nombreJugador = nombre;

agregarMensajeSistema(
  `✨ ${nombreJugador} se ha unido al Reino de los Unicornios`
);
    localStorage.setItem("nombreJugador", nombreJugador);
    actualizarHeaderNombre();
    mostrar("historia");
    return;
  }

  // Comprobar si el nombre ya existe en Firebase
  db.collection("players")
    .doc(nombre)
    .get()
    .then(doc => {
      if(doc.exists){
        
			if(doc.exists){
  const pinGuardado = doc.data().pin;
  const pinIntroducido = prompt(
    "Este jugador ya existe.\nIntroduce tu PIN secreto. Lo tienes en la mochila de la partida anterior:"
  );

  if(pinIntroducido === pinGuardado){
    // PIN correcto → cargar datos
    const data = doc.data();

    nombreJugador = nombre;
    cargarProgresoDesdeFirebase();

    localStorage.setItem("nombreJugador", nombreJugador);
    localStorage.setItem("puntos", puntos);
    localStorage.setItem("pinJugador", pinGuardado);

    actualizarHeaderNombre();
    actualizarPuntosUI();
    mostrarSelectorMundos();
  }else{
    error.textContent =
      "PIN incorrecto ❌ Prueba con otro nombre";
    error.style.display = "block";
  }
}


			

      }else{
        // Nombre libre → continuar
        

// Nombre libre → crear jugador nuevo
const pin = generarPIN();

nombreJugador = nombre;
puntos = 0;

agregarMensajeSistema(
  `✨ ${nombreJugador} se ha unido al Reino de los Unicornios`
);

localStorage.setItem("nombreJugador", nombreJugador);
localStorage.setItem("puntos", puntos);
localStorage.setItem("pinJugador", pin);

db.collection("players")
  .doc(nombreJugador)
  .set(buildFirebasePayload(nombreJugador, { puntos, intentosTotales, puntosPorMundo: puntosPorMundoMap }, loadAllMundosStates(), mundoId, pin));

actualizarHeaderNombre();
actualizarPuntosUI();
mostrar("historia");
//mostrarMapa();


      }
    })
    .catch(err => {
      console.log("JA 😂 Error comprobando nombre");
      console.error(err);

      // En caso de error, dejamos continuar
      nombreJugador = nombre;
      localStorage.setItem("nombreJugador", nombreJugador);
      actualizarHeaderNombre();
		mostrar("historia");
      //mostrarMapa();
    });
}



function actualizarHeaderNombre(){
  const zona = document.getElementById("nombreJugadorHeader");
  const zonaFinal = document.getElementById("nombreJugadorFinal");
  if(zona) zona.textContent = nombreJugador;
  if(zonaFinal) zonaFinal.textContent = nombreJugador;
}


/* ================= FIREBASE: GUARDAR JUGADOR ================= */

function guardarJugadorEnFirebase(){

try{
  if(!db){
    console.log("JA 😂 db no existe, no se guarda");
    return;
  }

  if(!nombreJugador){
    console.log("JA 😂 no hay nombreJugador");
    return;
  }

  db.collection("players")
    .doc(nombreJugador)
    .set(buildFirebasePayload(nombreJugador, { puntos, intentosTotales, puntosPorMundo: puntosPorMundoMap }, loadAllMundosStates(), mundoId))
    .then(() => {
      console.log("Firebase OK ✅");
    })
    .catch(err => {
      console.log("JA 😂 Error al guardar en Firebase");
      console.error(err);
    });


}catch(error){
 console.error("Error guardando en Firebase:", error);
}

}


async function mostrarRanking(){
  mostrar("ranking");
  await asegurarMundoRankingSincronizado();
  const ctx = crearContextoRankingStats();
  actualizarEncabezadoRankingStats(ctx);
  mostrarRankingRapidos(ctx);
  cargarPanelGlobal(ctx);

  const lista = document.getElementById("listaRanking");
  lista.innerHTML = "<li>Cargando ranking…</li>";

  if(!db){
    lista.innerHTML =
      "<li>Ranking no disponible sin conexión</li>";
    return;
  }

  db.collection("players")
    .orderBy("puntos", "desc")
    .limit(20)
    .get()
    .then(snapshot => {
      lista.innerHTML = "";

      if(snapshot.empty){
        lista.innerHTML = "<li>Aún no hay datos</li>";
        return;
      }

      let puesto = 1;

      snapshot.forEach(doc => {
        const data = doc.data();

        const li = document.createElement("li");

const esJugadorActual = data.nombre === nombreJugador;

const puntosMundoRanking = data.puntosPorMundo?.[mundoId];
const extraMundo = puntosMundoRanking !== undefined ? ` · ${puntosMundoRanking}⭐ en este mundo` : "";
li.textContent = esJugadorActual
  ? `👉 ${puesto}. ${data.nombre} — ${data.puntos} ⭐${extraMundo}`
  : `${puesto}. ${data.nombre} — ${data.puntos} ⭐`;

if(esJugadorActual){
  li.classList.add("jugador-actual");
}

lista.appendChild(li);
puesto++;
      });
    })
    .catch(err => {
      console.log("JA 😂 Error leyendo ranking");
      console.error(err);
      lista.innerHTML =
        "<li>Error cargando ranking</li>";
    });
}


function guardarProgreso(){
  persistirMundoActual();
  recalcularPuntosGlobales();
  saveGlobalState({ puntos, intentosTotales, puntosPorMundo: puntosPorMundoMap });
  if(!db || !nombreJugador) return;
  const allStates = loadAllMundosStates();
  db.collection("players").doc(nombreJugador)
    .set(buildFirebasePayload(nombreJugador, { puntos, intentosTotales, puntosPorMundo: puntosPorMundoMap }, allStates, mundoId))
    .catch(err => { console.log("JA 😂 Error guardando progreso"); console.error(err); });
}

function cargarProgresoDesdeFirebase(){
  if(!db || !nombreJugador) return;
  db.collection("players").doc(nombreJugador).get()
    .then(async doc => {
      if(!doc.exists) return;
      const parsed = parseFirebaseData(doc.data(), mundoId);
      for(const [id, state] of Object.entries(parsed.allMundosStates)){
        saveMundoState(id, state);
      }
      if(parsed.mundoActivo) setMundoActivoId(parsed.mundoActivo);
      await cargarMundoContenido(getMundoActivoId());
      guardarEstado();
      actualizarPuntosUI();
      mostrarSelectorMundos();
    })
    .catch(err => { console.log("JA 😂 Error cargando progreso"); console.error(err); });
}

function clavesPermitidasFases(fasesRef){
  const claves = new Set();
  fasesRef.forEach((fase) => {
    claves.add(fase.id);
    claves.add(getFaseLabel(fase));
    claves.add(fase.nombre);
  });
  return claves;
}

function filtrarTiemposPorMundo(tiempos, fasesRef){
  const claves = clavesPermitidasFases(fasesRef);
  const filtrado = {};
  for (const [clave, valor] of Object.entries(tiempos || {})) {
    if (claves.has(clave)) filtrado[clave] = valor;
  }
  return filtrado;
}

function getTiemposJugadorEnMundo(data, ctx){
  let tiempos = getTiemposMundoFromFirebase(data, ctx.mundoRef, ctx.clavesPermitidas);
  if(data.nombre === nombreJugador){
    const local = migrateTiempoKeys(loadMundoState(ctx.mundoRef).tiemposMejores || {}, ctx.fasesRef);
    tiempos = { ...tiempos, ...filtrarTiemposPorMundo(local, ctx.fasesRef) };
  }
  return tiempos;
}

function crearContextoRankingStats(){
  const fasesRef = [...fases];
  return {
    mundoRef: mundoId,
    fasesRef,
    clavesPermitidas: clavesPermitidasFases(fasesRef),
  };
}

function actualizarEncabezadoRankingStats(ctx){
  const entry = getMundoEntry(manifestCatalog, ctx.mundoRef);
  const etiqueta = entry ? `${entry.emoji} ${entry.nombre}` : (contenidoMundo?.nombre || "Mundo");
  const rapido = document.getElementById("tituloRapidosMundo");
  const medio = document.getElementById("tituloMediosMundo");
  if(rapido) rapido.textContent = `⚡ Los más rápidos de cada fase · ${etiqueta}`;
  if(medio) medio.textContent = `⏱️ Tiempo medio global · ${etiqueta}`;
}

async function asegurarMundoRankingSincronizado(){
  const idActivo = getMundoActivoId();
  if(!contenidoMundo || contenidoMundo.id !== idActivo || mundoId !== idActivo){
    await cargarMundoContenido(idActivo);
  }
}

function obtenerTiempoFase(tiempos, fase){
  if(!tiempos || !fase) return undefined;
  return tiempos[fase.id] ?? tiempos[getFaseLabel(fase)];
}

function mostrarRankingRapidos(ctx = crearContextoRankingStats()){
  const tbody = document.querySelector("#tablaRapidos tbody");
  tbody.innerHTML = "";

  if(!db){
    tbody.innerHTML =
      "<tr><td colspan='2'>No disponible sin conexión</td></tr>";
    return;
  }

  const mejores = {};
  ctx.fasesRef.forEach((fase) => {
    mejores[fase.id] = {
      label: getFaseLabel(fase),
      nombre: null,
      tiempo: Infinity,
    };
  });

  db.collection("players").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const tiempos = getTiemposJugadorEnMundo(data, ctx);

        ctx.fasesRef.forEach((fase) => {
          const tiempo = obtenerTiempoFase(tiempos, fase);
          if(tiempo === undefined) return;

          if(tiempo < mejores[fase.id].tiempo){
            mejores[fase.id] = {
              label: getFaseLabel(fase),
              nombre: data.nombre,
              tiempo,
            };
          }
        });
      });

      ctx.fasesRef.forEach((fase) => {
        const tr = document.createElement("tr");
        const tdFase = document.createElement("td");
        const tdJugador = document.createElement("td");
        const dato = mejores[fase.id];

        tdFase.textContent = dato.label;
        tdJugador.textContent = dato.nombre
          ? `${dato.nombre} (${formatearTiempo(dato.tiempo)} m:s)`
          : "—";

        tr.appendChild(tdFase);
        tr.appendChild(tdJugador);
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.log("JA 😂 Error ranking rápidos");
      console.error(err);
    });
}

function cargarPanelGlobal(ctx = crearContextoRankingStats()){
  if(!db) return;

  let puntosTotales = 0;
	let totalRecompensas = 0;

  const tiemposPorFase = {};
  ctx.fasesRef.forEach((fase) => {
    tiemposPorFase[fase.id] = {
      label: getFaseLabel(fase),
      suma: 0,
      count: 0,
    };
  });

  db.collection("players").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();

        puntosTotales += data.puntos || 0;

        if (data.mundos && Object.keys(data.mundos).length > 0) {
          Object.values(data.mundos).forEach((mundo) => {
            totalRecompensas += normalizarLiberadas(mundo).length;
          });
        } else {
          totalRecompensas += normalizarLiberadas({ liberadas: data.liberadas }).length;
        }

        const tiempos = getTiemposJugadorEnMundo(data, ctx);
        ctx.fasesRef.forEach((fase) => {
          const tiempo = obtenerTiempoFase(tiempos, fase);
          if(tiempo === undefined) return;
          tiemposPorFase[fase.id].suma += tiempo;
          tiemposPorFase[fase.id].count++;
        });
      });

      document.getElementById("puntosClase").textContent =
        puntosTotales.toLocaleString();

      document.getElementById("unicorniosClase").textContent =
        totalRecompensas;

      const objetivo = 60000;
      const porcentaje = Math.min(100, (puntosTotales / objetivo) * 100);

      document.getElementById("barraClase").style.width = porcentaje + "%";

puntosClase = puntosTotales;

document.getElementById("textoObjetivo").textContent =
        puntosTotales >= objetivo
          ? "🎉 ¡Objetivo conseguido! El grupo global ha logrado una gran hazaña."
          : `Faltan ${objetivo - puntosTotales} puntos para lograr el objetivo y desbloquear nuevos retos. ¿Podréis conseguirlo?`;

      const tbody = document.getElementById("tablaTiemposClase");
      tbody.innerHTML = "";

      ctx.fasesRef.forEach((fase) => {
        const stats = tiemposPorFase[fase.id];
        const tr = document.createElement("tr");
        const media = stats.count > 0 ? Math.round(stats.suma / stats.count) : null;
        tr.innerHTML = `<td>${stats.label}</td><td>${media !== null ? `${formatearTiempo(media)} m:s` : "—"}</td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("Error cargando panel global", err);
    });
}

function iniciarAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // 🔑 CLAVE: reanudar contexto si está suspendido
  if(audioCtx.state === "suspended"){
    audioCtx.resume();
  }
}


function reproducirMelodia(notas){
  iniciarAudio();

if(!audioCtx) return;

  let tiempo = audioCtx.currentTime;

  notas.forEach(nota => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    o.type = "sine";
    o.frequency.value = nota.freq;

    o.connect(g);
    g.connect(audioCtx.destination);

    g.gain.setValueAtTime(0.0001, tiempo);
    g.gain.exponentialRampToValueAtTime(0.3, tiempo + 0.02);
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      tiempo + nota.duracion
    );

    o.start(tiempo);
    o.stop(tiempo + nota.duracion);

    tiempo += nota.duracion;
  });
}



function sonidoFinalMagico(){
  reproducirMelodia([
    // Ascenso mágico
    { freq: 523, duracion: 0.25 }, // Do
    { freq: 587, duracion: 0.25 }, // Re
    { freq: 659, duracion: 0.25 }, // Mi
    { freq: 784, duracion: 0.35 }, // Sol

    // Pequeña pausa emocional
    { freq: 659, duracion: 0.2 },  // Mi
    { freq: 784, duracion: 0.3 },  // Sol
    { freq: 880, duracion: 0.35 }, // La

    // Clímax
    { freq: 1046, duracion: 0.45 }, // Do alto
    { freq: 988, duracion: 0.25 },  // Si
    { freq: 1046, duracion: 0.6 },  // Do alto

    // Resolución mágica final
    { freq: 784, duracion: 0.4 },   // Sol
    { freq: 659, duracion: 0.3 },   // Mi
    { freq: 523, duracion: 0.9 }    // Do final largo
  ]);
}


function puntosDelMundoActual(){
  return puntosPorFase(fases[faseActual], puntosPorFaseMap);
}


function cargarPuntosClase(callback){

  if(!db){
    if(callback) callback();
    return;
  }

  // Si ya está cargado, no volver a pedirlo
  if(datosClaseCargados){
    if(callback) callback();
    return;
  }

  datosClaseCargados = true;

  db.collection("players").get()
    .then(snapshot => {

      let total = 0;

      snapshot.forEach(doc => {
        total += doc.data().puntos || 0;
      });

      puntosClase = total;

      // 🔑 AVISAR DE QUE YA ESTÁ LISTO
      if(callback) callback();

    })
    .catch(err => {
      console.log("Error cargando puntos de la clase");
      console.error(err);

      if(callback) callback(); // para no bloquear la app
    });
}


function mostrarMural(){
try{
  mostrar("mural");
	pintarBotonesMural();
	actualizarContadorMensajes();
	escucharMural();
	
	}catch(err){
	 alert(err);
	}
}



function agregarMensajeSistema(texto){

  // Pintar en pantalla (si estamos en el mural)
  const cont = document.getElementById("muralMensajes");
  if(cont){
    const div = document.createElement("div");
    div.className = "mensaje-mural mensaje-sistema";
    div.textContent = texto;
    cont.appendChild(div);
    cont.scrollTop = cont.scrollHeight;
  }

  // Guardar en Firebase
  if(!db) return;

  db.collection("mural").add({
    tipo: "sistema",
    texto: texto,
	 likes: {},
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    console.log("Error guardando mensaje del mural");
    console.error(err);
  });
}


function formatearFechaHora(timestamp){
  if(!timestamp) return "";

  const fecha = timestamp.toDate();
  const dia = fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit"
  });
  const hora = fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${dia} ${hora}`;
}

function escucharMural(){

  if(!db) return;

  db.collection("mural")
    .orderBy("fecha", "desc")
    .limit(30)
    .onSnapshot(snapshot => {

      const cont = document.getElementById("muralMensajes");
      if(!cont) return;

      cont.innerHTML = "";

      snapshot.forEach(doc => {
        const m = doc.data();
        const div = document.createElement("div");
        
			div.className = 
  m.tipo === "sistema"
    ? "mensaje-mural mensaje-sistema"
    : "mensaje-mural mensaje-jugador";


        //div.textContent = m.texto;


const haDadoLike = m.likes && m.likes[nombreJugador];
const totalLikes = m.likes ? Object.keys(m.likes).length : 0;



div.innerHTML = `
  <div class="fecha-mural">
    ${formatearFechaHora(m.fecha)}
  </div>

  <div class="mensaje-con-like">
    <div class="texto-mural">${m.texto}</div>

    <button
      class="like-btn ${haDadoLike ? 'like-activo' : ''}"
      onclick="toggleLike('${doc.id}')"
      ${haDadoLike ? 'disabled' : ''}
    >
      👍 ${totalLikes}
    </button>
  </div>
`;

      

        cont.appendChild(div);
      });

      cont.scrollTop = cont.scrollHeight;
    });
}

//agregarMensajeSistema("✨ Se han anadido dos nuevas fases, 🌀 Torre del Hechizo que esta ya disponible y 🧮 Forja de los Gigantes que se desbloquea al llegar a los 60.000 puntos entre toda la clase.");



function toggleLike(idMensaje){
  if(!db || !nombreJugador) return;

  const ref = db.collection("mural").doc(idMensaje);

  ref.get().then(doc => {
    if(!doc.exists) return;

    const data = doc.data();
    const likes = data.likes || {};

    if(likes[nombreJugador]) return; // ya reaccionó

    ref.update({
      [`likes.${nombreJugador}`]: true
    });
  }).catch(err => {
    console.log("Error al dar like");
    console.error(err);
  });
}

let ultimoMensajeMural = 0;

function enviarMensajePredefinido(idMensaje){


comprobarResetDiarioMensajes();

if(mensajesDisponibles <= 0){
  popup(
    "🔒 No tienes mensajes mágicos disponibles.\n\n" +
    "Juega partidas para ganar más ✨"
  );
  return;
}


if (mensajesUsadosHoy === CONFIG_MURAL.maxMensajesDia){

popup(
    "🔒 Ya has enviado el maximo de mensajes permitido hoy ✨"
  );
  return;

}

  const texto = mensajesPredefinidos[idMensaje];
  if(!texto) return;

  const ahora = Date.now();
  if(ahora - ultimoMensajeMural < 8000){
    popup("⏳ Espera un poco antes de enviar otro mensaje");
    return;
  }
  ultimoMensajeMural = ahora;


mensajesUsadosHoy++;

localStorage.setItem("mensajesDisponibles", mensajesDisponibles);
localStorage.setItem("mensajesUsadosHoy", mensajesUsadosHoy);

actualizarContadorMensajes();

  // Guardar en Firebase
  if(!db || !nombreJugador) return;

  db.collection("mural").add({
    tipo: "jugador",
    texto: `${nombreJugador}: ${texto.texto}`,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    console.log("Error enviando mensaje predefinido");
    console.error(err);
  });
}


const reaccionesDisponibles = ["👏", "❤️", "👍", "⭐"];



function reaccionarMensaje(idMensaje, emoji){
  if(!db) return;

  const ref = db.collection("mural").doc(idMensaje);

  ref.get().then(doc => {
    if(!doc.exists) return;

    const data = doc.data();
    const reacciones = data.reacciones || {};

    const valorActual = reacciones[emoji] || 0;

    return ref.update({
      [`reacciones.${emoji}`]: valorActual + 1
    });
  }).catch(err => {
    console.log("Error al reaccionar al mensaje");
    console.error(err);
  });
}



function pintarBotonesMural(){
  const cont = document.getElementById("muralBotones");
  if(!cont) return;

  cont.innerHTML = "";

  Object.entries(mensajesPredefinidos).forEach(([id, texto]) => {
    // El emoji será el botón (primer carácter del texto)
    const emoji = texto.icono;

    const btn = document.createElement("button");
    btn.textContent = emoji;

	btn.title = texto.texto;

    
    btn.onclick = () => enviarMensajePredefinido(id);

    cont.appendChild(btn);
  });
}

/* ===============================
   CONFIGURACIÓN MURAL MÁGICO
================================ */

let mensajesDisponibles = 0;
let mensajesUsadosHoy = 0;
let ultimoDiaMensajes = localStorage.getItem("ultimoDiaMensajes") || "";

//ultimoDiaMensajes=null;


function comprobarResetDiarioMensajes(){
  const hoy = new Date().toISOString().slice(0,10);

  if(ultimoDiaMensajes !== hoy){
    mensajesDisponibles = 0;
    mensajesUsadosHoy = 0;
    ultimoDiaMensajes = hoy;

    localStorage.setItem("ultimoDiaMensajes", hoy);
    localStorage.setItem("mensajesDisponibles", mensajesDisponibles);
    localStorage.setItem("mensajesUsadosHoy", mensajesUsadosHoy);
  }
}

function actualizarContadorMensajes(){
  const el = document.getElementById("contadorMensajes");
  if(!el) return;

  el.innerHTML =
    `💬 Mensajes disponibles hoy: <strong>${mensajesDisponibles}</strong> / ${CONFIG_MURAL.maxMensajesDia}. Enviados ${mensajesUsadosHoy}`;
}



document.addEventListener("keydown", function(e){
  const input = document.getElementById("respuesta");

  if(
  document.activeElement === input &&
  e.key === "Enter" &&
  document.getElementById("popup").style.display !== "flex"
){
  e.preventDefault();
  responder();
}
});


/*
document.addEventListener("keydown", function(e){
  const popup = document.getElementById("popup");

  if(
    popup &&
    popup.style.display === "flex" &&
    e.key === "Enter"
  ){
    e.preventDefault();
    cerrarPopup();
  }
});*/

function pintarResumenMundosMochila(){
  const ul = document.getElementById("listaLogros");
  if(!ul || !manifestCatalog) return;
  const resumen = document.createElement("li");
  const partes = manifestCatalog.mundos
    .map(m => {
      const st = loadMundoState(m.id);
      return `${m.emoji} ${st.puntosMundo || 0}⭐`;
    });
  resumen.textContent = `Mundos: ${partes.join(" · ")}`;
  ul.prepend(resumen);
}

function pintarRecompensasLiberadas(){
  const cont = document.getElementById("galeriaRecompensas");
  if(!cont) return;

  cont.innerHTML = "";

  liberadas.forEach(i => {
    const fase = fases[i];
    if(!fase?.recompensa) return;

    const div = document.createElement("div");
    div.className = "recompensa-item";
    const rec = fase.recompensa;

    if(rec.asset){
      div.innerHTML = `
        <img src="${rec.asset}" alt="${rec.nombre}">
        <span>${rec.nombre}</span>
      `;
    }else{
      div.innerHTML = `
        <span class="emoji-recompensa-mochila">${rec.emoji || "🎁"}</span>
        <span>${rec.nombre}</span>
      `;
    }

    cont.appendChild(div);
  });

  if(liberadas.length === 0){
    cont.innerHTML = `<p>🔒 Aún no has liberado ninguna ${getEtiquetaRecompensa(contenidoMundo)}</p>`;
  }
}


async function initApp(){
  try {
    manifestCatalog = await loadManifest();
    applyAccessibilitySettings();

    const globalState = loadGlobalState();
    puntos = globalState.puntos;
    puntosPorMundoMap = globalState.puntosPorMundo || {};
    intentosTotales = globalState.intentosTotales;

    await cargarMundoContenido(getMundoActivoId());

    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./service-worker.js").catch(console.error);
    }

    const globalFns = {
      mostrar, mostrarMapa, mostrarSelectorMundos, entrarMundo, mostrarMochila, mostrarPanel, mostrarRanking, mostrarMural,
      responder, responderOpcion, cerrarPopup, cerrarHistoria, guardarNombre, resetearTodo,
      iniciarRepasoErrores, iniciarPracticaTabla, toggleLike, enviarMensajePredefinido
    };
    Object.entries(globalFns).forEach(([name, fn]) => { window[name] = fn; });

    if(!nombreJugador){
      mostrar("pantallaNombre");
    }else{
      actualizarHeaderNombre();
      actualizarHeaderMundo();
      if(!localStorage.getItem("historiaVista")){
        mostrar("historia");
      }else{
        mostrarSelectorMundos();
      }
    }
  } catch(err) {
    console.error("Error iniciando la app:", err);
    alert("No se pudo cargar el juego. Recarga la página.");
  }
}

initApp();
