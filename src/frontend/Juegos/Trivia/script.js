// --- CIERRE DE MODALES AL CLICKEAR FUERA DEL OVERLAY ---
// Clic en el fondo (.modal-overlay) cierra el modal sin aplicar cambios.
// En #modalResultado, cerrar por overlay equivale a pulsar "Continuar" (ejecuta callback).
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
                // Si es el modal de resultado, disparar el botón Continuar
                if (overlay.id === 'modalResultado') {
                    const btn = document.getElementById('btnContinuarResultado');
                    if (btn) btn.click();
                }
            }
        });
    });
});

// --- SISTEMA DE REGLAS ---
function mostrarReglas(juego, reglasHTML) {
    const modal = document.getElementById('modalReglas');
    const titulo = document.getElementById('tituloReglas');
    const contenido = document.getElementById('contenidoReglas');
    const checkNoMostrar = document.getElementById('checkNoMostrarReglas');
    
    // Verificar si usuario eligió no mostrar
    const claveNoMostrar = `no_mostrar_reglas_${juego}`;
    if (localStorage.getItem(claveNoMostrar) === 'true') {
        return; // No mostrar
    }
    
    titulo.innerText = `📜 Reglas - ${juego}`;
    contenido.innerHTML = reglasHTML;
    checkNoMostrar.checked = false;
    
    modal.style.display = 'flex';
    
    // Guardar preferencia
    checkNoMostrar.onchange = () => {
        localStorage.setItem(claveNoMostrar, checkNoMostrar.checked);
    };
}

function cerrarReglas() {
    document.getElementById('modalReglas').style.display = 'none';
}

const reglasTrivia = `
    <h3>🎯 Objetivo</h3>
    <p>Responder correctamente preguntas de cultura general para acumular puntos.</p>

    <h3>⏱️ Mecánicas</h3>
    <ul>
        <li>Tenés <strong>30 segundos</strong> por pregunta.</li>
        <li>Las preguntas se seleccionan por temática aleatoria.</li>
        <li>El equipo dice su respuesta y luego se revela la correcta.</li>
        <li>El moderador marca si la respuesta fue correcta o incorrecta.</li>
    </ul>

    <h3>🎚️ Sistema de Dificultad</h3>
    <ul>
        <li><strong>Fácil:</strong> 100 puntos (preguntas básicas)</li>
        <li><strong>Medio:</strong> 150 puntos (preguntas intermedias)</li>
        <li><strong>Difícil:</strong> 200 puntos (preguntas complejas)</li>
    </ul>

    <h3>⚙️ Modo Dificultad Incremental</h3>
    <ul>
        <li>Si se activa, la dificultad aumenta cada 3 preguntas.</li>
    </ul>

    <h3>🏆 Puntuación</h3>
    <ul>
        <li>Respuesta correcta: Puntos según dificultad</li>
        <li>Respuesta incorrecta: Sin puntos</li>
    </ul>
`;

// --- ESTADO GLOBAL Y CONEXIÓN CON EL HUB ---
let salasHub = JSON.parse(localStorage.getItem('arcade_salas')) || [];
let idSalaActiva = localStorage.getItem('arcade_sala_activa');
let salaActiva = salasHub.find(s => s.idSala === idSalaActiva);

if (!salaActiva || salaActiva.jugadores.length === 0) {
    window.location.href = '../../index.html'; // Si no hay sala, te patea al hub.
}

document.getElementById('tituloSalaJuego').innerText = `Mente Maestra - ${salaActiva.nombre}`;

if (localStorage.getItem('arcade_modo_oscuro') === 'true') {
    document.body.classList.add('dark-mode');
}

// --- ESTADOS DE JUEGO ---
let configJuego = {
    rondas: 3,
    dificultadInicial: "facil", // fácil, medio, difícil
    modoDificultadIncremental: false,
    categoriasActivas: ["Cultura General", "Ciencia", "Historia", "Geografía", "Deportes", "Arte", "Música", "Literatura", "Cine", "Tecnología"],
    dificultadesActivas: ["facil", "medio", "dificil"] // Filtro de dificultades
};
const todasLasTematicasPosibles = [...configJuego.categoriasActivas];

// --- BASE DE DATOS DE PREGUNTAS ---
let dbPreguntas = [];

// Cargar preguntas: prioriza variable global (script tag), fallback a fetch
async function cargarPreguntas() {
    // 1. Intentar usar la variable global cargada via <script src="preguntas.js">
    if (window.PREGUNTAS_TRIVIA && Array.isArray(window.PREGUNTAS_TRIVIA) && window.PREGUNTAS_TRIVIA.length > 0) {
        dbPreguntas = window.PREGUNTAS_TRIVIA;
        console.log('Preguntas cargadas (script tag):', dbPreguntas.length);
        inicializarJuego();
        return;
    }

    // 2. Fallback a fetch (sirve si se usa un servidor http)
    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error('Error cargando archivo');
        dbPreguntas = await response.json();
        console.log('Preguntas cargadas (fetch):', dbPreguntas.length);
        inicializarJuego();
    } catch (error) {
        console.error('Error cargando preguntas:', error);
        // Fallback mínimo si todo falla
        dbPreguntas = [
            { tematica: "Cultura General", pregunta: "¿Cuál es la capital de Francia?", respuesta: "París", dificultad: "facil", puntos: 100 },
            { tematica: "Ciencia", pregunta: "¿Cuál es el símbolo químico del agua?", respuesta: "H2O", dificultad: "facil", puntos: 100 },
            { tematica: "Historia", pregunta: "¿En qué año llegó el hombre a la Luna?", respuesta: "1969", dificultad: "medio", puntos: 150 }
        ];
        inicializarJuego();
    }
}

// Inicializar el juego después de cargar preguntas
function inicializarJuego() {
    preguntasDisponibles = [...dbPreguntas];
    console.log('Juego inicializado con', preguntasDisponibles.length, 'preguntas disponibles');
}

// Mostrar reglas al cargar
document.addEventListener('DOMContentLoaded', () => {
    mostrarReglas('Trivia', reglasTrivia);
});

// Cargar preguntas al inicio
cargarPreguntas();

let equipos = [];
let preguntasDisponibles = []; // Se inicializa después de cargar preguntas
let preguntasUsadasEnPartida = []; // Track de preguntas usadas en esta partida
let rondaActual = 1;
let turnoEquipoIndex = 0;
let tematicaRonda = "";
let dificultadActual = "facil"; // Dificultad actual en juego
let numeroPreguntaGlobal = 0; // Contador global de preguntas

let enJuego = false;
let juegoPausado = false;
let esperandoValidacion = false;
let timerTrivia = null;
let tiempoRestante = 30;
let preguntaActualObj = null;
let asignacionesTemporales = {}; // Para el setup cíclico

// --- UTILIDADES ---
function mezclarArray(array) {
    let arrayCopia = [...array];
    for (let i = arrayCopia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayCopia[i], arrayCopia[j]] = [arrayCopia[j], arrayCopia[i]];
    }
    return arrayCopia;
}

function obtenerPreguntaPorDificultad(dificultadDeseada) {
    let preguntasFiltradas = preguntasDisponibles.filter(p => 
        p.dificultad === dificultadDeseada &&
        configJuego.dificultadesActivas.includes(p.dificultad)
    );
    
    if (preguntasFiltradas.length === 0) {
        // Fallback a otras dificultades si no hay de la deseada
        preguntasFiltradas = preguntasDisponibles.filter(p => 
            configJuego.dificultadesActivas.includes(p.dificultad)
        );
    }
    
    if (preguntasFiltradas.length === 0) {
        // Último fallback: cualquier pregunta disponible
        preguntasFiltradas = preguntasDisponibles;
    }
    
    return preguntasFiltradas[Math.floor(Math.random() * preguntasFiltradas.length)];
}

function calcularDificultadActual(numeroPregunta) {
    if (!configJuego.modoDificultadIncremental) {
        return configJuego.dificultadInicial;
    }
    
    const preguntasPorNivel = 3; // Cada 3 preguntas aumenta dificultad
    const nivel = Math.floor(numeroPregunta / preguntasPorNivel);
    const dificultades = ["facil", "medio", "dificil"];
    const indiceInicial = dificultades.indexOf(configJuego.dificultadInicial);
    
    const nuevoIndice = Math.min(indiceInicial + nivel, dificultades.length - 1);
    return dificultades[nuevoIndice];
}

function obtenerPreguntaConDificultad(numeroPregunta) {
    dificultadActual = calcularDificultadActual(numeroPregunta);
    
    // Filtrar por dificultad y por preguntas ya usadas
    let preguntasFiltradas = preguntasDisponibles.filter(p => 
        p.dificultad === dificultadActual &&
        configJuego.dificultadesActivas.includes(p.dificultad) &&
        !preguntasUsadasEnPartida.includes(p.pregunta)
    );
    
    if (preguntasFiltradas.length === 0) {
        // Fallback: permitir repeticiones si no hay preguntas sin repetir
        preguntasFiltradas = preguntasDisponibles.filter(p => 
            p.dificultad === dificultadActual &&
            configJuego.dificultadesActivas.includes(p.dificultad)
        );
        
        if (preguntasFiltradas.length > 0) {
            mostrarToast("¡Se reiniciaron las preguntas disponibles!", 2000);
        }
    }
    
    if (preguntasFiltradas.length === 0) {
        // Último fallback: cualquier pregunta disponible
        preguntasFiltradas = preguntasDisponibles.filter(p => 
            !preguntasUsadasEnPartida.includes(p.pregunta)
        );
    }
    
    if (preguntasFiltradas.length === 0) {
        // Último caso absoluto: cualquier pregunta
        preguntasFiltradas = preguntasDisponibles;
    }
    
    const pregunta = preguntasFiltradas[Math.floor(Math.random() * preguntasFiltradas.length)];
    
    // Marcar como usada
    preguntasUsadasEnPartida.push(pregunta.pregunta);
    
    return pregunta;
}

function mostrarToast(mensaje, duracion = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = mensaje;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('mostrar'), 10);
    setTimeout(() => { toast.classList.remove('mostrar'); setTimeout(() => toast.remove(), 300); }, duracion);
}

let accionConfirmacionPendiente = null;
function mostrarConfirmacion(mensaje, callback) {
    document.getElementById('confirmMensaje').innerText = mensaje;
    accionConfirmacionPendiente = callback;
    document.getElementById('modalConfirm').style.display = 'flex';
}
function cerrarConfirmacion() {
    document.getElementById('modalConfirm').style.display = 'none';
    accionConfirmacionPendiente = null;
}
document.getElementById('btnConfirmarAccion').addEventListener('click', () => {
    if (accionConfirmacionPendiente) accionConfirmacionPendiente();
    cerrarConfirmacion();
});

function mostrarResultado(icono, titulo, mensaje, callback) {
    document.getElementById('iconoResultado').innerText = icono;
    document.getElementById('tituloResultado').innerText = titulo;
    document.getElementById('mensajeResultado').innerText = mensaje;
    document.getElementById('modalResultado').style.display = 'flex';
    document.getElementById('btnContinuarResultado').onclick = () => {
        document.getElementById('modalResultado').style.display = 'none';
        if(callback) callback();
    };
}

// --- FASE 1: SETUP ---
function limpiarPreviaAlCambiar() {
    document.getElementById('contenedorAsignacion').innerHTML = '';
    document.getElementById('vistaPreviaEquipos').innerHTML = '';
    document.getElementById('btnIrTablero').style.display = 'none';
    equipos = [];
}

function inicializarEstructuraEquipos(numEquipos) {
    equipos = [];
    const coloresEquipos = ['var(--equipo-1)', 'var(--equipo-2)', 'var(--equipo-3)', 'var(--equipo-4)'];
    for (let i = 0; i < numEquipos; i++) {
        equipos.push({
            id: i + 1,
            nombre: `Equipo ${i + 1}`,
            color: coloresEquipos[i],
            jugadores: [],
            puntos: 0
        });
    }
}

function generarEquiposAleatorios() {
    let numEquipos = parseInt(document.getElementById('inputNumEquipos').value);
    if (numEquipos > salaActiva.jugadores.length) {
        mostrarToast("No podés configurar más equipos que jugadores disponibles.");
        return;
    }

    document.getElementById('contenedorAsignacion').innerHTML = '';
    const jugadoresMezclados = mezclarArray(salaActiva.jugadores);
    inicializarEstructuraEquipos(numEquipos);

    jugadoresMezclados.forEach((jugador, index) => {
        equipos[index % numEquipos].jugadores.push(jugador);
    });

    renderizarVistaPreviaEquipos();
    document.getElementById('btnIrTablero').style.display = 'block'; 
}

function prepararAsignacionManual() {
    let numEquipos = parseInt(document.getElementById('inputNumEquipos').value);
    if (numEquipos > salaActiva.jugadores.length) {
        mostrarToast("No podés configurar más equipos que jugadores disponibles.");
        return;
    }

    document.getElementById('vistaPreviaEquipos').innerHTML = '';
    document.getElementById('btnIrTablero').style.display = 'none';
    inicializarEstructuraEquipos(numEquipos);
    
    asignacionesTemporales = {};
    salaActiva.jugadores.forEach(j => { asignacionesTemporales[j.id] = 1; });

    const contenedor = document.getElementById('contenedorAsignacion');
    contenedor.innerHTML = `
        <div class="bloque-manual">
            <h4 style="margin-top:0; margin-bottom:15px; color:#7f8c8d;">Tocá a un jugador para cambiarlo de equipo:</h4>
            <div id="listaManualJugadores"></div>
            <button class="btn-guardar" style="width: 100%; margin-top: 15px; padding: 15px; font-size: 16px;" onclick="confirmarAsignacionManual()">
                ✔ Confirmar Equipos
            </button>
        </div>
    `;
    renderizarListaAsignacionManual();
}

function renderizarListaAsignacionManual() {
    const listaDOM = document.getElementById('listaManualJugadores');
    listaDOM.innerHTML = '';
    let numEquipos = parseInt(document.getElementById('inputNumEquipos').value);

    salaActiva.jugadores.forEach(jugador => {
        const eqId = asignacionesTemporales[jugador.id];
        const equipo = equipos.find(e => e.id === eqId);

        const div = document.createElement('div');
        div.className = 'item-jugador-manual';
        div.style.borderColor = equipo.color; 
        
        div.onclick = () => {
            let actual = asignacionesTemporales[jugador.id];
            actual++;
            if (actual > numEquipos) actual = 1;
            asignacionesTemporales[jugador.id] = actual;
            renderizarListaAsignacionManual();
        };

        div.innerHTML = `
            <span><span class="color-dot" style="background-color:${jugador.color}"></span> <b>${jugador.nombre}</b></span>
            <span class="badge-equipo-asignado" style="background-color:${equipo.color};">${equipo.nombre}</span>
        `;
        listaDOM.appendChild(div);
    });
}

function confirmarAsignacionManual() {
    equipos.forEach(eq => eq.jugadores = []); 
    
    salaActiva.jugadores.forEach(jugador => {
        const eqId = asignacionesTemporales[jugador.id];
        const equipoObj = equipos.find(e => e.id === eqId);
        if (equipoObj) equipoObj.jugadores.push(jugador);
    });

    if (equipos.some(e => e.jugadores.length === 0)) {
        mostrarToast("Hay equipos vacíos. Asegurate de que haya al menos un jugador por equipo.");
        return;
    }

    renderizarVistaPreviaEquipos();
    document.getElementById('btnIrTablero').style.display = 'block';
    mostrarToast("Equipos confirmados.", 1500);
}

function renderizarVistaPreviaEquipos() {
    const grid = document.getElementById('vistaPreviaEquipos');
    grid.innerHTML = '';
    equipos.forEach(eq => {
        const div = document.createElement('div');
        div.className = 'tarjeta-equipo';
        div.style.borderColor = eq.color;
        
        let htmlJugadores = eq.jugadores.map(j => 
            `<li><span class="color-dot" style="background-color:${j.color}"></span> ${j.nombre}</li>`
        ).join('');

        div.innerHTML = `
            <h3 style="color:${eq.color}">${eq.nombre}</h3>
            <ul class="lista-jugadores-setup">${htmlJugadores}</ul>
        `;
        grid.appendChild(div);
    });
}

// --- FASE 2: MOTOR DE JUEGO ---
function irAlTablero() {
    document.getElementById('pantallaSetup').style.display = 'none';
    document.getElementById('pantallaJuego').style.display = 'flex';
    document.getElementById('rondaDisplay').style.display = 'block';
    
    renderizarPanelEquipos();
    
    document.getElementById('estadoInicialTrivia').style.display = 'flex';
    document.getElementById('estadoActivoTrivia').style.display = 'none';
}

function iniciarTrivia() {
    document.getElementById('estadoInicialTrivia').style.display = 'none';
    document.getElementById('estadoActivoTrivia').style.display = 'block';
    
    document.getElementById('zonaValidacion').style.display = 'none';
    document.getElementById('controlesValidacion').style.display = 'none';
    document.getElementById('ayudaClick').style.display = 'block';

    rondaActual = 1;
    turnoEquipoIndex = 0;
    prepararRonda();
}

function renderizarPanelEquipos() {
    const panel = document.getElementById('panelEquiposDOM');
    panel.innerHTML = '<h2>Puntajes</h2>';
    
    equipos.forEach((eq, idx) => {
        const div = document.createElement('div');
        div.className = `equipo-status ${idx === turnoEquipoIndex && enJuego ? 'activo' : ''}`;
        div.style.borderColor = eq.color;
        
        let htmlIntegrantes = eq.jugadores.map(j => 
            `<span class="tag-integrante" style="background-color:${j.color}">${j.nombre}</span>`
        ).join(' ');

        div.innerHTML = `
            <h4 style="color:${eq.color}">${eq.nombre}</h4>
            <div class="contenedor-tags-integrantes">${htmlIntegrantes}</div>
            <div class="equipo-pts">${eq.puntos} pts</div>
        `;
        panel.appendChild(div);
    });
}

function prepararRonda() {
    if (rondaActual > configJuego.rondas) {
        finalizarPartida();
        return;
    }

    document.getElementById('rondaDisplay').innerText = `Ronda ${rondaActual} / ${configJuego.rondas}`;
    turnoEquipoIndex = 0;

    const tematicasDisponibles = configJuego.categoriasActivas.filter(t => 
        preguntasDisponibles.some(p => p.tematica === t)
    );

    tematicaRonda = "";
    const tematicasMezcladas = mezclarArray(tematicasDisponibles);
    
    for (let t of tematicasMezcladas) {
        if (preguntasDisponibles.filter(p => p.tematica === t).length >= equipos.length) {
            tematicaRonda = t;
            break;
        }
    }
    if (!tematicaRonda && tematicasMezcladas.length > 0) tematicaRonda = tematicasMezcladas[0];

    document.getElementById('textoCategoriaLateral').innerText = tematicaRonda || "Mixta";
    iniciarTurno();
}

function iniciarTurno() {
    enJuego = true;
    juegoPausado = false;
    esperandoValidacion = false;
    
    // Verificar que hay preguntas disponibles
    if (preguntasDisponibles.length === 0) {
        console.error('No hay preguntas disponibles');
        mostrarToast('Error: No hay preguntas disponibles. Recargando...', 3000);
        // Intentar recargar
        preguntasDisponibles = [...dbPreguntas];
        if (preguntasDisponibles.length === 0) {
            mostrarToast('Error crítico: No se pueden cargar las preguntas.', 5000);
            return;
        }
    }
    
    const btnPausa = document.getElementById('btnPausa');
    btnPausa.querySelector('div').innerText = "Pausar Juego";
    btnPausa.classList.remove('pausado');
    
    renderizarPanelEquipos();

    const equipoActual = equipos[turnoEquipoIndex];
    document.getElementById('nombreEquipoTurno').innerText = equipoActual.nombre;
    document.getElementById('nombreEquipoTurno').style.color = equipoActual.color;

    // Usar el nuevo sistema de dificultades
    preguntaActualObj = obtenerPreguntaConDificultad(numeroPreguntaGlobal);
    numeroPreguntaGlobal++;
    
    if (!preguntaActualObj) {
        mostrarToast("No quedan más preguntas. Fin del juego.");
        finalizarPartida();
        return;
    }
    
    // Eliminar del pool general
    const dbIndex = preguntasDisponibles.findIndex(p => p.pregunta === preguntaActualObj.pregunta);
    if (dbIndex !== -1) {
        preguntasDisponibles.splice(dbIndex, 1);
    }

    document.getElementById('etiquetaTematica').innerText = `${preguntaActualObj.tematica} - ${preguntaActualObj.dificultad.toUpperCase()}`;
    document.getElementById('textoPregunta').innerText = preguntaActualObj.pregunta;
    
    document.getElementById('zonaValidacion').style.display = 'none';
    document.getElementById('controlesValidacion').style.display = 'none'; 
    document.getElementById('ayudaClick').style.display = 'block';
    
    tiempoRestante = 30;
    const relojDOM = document.getElementById('relojTrivia');
    relojDOM.innerText = tiempoRestante;
    relojDOM.style.borderColor = equipoActual.color;
    relojDOM.style.color = "var(--text-color)";

    activarIntervaloReloj();
}

function activarIntervaloReloj() {
    clearInterval(timerTrivia);
    timerTrivia = setInterval(() => {
        if (!juegoPausado && enJuego) {
            tiempoRestante--;
            const relojDOM = document.getElementById('relojTrivia');
            relojDOM.innerText = tiempoRestante;
            
            if (tiempoRestante <= 10) relojDOM.style.color = "var(--danger-color)";
            
            if (tiempoRestante <= 0) {
                clearInterval(timerTrivia);
                revelarRespuesta();
            }
        }
    }, 1000);
}

function forzarRespuesta() {
    if (!enJuego || esperandoValidacion || juegoPausado) return;
    clearInterval(timerTrivia);
    revelarRespuesta();
}

function revelarRespuesta() {
    esperandoValidacion = true;
    document.getElementById('ayudaClick').style.display = 'none';
    document.getElementById('zonaValidacion').style.display = 'block';
    document.getElementById('controlesValidacion').style.display = 'flex';
    document.getElementById('textoRespuestaCorrecta').innerText = preguntaActualObj.respuesta;
}

function calificarRespuesta(esCorrecta) {
    if (!esperandoValidacion) return;
    esperandoValidacion = false; 

    document.getElementById('controlesValidacion').style.display = 'none';

    if (esCorrecta) {
        equipos[turnoEquipoIndex].puntos += preguntaActualObj.puntos;
        mostrarToast(`¡Correcto! +${preguntaActualObj.puntos} pts para el ${equipos[turnoEquipoIndex].nombre}`, 1800);
    } else {
        mostrarToast(`Incorrecto. Sin puntos.`, 1800);
    }
    pasarSiguienteTurno();
    renderizarPanelEquipos();
}

function pasarSiguienteTurno() {
    turnoEquipoIndex++;
    if (turnoEquipoIndex >= equipos.length) {
        rondaActual++;
        setTimeout(prepararRonda, 1500);
    } else {
        setTimeout(iniciarTurno, 1500);
    }
}

// --- CONFIGURACIÓN ---
function toggleDificultadIncremental() {
    const isChecked = document.getElementById('checkDificultadIncremental').checked;
    const divDificultadInicial = document.getElementById('divDificultadInicial');
    if (divDificultadInicial) divDificultadInicial.style.display = isChecked ? 'block' : 'none';
}

function abrirConfigJuego() {
    // Pausar el juego si está activo
    let estabaPausado = juegoPausado;

    if (enJuego && !juegoPausado && !esperandoValidacion) {
        alternarPausa();
    }

    // Inicializar config temporal de temáticas
    configTemporal.categorias = [...configJuego.categoriasActivas];

    document.getElementById('modalConfigJuego').style.display = 'flex';
    document.getElementById('inputRondas').value = configJuego.rondas;
    document.getElementById('selectDificultadInicial').value = configJuego.dificultadInicial;
    document.getElementById('checkDificultadIncremental').checked = configJuego.modoDificultadIncremental;
    document.getElementById('checkFacil').checked = configJuego.dificultadesActivas.includes('facil');
    document.getElementById('checkMedio').checked = configJuego.dificultadesActivas.includes('medio');
    document.getElementById('checkDificil').checked = configJuego.dificultadesActivas.includes('dificil');
    toggleDificultadIncremental();
    renderizarTematicasConfig();

    // Guardar estado de pausa para reanudar al cerrar
    document.getElementById('modalConfigJuego').dataset.estabaPausado = estabaPausado;
}

function guardarConfigJuego() {
    configJuego.rondas = parseInt(document.getElementById('inputRondas').value) || 3;
    configJuego.dificultadInicial = document.getElementById('selectDificultadInicial').value;
    configJuego.modoDificultadIncremental = document.getElementById('checkDificultadIncremental').checked;
    configJuego.dificultadesActivas = [];

    if (document.getElementById('checkFacil').checked) configJuego.dificultadesActivas.push('facil');
    if (document.getElementById('checkMedio').checked) configJuego.dificultadesActivas.push('medio');
    if (document.getElementById('checkDificil').checked) configJuego.dificultadesActivas.push('dificil');

    configJuego.categoriasActivas = [...configTemporal.categorias];

    // Reanudar el juego si estaba activo
    const modal = document.getElementById('modalConfigJuego');
    const estabaPausado = modal.dataset.estabaPausado === 'true';
    modal.style.display = 'none';

    if (enJuego && !estabaPausado && !esperandoValidacion) {
        alternarPausa();
    }

    document.getElementById('rondaDisplay').innerText = `Ronda ${rondaActual} / ${configJuego.rondas}`;
    mostrarToast('Configuración guardada.', 2000);
}

function cerrarConfigJuego() {
    const modal = document.getElementById('modalConfigJuego');
    const estabaPausado = modal.dataset.estabaPausado === 'true';
    
    modal.style.display = 'none';
    
    // Reanudar el juego si estaba activo y no estaba pausado manualmente
    if (enJuego && !estabaPausado && !esperandoValidacion) {
        alternarPausa();
    }
}

// --- CONTROLES Y REINICIOS ---
function alternarPausa() {
    if (!enJuego || esperandoValidacion) return;
    juegoPausado = !juegoPausado;
    const btnPausa = document.getElementById('btnPausa');
    btnPausa.classList.toggle('pausado', juegoPausado);
    btnPausa.querySelector('div').innerText = juegoPausado ? "Reanudar" : "Pausar Juego";
    mostrarToast(juegoPausado ? "Juego en pausa" : "Juego reanudado");
}

function reiniciarRondaManual() {
    if(!enJuego && document.getElementById('estadoInicialTrivia').style.display === 'flex') {
        mostrarToast("Aún no comenzaste el juego.");
        return;
    }
    
    mostrarConfirmacion("¿Querés reiniciar la ronda actual? Las preguntas usadas volverán al pozo.", () => {
        clearInterval(timerTrivia);
        if (preguntaActualObj && enJuego) {
            preguntasDisponibles.push(preguntaActualObj);
        }
        
        document.getElementById('zonaValidacion').style.display = 'none';
        document.getElementById('controlesValidacion').style.display = 'none';
        document.getElementById('ayudaClick').style.display = 'block';
        
        prepararRonda();
        mostrarToast("Ronda restablecida.");
    });
}

function pedirReinicioCompleto() {
    mostrarConfirmacion("ATENCIÓN: Esto borrará los puntos de los equipos y volverá a la Ronda 1. ¿Seguro?", () => {
        clearInterval(timerTrivia);
        rondaActual = 1;
        
        equipos.forEach(eq => eq.puntos = 0);
        preguntasDisponibles = [...dbPreguntas]; 
        
        document.getElementById('modalConfigJuego').style.display = 'none';
        document.getElementById('zonaValidacion').style.display = 'none';
        document.getElementById('controlesValidacion').style.display = 'none';
        document.getElementById('ayudaClick').style.display = 'block';
        
        // Si estábamos en el estado inicial, forzamos iniciar
        document.getElementById('estadoInicialTrivia').style.display = 'none';
        document.getElementById('estadoActivoTrivia').style.display = 'block';
        
        prepararRonda();
        mostrarToast("Partida reiniciada desde cero.");
    });
}

// --- MODAL CONFIGURACIÓN: temáticas ---
let configTemporal = { categorias: [] };

function renderizarTematicasConfig() {
    const grid = document.getElementById('gridTematicasConfig');
    grid.innerHTML = '';
    todasLasTematicasPosibles.forEach(tematica => {
        const div = document.createElement('div');
        div.className = 'letra-opcion';
        if (configTemporal.categorias.includes(tematica)) div.classList.add('activa');
        div.innerText = tematica;
        div.onclick = () => {
            if (configTemporal.categorias.includes(tematica)) {
                configTemporal.categorias = configTemporal.categorias.filter(t => t !== tematica);
                div.classList.remove('activa');
            } else {
                configTemporal.categorias.push(tematica);
                div.classList.add('activa');
            }
        };
        grid.appendChild(div);
    });
}

function finalizarPartida() {
    enJuego = false;
    clearInterval(timerTrivia);

    const indexSala = salasHub.findIndex(s => s.idSala === idSalaActiva);
    if (indexSala !== -1) {
        equipos.forEach(eq => {
            if (eq.jugadores.length > 0) {
                const puntosPorJugador = Math.floor(eq.puntos / eq.jugadores.length);
                eq.jugadores.forEach(jugadorEquipo => {
                    const jugadorHub = salasHub[indexSala].jugadores.find(j => j.id === jugadorEquipo.id);
                    if (jugadorHub) jugadorHub.puntajeGlobal += puntosPorJugador;
                });
            }
        });
        localStorage.setItem('arcade_salas', JSON.stringify(salasHub));
    }

    mostrarResultado("📊", "¡Trivia Terminada!", "Los puntos se dividieron equitativamente y se sumaron al global.", () => {
        window.location.href = '../../index.html';
    });
}