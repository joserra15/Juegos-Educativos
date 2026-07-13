/**
 * Generación de preguntas y bancos procedimentales.
 */

import { calcularProporcionesDificultad } from "./Scoring.js";

function mezclar(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
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
    texto: aplicarTextoDivision(textos, cociente, divisor),
  };
}

function crearOperacionFraccion({ numerador, denominador, texto, pista }) {
  return {
    tipo: "fraccion",
    numerador,
    denominador,
    r: numerador,
    clave: `${numerador}/${denominador}`,
    texto,
    pista,
  };
}

function crearOperacionLectura(pregunta) {
  return {
    tipo: "lectura",
    texto: pregunta.texto,
    opciones: pregunta.opciones,
    r: pregunta.correcta,
    pista: pregunta.pista,
    clave: pregunta.id || pregunta.texto.slice(0, 40),
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

  while (ops.length < total) {
    const den = denominadores[Math.floor(Math.random() * denominadores.length)];
    const num = Math.floor(Math.random() * (den - 1)) + 1;
    const variantes = [
      {
        texto: `Una pizza está dividida en ${den} partes iguales. Si comes ${num}, ¿qué numerador representa tu porción? (denominador ${den})`,
        pista: `Piensa en ${num} trozos de un total de ${den}.`,
      },
      {
        texto: `En una barra de chocolate con ${den} trozos, ¿cuántos llevas si te quedas ${num}?`,
        pista: `El numerador cuenta las partes que tienes.`,
      },
      {
        texto: `¿Qué numerador forma la fracción ${num}/${den}? Escribe el numerador.`,
        pista: `Arriba va el número de partes tomadas: ${num}.`,
      },
    ];
    const variante = variantes[ops.length % variantes.length];
    ops.push(crearOperacionFraccion({ numerador: num, denominador: den, ...variante }));
  }

  return ops;
}

function generarFraccionesAvanzadas(fase, contexto) {
  const { bancoFracciones = [] } = contexto;
  if (bancoFracciones.length > 0) {
    return mezclar(bancoFracciones).slice(0, fase.total).map((item) => ({
      tipo: "fraccion",
      texto: item.texto,
      r: item.r,
      pista: item.pista,
      clave: item.id || item.texto.slice(0, 30),
      numerador: item.numerador,
      denominador: item.denominador,
    }));
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
    ops.push({
      tipo: "fraccion",
      texto: `¿Cuánto es ${n1}/${d1} + ${n2 - n1}/${d1}? (mismo denominador, escribe el numerador)`,
      r: n2,
      pista: `Suma los numeradores: ${n1} + ${n2 - n1} = ${n2}`,
      clave: `suma-${n1}-${d1}-${n2}`,
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
      return crearOperacionFraccion({
        numerador: num,
        denominador: den,
        texto: `Repasa: escribe el numerador de ${num}/${den}`,
        pista: `El numerador es ${num}.`,
      });
    }
    if (clave.includes("x")) {
      const [a, b] = clave.split("x").map(Number);
      return crearOperacionBasica(textos, a, b);
    }
    return {
      tipo: "lectura",
      texto: `Repasa esta idea: ${clave}`,
      opciones: ["Opción A", "Opción B", "Opción C"],
      r: 0,
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
