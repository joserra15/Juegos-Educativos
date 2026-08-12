/**
 * Puntuación y dificultad adaptativa.
 */

export function puntosPorFase(fase, puntosMap) {
  if (!fase) return 10;
  return puntosMap?.[fase.id] ?? 10;
}

export function calcularPenalizacion(puntosBase) {
  return Math.max(3, Math.floor(puntosBase / 2));
}

export function calcularNivelAdaptativo({ liberadas, fases, tiemposMejores, fallosPorOperacion }) {
  let nivel = 0;
  const ultimas = liberadas.slice(-2);

  ultimas.forEach((i) => {
    const fase = fases[i];
    if (!fase) return;
    const tiempo = tiemposMejores[fase.id];
    if (tiempo && tiempo < 25) nivel++;
  });

  const totalFallos = Object.values(fallosPorOperacion || {}).reduce((a, b) => a + b, 0);
  if (totalFallos < 5) nivel++;

  return Math.min(nivel, 2);
}

export function calcularProporcionesDificultad(total, nivelAdaptativo) {
  let numDificiles = Math.max(2, Math.floor(total * 0.25));
  let numMedias = Math.floor((total - numDificiles) / 2);
  let numFaciles = total - numMedias - numDificiles;

  if (nivelAdaptativo === 1) {
    numDificiles += 1;
    numFaciles = Math.max(1, numFaciles - 1);
  }
  if (nivelAdaptativo === 2) {
    numDificiles += 2;
    numFaciles = Math.max(1, numFaciles - 2);
  }

  const suma = numFaciles + numMedias + numDificiles;
  if (suma > total) numDificiles -= suma - total;

  return { numFaciles, numMedias, numDificiles };
}
