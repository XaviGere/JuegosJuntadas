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

// --- BASE DE DATOS DE PREGUNTAS ---
const dbPreguntas = [
    { tematica: "Videojuegos", pregunta: "En Stardew Valley, ¿cómo se llama el desarrollador y creador único del juego?", respuesta: "ConcernedApe (o Eric Barone)" },
    { tematica: "Videojuegos", pregunta: "En League of Legends, ¿cuántos carriles principales (lanes) tiene el mapa clásico de la Grieta del Invocador?", respuesta: "Tres (Top, Mid, Bot)" },
    { tematica: "Ciencia y Tecnología", pregunta: "¿Qué significa la sigla 'CNN' en el contexto del Machine Learning y la visión por computadora?", respuesta: "Red Neuronal Convolucional" },
    { tematica: "Ciencia y Tecnología", pregunta: "¿Qué plataforma de datos basada en la nube utiliza un copo de nieve como logotipo?", respuesta: "Snowflake" },
    { tematica: "Gastronomía", pregunta: "¿Qué microorganismos son los principales responsables de la fermentación del vino?", respuesta: "Las levaduras (Saccharomyces cerevisiae)" },
    { tematica: "Gastronomía", pregunta: "¿Qué corte de cerdo se utiliza tradicionalmente en Argentina para curar y hacer bondiola?", respuesta: "El cuello o aguja de cerdo" },
    { tematica: "Inversiones y Finanzas", pregunta: "¿Qué histórica empresa argentina, clave en el sector energético, cotiza bajo las siglas YPF?", respuesta: "Yacimientos Petrolíferos Fiscales" },
    { tematica: "Inversiones y Finanzas", pregunta: "¿Qué empresa argentina es la principal productora de cemento del país y cotiza en bolsa?", respuesta: "Loma Negra" },
    { tematica: "Cultura General", pregunta: "¿Cuál es la capital de la provincia de Santa Fe?", respuesta: "Santa Fe (Ciudad)" },
    { tematica: "Cultura General", pregunta: "¿Cómo se llama la parte metálica de la hoja de un cuchillo que se inserta dentro del mango?", respuesta: "Espiga (o nervio)" },
    { tematica: "Espacio", pregunta: "¿Qué programa de satélites de observación de la Tierra es gestionado por la NASA y el USGS?", respuesta: "Landsat" },
    { tematica: "Espacio", pregunta: "¿Cuál es el planeta más grande de nuestro sistema solar?", respuesta: "Júpiter" }
];

// --- ESTADOS DE JUEGO ---
let configJuego = {
    rondas: 3,
    modoRobo: false,
    categoriasActivas: ["Videojuegos", "Ciencia y Tecnología", "Gastronomía", "Inversiones y Finanzas", "Cultura General", "Espacio"]
};
const todasLasTematicasPosibles = [...configJuego.categoriasActivas];

let equipos = []; 
let preguntasDisponibles = [...dbPreguntas];
let rondaActual = 1;
let turnoEquipoIndex = 0;
let tematicaRonda = "";

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
    
    const btnPausa = document.getElementById('btnPausa');
    btnPausa.querySelector('div').innerText = "Pausar Juego";
    btnPausa.classList.remove('pausado');
    
    renderizarPanelEquipos();

    const equipoActual = equipos[turnoEquipoIndex];
    document.getElementById('nombreEquipoTurno').innerText = equipoActual.nombre;
    document.getElementById('nombreEquipoTurno').style.color = equipoActual.color;

    let posiblesPreguntas = tematicaRonda ? 
        preguntasDisponibles.filter(p => p.tematica === tematicaRonda) : 
        preguntasDisponibles.filter(p => configJuego.categoriasActivas.includes(p.tematica));

    if (posiblesPreguntas.length === 0) posiblesPreguntas = preguntasDisponibles;

    if (posiblesPreguntas.length === 0) {
        mostrarToast("No quedan más preguntas. Fin del juego.");
        finalizarPartida();
        return;
    }

    const indexAleatorio = Math.floor(Math.random() * posiblesPreguntas.length);
    preguntaActualObj = posiblesPreguntas[indexAleatorio];
    
    const dbIndex = preguntasDisponibles.findIndex(p => p.pregunta === preguntaActualObj.pregunta);
    preguntasDisponibles.splice(dbIndex, 1);

    document.getElementById('etiquetaTematica').innerText = preguntaActualObj.tematica;
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
        equipos[turnoEquipoIndex].puntos += 100;
        mostrarToast(`¡Correcto! +100 pts para el ${equipos[turnoEquipoIndex].nombre}`, 1800);
    } else {
        mostrarToast(`Incorrecto. Sin puntos.`, 1800);
    }

    renderizarPanelEquipos();

    turnoEquipoIndex++;
    if (turnoEquipoIndex >= equipos.length) {
        rondaActual++;
        setTimeout(prepararRonda, 1500); 
    } else {
        setTimeout(iniciarTurno, 1500);
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

// --- MODAL CONFIGURACIÓN ---
let configTemporal = { categorias: [], rondas: 3, robo: false };

function abrirConfigJuego() {
    if (enJuego && !juegoPausado && !esperandoValidacion) alternarPausa();
    document.getElementById('modalConfigJuego').style.display = 'flex';
    document.getElementById('inputRondas').value = configJuego.rondas;
    configTemporal.categorias = [...configJuego.categoriasActivas];
    configTemporal.rondas = configJuego.rondas;
    configTemporal.robo = configJuego.modoRobo;
    actualizarBotonRoboUI();
    renderizarTematicasConfig();
}

function alternarModoRoboPlaceholder() {
    configTemporal.robo = !configTemporal.robo;
    actualizarBotonRoboUI();
}

function actualizarBotonRoboUI() {
    const btn = document.getElementById('btnModoRobo');
    if (configTemporal.robo) {
        btn.innerText = "💥 Modo Robo: HABILITADO";
        btn.classList.add('activo');
    } else {
        btn.innerText = "💥 Modo Robo: Deshabilitado";
        btn.classList.remove('activo');
    }
}

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

function guardarConfigJuego() {
    if (configTemporal.categorias.length === 0) {
        mostrarToast("Seleccioná al menos 1 temática.");
        return;
    }
    configJuego.rondas = parseInt(document.getElementById('inputRondas').value) || 3;
    configJuego.categoriasActivas = [...configTemporal.categorias];
    configJuego.modoRobo = configTemporal.robo;
    document.getElementById('modalConfigJuego').style.display = 'none';
    document.getElementById('rondaDisplay').innerText = `Ronda ${rondaActual} / ${configJuego.rondas}`;
    mostrarToast("Ajustes guardados.");
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