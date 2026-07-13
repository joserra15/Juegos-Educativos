/**
 * Sistema de pistas adaptativas para multiplicación.
 */

export function getHint(op, fallosActual, fase) {
  if (fase?.tipo === "avanzada" && op.pista) {
    return `💡 ${op.pista}`;
  }

  if (fallosActual === 1) {
    return `Pista: son ${op.a} grupos de ${op.b}.`;
  }

  switch (op.a) {
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
    default:
      return `Pista: ${op.b} + ${op.b} + ... (${op.a} veces)`;
  }
}
