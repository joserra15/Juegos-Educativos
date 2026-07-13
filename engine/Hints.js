/**
 * Sistema de pistas adaptativas por tipo de operación.
 */

export function getHint(op, fallosActual, fase) {
  if (op?.pista && (fase?.tipo === "avanzada" || op.tipo === "lectura" || op.tipo === "fraccion")) {
    return `💡 ${op.pista}`;
  }

  if (op?.tipo === "lectura") {
    return fallosActual === 1
      ? "Pista: relee con calma y busca la información en el texto."
      : "Pista: descarta las opciones que no encajan con lo que dice el texto.";
  }

  if (op?.tipo === "fraccion") {
    return fallosActual === 1
      ? `Pista: la fracción tiene denominador ${op.denominador} y numerador ${op.numerador}.`
      : `Pista: el numerador son las partes que tomamos (${op.numerador}).`;
  }

  if (op?.tipo === "division") {
    if (fallosActual === 1) {
      return `Pista: reparte ${op.a} en ${op.b} grupos iguales.`;
    }
    return `Pista: piensa qué número multiplicado por ${op.b} da ${op.a}.`;
  }

  if (fase?.tipo === "avanzada" && op.pista) {
    return `💡 ${op.pista}`;
  }

  if (fallosActual === 1) {
    return `Pista: son ${op.a} grupos de ${op.b}.`;
  }

  switch (op.a) {
    case 1:
      return `Pista: la tabla del 1 deja el mismo número: 1 × ${op.b} = ${op.b}`;
    case 2:
      return `Pista: doblar ${op.b} → ${op.b} + ${op.b}`;
    case 3:
      return `Pista: es el doble de ${op.b} más otro ${op.b}`;
    case 4:
      return `Pista: dobla ${op.b} y vuelve a doblar`;
    case 5:
      return `Pista: piensa en contar de 5 en 5 (termina en 0 o 5)`;
    case 6:
      return `Pista: calcula 3 × ${op.b} y luego dóblalo`;
    case 7:
      return `Pista: calcula 5 × ${op.b} y suma 2 × ${op.b}`;
    case 8:
      return `Pista: dobla ${op.b} tres veces seguidas`;
    case 9:
      return `Pista: calcula 10 × ${op.b} y resta ${op.b}`;
    case 10:
      return `Pista: la tabla del 10 es muy rápida: ${op.b} y añades un cero`;
    default:
      return `Pista: ${op.b} + ${op.b} + ... (${op.a} veces)`;
  }
}
