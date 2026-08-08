# Esquema de Base de Datos - Juegos-Hub

## Estado Actual

Actualmente el proyecto **NO utiliza base de datos**. Toda la persistencia se maneja mediante `localStorage` del navegador con las siguientes claves:

- `arcade_salas` - Array de salas con jugadores y puntajes
- `arcade_sala_activa` - ID de la sala actualmente seleccionada
- `arcade_config` - Configuración global (modo oscuro, volumen, idioma)
- `arcade_modo_oscuro` - Estado de modo oscuro

## Esquema Propuesto para Futura Migración

Cuando se migre a una arquitectura fullstack con backend, se propone el siguiente esquema de base de datos utilizando **PostgreSQL** (producción) o **SQLite** (desarrollo).

### Tablas Principales

#### 1. Tabla `usuarios`
Almacena la información de usuarios registrados en el sistema.

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único del usuario
- `username`: Nombre de usuario único
- `email`: Correo electrónico único (opcional)
- `password_hash`: Hash de la contraseña (usando bcrypt)
- `creado_en`: Fecha de creación del usuario
- `actualizado_en`: Última actualización del perfil

#### 2. Tabla `salas`
Almacena la información de las salas de juego creadas por los usuarios.

```sql
CREATE TABLE salas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    creador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único de la sala
- `nombre`: Nombre personalizado de la sala
- `color`: Color hexadecimal de la sala
- `creador_id`: ID del usuario que creó la sala (puede ser NULL)
- `creada_en`: Fecha de creación de la sala
- `actualizada_en`: Última modificación de la sala

#### 3. Tabla `jugadores`
Almacena la información de jugadores asociados a salas (pueden ser usuarios registrados o jugadores anónimos).

```sql
CREATE TABLE jugadores (
    id SERIAL PRIMARY KEY,
    sala_id INTEGER REFERENCES salas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    puntaje_global INTEGER DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único del jugador
- `sala_id`: ID de la sala a la que pertenece
- `usuario_id`: ID del usuario registrado (NULL si es jugador anónimo)
- `nombre`: Nombre del jugador
- `color`: Color hexadecimal del jugador
- `puntaje_global`: Puntaje acumulado across todas las partidas
- `creado_en`: Fecha de creación del jugador en la sala

#### 4. Tabla `partidas`
Almacena la información de partidas jugadas en las salas.

```sql
CREATE TABLE partidas (
    id SERIAL PRIMARY KEY,
    sala_id INTEGER REFERENCES salas(id) ON DELETE CASCADE,
    juego_tipo VARCHAR(50) NOT NULL, -- 'basta', 'letrado', 'trivia', etc.
    estado VARCHAR(20) DEFAULT 'activa', -- 'activa', 'finalizada', 'pausada'
    configuracion JSONB, -- Configuración específica del juego
    iniciada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizada_en TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único de la partida
- `sala_id`: ID de la sala donde se jugó la partida
- `juego_tipo`: Tipo de juego ('basta', 'letrado', 'trivia', etc.)
- `estado`: Estado de la partida ('activa', 'finalizada', 'pausada')
- `configuracion`: Configuración específica en formato JSON
- `iniciada_en`: Fecha y hora de inicio
- `finalizada_en`: Fecha y hora de finalización (NULL si está activa)

#### 5. Tabla `puntajes_partida`
Almacena los puntajes de cada jugador en cada partida.

```sql
CREATE TABLE puntajes_partida (
    id SERIAL PRIMARY KEY,
    partida_id INTEGER REFERENCES partidas(id) ON DELETE CASCADE,
    jugador_id INTEGER REFERENCES jugadores(id),
    puntos INTEGER DEFAULT 0,
    detalles JSONB, -- Detalles específicos del juego (aciertos, errores, etc.)
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único del registro de puntaje
- `partida_id`: ID de la partida
- `jugador_id`: ID del jugador
- `puntos`: Puntos obtenidos en esa partida
- `detalles`: Detalles específicos en JSON (aciertos, errores, power-ups usados, etc.)
- `creado_en`: Fecha de registro del puntaje

#### 6. Tabla `categorias`
Almacena categorías personalizadas para los juegos.

```sql
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    juego_tipo VARCHAR(50) NOT NULL, -- 'basta', 'letrado', 'trivia'
    creador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único de la categoría
- `nombre`: Nombre de la categoría
- `juego_tipo`: Tipo de juego al que pertenece
- `creador_id`: ID del usuario que creó la categoría
- `activa`: Indica si la categoría está activa
- `creado_en`: Fecha de creación de la categoría

### Relaciones Entre Tablas

```
usuarios (1) ----< (N) salas
usuarios (1) ----< (N) jugadores (opcional)
salas (1) ----< (N) jugadores
salas (1) ----< (N) partidas
partidas (1) ----< (N) puntajes_partida
jugadores (1) ----< (N) puntajes_partida
usuarios (1) ----< (N) categorías (opcional)
```

### Índices Recomendados

```sql
-- Índices para mejor rendimiento
CREATE INDEX idx_salas_creador ON salas(creador_id);
CREATE INDEX idx_jugadores_sala ON jugadores(sala_id);
CREATE INDEX idx_jugadores_usuario ON jugadores(usuario_id);
CREATE INDEX idx_partidas_sala ON partidas(sala_id);
CREATE INDEX idx_partidas_estado ON partidas(estado);
CREATE INDEX idx_puntajes_partida ON puntajes_partida(partida_id);
CREATE INDEX idx_puntajes_jugador ON puntajes_partida(jugador_id);
CREATE INDEX idx_categorias_juego ON categorias(juego_tipo);
CREATE INDEX idx_categorias_activa ON categorias(activa);
```

### Estrategia de Migración desde LocalStorage

1. **Script de migración:** Crear script en `scripts/migrate_localstorage.py` que:
   - Lea datos de localStorage
   - Convierta al esquema de base de datos
   - Inserte en las tablas correspondientes

2. **Validación de datos:**
   - Verificar integridad de datos antes de migrar
   - Manejar casos de datos duplicados o corruptos
   - Crear backup de localStorage antes de migrar

3. **Período de transición:**
   - Mantener localStorage como fallback durante transición
   - Implementar sincronización bidireccional temporal
   - Validar que todos los datos se migraron correctamente

4. **Limpieza:**
   - Una vez validada la migración, eliminar dependencia de localStorage
   - Limpiar datos antiguos de localStorage

### Consideraciones de Diseño

1. **JSONB para configuraciones:** Usar JSONB para datos flexibles como configuración de juegos y detalles de puntajes
2. **Soft deletes:** Considerar agregar campos `eliminado_en` para soft deletes en lugar de eliminar registros
3. **Timestamps:** Incluir campos de auditoría (`creado_por`, `actualizado_por`) para rastrear cambios
4. **Constraints:** Agregar constraints adicionales según validaciones de negocio
5. **Triggers:** Considerar triggers para actualizar campos `actualizado_en` automáticamente

Este esquema está preparado para soportar las funcionalidades actuales y futuras del proyecto Juegos-Hub.