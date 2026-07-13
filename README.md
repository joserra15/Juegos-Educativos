# Mundos Mágicos Educativos

Plataforma de juegos educativos para primaria (3º-4º), alineada con LOMLOE.

## Estructura (v2.0)

```
content/          # Contenido JSON por mundo
  manifest.json   # Catálogo de mundos disponibles
  unicornios.json # Mundo de tablas de multiplicar
engine/           # Motor de juego reutilizable
  ContentLoader.js
  QuestionGenerator.js
  Scoring.js
  Hints.js
  ProgressStore.js
js/app.js         # Aplicación principal (UI + Firebase)
tests/            # Tests con Vitest
index.html        # Shell HTML/CSS
```

## Desarrollo local

```bash
npm install
npm test
# Servir con cualquier servidor estático, p.ej.:
npx serve .
```

## Despliegue

Push a `main` despliega automáticamente en GitHub Pages (workflow con tests + deploy).
