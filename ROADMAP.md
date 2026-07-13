# RoadMap — Rediseño integral Mundos Mágicos Educativos

> Versión de referencia: **v3.1.0** · Última revisión: julio 2026

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

### 🔜 Fase B — Recorrido y mapa (prioridad alta)

| Tarea | Descripción |
|-------|-------------|
| Mapa ilustrado | Sustituir grid de botones por camino vertical/serpenteante con nodos de fase |
| Avatares en el mapa | Icono del jugador en la última fase completada |
| Preview de recompensa | Silueta borrosa de la criatura en fases bloqueadas |
| Barra de progreso del mundo | En mapa y en selector (`3/8 fases`) |
| Microcopy | Textos motivadores por fase (“¡Casi llegas a Luna!”) |

### 🔜 Fase C — Celebración y engagement (prioridad alta)

| Tarea | Descripción |
|-------|-------------|
| Popup de recompensa 2.0 | Animación de criatura + nombre + sonido opcional |
| Revelado progresivo mejorado | Partículas al subir la máscara de la imagen |
| Rachas y combos | “3 aciertos seguidos” con refuerzo visual |
| Logros visuales | Insignias en mochila con rareza (bronce/plata/oro) |

### 🔜 Fase D — Selector y onboarding (prioridad media)

| Tarea | Descripción |
|-------|-------------|
| Hero de bienvenida | Ilustración + vídeo corto opcional en primera visita |
| Tarjetas mundo animadas | Parallax suave del emoji, badge “Nuevo” / “Completado” |
| Tutorial interactivo | 3 pasos: elegir mundo → jugar fase → ver mochila |
| Pantalla nombre | Diseño más “tarjeta de personaje” con avatar aleatorio |

### 🔜 Fase E — Navegación y accesibilidad (prioridad media)

| Tarea | Descripción |
|-------|-------------|
| Bottom nav con etiquetas | Texto bajo icono en pantallas ≥ 400px |
| Modo dislexia | Fuente OpenDyslexic opcional |
| Tamaños táctiles | Mínimo 44×44 px en todos los controles |
| Lectura en voz alta | Web Speech API para enunciados de lectura |

### 🔜 Fase F — Panel familias y ranking (prioridad media-baja)

| Tarea | Descripción |
|-------|-------------|
| Gráficos simples | Barras de progreso por área curricular |
| Exportar resumen | PDF o imagen del progreso semanal |
| Ranking amigable | Destacar mejora personal vs. récord anterior |
| Panel global narrativo | Historia del “hechizo colectivo” con hitos |

### 🔜 Fase G — Arquitectura front (prioridad técnica)

| Tarea | Descripción |
|-------|-------------|
| Componentizar vistas | Pequeños módulos JS por pantalla |
| Temas por mundo | CSS variables inyectadas desde `WorldManager` |
| Lazy load de assets | Imágenes de criaturas bajo demanda |
| Tests E2E | Playwright: flujo nombre → mundo → fase → recompensa |

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
