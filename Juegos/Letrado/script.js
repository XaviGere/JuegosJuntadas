// --- ESTADO GLOBAL Y CONEXIÓN CON EL HUB ---
let salasHub = JSON.parse(localStorage.getItem('arcade_salas')) || [];
let idSalaActiva = localStorage.getItem('arcade_sala_activa');
let salaActiva = salasHub.find(s => s.idSala === idSalaActiva);

let configGlobal = JSON.parse(localStorage.getItem('arcade_config')) || {
    modoOscuro: false, volumen: 50, idioma: 'es'
};

if (!salaActiva || salaActiva.jugadores.length === 0) {
    window.location.href = '../../index.html';
}

document.getElementById('tituloSalaJuego').innerText = `Letrado - ${salaActiva.nombre}`;

// --- MODO OSCURO GLOBAL ---
let modoOscuro = localStorage.getItem('arcade_modo_oscuro') === 'true';
function aplicarModoOscuroVisual() {
    if (modoOscuro) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    document.getElementById('checkModoOscuro').checked = modoOscuro;
}
aplicarModoOscuroVisual();

function alternarModoOscuro() {
    modoOscuro = document.getElementById('checkModoOscuro').checked;
    localStorage.setItem('arcade_modo_oscuro', modoOscuro);
    aplicarModoOscuroVisual();
}

// --- SISTEMA DE AUDIO BLINDADO ---
let audioCtx = null;
try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch(e) {
    console.warn("Audio no soportado en este navegador.");
}

function reproducirTick() {
    try {
        if (!audioCtx || configGlobal.volumen <= 0) return; 
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
        
        const volumenReal = (configGlobal.volumen / 100) * 0.1;
        gainNode.gain.setValueAtTime(volumenReal, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); 
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.05);
    } catch(e) {
        // Fallar silenciosamente para no congelar el reloj
    }
}

// --- MENSAJERÍA ---
function mostrarToast(mensaje, duracion = 3500) {
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
    
    const btn = document.getElementById('btnContinuarResultado');
    btn.onclick = () => {
        document.getElementById('modalResultado').style.display = 'none';
        if(callback) callback();
    };
}

// --- CONFIGURACIÓN DE LA PARTIDA ---
let configJuego = {
    tiempo: 10,
    rondas: 3,
    pasapalabras: 2,
    reglaPasapalabra: 'reset',
    ocurrenciasPorLetra: 1, 
    letrasActivas: "ABCDEFGHIJLMNOPRSTUV".split(""),
    categoriasActivas: ["Películas", "Países", "Comida", "Marcas", "Deportes", "Animales", "Colores"]
};

const todasLasLetrasPosibles = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

// --- ESTADOS DEL JUEGO ---
let rondaActual = 1;
let bolsaLetras = [];
let letraEnPantalla = "";

let enJuego = false;
let juegoPausado = false;
let rondaFinalizada = false; 
let categoriasUsadas = []; 

let timerInterval = null;
let tiempoInicio = 0;
let tiempoPausado = 0;
let tiempoLimiteMS = configJuego.tiempo * 1000;
let tiempoRestanteMS = tiempoLimiteMS;

let jugadoresPartida = salaActiva.jugadores.map(j => ({
    ...j, puntosMesa: 0, pasapalabras: configJuego.pasapalabras
}));

let jugadoresVivos = [];
let turnoIndex = 0;

// DOM Elements
const circuloDOM = document.getElementById('circuloLetrado');
const estadoInicialDOM = document.getElementById('estadoInicial');
const estadoJuegoDOM = document.getElementById('estadoJuego');
const timerDisplayDOM = document.getElementById('timerDisplay');
const letraDisplayDOM = document.getElementById('letraDisplay');
const btnPausaDOM = document.getElementById('btnPausa');
const btnPPDOM = document.getElementById('btnPasapalabraJuego');

// --- LÓGICA DE JUGADORES Y TURNOS ---
function renderizarJugadores() {
    const contenedor = document.getElementById('listaJugadoresJuego');
    contenedor.innerHTML = '';

    jugadoresPartida.forEach((jugador, index) => {
        const estaVivo = jugadoresVivos.some(j => j.id === jugador.id);
        const esSuTurno = enJuego && estaVivo && jugadoresVivos[turnoIndex].id === jugador.id;
        
        const div = document.createElement('div');
        div.className = `etiqueta-jugador ${!estaVivo ? 'eliminado' : ''} ${esSuTurno ? 'turno-activo' : ''}`;
        div.style.backgroundColor = jugador.color;
        
        const jugadorHub = salaActiva.jugadores.find(j => j.id === jugador.id);
        const puntosGlobales = jugadorHub ? jugadorHub.puntajeGlobal : 0;
        
        div.innerHTML = `
            <div>
                <div class="jugador-nombre">${jugador.nombre}</div>
                <div class="jugador-pp">⏭️ Pasapalabras: ${jugador.pasapalabras}</div>
            </div>
            <div class="jugador-stats">
                <div class="jugador-posicion">Orden #${index + 1}</div>
                <div class="jugador-puntaje">${jugador.puntosMesa} pts</div>
                <div class="jugador-global">Global: ${puntosGlobales} pts</div>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

function generarBolsaLetras() {
    bolsaLetras = [];
    configJuego.letrasActivas.forEach(letra => {
        for(let i=0; i < configJuego.ocurrenciasPorLetra; i++) {
            bolsaLetras.push(letra);
        }
    });
}

function obtenerLetraAleatoria() {
    if (bolsaLetras.length === 0) return null;
    const indexAleatorio = Math.floor(Math.random() * bolsaLetras.length);
    return bolsaLetras.splice(indexAleatorio, 1)[0];
}

// --- MOTOR DE TIEMPO ---
function actualizarDisplayReloj() {
    let segs = Math.floor(tiempoRestanteMS / 1000);
    let milis = Math.floor((tiempoRestanteMS % 1000) / 10);
    
    timerDisplayDOM.innerText = `${segs}.${milis.toString().padStart(2, '0')}`;
    
    if (tiempoRestanteMS <= 5000 && tiempoRestanteMS > 0) {
        timerDisplayDOM.classList.add('peligro');
    } else {
        timerDisplayDOM.classList.remove('peligro');
    }
}

function iniciarTurno(esCambioDeLetra = true) {
    if (jugadoresVivos.length === 0) return;
    
    enJuego = true;
    juegoPausado = false;
    
    const jugadorActual = jugadoresVivos[turnoIndex];

    estadoInicialDOM.style.display = 'none';
    estadoJuegoDOM.style.display = 'flex';
    circuloDOM.style.borderColor = jugadorActual.color; 
    letraDisplayDOM.style.color = jugadorActual.color; 
    btnPPDOM.disabled = (jugadorActual.pasapalabras <= 0);
    
    if (esCambioDeLetra) {
        const nuevaLetra = obtenerLetraAleatoria();
        if (!nuevaLetra) {
            verificarVictoria();
            return;
        }
        letraEnPantalla = nuevaLetra;
        letraDisplayDOM.innerText = letraEnPantalla;
    }

    renderizarJugadores();
    btnPausaDOM.querySelector('div').innerText = "Pausar Juego";
    btnPausaDOM.classList.remove('pausado');

    tiempoLimiteMS = configJuego.tiempo * 1000;
    tiempoRestanteMS = tiempoLimiteMS;
    tiempoInicio = Date.now();
    actualizarDisplayReloj();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!juegoPausado && !rondaFinalizada) {
            let tiempoPasado = Date.now() - tiempoInicio;
            tiempoRestanteMS = tiempoLimiteMS - tiempoPasado;
            
            if (tiempoRestanteMS <= 5000 && tiempoRestanteMS > 0 && Math.floor(tiempoRestanteMS) % 1000 < 50) {
                reproducirTick(); 
            }

            if (tiempoRestanteMS <= 0) {
                tiempoRestanteMS = 0;
                actualizarDisplayReloj();
                clearInterval(timerInterval);
                eliminarJugadorActual();
            } else {
                actualizarDisplayReloj();
            }
        }
    }, 30);
}

// --- INTERACCIONES DEL USUARIO ---
function tocarCentro() {
    try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch(e){}
    
    if (rondaFinalizada || juegoPausado) return;
    
    if (!enJuego) {
        // Corrección: Solo tira categoría automáticamente si el usuario 
        // NO apretó el botón de categoría antes de darle a Play.
        const textoCategoriaActual = document.getElementById('textoCategoria').innerText;
        if (textoCategoriaActual === "Esperando inicio...") {
            tirarCategoria();
        }
        iniciarTurno(true);
        return;
    } 
    
    turnoIndex = (turnoIndex + 1) % jugadoresVivos.length;
    iniciarTurno(true);
}

function usarPasapalabra(evento) {
    evento.stopPropagation(); 
    if (rondaFinalizada || juegoPausado || !enJuego) return;

    const jugadorActual = jugadoresVivos[turnoIndex];
    if (jugadorActual.pasapalabras > 0) {
        jugadorActual.pasapalabras--;
        turnoIndex = (turnoIndex + 1) % jugadoresVivos.length;
        iniciarTurno(false); 
    }
}

// --- RESOLUCIÓN Y ELIMINACIONES ---
function eliminarJugadorActual() {
    jugadoresVivos.splice(turnoIndex, 1);
    
    if (jugadoresVivos.length === 0) {
        enJuego = false; rondaFinalizada = true;
        letraDisplayDOM.innerText = "✖"; letraDisplayDOM.style.color = "#e74c3c";
        mostrarResultado("💀", "¡Todos Eliminados!", "Nadie superó la ronda. Fin sin puntos.", avanzarRonda);
    } else if (jugadoresVivos.length === 1) {
        enJuego = false; rondaFinalizada = true;
        letraDisplayDOM.innerText = "🏆"; letraDisplayDOM.style.color = "#f1c40f";
        timerDisplayDOM.classList.remove('peligro');
        jugadoresVivos[0].puntosMesa += 100;
        renderizarJugadores();
        mostrarResultado("👑", "¡Último en pie!", `¡${jugadoresVivos[0].nombre} gana 100 puntos!`, avanzarRonda);
    } else {
        if (turnoIndex >= jugadoresVivos.length) turnoIndex = 0;
        iniciarTurno(false); 
    }
}

function verificarVictoria() {
    clearInterval(timerInterval);
    enJuego = false; rondaFinalizada = true;
    letraDisplayDOM.innerText = "🏆"; letraDisplayDOM.style.color = "#2ecc71";
    timerDisplayDOM.classList.remove('peligro');
    
    jugadoresVivos.forEach(j => j.puntosMesa += 100);
    renderizarJugadores();
    mostrarResultado("🎉", "¡Bolsa Vacía!", "¡Se completó el abecedario! Los sobrevivientes ganan 100 puntos.", avanzarRonda);
}

// --- CONTROLES Y RONDAS ---
function alternarPausa() {
    if (!enJuego || rondaFinalizada) return;
    juegoPausado = !juegoPausado;
    btnPausaDOM.classList.toggle('pausado', juegoPausado);
    btnPausaDOM.querySelector('div').innerText = juegoPausado ? "Reanudar" : "Juego Pausado";

    if (juegoPausado) {
        tiempoPausado = tiempoRestanteMS;
    } else {
        tiempoLimiteMS = tiempoPausado;
        tiempoInicio = Date.now();
    }
}

function rotarJugadores() {
    if (jugadoresPartida.length > 1) {
        const primero = jugadoresPartida.shift();
        jugadoresPartida.push(primero);
    }
}

function prepararRonda() {
    generarBolsaLetras();
    
    if (rondaActual === 1) {
        jugadoresVivos = jugadoresPartida.map(j => { j.pasapalabras = configJuego.pasapalabras; return j; });
    } else {
        jugadoresVivos = jugadoresPartida.map(j => {
            if (configJuego.reglaPasapalabra === 'reset') j.pasapalabras = configJuego.pasapalabras;
            else if (configJuego.reglaPasapalabra === 'add1') j.pasapalabras = Math.min(configJuego.pasapalabras, j.pasapalabras + 1);
            return j;
        });
    }
    
    turnoIndex = 0;
    enJuego = false;
    juegoPausado = false;
    rondaFinalizada = false;
    
    document.getElementById('rondaDisplay').innerText = `Ronda ${rondaActual} / ${configJuego.rondas}`;
    btnPausaDOM.classList.remove('pausado');
    btnPausaDOM.querySelector('div').innerText = "Pausar Juego";
    document.getElementById('textoCategoria').innerText = "Esperando inicio...";
    btnPPDOM.disabled = true;

    estadoInicialDOM.style.display = 'block';
    estadoJuegoDOM.style.display = 'none';
    circuloDOM.style.borderColor = 'transparent';
    timerDisplayDOM.classList.remove('peligro');
    
    renderizarJugadores();
}

function avanzarRonda() {
    rondaActual++;
    if (rondaActual > configJuego.rondas) { finalizarPartidaYGuardarGlobal(); return; }
    rotarJugadores();
    prepararRonda();
}

function finalizarPartidaYGuardarGlobal() {
    const indexSala = salasHub.findIndex(s => s.idSala === idSalaActiva);
    if(indexSala !== -1) {
        salasHub[indexSala].jugadores.forEach(jHub => {
            const jPartida = jugadoresPartida.find(jp => jp.id === jHub.id);
            if(jPartida) jHub.puntajeGlobal += jPartida.puntosMesa;
        });
        localStorage.setItem('arcade_salas', JSON.stringify(salasHub));
    }
    mostrarResultado("🎮", "¡Partida Finalizada!", "Los puntos se sumaron al global de la sala.", () => {
        window.location.href = '../../index.html';
    });
}

function reiniciarRondaManual() {
    mostrarConfirmacion("¿Seguro que querés reiniciar esta ronda? (No afecta los puntos ganados)", () => {
        if(timerInterval) clearInterval(timerInterval);
        prepararRonda();
        mostrarToast("Ronda reiniciada.");
    });
}

function pedirReinicioCompleto() {
    mostrarConfirmacion("ATENCIÓN: Esto borrará todos los puntos de ESTA partida y volverá a la Ronda 1. ¿Estás seguro?", () => {
        if(timerInterval) clearInterval(timerInterval);
        rondaActual = 1;
        categoriasUsadas = []; 
        jugadoresPartida = salaActiva.jugadores.map(j => ({
            ...j, puntosMesa: 0, pasapalabras: configJuego.pasapalabras
        }));
        document.getElementById('modalConfigJuego').style.display = 'none';
        prepararRonda();
        mostrarToast("Partida reiniciada desde cero.");
    });
}

function tirarCategoria() {
    let catsDisponibles = configJuego.categoriasActivas.filter(c => !categoriasUsadas.includes(c));
    
    if(catsDisponibles.length === 0) {
        if (configJuego.categoriasActivas.length === 0) {
            document.getElementById('textoCategoria').innerText = "Sin categorías";
            return;
        }
        mostrarToast("Se usaron todas las categorías. ¡Reiniciando lista!", 2500);
        categoriasUsadas = [];
        catsDisponibles = [...configJuego.categoriasActivas];
    }
    
    const elegida = catsDisponibles[Math.floor(Math.random() * catsDisponibles.length)];
    categoriasUsadas.push(elegida);
    document.getElementById('textoCategoria').innerText = elegida;
}

// --- CONFIGURACIÓN MODAL ---
let configTemporal = { letras: [], categorias: [] };

function abrirConfigJuego() { 
    document.getElementById('modalConfigJuego').style.display = 'flex'; 
    document.getElementById('inputTiempo').value = configJuego.tiempo;
    document.getElementById('inputRondas').value = configJuego.rondas;
    document.getElementById('inputPasapalabras').value = configJuego.pasapalabras;
    document.getElementById('inputOcurrencias').value = configJuego.ocurrenciasPorLetra;
    document.getElementById('selectReglaPasapalabra').value = configJuego.reglaPasapalabra;
    
    configTemporal.letras = [...configJuego.letrasActivas];
    configTemporal.categorias = [...configJuego.categoriasActivas];
    
    renderizarLetrasConfig();
    renderizarCatConfig();
}

function renderizarLetrasConfig() {
    const grid = document.getElementById('gridLetrasConfig');
    grid.innerHTML = '';
    todasLasLetrasPosibles.forEach(letra => {
        const div = document.createElement('div');
        div.className = 'letra-opcion';
        if(configTemporal.letras.includes(letra)) div.classList.add('activa');
        div.innerText = letra;
        
        div.onclick = () => {
            if(configTemporal.letras.includes(letra)) {
                configTemporal.letras = configTemporal.letras.filter(l => l !== letra);
                div.classList.remove('activa');
            } else {
                configTemporal.letras.push(letra);
                configTemporal.letras.sort((a, b) => todasLasLetrasPosibles.indexOf(a) - todasLasLetrasPosibles.indexOf(b)); 
                div.classList.add('activa');
            }
        };
        grid.appendChild(div);
    });
}

function renderizarCatConfig() {
    const lista = document.getElementById('listaCatConfig');
    lista.innerHTML = '';
    configTemporal.categorias.forEach((cat, idx) => {
        const div = document.createElement('div');
        div.className = 'item-categoria';
        div.innerHTML = `<span>${cat}</span> <button class="btn-borrar-cat" onclick="eliminarCategoria(${idx})">✖</button>`;
        lista.appendChild(div);
    });
}

function agregarCategoria() {
    const input = document.getElementById('inputNuevaCat');
    const valor = input.value.trim();
    if(valor) {
        configTemporal.categorias.push(valor);
        input.value = '';
        renderizarCatConfig();
    }
}

function eliminarCategoria(idx) {
    configTemporal.categorias.splice(idx, 1);
    renderizarCatConfig();
}

function guardarConfigJuego() {
    if(configTemporal.letras.length === 0) {
        mostrarToast("Debes seleccionar al menos 1 letra para jugar.", 3000);
        return;
    }

    configJuego.tiempo = parseInt(document.getElementById('inputTiempo').value);
    configJuego.rondas = parseInt(document.getElementById('inputRondas').value);
    configJuego.pasapalabras = parseInt(document.getElementById('inputPasapalabras').value);
    configJuego.ocurrenciasPorLetra = parseInt(document.getElementById('inputOcurrencias').value) || 1;
    configJuego.reglaPasapalabra = document.getElementById('selectReglaPasapalabra').value;
    
    configJuego.letrasActivas = [...configTemporal.letras];
    configJuego.categoriasActivas = [...configTemporal.categorias];
    
    document.getElementById('modalConfigJuego').style.display = 'none';
    
    if(timerInterval) clearInterval(timerInterval);
    prepararRonda();
    mostrarToast("Ajustes aplicados. Se reinició la ronda actual.");
}

// Arranque inicial
prepararRonda();