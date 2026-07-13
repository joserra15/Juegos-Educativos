import {
  loadMundoContent,
  getFaseLabel,
  migrateTiempoKeys
} from "../engine/ContentLoader.js";
import {
  generarOperacionesFase,
  generarOperacionesRepaso,
  getDificultadLabel,
  formatearTiempo
} from "../engine/QuestionGenerator.js";
import {
  puntosPorFase,
  calcularPenalizacion,
  calcularNivelAdaptativo
} from "../engine/Scoring.js";
import { getHint } from "../engine/Hints.js";
import {
  MUNDO_ACTUAL,
  loadMundoState,
  saveMundoState,
  loadGlobalState,
  saveGlobalState,
  buildFirebasePayload,
  parseFirebaseData,
  mergeRemoteIfNewer
} from "../engine/ProgressStore.js";


let puntos = 0;
let faseActual = 0;
let indice = 0;
let operaciones = [];
let liberadas = [0];
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
let contenidoMundo = null;
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
      const parsed = parseFirebaseData(doc.data());
      const localState = { liberadas, tiemposMejores, fallosPorOperacion, tablasDominadas, logros };
      const merged = mergeRemoteIfNewer(puntos, parsed.puntos, localState, parsed.mundoState);
      if(merged.merged){
        puntos = merged.puntos;
        liberadas = merged.mundoState.liberadas;
        tiemposMejores = migrateTiempoKeys(merged.mundoState.tiemposMejores, fases);
        fallosPorOperacion = merged.mundoState.fallosPorOperacion;
        tablasDominadas = merged.mundoState.tablasDominadas || [];
        logros = merged.mundoState.logros || [];
        guardarEstado();
        actualizarPuntosUI();
      }
      localStorage.setItem("ultimaSyncFirebase", Date.now());
    })
    .catch(err => { console.log("JA 😂 Error sincronizando"); console.error(err); });
}


function cerrarHistoria(){
  localStorage.setItem("historiaVista", "true");
  mostrarMapa();
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
  indice = 0;
  fallosActual = 0;
  operaciones = generarOperacionesRepaso(fallosPorOperacion, textos);

  document.getElementById("tituloFase").textContent =
    "🔁 Repaso de operaciones difíciles";

  document.getElementById("contador").textContent =
    `Pregunta 1 de ${operaciones.length}`;

document.getElementById("mascaraUnicornio").style.height = "0%";
 
indice=0;
 fallosActual=0;
document.getElementById("contadorFallos").textContent = "";


document.getElementById("pista").textContent = "";

tiempoInicio=Date.now();
iniciarTimer();


document.getElementById("imgUnicornio").src = fases[0]?.recompensa?.asset || "unicornio1.png";

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
        `⭐ la clase llegue a ${puntosNecesarios.toLocaleString()} puntos\n\n` +
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
 faseActual=i;
 indice=0;
fallosActual = 0;

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
operaciones = generarOperacionesFase(fases[i], { textos, bancoAvanzado, fallosPorOperacion, nivelAdaptativo });

document.getElementById("imgUnicornio").src = fases[i].recompensa.asset;
document.getElementById("mascaraUnicornio").style.height = "0%";
document.getElementById("indicadorDificultad").textContent = "";
mostrar("juego");
mostrarOperacion();
}


/* =====================================================
   MOSTRAR OPERACIÓN
===================================================== */
function mostrarOperacion(){
 document.getElementById("tituloFase").textContent=getFaseLabel(fases[faseActual]);
 document.getElementById("contador").textContent=
  `Pregunta ${indice+1} de ${operaciones.length}`;
 document.getElementById("problema").textContent=
  operaciones[indice].texto;

actualizarIndicadorDificultad(operaciones[indice]);
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
}

/* =====================================================
   RESPONDER
===================================================== */
function responder(){
 const op=operaciones[indice];
 const val=+respuesta.value;
 intentosTotales++;

 if(val===op.r){
  sonido([880,1320,1760]);
	document.getElementById("pista").textContent = "";

if(!modoRepaso){
	
	// Sistema unificado de puntos por fase
const puntosGanados = puntosDelMundoActual();
puntos += puntosGanados;


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


document.getElementById("mascaraUnicornio").style.height =
  porcentaje + "%";

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
    : `🦄 ¡Has liberado a ${fases[faseActual].recompensa.nombre}!`,
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

if(!modoRepaso){


const penalizacion = Math.max(3, Math.floor(puntosDelMundoActual() / 2));
puntos -= penalizacion;

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



  const clave=`${op.a}x${op.b}`;
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


 clearInterval(temporizador);
 sonido([660,880,1100],0.6);


const puntosGanados = puntosDelMundoActual() * 4;



puntos += puntosGanados;
 //puntos+=50;


// ✅ Marcar fase como superada (todas, incluidas avanzadas)
if(!liberadas.includes(faseActual)){
  liberadas.push(faseActual);
}

agregarMensajeSistema(
  `🦄 ${nombreJugador} ha liberado a ${fases[faseActual].recompensa.nombre}`
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



document.getElementById("mascaraUnicornio").style.height ="0%";
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

pintarUnicorniosLiberados();
}

/* =====================================================
   PANEL FAMILIAR
===================================================== */
function mostrarPanel(){
 document.getElementById("panelFases").textContent=
  `${liberadas.length}/${fases.length}`;
 document.getElementById("panelTablas").textContent=
  tablasDominadas.join(", ");
 document.getElementById("panelIntentos").textContent=
  intentosTotales;

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

localStorage.removeItem("historiaVista");

  // Reiniciar estado en memoria
  puntos = 0;
  liberadas = [0]; // 🔑 CLAVE
  tiemposMejores = {};
  fallosPorOperacion = {};

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
  mostrarMapa();
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

function popup(texto, mostrarUnicornio=false){
  document.getElementById("popupTexto").textContent = texto;

  const img = document.getElementById("popupUnicornio");

  if(mostrarUnicornio){
    img.src = fases[faseActual].recompensa.asset;
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
  saveGlobalState({ puntos, intentosTotales });
  saveMundoState(MUNDO_ACTUAL, { liberadas, tiemposMejores, fallosPorOperacion, tablasDominadas, logros });
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
      construirMapa();
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
    mostrarMapa();
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
    mostrarMapa();
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
  .set(buildFirebasePayload(nombreJugador, { puntos, intentosTotales }, {
    liberadas, tiemposMejores, fallosPorOperacion, tablasDominadas, logros
  }));

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
    .set(buildFirebasePayload(nombreJugador, { puntos, intentosTotales }, {
      liberadas, tiemposMejores, fallosPorOperacion, tablasDominadas, logros
    }))
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


function mostrarRanking(){
  mostrar("ranking");

mostrarRankingRapidos();
cargarPanelClase();

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

li.textContent = esJugadorActual
  ? `👉 ${puesto}. ${data.nombre} — ${data.puntos} ⭐`
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
  saveGlobalState({ puntos, intentosTotales });
  saveMundoState(MUNDO_ACTUAL, { liberadas, tiemposMejores, fallosPorOperacion, tablasDominadas, logros });
  if(!db || !nombreJugador) return;
  db.collection("players").doc(nombreJugador)
    .set(buildFirebasePayload(nombreJugador, { puntos, intentosTotales }, {
      liberadas, tiemposMejores, fallosPorOperacion, tablasDominadas, logros
    }))
    .catch(err => { console.log("JA 😂 Error guardando progreso"); console.error(err); });
}

function cargarProgresoDesdeFirebase(){
  if(!db || !nombreJugador) return;
  db.collection("players").doc(nombreJugador).get()
    .then(doc => {
      if(!doc.exists) return;
      const parsed = parseFirebaseData(doc.data());
      puntos = parsed.puntos;
      liberadas = parsed.mundoState.liberadas;
      tiemposMejores = migrateTiempoKeys(parsed.mundoState.tiemposMejores, fases);
      fallosPorOperacion = parsed.mundoState.fallosPorOperacion;
      tablasDominadas = parsed.mundoState.tablasDominadas || [];
      logros = parsed.mundoState.logros || [];
      guardarEstado();
      actualizarPuntosUI();
      mostrarMapa();
    })
    .catch(err => { console.log("JA 😂 Error cargando progreso"); console.error(err); });
}

function mostrarRankingRapidos(){
  const tbody = document.querySelector("#tablaRapidos tbody");
  tbody.innerHTML = "";

  if(!db){
    tbody.innerHTML =
      "<tr><td colspan='2'>No disponible sin conexión</td></tr>";
    return;
  }

  // Inicializamos estructura de mejores tiempos
  const mejores = {};
  mundos().forEach(mundo => {
    mejores[mundo] = {
      nombre: null,
      tiempo: Infinity
    };
  });

  db.collection("players").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const tiempos = data.tiemposMejores || {};

        mundos().forEach(mundo => {
          if(tiempos[mundo] !== undefined){
            const tiempo = tiempos[mundo];

            if(tiempo < mejores[mundo].tiempo){
              mejores[mundo] = {
                nombre: data.nombre,
                tiempo: tiempo
              };
            }
          }
        });
      });

      // Pintar tabla
      mundos().forEach(mundo => {
        const tr = document.createElement("tr");

        const tdMundo = document.createElement("td");
        tdMundo.textContent = mundo;

        const tdJugador = document.createElement("td");
        const dato = mejores[mundo];

        tdJugador.textContent = dato.nombre
          ? `${dato.nombre} (${formatearTiempo(dato.tiempo)} m:s)`
          : "—";

        tr.appendChild(tdMundo);
        tr.appendChild(tdJugador);
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.log("JA 😂 Error ranking rápidos");
      console.error(err);
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


function cargarPanelClase(){
  if(!db) return;

datosClaseCargados = true;

  let puntosTotales = 0;
  //let unicornios = new Set();
	let totalUnicornios = 0;

  const tiemposPorMundo = {};
  const conteosPorMundo = {};

  db.collection("players").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();

        // Puntos
        puntosTotales += data.puntos || 0;

        // Unicornios liberados
        totalUnicornios += (data.liberadas || []).length;

        // Tiempos
        const tiempos = data.tiemposMejores || {};
        Object.keys(tiempos).forEach(mundo => {
          if(!tiemposPorMundo[mundo]){
            tiemposPorMundo[mundo] = 0;
            conteosPorMundo[mundo] = 0;
          }
          tiemposPorMundo[mundo] += tiempos[mundo];
          conteosPorMundo[mundo]++;
        });
      });

      // Mostrar puntos
      document.getElementById("puntosClase").textContent =
        puntosTotales.toLocaleString();

      // Mostrar unicornios
      document.getElementById("unicorniosClase").textContent =
        totalUnicornios;

      // Barra de progreso
      const objetivo = 60000;
      const porcentaje = Math.min(100, (puntosTotales / objetivo) * 100);

      document.getElementById("barraClase").style.width = porcentaje + "%";

puntosClase = puntosTotales;

document.getElementById("textoObjetivo").textContent =
        puntosTotales >= objetivo
          ? "🎉 ¡Objetivo conseguido! La clase ha logrado una gran hazaña."
          : `Faltan ${objetivo - puntosTotales} puntos para lograr el objetivo y desbloquear nuevos mundos. ¿Podreis consegurlo?`;

      // Tabla de tiempos medios
      const tbody = document.getElementById("tablaTiemposClase");
      tbody.innerHTML = "";

      Object.keys(tiemposPorMundo).forEach(mundo => {
        const media = Math.round(
          tiemposPorMundo[mundo] / conteosPorMundo[mundo]
        );

        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${mundo}</td><td>${formatearTiempo(media)} m:s</td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("Error cargando panel de clase", err);
    });

construirMapa();

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

function pintarUnicorniosLiberados(){
  const cont = document.getElementById("galeriaUnicornios");
  if(!cont) return;

  cont.innerHTML = "";

  liberadas.forEach(i => {
    const fase = fases[i];
    if(!fase || !fase.recompensa.asset) return;

    const div = document.createElement("div");
    div.className = "unicornio-item";

    div.innerHTML = `
      <img src="${fase.recompensa.asset}" alt="${fase.recompensa.nombre}">
      <span>${fase.recompensa.nombre}</span>
    `;

    cont.appendChild(div);
  });

  if(liberadas.length === 0){
    cont.innerHTML = "<p>🔒 Aún no has liberado ningún unicornio</p>";
  }
}


async function initApp(){
  try {
    contenidoMundo = await loadMundoContent(MUNDO_ACTUAL);
    fases = contenidoMundo.fases;
    textos = contenidoMundo.textos;
    bancoAvanzado = contenidoMundo.bancoAvanzado;
    puntosPorFaseMap = contenidoMundo.puntosPorFase;
    mensajesAcierto = contenidoMundo.mensajes.acierto;
    mensajesError = contenidoMundo.mensajes.error;
    mensajesUltima = contenidoMundo.mensajes.ultima;
    mensajesPredefinidos = contenidoMundo.mensajesPredefinidos;
    CONFIG_MURAL = contenidoMundo.configMural;

    const globalState = loadGlobalState();
    puntos = globalState.puntos;
    intentosTotales = globalState.intentosTotales;

    const mundoState = loadMundoState(MUNDO_ACTUAL);
    liberadas = mundoState.liberadas;
    tiemposMejores = migrateTiempoKeys(mundoState.tiemposMejores, fases);
    fallosPorOperacion = mundoState.fallosPorOperacion;
    tablasDominadas = mundoState.tablasDominadas;
    logros = mundoState.logros;

    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./service-worker.js").catch(console.error);
    }

    try{
if(!nombreJugador){
  mostrar("pantallaNombre");
}else{
  actualizarHeaderNombre();
  if(!localStorage.getItem("historiaVista")){
  mostrar("historia");
}else{
  mostrarMapa();
}
}
}catch(error){

mostrarMapa();

}

    const globalFns = {
      mostrar, mostrarMapa, mostrarMochila, mostrarPanel, mostrarRanking, mostrarMural,
      responder, cerrarPopup, cerrarHistoria, guardarNombre, resetearTodo,
      iniciarRepasoErrores, toggleLike, enviarMensajePredefinido
    };
    Object.entries(globalFns).forEach(([name, fn]) => { window[name] = fn; });

  } catch(err) {
    console.error("Error iniciando la app:", err);
    alert("No se pudo cargar el juego. Recarga la página.");
  }
}

initApp();
