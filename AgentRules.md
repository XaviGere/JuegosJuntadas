# AgentRules — Juegos-Hub

## 1. Propósito y alcance

Este documento define cómo se analiza, diseña, implementa, prueba y documenta Juegos-Hub.
Es obligatorio para cualquier persona o agente que modifique el proyecto.

No reemplaza la especificación del producto: establece el modo de trabajo y los límites
para implementarla de forma consistente. Es adaptado del modelo de Couplex, pero más
liviano: Juegos-Hub no usa ADRs formales.

### Producto

Juegos-Hub ("🎮 Arcade Hub") es una aplicación web de **party games locales** para jugar
en un único dispositivo (mesa presencial) con un moderador que valida respuestas
manualmente. Stack actual: HTML5 + CSS3 + JavaScript Vanilla, sin frameworks ni build.
Persistencia: `localStorage`. Alojable en GitHub Pages.

### Alcance por fases (roadmap)

1. **Fase 1 (actual): pulir frontend vanilla.** Terminar Basta, Letrado y Trivia en
   HTML/CSS/JS vanilla + localStorage, jugable en GitHub Pages. Backend y frameworks
   fuera de alcance en esta fase.
2. **Fase 2 (futura): migrar a framework visual + backend.** Reescritura del frontend a
   un framework component-based (React u otro a confirmar) con su build tooling, y
   migración de la persistencia de `localStorage` a una base de datos real
   (PostgreSQL/SQLite) con backend (FastAPI ya preparado como placeholder).
   Referencia: `docs/esquema_db.md`, `docs/arquitectura.puml`,
   `scripts/migrate_localstorage.py`.
3. **Fase 3 (futura): tiempo real.** WebSockets para multi-dispositivo (cada jugador con
   su celular en la misma sala).

> El framework exacto de Fase 2 (React, Vue, Svelte, etc.) **no está decidido**. No
> asumir ninguno hasta que el responsable lo confirme. Las decisiones de Fase 1 **no
> deben bloquear** la migración: mantener la lógica de juegos aislada y modular, y el
> modelo de datos de localStorage migrable, para facilitar el traslado.

## 2. Jerarquía de autoridad

Ante una contradicción, aplicar este orden:

1. Instrucciones explícitas y actuales del responsable del proyecto.
2. Este archivo (`AgentRules.md`) para el proceso y las restricciones.
3. `docs/specs-inicial.md` — fuente de verdad del producto y del estado del sistema.
4. `docs/esquema_db.md` y `docs/arquitectura.puml` — referencia del roadmap backend.
5. Código, estilos y HTML existentes, solo como evidencia de la implementación actual.
6. `ContextProject.md` — contexto histórico y tarea de game design (no normativo).

Si los niveles 2, 3 o 4 se contradicen, no elegir silenciosamente. Señalar la contradicción
y pedir decisión si cambia el comportamiento, la arquitectura o los datos.

## 3. Fuente de verdad y requisitos

### Especificación

`docs/specs-inicial.md` es la fuente de verdad del sistema. Se actualiza **in-place**:
cuando un cambio altere mecánicas, puntuación, configuración, persistencia o flujo,
actualizar ese archivo en el mismo cambio. No mantener dos versiones divergentes.

El código debe implementar la especificación; no debe redefinirla de forma implícita. Si
una implementación revela una ambigüedad o una regla faltante, detener el desarrollo de
esa parte y solicitar definición antes de inventarla.

### No inventar requisitos

Está prohibido asumir o agregar sin validación:

- mecánicas de juego, modos, power-ups o reglas no definidas;
- criterios de puntuación, pasapalabras, eliminación o victoria;
- categorías, letras, temáticas o bancos de preguntas por defecto;
- comportamientos de salas, jugadores, ranking o configuración global;
- el framework de la Fase 2 (React u otro) o el stack/protocolo de backend.

Se pueden proponer alternativas. Deben diferenciarse explícitamente de una decisión tomada
y no implementarse hasta recibir aprobación cuando afecten el producto, la jugabilidad o
la migración futura.

## 4. Documentación y ubicación

```text
AgentRules.md                     Reglas obligatorias de desarrollo (este archivo)
.devinrules                       Reglas operativas rápidas del agente
docs/specs-inicial.md             Fuente de verdad del producto y estado del sistema
docs/esquema_db.md                Esquema DB propuesto (roadmap, no implementado)
docs/arquitectura.puml            Diagramas: estado actual + futuro fullstack
ContextProject.md                 Contexto histórico (no normativo)
src/frontend/                     Producto vivo (HTML/CSS/JS vanilla)
src/api/, src/core/, src/games/   Placeholders del backend futuro (comentados)
tests/                            Placeholders de tests (comentados)
```

No crear documentación duplicada. Si una regla cambia, actualizar `specs-inicial.md` y,
si aplica, `esquema_db.md` o `arquitectura.puml`. No documentar funcionalidad inexistente.

## 5. Flujo obligatorio de desarrollo

Ninguna implementación empieza directamente por código. Aplicar este flujo, de forma
proporcional al tamaño del cambio:

1. **Leer y delimitar.** Identificar la petición, el alcance y los archivos afectados.
   Revisar `specs-inicial.md` para la mecánica afectada.
2. **Analizar previamente.** Determinar qué juego/sala/contador/persistencia se toca y
   qué juegos comparten el patrón (Basta y Letrado comparten mucha lógica).
3. **Resolver ambigüedades.** No completar huecos con suposiciones. Proponer opciones y
   pedir decisión cuando afecte mecánica, puntuación o persistencia.
4. **Diseñar el cambio.** Definir qué archivo/s son responsables. Mantener la lógica de
   juego dentro de su carpeta de juego; no mezclar entre juegos.
5. **Implementar.** Vanilla JS, sin frameworks. Respetar patrones existentes (modales,
   toasts, reloj, audio, config).
6. **Verificar.** Probar el flujo afectado manualmente en navegador. Si hay tests
   aplicables, ejecutarlos.
7. **Documentar.** Actualizar `specs-inicial.md` cuando el cambio altere comportamiento,
   puntuación, configuración o persistencia.

## 6. Análisis previo obligatorio

Antes de modificar código, responder internamente o dejar documentado:

- ¿Qué pide exactamente el cambio y qué queda fuera?
- ¿Qué parte de `specs-inicial.md` lo sustenta?
- ¿Qué juego/sala/contador/persistencia toca?
- ¿Tiene impacto en `localStorage` (claves, modelo de datos)?
- ¿Tiene impacto en la migración futura a framework + backend (no debe bloquearla)?
- ¿Afecta mecánica compartida entre Basta y Letrado (cambiar en ambos)?
- ¿Requiere actualizar `specs-inicial.md`?

Para un cambio pequeño puede ser una lista breve. Para uno que altere mecánica o
persistencia, debe existir un diseño explícito antes de implementar.

## 7. Arquitectura actual (Fase 1)

No hay arquitectura por capas backend. La estructura es **frontend modular**:

```text
src/frontend/
├── index.html + script.js + style.css   # Hub: salas, config global, ranking
└── Juegos/
    ├── Basta/    # Juego 1 (rosco de letras, validación manual)
    ├── Letrado/  # Juego 2 (letra aleatoria + categoría, validación manual)
    ├── Trivia/   # Juego 3 (Mente Maestra, por equipos, banco preguntas)
    ├── Juego4/   # Placeholder vacío
    └── Juego5/   # Prototipo aislado de Basta (no integrado al hub)
```

### Reglas de organización

- Cada juego es **autónomo** dentro de su carpeta (HTML + CSS + JS propios).
- Los juegos leen el estado del hub desde `localStorage` al arrancar (ver §9).
- La lógica compartida (modales, toasts, audio, reglas, config) se **duplica** hoy entre
  juegos por diseño (sin build ni módulos). Al pulir, mantener la consistencia entre
  juegos que comparten patrón (Basta ↔ Letrado).
- No introducir frameworks, bundlers ni módulos ES en Fase 1 (rompe GitHub Pages sin
  build). Mantener JS vanilla con `<script src>`.

### Preparación para la migración (Fase 2)

- Mantener la lógica de cada juego **aislada y nombrada de forma trasladable** a
  componentes/framework cuando llegue la Fase 2.
- No acoplar mecánica de juego a detalles de `localStorage` más de lo necesario: idealmente
  un punto único de lectura/escritura por juego, para poder cambiar la fuente de datos
  (localStorage → API) sin reescribir la mecánica.
- Separar progresivamente, donde sea viable sin sobre-ingeniería, la lógica de juego
  (reglas, turnos, puntuación) de la lógica de UI (DOM, eventos), para facilitar el
  traslado a componentes React/similares.
- No hardcodear supuestos que asuman un único dispositivo si la mecánica podría ser
  multi-dispositivo en Fase 3.

## 8. Reglas de los juegos (dominio)

### Principio fundamental: validación manual

Basta, Letrado y Trivia son **party games con moderador**. No hay input de texto ni
validación automática de palabras. El moderador humano decide si una respuesta es válida
y marca el acierto mediante clic. No introducir validación automática sin decisión
explícita del responsable.

### Puntuación — estado actual y deuda

`specs-inicial.md` documenta la puntuación **as-is** del código. Existen discrepancias
conocidas entre los modales de reglas y el código real (ver §15 de specs-inicial.md):

- Basta/Letrado: los modales dicen "+50/+75 por acierto" pero el código **no suma** por
  acierto; solo +100 al sobrevivir/último en pie/completar tablero.
- Trivia: `modoRobo` existe como toggle pero su efecto no está claro; el robo real lo
  hacía `modoRevancha` (eliminado en esta fase). Hay funciones duplicadas
  (`abrirConfigJuego`/`guardarConfigJuego`) a consolidar.

Al pulir los juegos, estas discrepancias son **deuda a resolver**, no comportamiento a
preservar ciegamente. Antes de cambiar la puntuación, confirmar con el responsable cuál
es el comportamiento deseado. No decidir unilateralmente.

### Mecánicas compartidas (Basta y Letrado)

- Turnos rotativos con `turnoIndex` sobre `jugadoresVivos`.
- `pasapalabras` limitado por `configJuego.pasapalabras`; regla entre rondas:
  `reset` | `add1` | `none`.
- Eliminación por tiempo agotado; pausa visual de 2s con feedback (💀).
- Categoría mostrada 2s al inicio de cada ronda (`primerTurnoDeRonda`).
- `rotarJugadores()` rota el orden de inicio entre rondas.
- Al finalizar, `puntosMesa` → `puntajeGlobal` en `arcade_salas`.

### Trivia

- Por **equipos** (2–4), asignación aleatoria o manual.
- Banco en `preguntas.json` (temática, pregunta, respuesta, dificultad, puntos).
- Dificultades: facil (100), medio (150), dificil (200).
- Flujo (Fase 1, simplificado): pregunta → equipo responde → botón revelar →
  moderador marca ✔/✖ → siguiente turno. **Sin modo revancha** (eliminado).
- Dificultad incremental opcional (sube cada 3 preguntas).
- Al finalizar, puntos del equipo se dividen equitativamente entre integrantes y suman
  al `puntajeGlobal` de cada uno.

### Juego4 y Juego5

- **Juego4**: placeholder vacío. No implementar nada ahí sin un concepto definido por el
  responsable.
- **Juego5**: prototipo aislado de Basta, no integrado al hub ni a salas. Tratar como
  referencia/legacy salvo decisión explícita de integrarlo.

## 9. Persistencia (localStorage)

### Claves vigentes

| Clave | Uso |
|---|---|
| `arcade_salas` | Array de salas con jugadores |
| `arcade_sala_activa` | `idSala` seleccionada |
| `arcade_config` | `{ modoOscuro, volumen, idioma }` |
| `arcade_modo_oscuro` | Estado modo oscuro (duplicado, usado por los juegos) |
| `no_mostrar_reglas_<Juego>` | Ocultar modal de reglas |

### Reglas

- **No introducir base de datos ni framework en Fase 1.** Mantener `localStorage` y
  vanilla JS.
- No cambiar las claves existentes sin motivo: rompe datos guardados de usuarios.
- Al añadir datos, extender el modelo sin romper la estructura de `Sala`/`Jugador`
  documentada en `specs-inicial.md`.
- El `id` de jugador es numérico (`Date.now() + Math.random()`) al crearse en el hub;
  los juegos lo usan como identificador único. No cambiar el tipo sin migrar.
- **Deuda conocida:** el modo oscuro está duplicado entre `arcade_config.modoOscuro`
  (hub) y `arcade_modo_oscuro` (juegos). Al pulir, unificar — pero confirmar el destino
  antes de romper la compatibilidad con datos existentes.

## 10. Frontend y UX

- **Vanilla JS, sin frameworks, sin build.** Debe funcionar abriendo `index.html` o
  sirviendo estáticamente (GitHub Pages).
- **Mobile-first y responsive.** Los juegos ya tienen layouts adaptados (Basta SVG
  elástico, Letrado grilla compacta). No romper el responsive.
- **Theming con variables CSS** (`style.css`). Modo oscuro/claro vía clase `dark-mode`.
- **Web Audio API** para ticks, respetando `configGlobal.volumen`.
- **Modales compartidos**: toast, confirmación, resultado, reglas, config. Mantener el
  patrón existente al añadir UI.
- **Cierre de modales por overlay**: clic en el fondo (`.modal-overlay`) fuera del
  contenido (`.modal-contenido`) cierra el modal sin aplicar cambios. En modales de
  resultado (fin de ronda/partida), el cierre por overlay equivale a pulsar "Continuar".
- No codificar reglas de negocio solo en HTML; la lógica va en `script.js`.
- Las decisiones de UX que cambien el producto deben reflejarse en `specs-inicial.md`.

## 11. Pruebas

- No hay tests reales hoy (`tests/` son placeholders comentados).
- En Fase 1, la verificación es **manual en navegador**: recorrer el flujo afectado.
- Cuando se introduzca lógica backend (Fase 2), usar `pytest` como ya está preparado.
- No declarar "funciona" sin haber ejecutado el flujo. Ser preciso: "Verificado
  manualmente el flujo X en navegador; tests no ejecutados."

## 12. Git, cambios y refactors

- Cambios pequeños, coherentes y trazables.
- No mezclar refactors amplios con cambios funcionales sin motivo.
- No modificar trabajo ajeno sin autorización.
- Antes de editar, revisar cambios locales existentes y preservar los ajenos a la tarea.
- Mensajes de commit describiendo la intención.
- Un refactor no debe alterar comportamiento. Si altera mecánica, puntuación,
  persistencia o UX, deja de ser refactor y requiere análisis y documentación.

## 13. Evitar sobre-ingeniería

Resolver el problema actual respetando los límites, sin construir plataformas anticipadas.

Evitar:

- frameworks, bundlers o módulos ES sin decisión explícita (rompe GitHub Pages y es
  alcance de Fase 2, no Fase 1);
- abstracciones para posibilidades hipotéticas;
- capas/backend antes de la Fase 2;
- optimizaciones sin evidencia de necesidad;
- dependencias nuevas sin evaluación.

Preparar la evolución futura con lógica aislada y datos migrables, no con complejidad
prematura.

## 14. Cambios que afectan el roadmap

Un cambio es relevante para el roadmap si altera: el modelo de persistencia, las claves
de `localStorage`, la estructura de salas/jugadores, la preparación para la migración a
framework + backend, o la mecánica de un juego de forma que afecte la futura
sincronización multi-dispositivo.

Antes de implementarlo:

1. Exponer el impacto en `specs-inicial.md` y/o `esquema_db.md`.
2. Confirmar que no bloquea la migración futura.
3. Si rompe compatibilidad con datos guardados, definir migración de localStorage.

No introducir cambios de roadmap encubiertos dentro de una corrección pequeña.

## 15. Checks previos a entregar

Antes de considerar finalizado un cambio, confirmar:

- El alcance coincide con la petición y `specs-inicial.md`.
- No se inventaron requisitos ni decisiones pendientes.
- La lógica stayed dentro de su juego; no se mezcló entre juegos sin motivo.
- No se rompió el modelo de `localStorage` ni las claves existentes.
- No se bloqueó la migración futura a framework + backend.
- El responsive y el theming siguen funcionando.
- Se verificó el flujo manualmente en navegador.
- `specs-inicial.md` fue actualizado si el comportamiento cambió.
- No quedan cambios fuera de alcance ni deuda implícita sin señalar.

## 16. Definition of Done

Un cambio está terminado únicamente cuando:

1. Implementa un requisito confirmado o una instrucción actual del responsable.
2. Respeta las reglas de dominio, persistencia y organización modular.
3. Se verificó el flujo en navegador (y tests si los hay).
4. Maneja los estados normales y de error que le correspondan.
5. No rompe datos existentes ni la migración futura.
6. Actualiza `specs-inicial.md` cuando el alcance lo requiere.
7. No introduce regresiones conocidas sin acuerdo explícito.

## 17. Regla final

Si una decisión afecta la jugabilidad, la puntuación, la persistencia, la migración a
framework + backend o la experiencia de juego y no está documentada o confirmada, no
improvisar: detenerse, explicar el impacto y pedir una decisión explícita.
