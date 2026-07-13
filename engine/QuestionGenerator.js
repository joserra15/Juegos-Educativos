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
    a,
    b,
    r: a * b,
    texto: aplicarTexto(textos, a, b),
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

export function generarOperacionesFase(fase, contexto) {
  const { textos, bancoAvanzado, nivelAdaptativo, tablaFocal = null } = contexto;

  if (fase.id === "forja-gigantes") {
    const banco = generarBancoGigantes();
    return seleccionarPorDificultad(banco, fase.total).map((op) => ({
      texto: `🧠 Calcula: ${op.a} × ${op.b}`,
      r: op.r,
      pista: op.pista,
      a: op.a,
      b: op.b,
    }));
  }

  if (fase.id === "torre-hechizo") {
    const banco = generarBancoHechizo();
    return seleccionarPorDificultad(banco, fase.total).map((op) => ({
      texto: `🧙‍♂️ Resuelve el hechizo: ${op.expr}`,
      r: op.r,
      pista: op.pista,
    }));
  }

  if (fase.tipo === "avanzada") {
    return mezclar(bancoAvanzado)
      .slice(0, fase.total)
      .map((op) => ({
        ...op,
        r: op.a * op.b,
        texto: `En el santuario hay ${op.a} filas de ${op.b} cristales mágicos. ¿Cuántos hay en total?`,
      }));
  }

  let todas = [];
  const tablasObjetivo = tablaFocal ? [tablaFocal] : fase.tablas;
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

export function generarOperacionesRepaso(fallosPorOperacion, textos, max = 8) {
  const entradas = Object.entries(fallosPorOperacion || {});
  if (entradas.length === 0) return [];

  entradas.sort((a, b) => b[1] - a[1]);
  return entradas.slice(0, max).map(([clave]) => {
    const [a, b] = clave.split("x").map(Number);
    return {
      a,
      b,
      r: a * b,
      texto: aplicarTexto(textos, a, b),
    };
  });
}

export function generarOperacionesTabla(tabla, textos, total = 10) {
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
  if (!op?.a || !op?.b) return null;
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
  if (!op.b) return "";
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
