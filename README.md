# Mundos Mágicos Educativos

Plataforma de juegos educativos para **3º y 4º de Primaria** (España), alineada con LOMLOE.

## Mundos disponibles (v3.0)

### 3º de Primaria
| Mundo | Área | Contenido |
|-------|------|-----------|
| 🦄 Unicornios | Matemáticas | Tablas de multiplicar del 1 al 10 |
| 🦕 Dinosaurios | Matemáticas | División como reparto equitativo |
| 🍕 Fracciones | Matemáticas | Fracciones propias, comparación y recta |
| 📚 Biblioteca | Lengua | Comprensión lectora y ortografía |

### 4º de Primaria
| Mundo | Área | Contenido |
|-------|------|-----------|
| 🏙️ Ciudad de los Números | Matemáticas | Tablas hasta 12, productos 2 cifras, división |
| 👑 Imperio de las Fracciones | Matemáticas | Equivalencia, suma y comparación |
| ✍️ Atelier de la Lengua | Lengua | Comprensión, ortografía y gramática |

## Estructura

```
content/          # JSON por mundo + manifest.json
engine/           # Motor reutilizable (preguntas, pistas, progreso)
js/app.js         # UI + Firebase
tests/            # Vitest
```

## Desarrollo

```bash
npm install
npm test
npx serve .
```

Push a `main` despliega en GitHub Pages con tests automáticos.
