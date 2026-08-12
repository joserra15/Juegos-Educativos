/**
 * Generación de preguntas y bancos procedimentales.
 */

import { calcularProporcionesDificultad } from "./Scoring.js?v=3.6.1";

/** Fisher–Yates: mezcla uniforme sin el sesgo de sort+random. */
export function mezclar(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Normaliza opciones de selección múltiple:
 * - conserva exactamente una respuesta correcta (por índice o texto)
 * - elimina duplicados (case-insensitive) manteniendo la correcta
 * - baraja las opciones para que la correcta no quede siempre primera
 *
 * @returns {{ opciones: string[], r: number, textoCorrecto: string }}
 */
export function normalizarYBarajarOpciones(opcionesEntrada, correcta, { barajar = true } = {}) {
  const crudas = Array.isArray(opcionesEntrada) ? opcionesEntrada.map((o) => String(o ?? "").trim()) : [];
  if (!crudas.length) {
    throw new Error("La pregunta de selección debe tener opciones");
  }

  let textoCorrecto;
  if (typeof correcta === "number" && Number.isInteger(correcta) && correcta >= 0 && correcta < crudas.length) {
    textoCorrecto = crudas[correcta];
  } else if (correcta != null && String(correcta).trim() !== "") {
    const comoTexto = String(correcta).trim();
    const idx = crudas.findIndex((o) => o.toLowerCase() === comoTexto.toLowerCase());
    textoCorrecto = idx >= 0 ? crudas[idx] : comoTexto;
  } else {
    textoCorrecto = crudas[0];
  }

  if (!textoCorrecto) {
    throw new Error("La pregunta de selección no tiene texto de respuesta correcta");
  }

  const unicas = [];
  const vistos = new Set();
  for (const opt of crudas) {
    if (!opt) continue;
    const key = opt.toLowerCase();
    if (vistos.has(key)) continue;
    vistos.add(key);
    unicas.push(opt);
  }

  if (!unicas.some((o) => o.toLowerCase() === textoCorrecto.toLowerCase())) {
    unicas.unshift(textoCorrecto);
  } else {
    // Mantener la grafía original de la correcta si hubiera diferencias de mayúsculas.
    const idxCorrecta = unicas.findIndex((o) => o.toLowerCase() === textoCorrecto.toLowerCase());
    textoCorrecto = unicas[idxCorrecta];
  }

  if (unicas.length < 2) {
    throw new Error("La pregunta de selección necesita al menos 2 opciones distintas");
  }

  const lista = barajar ? mezclar(unicas) : [...unicas];
  const r = lista.findIndex((o) => o.toLowerCase() === textoCorrecto.toLowerCase());
  return { opciones: lista, r, textoCorrecto: lista[r] };
}

/** Reordena opciones de una operación ya creada y actualiza `r`. */
export function barajarOpcionesOperacion(op) {
  if (!op?.opciones?.length) return op;
  const textoCorrecto =
    op.textoCorrecto != null
      ? String(op.textoCorrecto)
      : typeof op.r === "number" && op.opciones[op.r] != null
        ? String(op.opciones[op.r])
        : null;
  if (textoCorrecto == null) return op;

  const { opciones, r, textoCorrecto: texto } = normalizarYBarajarOpciones(
    op.opciones,
    textoCorrecto,
    { barajar: true }
  );
  op.opciones = opciones;
  op.r = r;
  op.textoCorrecto = texto;
  return op;
}

/**
 * Evalúa si el índice elegido es la única respuesta correcta.
 * No acepta input numérico ni índices fuera de rango.
 */
export function esSeleccionCorrecta(op, indiceSeleccionado) {
  if (!Array.isArray(op?.opciones) || op.opciones.length === 0) return false;
  if (indiceSeleccionado == null || !Number.isInteger(indiceSeleccionado)) return false;
  if (indiceSeleccionado < 0 || indiceSeleccionado >= op.opciones.length) return false;

  const elegida = String(op.opciones[indiceSeleccionado]);
  if (op.textoCorrecto != null) {
    return elegida === String(op.textoCorrecto);
  }
  if (typeof op.r === "number") {
    return indiceSeleccionado === op.r && elegida === String(op.opciones[op.r]);
  }
  return false;
}

function aplicarTexto(textos, a, b) {
  const t = textos[Math.floor(Math.random() * textos.length)]
    .replace("{a}", a)
    .replace("{b}", b);
  return t + " ¿Cuántos hay en total?";
}

function crearOperacionBasica(textos, a, b) {
  return {
    tipo: "multiplicacion",
    a,
    b,
    r: a * b,
    texto: aplicarTexto(textos, a, b),
    clave: `${a}x${b}`,
    claveCanonica: `${a}x${b}`,
  };
}

function aplicarTextoDivision(textos, cociente, divisor) {
  const total = cociente * divisor;
  const plantilla = textos[Math.floor(Math.random() * textos.length)];
  return plantilla
    .replace("{total}", total)
    .replace("{grupos}", divisor)
    .replace("{c}", cociente)
    .replace("{d}", divisor)
    + " ¿Cuántos hay en cada grupo?";
}

function crearOperacionDivision(textos, divisor, cociente) {
  const total = divisor * cociente;
  return {
    tipo: "division",
    a: total,
    b: divisor,
    r: cociente,
    clave: `${total}div${divisor}`,
    claveCanonica: `${total}div${divisor}`,
    texto: aplicarTextoDivision(textos, cociente, divisor),
  };
}

function crearOperacionFraccion({ numerador, denominador, texto, pista, opciones, r }) {
  const textoCorrectoEsperado = `${numerador}/${denominador}`;
  const normalizadas = opciones?.length
    ? normalizarYBarajarOpciones(
        opciones,
        typeof r === "number" && opciones[r] != null ? opciones[r] : textoCorrectoEsperado,
        { barajar: true }
      )
    : generarOpcionesFraccion(numerador, denominador);
  return {
    tipo: "fraccion",
    numerador,
    denominador,
    r: normalizadas.r,
    opciones: normalizadas.opciones,
    textoCorrecto: normalizadas.textoCorrecto ?? textoCorrectoEsperado,
    clave: `${numerador}/${denominador}`,
    claveCanonica: `${numerador}/${denominador}`,
    texto,
    pista,
  };
}

export function generarOpcionesFraccion(numerador, denominador, cantidad = 4) {
  const correcta = `${numerador}/${denominador}`;
  const opciones = new Set([correcta]);
  const dens = [2, 3, 4, 5, 6, 8, 10, 12];

  while (opciones.size < cantidad) {
    const den = dens[Math.floor(Math.random() * dens.length)];
    const num = Math.floor(Math.random() * (den - 1)) + 1;
    opciones.add(`${num}/${den}`);
  }

  const { opciones: lista, r, textoCorrecto } = normalizarYBarajarOpciones(
    [...opciones],
    correcta,
    { barajar: true }
  );
  return { opciones: lista, r, textoCorrecto };
}

function textoFraccionParteTodo(num, den, variante) {
  const plantillas = [
    `¿Qué fracción representa ${num} partes de un total de ${den} iguales?`,
    `Una pizza tiene ${den} porciones iguales. Tomas ${num}. ¿Qué fracción es?`,
    `De ${den} trozos iguales, ¿cuál fracción son ${num}?`,
    `En una barra dividida en ${den} partes, eliges ${num}. Selecciona la fracción correcta.`,
  ];
  return plantillas[variante % plantillas.length];
}

function crearOperacionLectura(pregunta) {
  const clave = pregunta.id || pregunta.texto.slice(0, 40);
  const { opciones, r, textoCorrecto } = normalizarYBarajarOpciones(
    pregunta.opciones,
    pregunta.correcta ?? pregunta.textoCorrecto,
    { barajar: true }
  );
  return {
    tipo: "lectura",
    texto: pregunta.texto,
    opciones,
    r,
    textoCorrecto,
    pista: pregunta.pista,
    clave,
    claveCanonica: clave,
  };
}

export function generarBancoHechizo() {
  const banco = { facil: [], media: [], dificil: [] };

  while (banco.facil.length + banco.media.length + banco.dificil.length < 60) {
    const a = Math.floor(Math.random() * 5) + 4;
    const b = Math.floor(Math.random() * 5) + 2;
    const c = Math.floor(Math.random() * 10) + 1;
    const d = Math.floor(Math.random() * 10) + 1;
    const expr = `${a}×${b}+${c}-${d}`;
    const r = a * b + c - d;
    if (r < 0 || r > 150) continue;

    const op = { expr, r, pista: `💡 ${a} × ${b} + ${c} − ${d}` };

    if (r <= 30 && banco.facil.length < 18) banco.facil.push(op);
    else if (r <= 70 && banco.media.length < 18) banco.media.push(op);
    else if (banco.dificil.length < 24) banco.dificil.push(op);
  }

  return banco;
}

export function generarBancoGigantes() {
  const banco = { facil: [], media: [], dificil: [] };

  while (banco.facil.length + banco.media.length + banco.dificil.length < 60) {
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 8) + 2;
    const resultado = a * b;
    if (resultado > 999) continue;

    const op = {
      a,
      b,
      r: resultado,
      pista: `💡 ${a} × ${b} = (${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b})`,
    };

    if (resultado <= 150 && banco.facil.length < 18) banco.facil.push(op);
    else if (resultado <= 400 && banco.media.length < 18) banco.media.push(op);
    else if (banco.dificil.length < 24) banco.dificil.push(op);
  }

  return banco;
}

function seleccionarPorDificultad(banco, total) {
  return [
    ...banco.facil.slice(0, Math.floor(total * 0.3)),
    ...banco.media.slice(0, Math.floor(total * 0.3)),
    ...banco.dificil.slice(0, total),
  ].slice(0, total);
}

export function generarOperacionesDivision(fase, contexto) {
  const { textos, nivelAdaptativo } = contexto;
  const divisores = fase.divisores || [2, 3, 4, 5];
  let candidatos = [];

  for (const divisor of divisores) {
    for (let cociente = 1; cociente <= 10; cociente++) {
      candidatos.push({ divisor, cociente, dificultad: cociente });
    }
  }

  const faciles = mezclar(candidatos.filter((o) => o.cociente <= 4));
  const medias = mezclar(candidatos.filter((o) => o.cociente >= 5 && o.cociente <= 7));
  const dificiles = mezclar(candidatos.filter((o) => o.cociente >= 8));

  const { numFaciles, numMedias, numDificiles } = calcularProporcionesDificultad(
    fase.total,
    nivelAdaptativo
  );

  const seleccion = [
    ...faciles.slice(0, numFaciles),
    ...medias.slice(0, numMedias),
    ...dificiles.slice(0, numDificiles),
  ];

  return seleccion.map((op) => crearOperacionDivision(textos, op.divisor, op.cociente));
}

export function generarOperacionesFraccion(fase, contexto) {
  if (fase.mecanica === "fraccion-avanzada") {
    return generarFraccionesAvanzadas(fase, contexto);
  }

  const denominadores = fase.denominadores || [2, 3, 4, 5, 6];
  const total = fase.total || 8;
  const ops = [];
  const vistos = new Set();

  while (ops.length < total) {
    const den = denominadores[Math.floor(Math.random() * denominadores.length)];
    const num = Math.floor(Math.random() * (den - 1)) + 1;
    const clave = `${num}/${den}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const { opciones, r } = generarOpcionesFraccion(num, den);
    ops.push(crearOperacionFraccion({
      numerador: num,
      denominador: den,
      texto: textoFraccionParteTodo(num, den, ops.length),
      pista: `Piensa en ${num} trozos de un total de ${den}.`,
      opciones,
      r,
    }));
  }

  return ops;
}

function generarFraccionesAvanzadas(fase, contexto) {
  const { bancoFracciones = [] } = contexto;
  if (bancoFracciones.length > 0) {
    return mezclar(bancoFracciones).slice(0, fase.total).map((item) => {
      const num = item.numerador ?? item.r;
      const den = item.denominador ?? 4;
      const { opciones, r, textoCorrecto } = generarOpcionesFraccion(num, den);
      return {
        tipo: "fraccion",
        texto: item.texto.replace(/Escribe el numerador\.?/gi, "Selecciona la fracción correcta."),
        r: opciones.indexOf(`${num}/${den}`) >= 0 ? opciones.indexOf(`${num}/${den}`) : r,
        opciones,
        textoCorrecto: textoCorrecto ?? `${num}/${den}`,
        pista: item.pista,
        clave: item.id || item.texto.slice(0, 30),
        claveCanonica: item.id || `${num}/${den}`,
        numerador: num,
        denominador: den,
      };
    });
  }

  const ops = [];
  const pares = [
    [1, 2, 2, 4],
    [2, 3, 4, 6],
    [3, 4, 6, 8],
    [2, 5, 4, 10],
  ];

  while (ops.length < (fase.total || 8)) {
    const [n1, d1, n2, d2] = pares[ops.length % pares.length];
    const { opciones, r, textoCorrecto } = generarOpcionesFraccion(n2, d1);
    ops.push({
      tipo: "fraccion",
      texto: `¿Cuánto es ${n1}/${d1} + ${n2 - n1}/${d1}? Selecciona el resultado.`,
      r: opciones.indexOf(`${n2}/${d1}`) >= 0 ? opciones.indexOf(`${n2}/${d1}`) : r,
      opciones,
      textoCorrecto: textoCorrecto ?? `${n2}/${d1}`,
      pista: `Suma los numeradores: ${n1} + ${n2 - n1} = ${n2}`,
      clave: `suma-${n1}-${d1}-${n2}`,
      claveCanonica: `suma-${n1}-${d1}-${n2}`,
      numerador: n2,
      denominador: d1,
    });
  }
  return ops;
}

export function generarOperacionesLectura(fase, contexto) {
  const { bancoLectura = [] } = contexto;
  const filtradas = bancoLectura.filter(
    (p) => !fase.etiquetasLectura || fase.etiquetasLectura.some((t) => p.etiquetas?.includes(t))
  );
  const fuente = filtradas.length > 0 ? filtradas : bancoLectura;
  return mezclar(fuente).slice(0, fase.total).map(crearOperacionLectura);
}

export function generarOperacionesDivisionTabla(divisor, textos, total = 10) {
  const candidatos = [];
  for (let cociente = 1; cociente <= 10; cociente++) {
    candidatos.push(crearOperacionDivision(textos, divisor, cociente));
  }
  return mezclar(candidatos).slice(0, total);
}

export function generarOperacionesFase(fase, contexto) {
  const mecanica = fase.mecanica || contexto.tipoMundo || "multiplicacion";

  if (mecanica === "division") return generarOperacionesDivision(fase, contexto);
  if (mecanica === "fraccion" || mecanica === "fraccion-avanzada") {
    return generarOperacionesFraccion(fase, contexto);
  }
  if (mecanica === "lectura") return generarOperacionesLectura(fase, contexto);

  const { textos, bancoAvanzado, nivelAdaptativo, tablaFocal = null } = contexto;

  if (fase.id === "forja-gigantes" || mecanica === "producto-2cifras") {
    const banco = generarBancoGigantes();
    return seleccionarPorDificultad(banco, fase.total).map((op) => ({
      tipo: "multiplicacion",
      texto: `🧠 Calcula: ${op.a} × ${op.b}`,
      r: op.r,
      pista: op.pista,
      a: op.a,
      b: op.b,
    }));
  }

  if (fase.id === "torre-hechizo" || mecanica === "combinadas") {
    const banco = generarBancoHechizo();
    return seleccionarPorDificultad(banco, fase.total).map((op) => ({
      tipo: "combinada",
      texto: `🧙‍♂️ Resuelve: ${op.expr}`,
      r: op.r,
      pista: op.pista,
    }));
  }

  if (fase.mecanica === "division-mixta") {
    const divs = generarOperacionesDivision(fase, contexto).slice(0, Math.ceil(fase.total / 2));
    const mults = generarOperacionesFase(
      { ...fase, mecanica: "multiplicacion", tablas: fase.tablas || [2, 3, 4, 5] },
      contexto
    ).slice(0, Math.floor(fase.total / 2));
    return mezclar([...divs, ...mults]).slice(0, fase.total);
  }

  if (fase.tipo === "avanzada" && bancoAvanzado?.length) {
    return mezclar(bancoAvanzado)
      .slice(0, fase.total)
      .map((op) => ({
        tipo: "multiplicacion",
        ...op,
        r: op.a * op.b,
        texto: op.texto || `Hay ${op.a} filas de ${op.b} objetos. ¿Cuántos hay en total?`,
      }));
  }

  let todas = [];
  const tablasObjetivo = tablaFocal ? [tablaFocal] : fase.tablas || [];
  for (const a of tablasObjetivo) {
    for (let b = 1; b <= 10; b++) {
      todas.push({ a, b, r: a * b, dificultad: b });
    }
  }

  const faciles = mezclar(todas.filter((o) => o.b <= 4));
  const medias = mezclar(todas.filter((o) => o.b >= 5 && o.b <= 6));
  const dificiles = mezclar(todas.filter((o) => o.b >= 7));

  const { numFaciles, numMedias, numDificiles } = calcularProporcionesDificultad(
    fase.total,
    nivelAdaptativo
  );

  const seleccion = [
    ...faciles.slice(0, numFaciles),
    ...medias.slice(0, numMedias),
    ...dificiles.slice(0, numDificiles),
  ];

  return seleccion.map((op) => crearOperacionBasica(textos, op.a, op.b));
}

export function generarOperacionesRepaso(fallosPorOperacion, textos, max = 8, tipoMundo = "multiplicacion") {
  const entradas = Object.entries(fallosPorOperacion || {});
  if (entradas.length === 0) return [];

  entradas.sort((a, b) => b[1] - a[1]);

  return entradas.slice(0, max).map(([clave]) => {
    if (clave.includes("div")) {
      const [total, divisor] = clave.split("div").map(Number);
      return crearOperacionDivision(textos, divisor, total / divisor);
    }
    if (clave.includes("/")) {
      const [num, den] = clave.split("/").map(Number);
      const { opciones, r } = generarOpcionesFraccion(num, den);
      return crearOperacionFraccion({
        numerador: num,
        denominador: den,
        texto: `Repasa: selecciona la fracción ${num}/${den}`,
        pista: `La fracción correcta es ${num}/${den}.`,
        opciones,
        r,
      });
    }
    if (clave.includes("x")) {
      const [a, b] = clave.split("x").map(Number);
      return crearOperacionBasica(textos, a, b);
    }
    return {
      tipo: "lectura",
      texto: `Repasa esta idea: ${clave}`,
      opciones: ["Repasar", "Otra idea", "Saltar"],
      r: 0,
      textoCorrecto: "Repasar",
      clave: `repaso-${clave}`,
      claveCanonica: `repaso-${clave}`,
    };
  });
}

export function generarOperacionesTabla(tabla, textos, total = 10, tipoMundo = "multiplicacion") {
  if (tipoMundo === "division") {
    return generarOperacionesDivisionTabla(tabla, textos, total);
  }

  const candidatos = [];
  for (let b = 1; b <= 10; b++) {
    candidatos.push(crearOperacionBasica(textos, tabla, b));
  }

  const barajadas = mezclar(candidatos);
  if (total <= barajadas.length) return barajadas.slice(0, total);

  const extras = [];
  while (barajadas.length + extras.length < total) {
    extras.push(crearOperacionBasica(textos, tabla, (extras.length % 10) + 1));
  }
  return [...barajadas, ...extras];
}

export function crearModeloRectangular(op, maxCeldas = 100) {
  if (op?.tipo === "division" && op.a && op.b) {
    const cociente = op.r;
    const total = op.a;
    const grupos = op.b;
    if (total > maxCeldas) return null;
    return {
      filas: grupos,
      columnas: cociente,
      total,
      etiqueta: `${grupos} grupos de ${cociente}`,
      celdas: Array.from({ length: total }, (_, index) => ({
        fila: Math.floor(index / cociente),
        columna: index % cociente,
      })),
    };
  }

  if (!op?.a || !op?.b || op.tipo === "lectura" || op.tipo === "fraccion") return null;
  const total = op.a * op.b;
  if (total > maxCeldas) return null;

  return {
    filas: op.a,
    columnas: op.b,
    total,
    celdas: Array.from({ length: total }, (_, index) => ({
      fila: Math.floor(index / op.b),
      columna: index % op.b,
    })),
  };
}

export function getDificultadLabel(op) {
  if (op?.tipo === "lectura") return "📖 Comprensión";
  if (op?.tipo === "fraccion") return "🍕 Fracciones";
  if (op?.tipo === "division") return "🦕 División";
  if (!op?.b) return "";
  if (op.b <= 4) return "🟢 Nivel fácil";
  if (op.b <= 6) return "🟡 Nivel medio";
  return "🔴 Nivel difícil";
}

export function formatearTiempo(segundos) {
  if (typeof segundos !== "number" || isNaN(segundos)) return "--:--";
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function getClaveOperacion(op) {
  if (op.clave) return op.clave;
  if (op.tipo === "division") return `${op.a}div${op.b}`;
  if (op.tipo === "fraccion") return `${op.numerador}/${op.denominador}`;
  if (op.a && op.b) return `${op.a}x${op.b}`;
  return op.texto?.slice(0, 40) || "op";
}

/** Misma idea de canónica que SessionEngine (sin import circular). */
export function getClaveCanonica(op) {
  if (!op) return "";
  if (op.claveCanonica) return String(op.claveCanonica);
  if (op.tipo === "fraccion" || (op.numerador != null && op.denominador != null && op.tipo !== "lectura")) {
    return `${op.numerador}/${op.denominador}`;
  }
  if (op.tipo === "division" && op.a != null && op.b != null) return `${op.a}div${op.b}`;
  if (op.a != null && op.b != null && op.tipo !== "lectura") return `${op.a}x${op.b}`;
  return String(op.clave || op.id || op.texto || "").replace(/-v\d+$/i, "").trim();
}

function ampliarBancoHasta(banco, minimo, generador) {
  const resultado = [...banco];
  const vistos = new Set(resultado.map((op) => getClaveOperacion(op)));
  let intentos = 0;
  while (resultado.length < minimo && intentos < minimo * 4) {
    intentos++;
    const op = generador(resultado.length);
    const clave = getClaveOperacion(op);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    op._dificultad = op._dificultad ?? resultado.length;
    resultado.push(op);
  }
  return resultado;
}

function generarBancoDivisionExtendido(fase, contexto, minimo) {
  const { textos, nivelAdaptativo } = contexto;
  const divisores = fase.divisores || [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const base = [];

  for (const divisor of divisores) {
    for (let cociente = 1; cociente <= 12; cociente++) {
      const op = crearOperacionDivision(textos, divisor, cociente);
      op._dificultad = cociente + divisor;
      base.push(op);
    }
  }

  return ampliarBancoHasta(base, minimo, (n) => {
    const divisor = divisores[n % divisores.length];
    const cociente = (n % 12) + 1;
    const op = crearOperacionDivision(textos, divisor, cociente);
    op._dificultad = cociente + divisor + Math.floor(n / 12);
    op.clave = `${op.a}div${op.b}-v${n}`;
    op.claveCanonica = `${op.a}div${op.b}`;
    return op;
  }).sort((a, b) => a._dificultad - b._dificultad);
}

function generarBancoFraccionExtendido(fase, contexto, minimo) {
  const denominadores = fase.denominadores || [2, 3, 4, 5, 6, 8, 10, 12];
  const unicas = [];

  for (const den of denominadores) {
    for (let num = 1; num < den; num++) {
      const { opciones, r } = generarOpcionesFraccion(num, den);
      const op = crearOperacionFraccion({
        numerador: num,
        denominador: den,
        texto: textoFraccionParteTodo(num, den, unicas.length),
        pista: `${num} de ${den} partes → ${num}/${den}`,
        opciones,
        r,
      });
      // Dificultad por denominador, con ligera variación por numerador
      // (evita que 1/2 monopolice el tramo fácil).
      op._dificultad = den * 10 + (num === 1 ? 0 : num);
      unicas.push(op);
    }
  }

  if (fase.mecanica === "fraccion-avanzada") {
    const avanzadas = generarFraccionesAvanzadas({ ...fase, total: Math.max(12, minimo / 4) }, contexto);
    avanzadas.forEach((op, i) => {
      op._dificultad = 200 + i;
      unicas.push(op);
    });
  }

  const ampliadas = ampliarBancoHasta(unicas, minimo, (n) => {
    const den = denominadores[n % denominadores.length];
    const num = (n % (den - 1)) + 1;
    const { opciones, r } = generarOpcionesFraccion(num, den);
    const varianteTexto = Math.floor(n / denominadores.length);
    const op = crearOperacionFraccion({
      numerador: num,
      denominador: den,
      texto: textoFraccionParteTodo(num, den, n + varianteTexto),
      pista: `Recuerda: ${num}/${den}`,
      opciones,
      r,
    });
    // Variantes reutilizan la fracción pero con enunciado distinto; dificultad
    // encima del set único para no saturar el inicio con repeticiones de 1/2.
    op._dificultad = 100 + den * 10 + num + Math.floor(n / denominadores.length);
    op.clave = `${num}/${den}-v${n}`;
    op.claveCanonica = `${num}/${den}`;
    return op;
  });

  return intercalarFraccionesPorDenominador(ampliadas);
}

/** Mezcla fracciones del tramo fácil para no empezar siempre con 1/2. */
function intercalarFraccionesPorDenominador(banco) {
  const ordenado = [...banco].sort((a, b) => a._dificultad - b._dificultad);
  const faciles = ordenado.slice(0, Math.min(18, Math.ceil(ordenado.length / 3)));
  const resto = ordenado.slice(faciles.length);

  const porDen = new Map();
  for (const op of faciles) {
    const den = op.denominador ?? 0;
    if (!porDen.has(den)) porDen.set(den, []);
    porDen.get(den).push(op);
  }

  const intercaladas = [];
  const dens = [...porDen.keys()].sort((a, b) => a - b);
  let quedan = true;
  while (quedan) {
    quedan = false;
    for (const den of dens) {
      const cola = porDen.get(den);
      if (cola?.length) {
        intercaladas.push(cola.shift());
        if (cola.length) quedan = true;
      }
    }
  }

  return [...intercaladas, ...resto];
}

function generarBancoLecturaExtendido(fase, contexto, _minimo) {
  const { bancoLectura = [] } = contexto;
  const filtradas = bancoLectura.filter(
    (p) => !fase.etiquetasLectura || fase.etiquetasLectura.some((t) => p.etiquetas?.includes(t))
  );
  const fuente = filtradas.length > 0 ? filtradas : bancoLectura;
  // Solo preguntas únicas: no clonar con opciones reordenadas (provocaba repeticiones).
  return mezclar(fuente).map((p, i) => {
    const op = crearOperacionLectura(p);
    op._dificultad = i;
    return op;
  });
}

function generarBancoMultiplicacionExtendido(fase, contexto, minimo) {
  const ops = generarOperacionesFase(fase, contexto);
  const base = ops.map((op, i) => ({ ...op, _dificultad: op.b ?? i }));

  return ampliarBancoHasta(base, minimo, (n) => {
    const tablas = fase.tablas || [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const a = tablas[n % tablas.length];
    const b = (n % 10) + 1;
    const op = crearOperacionBasica(contexto.textos, a, b);
    op._dificultad = a + b + Math.floor(n / 10);
    // Clave única para el banco; canónica = producto real (anti-repeats en sesión).
    op.clave = `${a}x${b}-v${n}`;
    op.claveCanonica = `${a}x${b}`;
    return op;
  }).sort((a, b) => a._dificultad - b._dificultad);
}

/** Banco amplio (≥50) ordenado por dificultad creciente para sesión extendida. */
export function generarBancoFase(fase, contexto, minimo = 50) {
  const mecanica = fase.mecanica || contexto.tipoMundo || "multiplicacion";

  if (mecanica === "division" || mecanica === "division-mixta") {
    if (mecanica === "division-mixta") {
      const divs = generarBancoDivisionExtendido(fase, contexto, Math.floor(minimo / 2));
      const mults = generarBancoMultiplicacionExtendido(
        { ...fase, mecanica: "multiplicacion" },
        contexto,
        Math.ceil(minimo / 2)
      );
      return [...divs, ...mults].sort((a, b) => a._dificultad - b._dificultad);
    }
    return generarBancoDivisionExtendido(fase, contexto, minimo);
  }

  if (mecanica === "fraccion" || mecanica === "fraccion-avanzada") {
    return generarBancoFraccionExtendido(fase, contexto, minimo);
  }

  if (mecanica === "lectura") {
    return generarBancoLecturaExtendido(fase, contexto, minimo);
  }

  if (mecanica === "producto-2cifras" || fase.id === "forja-gigantes") {
    const gigantes = generarBancoGigantes();
    const todas = [...gigantes.facil, ...gigantes.media, ...gigantes.dificil].map((op, i) => ({
      tipo: "multiplicacion",
      texto: `🧠 Calcula: ${op.a} × ${op.b}`,
      r: op.r,
      pista: op.pista,
      a: op.a,
      b: op.b,
      clave: `${op.a}x${op.b}`,
      claveCanonica: `${op.a}x${op.b}`,
      _dificultad: i,
    }));
    return ampliarBancoHasta(todas, minimo, (n) => {
      const a = 10 + (n % 80);
      const b = 2 + (n % 9);
      return {
        tipo: "multiplicacion",
        texto: `🧠 Calcula: ${a} × ${b}`,
        a,
        b,
        r: a * b,
        _dificultad: n,
        clave: `${a}x${b}-v${n}`,
        claveCanonica: `${a}x${b}`,
      };
    }).sort((a, b) => a._dificultad - b._dificultad);
  }

  if (mecanica === "combinadas" || fase.id === "torre-hechizo") {
    const hechizo = generarBancoHechizo();
    const todas = [...hechizo.facil, ...hechizo.media, ...hechizo.dificil].map((op, i) => ({
      tipo: "combinada",
      texto: `🧙‍♂️ Resuelve: ${op.expr}`,
      r: op.r,
      pista: op.pista,
      _dificultad: i,
      clave: `comb-${op.expr}`,
      claveCanonica: `comb-${op.expr}`,
    }));
    return ampliarBancoHasta(todas, minimo, (n) => {
      const a = 4 + (n % 6);
      const b = 2 + (n % 5);
      const c = 1 + (n % 8);
      const expr = `${a}×${b}+${c}`;
      return {
        tipo: "combinada",
        texto: `🧙‍♂️ Resuelve: ${expr}`,
        r: a * b + c,
        pista: `💡 ${a} × ${b} + ${c}`,
        _dificultad: n,
        clave: `comb-${expr}-v${n}`,
        claveCanonica: `comb-${expr}`,
      };
    }).sort((a, b) => a._dificultad - b._dificultad);
  }

  return generarBancoMultiplicacionExtendido(fase, contexto, minimo);
}
