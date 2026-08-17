# Mundos Mágicos Educativos

Plataforma de juegos educativos para **Infantil (5 años)** y **3º y 4º de Primaria** (España), alineada con LOMLOE.

## Mundos disponibles (v3.6.4)

### Infantil (último curso)
| Mundo | Área | Contenido | Fases |
|-------|------|-----------|-------|
| 🌙 El Bosque de Luna | Infantil | Contar 1–10, sumar y leer desde cero (vocales, sílabas, palabras) | 8 |
| 🐷 La Granja de los Números | Infantil | Comparar más/menos/igual, contar y quitar (con voz) | 6 |

### 3º de Primaria
| Mundo | Área | Contenido | Fases |
|-------|------|-----------|-------|
| 🦄 Unicornios | Matemáticas | Tablas de multiplicar del 1 al 10 | 8 |
| 🦕 Dinosaurios | Matemáticas | División como reparto equitativo | 6 |
| 🍕 Fracciones | Matemáticas | Fracciones propias, comparación y recta | 6 |
| 📚 Biblioteca | Lengua | Comprensión lectora y ortografía | 6 |
| 🔬 Bosque Científico | Ciencias | Seres vivos, cuerpo, materiales y entorno | 6 |
| 🗺️ Villa de las Historias | Sociales | Municipio, mapas, pasado-presente y convivencia | 6 |
| 🇬🇧 English Garden | Inglés | Colores, números, animales, colegio y saludos | 6 |
| 🧩 Laberinto de la Lógica | Lógica | Series, patrones, clasificación y analogías | 5 |
| 🔷 Isla de las Formas | Visoespacial | Figuras, posiciones, conteo y simetría | 5 |

### 4º de Primaria
| Mundo | Área | Contenido | Fases |
|-------|------|-----------|-------|
| 🏙️ Ciudad de los Números | Matemáticas | Tablas hasta 12, productos 2 cifras, división | 5 |
| 👑 Imperio de las Fracciones | Matemáticas | Equivalencia, suma y comparación | 4 |
| ✍️ Atelier de la Lengua | Lengua | Comprensión, ortografía y gramática | 4 |
| 🌍 Laboratorio del Planeta | Ciencias | Ecosistemas, materia, energía y planeta | 4 |
| 🏛️ Cronópolis | Sociales | Geografía de España, paisajes e historia | 4 |
| 🏰 English Castle | Inglés | Vocabulario, presente simple, preguntas y lectura | 5 |
| 🕵️ Torre de Enigmas | Lógica | Series avanzadas, deducción y problemas | 5 |
| 🛰️ Ciudad Perspectiva | Visoespacial | Rotaciones, vistas, composición y espejo | 5 |

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

## Instalar como app (PWA)

La web es una **Progressive Web App** instalable:

- En **Chrome / Edge / Android** aparece el botón nativo «Instalar app» cuando el navegador lo permite.
- En **iPhone / iPad** se muestran instrucciones (Compartir → Añadir a pantalla de inicio).
- En el pie de página hay un enlace **Instalar app** con las instrucciones según tu dispositivo.
- El service worker cachea la app para uso offline tras la primera visita.
