# RoadMap — Rediseño integral Mundos Mágicos Educativos

> Versión de referencia: **v3.3.0** · Última revisión: julio 2026

Este documento recoge el análisis de la interfaz actual y un plan por fases para evolucionar la app hacia una experiencia más profesional y atractiva para niños de 3º y 4º de Primaria, **sin perder la esencia**: desbloquear mundos, fases y criaturas/recompensas al resolver retos correctamente.

---

## 1. Diagnóstico de la interfaz actual (v3.0)

### Fortalezas que debemos conservar

| Aspecto | Por qué importa |
|--------|------------------|
| Desbloqueo progresivo | Motiva el esfuerzo: cada respuesta correcta revela la criatura |
| Multi-mundo por curso | Escala pedagógica (matemáticas, fracciones, lectura) |
| Mochila + galería | Coleccionismo visual muy efectivo en edades 8–10 |
| Ranking y panel global | Competencia sana y objetivo colectivo |
| PWA offline | Uso en clase y en casa sin fricción |
| Accesibilidad básica | Alto contraste y texto grande ya implementados |

### Debilidades detectadas

| Área | Problema | Impacto |
|------|----------|---------|
| **Identidad visual** | Comic Sans + estilos inline monolíticos | Percepción “prototipo” frente a apps infantiles actuales |
| **Jerarquía** | Mucha información con el mismo peso visual | Dificulta saber “qué hacer ahora” |
| **Selector de mundos** | Tarjetas funcionales pero planas | Poco “wow” al elegir aventura |
| **Mapa de fases** | Botones genéricos en fila | No transmite sensación de viaje/recorrido |
| **Pantalla de juego** | Correcta pero compacta | La recompensa podría celebrarse más |
| **Popup de victoria** | Básico | Oportunidad de micro-celebración |
| **Navegación inferior** | Solo emojis | Niños pequeños no siempre interpretan iconos |
| **CSS** | ~960 líneas en `index.html` | Mantenimiento y evolución costosos |
| **Tests** | Solo motor (`engine/`) | Riesgo de regresión en flujos UI/progreso |

---

## 2. Principios de diseño para el rediseño

1. **Magia coleccionable** — Cada mundo tiene paleta propia (ya en `WorldManager`); reforzarla en cards, mapas y recompensas.
2. **Claridad infantil** — Tipografía redondeada legible (Baloo 2 + Nunito), botones grandes, feedback inmediato.
3. **Progreso visible** — Barras, badges y estados (bloqueado / disponible / completado) en todo el recorrido.
4. **Celebración moderada** — Confeti, animaciones cortas y sonidos opcionales; respetar `prefers-reduced-motion`.
5. **Funcionamiento intacto** — Misma lógica de desbloqueo, Firebase, PIN y PWA; cambios principalmente presentacionales.
6. **Testeable** — Reglas de fases y tiempos en `engine/PhaseProgress.js` con tests de regresión.

---

## 3. Estado de implementación por fase

### ✅ Fase A — Fundamentos (v3.1.0, esta entrega)

- [x] Extraer CSS a `css/app.css`
- [x] Design tokens (`--mm-*`, gradientes, sombras, tipografías)
- [x] Header y navegación con glassmorphism
- [x] Tarjetas de mundo y paneles con bordes y sombras unificados
- [x] Estados visuales en botones de fase (`fase-disponible`, `fase-completada`, `fase-bloqueada`)
- [x] Pantalla de juego con panel elevado y tipografía display
- [x] Popup y tablas de ranking pulidos
- [x] `engine/PhaseProgress.js` + `tests/regression.test.js`
- [x] Documento ROADMAP

### ✅ Fase B — Recorrido y mapa (v3.2.0)

- [x] Mapa en camino vertical con nodos de fase
- [x] Avatar del jugador en la última fase completada
- [x] Preview borroso de recompensa en fases bloqueadas
- [x] Barra de progreso del mundo en el mapa
- [x] Microcopy motivador según avance

### ✅ Fase C — Celebración y engagement (v3.2.0)

- [x] Popup de recompensa con animación y emoji grande
- [x] Revelado completo de criatura al terminar fase (`revelado-completo`)
- [x] Rachas visuales (≥3 aciertos seguidos)
- [x] Confeti y brillo al completar

### ✅ Mecánica de sesión extendida — todos los mundos (v3.2.1)

- [x] Banco aleatorio ≥50 preguntas por fase (`generarBancoFase`)
- [x] 10 aciertos necesarios para pasar cada fase
- [x] Dificultad creciente durante la sesión
- [x] Fases finales: 5 fallos → reinicio desde el principio
- [x] Fracciones con opción múltiple (sin escribir)

### ✅ Fase D — Selector y onboarding (v3.3.0)

- [x] Hero de bienvenida en selector de mundos
- [x] Tarjetas mundo animadas con parallax y badges (Nuevo / Completado)
- [x] Tutorial interactivo (mundo → fase → mochila → PIN) con pantallas reales abiertas
- [x] Pantalla nombre como tarjeta de personaje con selector de avatar

### 🔜 Fase E — Navegación y accesibilidad (prioridad media)

| Tarea | Descripción |
|-------|-------------|
| Bottom nav con etiquetas | Texto bajo icono en pantallas ≥ 400px |
| Modo dislexia | Fuente OpenDyslexic opcional |
| Tamaños táctiles | Mínimo 44×44 px en todos los controles |
| Lectura en voz alta | Web Speech API para enunciados (Infantil por defecto) |

### ✅ Fase F — Panel familias y ranking (v3.3.0)

- [x] Gráficos de barras por área curricular (`PanelStats`, `PanelFamilias`)
- [x] Exportar resumen de progreso (archivo `.txt`)
- [x] Ranking amigable con mejora personal vs. récord anterior
- [x] Panel global narrativo del hechizo colectivo con hitos

### ✅ Fase G — Arquitectura front (v3.3.0)

- [x] Módulos JS por pantalla (`js/ui/Onboarding`, `SelectorMundos`, `PanelFamilias`, `RankingView`, `LazyAssets`)
- [x] Temas por mundo vía CSS variables desde `WorldManager`
- [x] Lazy load de imágenes de criaturas (`LazyAssets`)
- [x] Tests E2E con Playwright (flujo nombre → mundo → panel)

---

## 4. Mapa de pantallas y mejoras objetivo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Historia / PIN   │ ──► │ Selector mundos │ ──► │   Mapa fases    │
│  Onboarding++   │     │  Cards premium  │     │ Camino visual   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                        │
                        ┌─────────────────┐             ▼
                        │  Mochila / Rank │ ◄── ┌─────────────────┐
                        │  Galería 3D-ish │     │  Juego + premio │
                        └─────────────────┘     │ Celebración++   │
                                                └─────────────────┘
```

---

## 5. Paleta y tokens (v3.1)

| Token | Uso |
|-------|-----|
| `--color-primario` | CTAs, acentos de acción |
| `--color-secundario` | Bordes, chips curriculares |
| `--color-acento` | Focus, enlaces, detalles |
| `--mm-font-display` | Títulos (Baloo 2) |
| `--mm-font-body` | Texto general (Nunito) |
| `--mm-gradient-magic` | Botones principales, título hero |
| `--mm-shadow-card` | Tarjetas y paneles |

Cada mundo puede sobrescribir `--color-primario` y `--color-secundario` vía `aplicarTemaMundo()`.

---

## 6. Criterios de aceptación del rediseño

- [ ] Un niño de 8 años identifica en &lt; 5 s qué botón pulsar para jugar
- [ ] El desbloqueo de fases y criaturas funciona igual que en v3.0
- [ ] Progreso multi-mundo no se mezcla (tests de regresión en verde)
- [ ] Lighthouse Performance ≥ 85 en móvil
- [ ] `prefers-reduced-motion` desactiva animaciones no esenciales
- [ ] PWA sigue funcionando offline tras actualizar SW

---

## 7. Tests de regresión funcionales

Ubicación: `tests/regression.test.js`

| Suite | Qué protege |
|-------|-------------|
| Desbloqueo secuencial | Solo fase 0 al inicio; siguiente tras completar |
| Fases avanzadas | Requisitos de puntos globales + fase anterior |
| Aislamiento multi-mundo | `saveMundoState` / `loadMundoState` independientes |
| Tiempos y ranking | Filtrado por claves de fase del mundo activo |
| Legacy Firebase | `normalizarLiberadas`, `parseFirebaseData` |

Ejecutar: `npm test`

---

## 8. Métricas de éxito (post-despliegue)

- Tiempo medio en primera fase completada (engagement)
- % jugadores que abren segundo mundo en la misma sesión
- Repetición de fases para mejorar tiempo (aprendizaje)
- Incidencias reportadas de progreso perdido o récords incorrectos (objetivo: 0)

---

## 9. Referencias visuales recomendadas

- **Duolingo Kids** — Progreso claro y refuerzo positivo
- **Khan Academy Kids** — Ilustración amable sin infantilizar en exceso
- **Prodigy Math** — Mapa de aventura como hilo conductor

---

*Mantener este documento actualizado al cerrar cada fase del RoadMap.*
