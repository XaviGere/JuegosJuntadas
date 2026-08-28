// --- ESTADOS Y VARIABLES GLOBALES ---
let salas = JSON.parse(localStorage.getItem('arcade_salas')) || [];
let idSalaActiva = localStorage.getItem('arcade_sala_activa') || null;

// Configuración Global
let configGlobal = JSON.parse(localStorage.getItem('arcade_config')) || {
    modoOscuro: false, volumen: 50, idioma: 'es'
};

// Variables para el Modal de Sala
let jugadoresTemporales = [];
let salaEnEdicionId = null; // Si es null, estamos creando. Si tiene ID, estamos editando.

const treintaColores = [
    "#FF3B30", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA", "#007AFF", "#5856D6", "#FF2D55", "#8E44AD", "#2C3E50", 
    "#1ABC9C", "#2ECC71", "#3498DB", "#9B59B6", "#34495E", "#16A085", "#27AE60", "#2980B9", "#F1C40F", "#E67E22", 
    "#E74C3C", "#F39C12", "#D35400", "#C0392B", "#000000", "#7F8C8D", "#BDC3C7", "#95A5A6", "#607D8B", "#795548"
];

const sidebarSala = document.getElementById('sidebarSala');
const contenedorSalas = document.getElementById('contenedorSalas');
const textoSalaActiva = document.getElementById('textoSalaActiva');

// --- CIERRE DE MODALES AL CLICKEAR FUERA DEL OVERLAY ---
// Clic en el fondo (.modal-overlay) cierra el modal sin aplicar cambios.
// Clic dentro de .modal-contenido no se propaga al overlay.
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            // Si es el modal de sala, limpiar estado de edición para no colgar datos
            if (overlay.id === 'modalSala') {
                salaEnEdicionId = null;
                jugadoresTemporales = [];
            }
        }
    });
});

// --- INICIALIZACIÓN ---
function aplicarConfiguracionInicial() {
    if (configGlobal.modoOscuro) document.body.classList.add('dark-mode');
    document.getElementById('toggleModoOscuro').checked = configGlobal.modoOscuro;
    document.getElementById('inputVolumen').value = configGlobal.volumen;
    document.getElementById('valorVolumen').innerText = `${configGlobal.volumen}%`;
    document.getElementById('selectIdioma').value = configGlobal.idioma;
    
    renderizarTodasLasSalas();
}
aplicarConfiguracionInicial();

function guardarDatos() {
    localStorage.setItem('arcade_salas', JSON.stringify(salas));
    if (idSalaActiva) localStorage.setItem('arcade_sala_activa', idSalaActiva);
    localStorage.setItem('arcade_config', JSON.stringify(configGlobal));
}

// --- INTERFAZ PRINCIPAL ---
document.getElementById('btnToggleSala').addEventListener('click', () => {
    sidebarSala.classList.toggle('oculta');
});

// --- SETTINGS GLOBALES ---
function abrirModalConfig() {
    document.getElementById('modalConfigGlobal').style.display = 'flex';
}
function cerrarModalConfig() {
    document.getElementById('modalConfigGlobal').style.display = 'none';
}
function alternarModoOscuro() {
    configGlobal.modoOscuro = document.getElementById('toggleModoOscuro').checked;
    document.body.classList.toggle('dark-mode', configGlobal.modoOscuro);
    guardarDatos();
}
function cambiarVolumen() {
    configGlobal.volumen = document.getElementById('inputVolumen').value;
    document.getElementById('valorVolumen').innerText = `${configGlobal.volumen}%`;
    guardarDatos();
}
function cambiarIdioma() {
    configGlobal.idioma = document.getElementById('selectIdioma').value;
    guardarDatos();
}

// --- GENERADOR DE PALETAS INTELIGENTE ---
function generarPaleta(contenedorId, inputOcultoId, colorPreseleccionado = null, coloresBloqueados = []) {
    const contenedor = document.getElementById(contenedorId);
    const input = document.getElementById(inputOcultoId);
    contenedor.innerHTML = '';
    
    // Si no hay color preseleccionado, buscamos uno que no esté bloqueado
    if (!colorPreseleccionado) {
        const coloresDisponibles = treintaColores.filter(c => !coloresBloqueados.includes(c));
        colorPreseleccionado = coloresDisponibles.length > 0 ? coloresDisponibles[Math.floor(Math.random() * coloresDisponibles.length)] : treintaColores[0];
    }
    
    input.value = colorPreseleccionado;

    treintaColores.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        
        const estaBloqueado = coloresBloqueados.includes(color);
        if (estaBloqueado) {
            swatch.classList.add('usado');
            swatch.title = "Color ya en uso";
        } else {
            if (color === colorPreseleccionado) swatch.classList.add('selected');

            swatch.onclick = () => {
                contenedor.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
                swatch.classList.add('selected');
                input.value = color;
            };
        }
        contenedor.appendChild(swatch);
    });
}

function actualizarPaletaJugadores() {
    const coloresUsados = jugadoresTemporales.map(j => j.color);
    // Recuperar el color actual para no perderlo al re-renderizar, a menos que se haya bloqueado
    let colorActual = document.getElementById('inputColorJugador').value;
    if (coloresUsados.includes(colorActual)) colorActual = null; 

    generarPaleta('paletaJugador', 'inputColorJugador', colorActual, coloresUsados);
}

// --- MODAL DE SALA (CREAR / EDITAR) ---
function abrirModalSala(idSalaParaEditar = null) {
    document.getElementById('modalSala').style.display = 'flex';
    const titulo = document.getElementById('tituloModalSala');
    const btnGuardar = document.getElementById('btnGuardarSala');
    const inputNombreSala = document.getElementById('inputNombreSala');
    const inputNombreJugador = document.getElementById('inputNombreJugador');

    salaEnEdicionId = idSalaParaEditar;

    if (idSalaParaEditar) {
        const salaObj = salas.find(s => s.idSala === idSalaParaEditar);
        titulo.innerText = "Editar Sala";
        btnGuardar.innerText = "Guardar Cambios";
        inputNombreSala.value = salaObj.nombre;
        
        // Copiamos los jugadores actuales para no mutar los originales hasta apretar Guardar
        jugadoresTemporales = JSON.parse(JSON.stringify(salaObj.jugadores));
        generarPaleta('paletaSala', 'inputColorSala', salaObj.color);
    } else {
        titulo.innerText = "Crear Nueva Sala";
        btnGuardar.innerText = "Crear Sala";
        inputNombreSala.value = '';
        jugadoresTemporales = [];
        generarPaleta('paletaSala', 'inputColorSala');
    }

    inputNombreJugador.value = '';
    renderizarJugadoresTemporales();
}

function cerrarModalSala() {
    document.getElementById('modalSala').style.display = 'none';
}

function manejarEnterJugador(evento) {
    if (evento.key === "Enter") agregarJugadorTemporal();
}

function agregarJugadorTemporal() {
    const nombre = document.getElementById('inputNombreJugador').value.trim();
    const color = document.getElementById('inputColorJugador').value;
    
    // Verificación extra por las dudas
    if (jugadoresTemporales.some(j => j.color === color)) {
        alert("Ese color ya está en uso en esta sala. Por favor, elegí otro.");
        return;
    }

    if (nombre) {
        jugadoresTemporales.push({ 
            id: Date.now() + Math.random(), // Generamos ID temporal, luego se respeta si se guarda
            nombre: nombre, 
            color: color,
            puntajeGlobal: 0 // Si es nuevo, arranca en 0
        });
        
        document.getElementById('inputNombreJugador').value = '';
        renderizarJugadoresTemporales();
        document.getElementById('inputNombreJugador').focus();
    }
}

function eliminarJugadorTemporal(index) {
    jugadoresTemporales.splice(index, 1);
    renderizarJugadoresTemporales();
}

function renderizarJugadoresTemporales() {
    const lista = document.getElementById('listaJugadoresTemp');
    lista.innerHTML = '';
    jugadoresTemporales.forEach((jugador, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><span style="color:${jugador.color}">●</span> ${jugador.nombre} ${jugador.puntajeGlobal > 0 ? `(${jugador.puntajeGlobal} pts)` : ''}</span>
            <button class="btn-eliminar-temp" onclick="eliminarJugadorTemporal(${index})">X</button>
        `;
        lista.appendChild(li);
    });
    // Se actualiza la paleta para bloquear los colores ya elegidos
    actualizarPaletaJugadores();
}

function guardarSala() {
    const nombreSala = document.getElementById('inputNombreSala').value.trim();
    const colorSala = document.getElementById('inputColorSala').value;
    
    if (jugadoresTemporales.length === 0) {
        alert("Agregá al menos un jugador para guardar la sala.");
        return;
    }

    const nombreFinal = nombreSala || `Sala ${salas.length + 1}`;

    if (salaEnEdicionId) {
        // Modo Edición
        const index = salas.findIndex(s => s.idSala === salaEnEdicionId);
        salas[index].nombre = nombreFinal;
        salas[index].color = colorSala;
        salas[index].jugadores = jugadoresTemporales; 
    } else {
        // Modo Creación
        const nuevaSala = {
            idSala: Date.now().toString(),
            nombre: nombreFinal,
            color: colorSala,
            minimizada: false,
            jugadores: jugadoresTemporales
        };
        salas.push(nuevaSala);
        if (!idSalaActiva) idSalaActiva = nuevaSala.idSala;
    }

    guardarDatos();
    cerrarModalSala();
    renderizarTodasLasSalas();
}

// --- LÓGICA DE RENDERIZADO Y ESTADOS ---
function marcarComoActiva(id) {
    idSalaActiva = id;
    guardarDatos();
    renderizarTodasLasSalas();
}

function toggleMinimizar(idSala) {
    const salaBuscada = salas.find(s => s.idSala === idSala);
    if (salaBuscada) {
        salaBuscada.minimizada = !salaBuscada.minimizada;
        guardarDatos();
        renderizarTodasLasSalas();
    }
}

function renderizarTodasLasSalas() {
    contenedorSalas.innerHTML = ''; 
    let salaActivaEncontrada = null;
    
    if (salas.length === 0) {
        contenedorSalas.innerHTML = '<p style="text-align:center; opacity:0.6; font-size:14px;">No hay salas activas.</p>';
        textoSalaActiva.innerText = "Ninguna sala seleccionada";
        textoSalaActiva.style.color = "var(--text-color)";
        return;
    }

    const salasOrdenadas = [...salas].sort((a, b) => {
        if (a.idSala === idSalaActiva) return -1;
        if (b.idSala === idSalaActiva) return 1;
        return 0;
    });

    salasOrdenadas.forEach(sala => {
        const esActiva = sala.idSala === idSalaActiva;
        if (esActiva) salaActivaEncontrada = sala;

        const colorBorde = esActiva ? sala.color : 'transparent';
        const sombraActiva = esActiva ? `0 4px 15px ${sala.color}60` : '0 2px 8px rgba(0,0,0,0.1)';
        const colorEstrella = esActiva ? sala.color : 'var(--text-color)';

        const bloqueSala = document.createElement('div');
        bloqueSala.className = `sala-bloque ${esActiva ? 'activa' : ''}`;
        bloqueSala.style.borderColor = colorBorde;
        bloqueSala.style.boxShadow = sombraActiva;
        
        let htmlContenido = `
            <div class="sala-header-superior">
                <h3>${sala.nombre}</h3>
                <div class="acciones-sala">
                    <button class="btn-mini-accion" onclick="abrirModalSala('${sala.idSala}')" title="Editar Sala">✏️</button>
                    <button class="btn-mini-accion btn-activar ${esActiva ? 'es-activa' : ''}" 
                            onclick="marcarComoActiva('${sala.idSala}')" 
                            style="color: ${colorEstrella};"
                            title="Marcar como sala activa">
                            ${esActiva ? '★' : '☆'}
                    </button>
                    <button class="btn-mini-accion" onclick="toggleMinimizar('${sala.idSala}')">
                        ${sala.minimizada ? '➕' : '➖'}
                    </button>
                </div>
            </div>
            <div class="lista-jugadores ${sala.minimizada ? 'minimizada' : ''}">
        `;
        
        const jugadoresOrdenados = [...sala.jugadores].sort((a, b) => b.puntajeGlobal - a.puntajeGlobal);

        jugadoresOrdenados.forEach((jugador, index) => {
            // Lógica para iluminar al primer puesto (solo si tiene más de 0 puntos para que tenga sentido)
            const esPrimero = (index === 0 && jugador.puntajeGlobal > 0);
            const estiloPrimero = esPrimero ? `border: 2px solid ${sala.color}; background-color: ${sala.color}15; box-shadow: 0 0 10px ${sala.color}40;` : '';
            const clasePrimero = esPrimero ? 'primero' : '';

            htmlContenido += `
                <div class="jugador-card ${clasePrimero}" style="${estiloPrimero}">
                    <div class="jugador-info">
                        <span class="puesto-ranking">#${index + 1}</span>
                        <div class="color-dot" style="background-color: ${jugador.color};"></div>
                        <span>${jugador.nombre}</span>
                    </div>
                    <div class="jugador-score" style="color: ${esPrimero ? sala.color : 'var(--primary-color)'}">${jugador.puntajeGlobal} pts</div>
                </div>
            `;
        });
        
        htmlContenido += `</div>`;
        bloqueSala.innerHTML = htmlContenido;
        contenedorSalas.appendChild(bloqueSala);
    });

    if (salaActivaEncontrada) {
        textoSalaActiva.innerText = `Jugando ahora: ${salaActivaEncontrada.nombre}`;
        textoSalaActiva.style.color = salaActivaEncontrada.color;
    }
}