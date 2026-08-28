# CONTEXTO DEL PROYECTO Y TAREA: "JUEGOS-HUB"

Actúa como Arquitecto de Software Senior, Desarrollador Fullstack y Game Designer. A continuación te presento el estado actual, la arquitectura técnica y la nueva estructura de directorios del proyecto "Juegos-Hub". 

Asimila toda esta información técnica. Al final de este documento se detalla tu tarea principal: proponer mejoras de jugabilidad y diseñar un plan estratégico de nuevas implementaciones.

---

## 🏗️ 1. Nueva Arquitectura y Estructura de Directorios Objetivo
El proyecto está migrando de ser una aplicación web estática a una arquitectura modular preparada para integrar backend, bases de datos y testing automatizado. La nueva estructura que rige el proyecto es la siguiente:

    juegoshub/
    ├── .devinrules                 # Reglas estrictas de desarrollo para el agente
    ├── setup.sh                    # Comando único para levantar el entorno de desarrollo
    ├── requirements.txt            # Dependencias Python (ej. FastAPI, WebSockets, Pandas)
    ├── docs/
    │   ├── arquitectura.puml       # Diagrama de cómo se comunican los módulos
    │   └── esquema_db.md           # Estructura de tablas (Usuarios, Puntajes, Partidas)
    ├── src/
    │   ├── frontend/               # Todo el cliente Web estático (Migrado de la raíz anterior)
    │   │   ├── index.html          # Hub principal (página de inicio)
    │   │   ├── script.js           # Lógica del hub
    │   │   ├── style.css           # Estilos globales
    │   │   └── Juegos/             # Módulos de juegos 
    │   │       ├── Basta/          # Juego de palabras estilo "Basta"
    │   │       ├── Letrado/        # Juego de letras aleatorias
    │   │       ├── Trivia/         # Juego de preguntas (Mente Maestra)
    │   │       ├── Juego4/         # Placeholder vacío
    │   │       └── Juego5/         # Versión simplificada de Basta
    │   ├── api/                    # [Futuro] Rutas y endpoints que exponen los juegos al frontend
    │   ├── games/                  # [Futuro] La lógica aislada de cada módulo de juego backend
    │   │   ├── trivia/             # Motor de generación y validación de preguntas
    │   │   └── coop_sessions/      # Gestión de guardado de datos y estado cooperativo
    │   └── core/                   # [Futuro] Autenticación, conexión a base de datos y utilidades
    └── tests/
        ├── test_trivia_logic.py    # Pruebas para validar que la lógica de puntos no falle
        └── test_sessions.py        # Validaciones de las salas de juego

---

## 🎮 2. Resumen Técnico del Proyecto (Frontend Actual)
*   **Tipo:** Aplicación web estática (frontend-only, alojable en GitHub Pages).
*   **Patrón:** SPA (Single Page Application) simulada con navegación entre páginas HTML independientes.
*   **Stack Tecnológico:** HTML5 + CSS3 + JavaScript Vanilla (sin frameworks).
*   **Persistencia:** `LocalStorage` del navegador.

### Características Técnicas Principales
1.  **Sistema de Gestión de Salas:**
    *   Creación de salas con nombre personalizado y color.
    *   Gestión de jugadores con nombre, color y puntaje global.
    *   Sistema de ranking por puntajes.
    *   Persistencia en localStorage con claves: `arcade_salas` (Array de salas), `arcade_sala_activa` (ID de sala seleccionada), `arcade_config` (Configuración global).
2.  **Sistema de Configuración Global:**
    *   Modo oscuro/claro implementado con variables CSS.
    *   Control de volumen para efectos de sonido generados programáticamente (Web Audio API).
    *   Navegación breadcrumb y notificaciones tipo toast.
3.  **Juegos Implementados (`src/frontend/Juegos/`):**
    *   **Basta (Pasapalabra/Rosco):** Tablero SVG interactivo (disco, círculos, cuadrado). Temporizador, categorías, y diseño responsive con SVG elástico (`viewBox`) y contenedor forzado a `aspect-ratio: 1`.
    *   **Letrado:** Círculo con letras aleatorias y temporizador de alta precisión. Diseño responsive con reloj circular (`border-radius: 50%`) y jugadores organizados en una grilla CSS compacta de 3 columnas con badges flotantes para las vidas/pasapalabras.
    *   **Trivia (Mente Maestra):** Sistema de equipos, banco de preguntas por temáticas, validación de respuestas y temporizador de 30s por turno.
    *   **En desarrollo:** "Juego4" (placeholder vacío) y "Juego5" (versión simplificada de Basta).

### Estado de Desarrollo y Limitaciones
*   **Puntos Fuertes:** Arquitectura modular (juegos aislados), persistencia local robusta, sistema de theming escalable vía CSS vars, diseño mobile-first saneado recientemente sin desbordamientos flexbox.
*   **Limitaciones Actuales a Resolver:** Dependencia total de `localStorage` (volatilidad de datos), falta de backend y autenticación, ausencia de entorno de testing automatizado y falta de un proceso de build.

---

## 🎯 3. TAREA REQUERIDA

Habiendo analizado el resumen técnico y considerando que recientemente se ha estabilizado el diseño responsive del frontend, necesito que actúes de manera proactiva cumpliendo estas dos directrices:

**Fase 1: Mejoras de Game Design y Experiencia (Frontend)**
Asume el rol de Game Designer y propón ideas innovadoras de mecánicas, power-ups, o modos de juego para enriquecer los juegos actuales (Basta, Letrado y Trivia). Además, sugiere conceptos divertidos y realizables para ocupar los placeholders actuales ("Juego4" y "Juego5") que encajen con la filosofía de party-games locales/juntadas.

**Fase 2: Plan de Implementación de Arquitectura Backend (Fullstack)**
Diseña un plan estratégico de nuevas implementaciones a corto y mediano plazo para hacer la transición a la nueva arquitectura. 
El plan debe proponer soluciones técnicas viables para:
1. Migrar la persistencia de datos (de `localStorage` a una Base de Datos real como PostgreSQL/SQLite).
2. Implementar un backend en Python (ej. FastAPI, SQLAlchemy) que maneje la lógica de sesiones.
3. Incorporar WebSockets para que los juegos tengan funcionalidad multi-dispositivo en tiempo real (que cada jugador pueda usar su propio celular en la misma sala).
4. Estrategias de testing automatizado (pytest) para el motor de juegos.

Por favor, entrega tu análisis y plan estructurado.