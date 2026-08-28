# Juegos-Hub — Especificación Técnica (As-Is)

> Documento generado para que un agente IA entienda el estado **actual** del proyecto.
> Describe lo que **realmente existe y hace el código hoy**, no lo deseado.
> Las notas marcadas como `[DISCREPANCIA]` indican diferencias entre la UI/UX y el código real,
> confirmadas con el responsable del proyecto.

---

## 1. Visión General

**Juegos-Hub** (título en UI: "🎮 Arcade Hub") es una **aplicación web estática frontend-only**
para jugar *party games* locales (juntadas presenciales) en un único dispositivo.

- **Stack:** HTML5 + CSS3 + JavaScript Vanilla (sin frameworks, sin build).
- **Patrón:** SPA simulada mediante navegación entre páginas HTML independientes.
- **Persistencia:** `localStorage` del navegador (volátil, local al dispositivo).
- **Alojamiento:** apto para GitHub Pages (servir `src/frontend/`).
- **Backend:** NO implementado. Existe estructura de directorios placeholder comentada (`src/api/`, `src/core/`, `src/games/`).
- **Tests:** NO implementados. Existe estructura `tests/` con placeholders comentados.

### Filosofía de uso
Un único dispositivo (notebook/celular) actúa como "mesa". Un **moderador/juez** opera la UI
y valida manualmente las respuestas de los jugadores presenciales. No hay input de texto ni
validación automática de palabras en ningún juego (ver §5 y §6).

---

## 2. Estructura de Directorios

```
Juegos-Hub/
├── .devinrules                 # Reglas del agente (idioma ES, no tocar localStorage, etc.)
├── .env.example
├── ContextProject.md           # Contexto histórico + tarea de game design (no es spec técnica)
├── requirements.txt            # Deps Python (FastAPI, pytest...) — sin uso real aún
├── setup.bat / setup.sh        # Scripts de entorno
├── docs/
│   ├── arquitectura.puml       # 2 diagramas: estado actual + futuro fullstack
│   ├── esquema_db.md           # Esquema PostgreSQL PROPUESTO (no implementado)
│   └── specs-inicial.md        # ESTE documento
├── scripts/
│   └── migrate_localstorage.py # Script de migración LS→DB (futuro)
├── src/
│   ├── frontend/               # ★ TODO el producto vivo ★
│   │   ├── index.html          # Hub principal
│   │   ├── script.js           # Lógica del hub (salas, config global)
│   │   ├── style.css           # Estilos globales + theming CSS vars
│   │   └── Juegos/
│   │       ├── Basta/          # Juego 1 (rosco de letras) — ACTIVO
│   │       ├── Letrado/        # Juego 2 (letra aleatoria + categoría) — ACTIVO
│   │       ├── Trivia/         # Juego 3 (Mente Maestra, por equipos) — ACTIVO
│   │       ├── Juego4/         # Placeholder VACÍO (script.js sin contenido)
│   │       └── Juego5/         # Prototipo aislado de Basta (NO integrado al hub)
│   ├── api/                    # Placeholder FastAPI (todo comentado)
│   │   ├── main.py
│   │   ├── middleware/cors.py
│   │   ├── models/{database.py, schemas.py}
│   │   └── routers/{auth.py, salas.py, partidas.py}
│   ├── core/                   # Placeholder (auth.py, database.py)
│   └── games/                  # Placeholder vacío (lógica backend futura)
└── tests/                      # Placeholders comentados (pytest)
    ├── conftest.py
    ├── test_auth.py
    ├── test_salas.py
    └── test_juegos/{test_basta,test_letrado,test_trivia}_logic.py
```

**Regla de oro:** `src/frontend/` es lo único funcional. Todo lo bajo `src/api`, `src/core`,
`src/games` y `tests` son *stubs* comentados que preparan la migración futura a fullstack.

---

## 3. Persistencia (localStorage)

Toda la persistencia se hace con estas claves en `localStorage`:

| Clave | Tipo | Contenido | Quien la usa |
|---|---|---|---|
| `arcade_salas` | JSON (Array) | Lista de salas con sus jugadores | Hub + los 3 juegos activos |
| `arcade_sala_activa` | String | `idSala` de la sala seleccionada | Hub + los 3 juegos activos |
| `arcade_config` | JSON | `{ modoOscuro, volumen, idioma }` | Hub + los 3 juegos activos |
| `arcade_modo_oscuro` | String `"true"`/`"false"` | Estado modo oscuro (duplicado de `arcade_config.modoOscuro`) | Los 3 juegos activos |
| `no_mostrar_reglas_<Juego>` | String `"true"` | Ocultar modal de reglas al cargar | Los 3 juegos activos |

> `[DISCREPANCIA]` El modo oscuro se guarda en DOS lugares: `arcade_config.modoOscuro` (hub)
> y `arcade_modo_oscuro` (juegos). El hub escribe `arcade_config`; los juegos leen
> `arcade_modo_oscuro`. Si se cambia el tema desde el hub, los juegos no necesariamente
> reflejan el mismo estado. Confirmado como estado as-is.

### 3.1 Modelo de datos en localStorage

**Sala** (`arcade_salas[i]`):
```jsonc
{
  "idSala": "1693... (Date.now().toString())",
  "nombre": "Torneo de fin de semana",
  "color": "#FF9500",
  "minimizada": false,
  "jugadores": [ /* Jugador[] */ ]
}
```

**Jugador** (dentro de `sala.jugadores[k]`):
```jsonc
{
  "id": 1693... + Math.random(),   // numérico (Date.now()+random) en creación del hub
  "nombre": "Ana",
  "color": "#FF3B30",
  "puntajeGlobal": 0               // acumulado entre todas las partidas
}
```

> Nota: el `id` del jugador es **numérico** (`Date.now() + Math.random()`) cuando se crea
> desde el hub. Los juegos lo tratan como identificador único para matchear entre
> `jugadoresPartida` y `salaActiva.jugadores`.

---

## 4. El Hub (`src/frontend/`)

Archivo: `src/frontend/index.html` + `script.js`.

### 4.1 Salas
- **Crear/Editar sala:** modal con nombre, color (paleta de 30 colores predefinidos `treintaColores`)
  y lista de jugadores temporales (cada uno con nombre + color único dentro de la sala).
- **Validación de color:** los colores ya usados por otros jugadores de la sala se bloquean
  en la paleta. No pueden repetirse colores dentro de una sala.
- **Sala activa:** se marca una sala como activa (★). Solo una puede estar activa.
  Su `idSala` se guarda en `arcade_sala_activa`. Los juegos leen esta clave al arrancar.
- **Minimizar:** cada sala se puede colapsar (➕/➖).
- **Ranking:** los jugadores se ordenan por `puntajeGlobal` descendente. El primer puesto
  (solo si tiene >0 puntos) se resalta con el color de la sala.

### 4.2 Configuración global (modal ⚙️)
- **Modo oscuro** → `arcade_config.modoOscuro` (togglea clase `dark-mode` en `body`).
- **Volumen** (0–100) → `arcade_config.volumen` (usado por Web Audio API en los juegos).
- **Idioma** (es/en/pt) → `arcade_config.idioma` (almacenado, sin i18n real implementado).
- **Login:** botón "Iniciar Sesión" que solo muestra un `alert('Próximamente')`. No hay auth.

### 4.3 Grid de juegos
El hub muestra **3 tarjetas activas** (Basta, Letrado, Trivia) + 1 tarjeta "Próximamente".
> `[HECHO]` **Juego4 y Juego5 NO están enlazados desde el hub.** Solo se accede a ellos
> abriendo directamente su `index.html`. Confirmado: Juego5 es un prototipo aislado y
> Juego4 es un placeholder vacío.

---

## 5. Juego: Basta (`src/frontend/Juegos/Basta/`)

Juego de rosco estilo *Pasapalabra*. **Validación manual**: el jugador dice una palabra que
empiece con la letra y pertenezca a la categoría; el moderador hace clic en la letra para
marcarla como acertada. No hay input de texto.

### 5.1 Configuración de partida (`configJuego`)
```js
{
  tiempo: 15,                    // segundos por turno
  rondas: 3,
  pasapalabras: 2,               // máx por jugador
  formaTablero: 'disco',         // 'disco' | 'circulos' | 'cuadrado'
  reglaPasapalabra: 'reset',     // 'reset' | 'add1' | 'none' (al avanzar ronda)
  completitud: false,            // tiempo extra cuando queda 1 jugador
  tiempoExtraCompletitud: 0,
  letrasActivas: "ABCDEFGHIJLMNOPRSTUV".split(""),  // 20 letras (sin K,Ñ,W,X,Y,Z)
  categoriasActivas: ["Película","Comida","Animal","Marca","País",
                      "Profesión","Color","Serie","Nombre Mujer","Nombre Hombre"]
}
```
- Mínimo **4 letras** para guardar la config (validación en `guardarConfigJuego`).
- Las letras se eligen de `todasLasLetrasPosibles` = A–Z incluyendo Ñ.

### 5.2 Formas del tablero (`dibujarTablero`)
- **disco:** SVG donut (`<path>` con arcos), viewBox `0 0 600 600`, elástico.
- **circulos:** divs `.letra-flotante` posicionados en círculo por trigonometría.
- **cuadrado:** divs distribuidos en el perímetro de un cuadrado.

### 5.3 Contador / Reloj
- Elemento `#contador` (centro del tablero). Muestra: `▶` (idle), la **categoría** durante
  2s al inicio de cada ronda, el **número de segundos** durante el turno, `💀` al eliminar,
  `🏆` al ganar, `✖` si nadie supera la ronda.
- Color de fondo del reloj = color del jugador en turno.
- Tick de audio (Web Audio API, 800Hz sine) cuando el tiempo restante ≤ 25% del turno.
- `tocarReloj()` (clic en el reloj) = **usar pasapalabra** (consume 1 y pasa turno).

### 5.4 Flujo de ronda
1. `prepararRonda()`: reinicia `letrasDisponibles`, resetea `pasapalabras` según
   `reglaPasapalabra`, `turnoIndex=0`, dibuja tablero.
2. `iniciarTurno()` → si `primerTurnoDeRonda`: muestra categoría 2s, luego `iniciarContadorReal()`.
3. Durante el turno: clic en letra → `manejarClickLetra` la marca `usada`, la quita de
   `letrasDisponibles`. Si quedan letras → `pasarTurno()`. Si no quedan → `verificarVictoria()`.
4. Tiempo agotado → `eliminarJugadorActualConPausa()` (pausa 2s con 💀).
5. Fin de ronda → `avanzarRonda()`: `rondaActual++`, `rotarJugadores()` (rota orden),
   si `rondaActual > rondas` → `finalizarPartidaYGuardarGlobal()`.

### 5.5 Puntuación (AS-IS del código)
> `[DISCREPANCIA CONFIRMADA]` El modal de reglas dice "+50 acierto, +100 sobrevivir,
> +200 último en pie". **El código real hace otra cosa:**

| Evento | Puntos (código real) |
|---|---|
| Acertar una letra | **0** (no suma nada; solo pasa turno) |
| Completar todo el tablero (`verificarVictoria`) | +100 a cada jugador vivo |
| Qedar último en pie (`eliminarJugadorActualConPausa`, sin `completitud`) | +100 al último |
| Sobrevivir ronda (otros) | 0 |
| Nadie supera la ronda | 0 (fin sin puntos) |

Al finalizar la partida, `puntosMesa` de cada jugador se suman a `puntajeGlobal` de la sala
en `arcade_salas` y se persiste.

### 5.6 Eliminación y fin de ronda
- Si `jugadoresVivos.length === 0` → fin sin puntos, avanza ronda.
- Si `jugadoresVivos.length === 1` y **no** hay modo `completitud` → último en pie gana +100.
- Si hay modo `completitud` y queda 1 jugador → sigue jugando solo con `tiempoExtraCompletitud`
  extra hasta completar el tablero o agotar tiempo.

### 5.7 Controles
- Pausa (`alternarPausa`), Reiniciar ronda (`reiniciarRondaManual`, confirmación),
  Reiniciar partida completa (`pedirReinicioCompleto`, borra `puntosMesa` y vuelve a ronda 1),
  Configuración (`abrirConfigJuego`).

---

## 6. Juego: Letrado (`src/frontend/Juegos/Letrado/`)

Juego de letra aleatoria + categoría. **Validación manual**: el jugador dice una palabra que
**contenga** la letra mostrada y pertenezca a la categoría; el moderador hace clic en el
centro para marcar acierto y pasar turno.

### 6.1 Configuración (`configJuego`)
```js
{
  tiempo: 10,                    // segundos por turno
  rondas: 3,
  pasapalabras: 2,
  reglaPasapalabra: 'reset',     // 'reset' | 'add1' | 'none'
  ocurrenciasPorLetra: 1,        // cuántas veces aparece cada letra en la bolsa
  letrasActivas: "ABCDEFGHIJLMNOPRSTUV".split(""),
  categoriasActivas: ["Películas","Países","Comida","Marcas",
                      "Deportes","Animales","Colores"]
}
```
- Mínimo **1 letra** para jugar.

### 6.2 Mecánica de letras (bolsa)
- `generarBolsaLetras()`: crea `bolsaLetras` con cada letra repetida `ocurrenciasPorLetra` veces.
- `obtenerLetraAleatoria()`: saca una letra al azar de la bolsa (sin reposición).
- Cuando la bolsa se vacía → `verificarVictoria()` (completar abecedario).

### 6.3 Contador / Reloj (alta precisión)
- A diferencia de Basta (enteros), Letrado usa **milisegundos** con `Date.now()`.
- Display `#timerDisplay` formato `seg.decimas` (ej. `9.83`).
- Intervalo cada **30ms** recalcula `tiempoRestanteMS = tiempoLimiteMS - (Date.now()-tiempoInicio)`.
- Clase `peligro` cuando `tiempoRestanteMS <= 5000`.
- Pausa guarda `tiempoPausado` y al reanudar setea `tiempoLimiteMS = tiempoPausado`.
- Tick de audio cuando faltan ≤5s.

### 6.4 Interacción
- `tocarCentro()` (clic en círculo central): arranca el juego si estaba idle, o **pasa turno
  con nueva letra** (acierto implícito).
- `usarPasapalabra()` (botón, `stopPropagation`): consume 1 pasapalabra, pasa turno **sin
  cambiar letra** (`iniciarTurno(false)`).
- Categoría: se muestra 2s al inicio de cada ronda (`primerTurnoDeRonda`).

### 6.5 Puntuación (AS-IS del código)
> `[DISCREPANCIA CONFIRMADA]` El modal dice "+75 acierto, +100 sobrevivir, +150 completar
> abecedario". **El código real:**

| Evento | Puntos (código real) |
|---|---|
| Acertar (clic centro) | **0** |
| Último en pie | +100 |
| Completar bolsa (`verificarVictoria`) | +100 a cada vivo |

Al finalizar, `puntosMesa` → `puntajeGlobal` en `arcade_salas`. Muestra modal de resultado
(`mostrarResultado`) y redirige al hub.

### 6.6 Fin de ronda / partida
- `avanzarRonda()`: `rondaActual++`, `rotarJugadores()`, `prepararRonda()`.
- Si `rondaActual > rondas` → `finalizarPartidaYGuardarGlobal()`.

---

## 7. Juego: Trivia / "Mente Maestra" (`src/frontend/Juegos/Trivia/`)

Juego de preguntas **por equipos** con banco de preguntas cargado desde `preguntas.json`.
Un moderador lee la pregunta, el equipo responde, y el moderador valida (✔/✖).

### 7.1 Banco de preguntas (`preguntas.json`)
Array de objetos:
```jsonc
{
  "tematica": "Cultura General",
  "pregunta": "¿Cuál es la capital de Francia?",
  "respuesta": "París",
  "dificultad": "facil",   // "facil" | "medio" | "dificil"
  "puntos": 100            // 100 / 150 / 200 según dificultad
}
```
- Se carga vía `fetch('preguntas.json')` al iniciar. Si falla, hay un fallback hardcodeado
  de 3 preguntas.
- **Banco actual (456 preguntas)** distribuidas en 10 temáticas de cultura general:
  Cultura General (56), Ciencia (50), Historia (50), Geografía (50), Deportes (50),
  Arte (40), Música (40), Literatura (40), Cine (40), Tecnología (40).
- Distribución por dificultad: facil (180), medio (176), dificil (100).
- Puntos por dificultad: facil=100, medio=150, dificil=200.

### 7.2 Configuración (`configJuego`)
```js
{
  rondas: 3,
  dificultadInicial: "facil",
  modoDificultadIncremental: false,// cada 3 preguntas sube de nivel
  categoriasActivas: [ /* 10 temáticas de cultura general */ ],
  dificultadesActivas: ["facil","medio","dificil"]
}
```
> `[CAMBIO]` **`modoRobo` y `modoRevancha` fueron eliminados** del código, del HTML y del
> CSS. Ya no existen toggles ni funciones relacionadas (`iniciarRevancha`, `calificarRevancha`,
> `alternarModoRoboPlaceholder`, `actualizarBotonRoboUI`).

### 7.3 Fase 1 — Setup de equipos
- Pantalla `#pantallaSetup`: cantidad de equipos (2–4), color por equipo
  (`var(--equipo-1..4)`).
- **Aleatorio** (`generarEquiposAleatorios`): mezcla jugadores y reparte round-robin.
- **Manual** (`prepararAsignacionManual`): clic en cada jugador rota su equipo (1→2→...→N).
  Validación: ningún equipo vacío.
- `irAlTablero()` → oculta setup, muestra `#pantallaJuego`.

### 7.4 Fase 2 — Motor de juego
- `prepararRonda()`: elige `tematicaRonda` (primera temática con ≥ `equipos.length` preguntas).
- `iniciarTurno()`: equipo actual, obtiene pregunta con `obtenerPreguntaConDificultad(numeroPreguntaGlobal)`.
- `numeroPreguntaGlobal++` en cada turno (contador global de preguntas).
- La pregunta usada se marca en `preguntasUsadasEnPartida` y se saca de `preguntasDisponibles`.

### 7.5 Contador / Reloj
- `#relojTrivia`: cuenta regresiva **30s fijo** (enteros, intervalo 1s).
- `forzarRespuesta()`: revela la respuesta sin esperar el tiempo.
- A ≤10s el reloj cambia a color `var(--danger-color)`.
- A 0s → `revelarRespuesta()`.

### 7.6 Validación
- `revelarRespuesta()` muestra la respuesta correcta + botones ✔/✖.
- `calificarRespuesta(true)` → `equipos[turno].puntos += pregunta.puntos`.
- `calificarRespuesta(false)` → sin puntos; pasa al siguiente turno.
> `[CAMBIO]` El **modo revancha** (robo de 50% por el siguiente equipo) fue eliminado.
> Ya no existe `iniciarRevancha` ni `calificarRevancha`.

### 7.7 Dificultad incremental
`calcularDificultadActual(n)`: si `modoDificultadIncremental`, sube un nivel cada 3 preguntas
desde `dificultadInicial`, hasta `dificil`.

### 7.8 Puntuación y fin de partida
- Los puntos viven en `equipos[i].puntos` (no en `puntajeGlobal` durante la partida).
- `finalizarPartida()`: divide los puntos del equipo equitativamente entre sus integrantes
  (`Math.floor(eq.puntos / eq.jugadores.length)`) y los suma al `puntajeGlobal` de cada
  jugador en `arcade_salas`. Persiste y redirige al hub.

### 7.9 Controles
- Pausa, Reiniciar ronda (devuelve la pregunta actual al pozo), Reiniciar partida completa
  (puntos a 0, recarga `preguntasDisponibles` desde `dbPreguntas`), Configuración
  (pausa automática al abrir, reanuda al cerrar si no estaba pausado manualmente).

> `[RESUELTO]` Las **dos definiciones duplicadas** de `abrirConfigJuego`/`guardarConfigJuego`
> fueron consolidadas en una sola. La versión única gestiona dificultad incremental, temáticas
> y dificultades activas. `configTemporal` ahora solo contiene `{ categorias: [] }`.

---

## 8. Juego4 (`src/frontend/Juegos/Juego4/`)

**Placeholder vacío.** `script.js` no tiene contenido. `index.html`/`style.css` existen pero
sin lógica. No está enlazado desde el hub. Confirmado: slot de reserva sin juego asignado.

---

## 9. Juego5 (`src/frontend/Juegos/Juego5/`)

**Prototipo aislado** de Basta (versión simplificada). Confirmado: prototipo independiente.

### Diferencias clave con Basta:
- **NO se integra al hub**: no lee `arcade_salas`, no hay sala activa, no hay jugadores del
  hub, no persiste `puntajeGlobal`. Es totalmente standalone.
- **NO hay sistema de turnos/jugadores/eliminación**: es solo un tablero de letras + reloj.
- Reloj simple: `tiempoMaximo=15`, cuenta regresiva entera, `tocarReloj()` resetea a 15 y
  arranca. Pausa/reanudar básico.
- Clic en una letra solo togglea la clase `usada` (marcado visual, sin lógica de juego).
- `tirarCategoria()` elige al azar de `categoriasBasta` (lista hardcodeada de 12).
- Config modal: tiempo (≥5), letras activas, categorías (agregar/eliminar).
- Render: ruleta de divs `.letra` en círculo (radio 190px, centro 230,230), coordenadas
  absolutas en px (no responsive como Basta).

---

## 10. Sistemas transversales (compartidos por los 3 juegos activos)

### 10.1 Conexión con el hub
Los 3 juegos arrancan leyendo:
```js
let salasHub = JSON.parse(localStorage.getItem('arcade_salas')) || [];
let idSalaActiva = localStorage.getItem('arcade_sala_activa');
let salaActiva = salasHub.find(s => s.idSala === idSalaActiva);
```
Si no hay sala activa o no tiene jugadores → `window.location.href = '../../index.html'`
(redirige al hub). Por eso **es obligatorio crear y activar una sala antes de jugar**.

### 10.2 Jugadores de partida vs jugadores del hub
Cada juego crea `jugadoresPartida` mapeando `salaActiva.jugadores` añadiendo:
- `puntosMesa: 0` (puntos de la partida actual, no globales)
- `pasapalabras: configJuego.pasapalabras` (Basta/Letrado)

Al finalizar, `puntosMesa` se suma a `puntajeGlobal` del jugador correspondiente en
`salasHub` y se persiste `arcade_salas`.

### 10.3 Modales y mensajería comunes
- **Toast** (`mostrarToast`): notificaciones efímeras.
- **Confirmación** (`mostrarConfirmacion`): modal sí/no con callback.
- **Resultado** (`mostrarResultado`, en Letrado/Trivia): modal con icono/título/mensaje.
- **Reglas** (`mostrarReglas`): modal al cargar (`DOMContentLoaded`), con checkbox
  "No volver a mostrar" → `no_mostrar_reglas_<Juego>` en localStorage.
- **Config del juego** (`abrirConfigJuego`/`guardarConfigJuego`): modal por juego.
- **Cierre por overlay** `[CAMBIO]`: todos los modales con clase `.modal-overlay` se cierran
  al clickear fuera del contenido (si `e.target === overlay`). Implementado en el hub y en
  los 3 juegos activos vía `DOMContentLoaded` → `querySelectorAll('.modal-overlay')`.

### 10.4 Audio (Web Audio API)
- `audioCtx` creado al cargar (Basta sin try/catch; Letrado con try/catch "blindado").
- `reproducirTick()`: oscilador sine 800Hz, gain `(volumen/100)*0.1`, decay 0.05s.
- Respeta `configGlobal.volumen` (0 → silencio).

### 10.5 Modo oscuro
- Clase `dark-mode` en `<body>`, controlada por variables CSS en `style.css`.
- Basta/Letrado tienen toggle propio en su modal de config; escriben `arcade_modo_oscuro`.
- Trivia solo lee `arcade_modo_oscuro` al cargar (sin toggle propio).
- El hub usa `arcade_config.modoOscuro`.

### 10.6 Reglas de pasapalabras entre rondas (`reglaPasapalabra`)
Aplica a Basta y Letrado:
- `reset`: al iniciar ronda (no la 1), cada jugador vuelve a `configJuego.pasapalabras`.
- `add1`: suma 1 sin superar el máximo configurado.
- `none`: se mantienen los que le quedaron al jugador.

### 10.7 Rotación de orden
`rotarJugadores()` (Basta/Letrado): mueve el primer jugador de `jugadoresPartida` al final,
para que el orden de inicio rote entre rondas.

---

## 11. Backend y Tests (estado placeholder)

### 11.1 Backend (`src/api/`, `src/core/`, `src/games/`)
- `src/api/main.py`: FastAPI **completamente comentado**. No se ejecuta.
- `routers/auth.py`, `routers/salas.py`, `routers/partidas.py`: endpoints CRUD comentados.
- `models/schemas.py`: modelos Pydantic (Sala, Jugador) comentados.
- `models/database.py`, `core/database.py`, `core/auth.py`: placeholders.
- `requirements.txt`: fastapi 0.104.1, uvicorn, pydantic 2.5, pytest, httpx — sin uso real.

### 11.2 Esquema DB propuesto (`docs/esquema_db.md`)
Esquema PostgreSQL **no implementado**: tablas `usuarios`, `salas`, `jugadores`, `partidas`,
`puntajes_partida`, `categorias`. Incluye estrategia de migración desde localStorage.

### 11.3 Tests (`tests/`)
Todos los archivos son placeholders con imports y funciones comentadas. No hay tests reales.

---

## 12. Reglas del agente (`.devinrules`) — resumen

- Responder y comentar en español.
- Frontend en `src/frontend/`; backend futuro en `src/api`, `src/core`, `src/games`.
- **No implementar base de datos aún** — mantener localStorage.
- **No implementar mejoras de game design por ahora** — mantener funcionalidad actual.
- Juego4 y Juego5 son placeholders.
- Usar variables CSS para theming; responsive mobile-first; no agregar dependencias.

---

## 13. Glosario rápido para el agente

| Término | Significado |
|---|---|
| Sala | Grupo de jugadores con nombre/color, persistida en `arcade_salas` |
| Sala activa | Sala seleccionada (`arcade_sala_activa`); obligatoria para jugar |
| `puntajeGlobal` | Puntos acumulados del jugador entre todas las partidas (en la sala) |
| `puntosMesa` | Puntos de la partida actual (Basta/Letrado); al finalizar suma al global |
| Pasapalabra | Acción de saltar turno/letra; cantidad limitada por `configJuego.pasapalabras` |
| Rosco | Tablero circular de letras (Basta, forma `disco`) |
| `jugadoresVivos` | Jugadores no eliminados en la ronda actual (Basta/Letrado) |
| `turnoIndex` | Índice del jugador/equipo con el turno actual |
| Moderador | Operador humano de la UI que valida respuestas manualmente |
| `dbPreguntas` | Banco cargado desde `preguntas.json` (Trivia) |
| `preguntasDisponibles` | Pool de preguntas no usadas aún (Trivia) |

---

## 14. Cómo levantar el producto hoy

No requiere build ni servidor. Servir estáticamente la carpeta `src/frontend/`:
- Abrir `src/frontend/index.html` directamente, o
- `python -m http.server` dentro de `src/frontend/`, o
- Desplegar `src/frontend/` en GitHub Pages.

**Flujo mínimo:** crear una sala con ≥1 jugador → marcarla activa (★) → elegir un juego
→ el moderador opera la partida → al finalizar, los puntos se suman al ranking de la sala.

---

## 15. Discrepancias y deuda técnica conocida (resumen)

1. **Puntos por acierto inexistentes** en Basta y Letrado (modales mienten vs código). Confirmado as-is.
2. **Modo oscuro duplicado** entre `arcade_config.modoOscuro` (hub) y `arcade_modo_oscuro` (juegos).
3. **Juego5 no integrado** al hub ni al sistema de salas (prototipo aislado).
4. **Juego4 vacío** (placeholder sin contenido).
5. ~~**Funciones duplicadas** en Trivia~~ → **RESUELTO**: consolidadas en una sola definición.
6. ~~**`modoRobo` / `modoRevancha`** en Trivia~~ → **RESUELTO**: eliminados por completo.
7. **Sin backend, sin auth, sin tests** — toda la lógica vive en el frontend.
8. **Persistencia volátil** — atada al localStorage del navegador/dispositivo.

---

## 16. Changelog de cambios aplicados

### Letrado
- **Bug fix A**: la categoría no aparecía al comenzar la ronda porque `estadoJuegoDOM`
  no se hacía visible antes de setear el texto. Ahora se setea `display='flex'` antes
  de mostrar la categoría (`script.js` ~línea 296).
- **Bug fix B**: tras la eliminación de un jugador, el `fontSize` del display quedaba en
  `2em` (calavera grande) en el siguiente turno. El reset de `fontSize`/`fontWeight` se
  movió fuera del bloque condicional `if (esCambioDeLetra)` para que se ejecute siempre
  (`script.js` ~línea 340).

### Trivia
- **Modo revancha eliminado**: removidas las funciones `iniciarRevancha`, `calificarRevancha`,
  el toggle `modoRevancha` de `configJuego`, los botones del HTML, las reglas CSS
  `.botones-revancha`, y toda referencia al flujo de robo de 50%.
- **Modo robo eliminado**: removidas `alternarModoRoboPlaceholder`, `actualizarBotonRoboUI`,
  el toggle `modoRobo` de `configJuego`, y el botón `btnModoRobo` del HTML.
- **Funciones duplicadas consolidadas**: `abrirConfigJuego` y `guardarConfigJuego` ahora
  existen en una sola definición. `configTemporal` se simplificó a `{ categorias: [] }`.
- **Banco de preguntas reemplazado**: `preguntas.json` pasó de un banco misceláneo a
  **456 preguntas de cultura general** en 10 temáticas (Cultura General, Ciencia, Historia,
  Geografía, Deportes, Arte, Música, Literatura, Cine, Tecnología), con 3 niveles de
  dificultad (facil=180, medio=176, dificil=100).

### General (hub + 3 juegos)
- **Cierre de modales por overlay**: todos los modales con clase `.modal-overlay` ahora
  se cierran al clickear fuera del contenido. Implementado en `src/frontend/script.js`,
  `Basta/script.js`, `Letrado/script.js` y `Trivia/script.js`.

---

*Fin del documento. Estado capturado a partir del código actual del repositorio.*
