// --- CIERRE DE MODALES AL CLICKEAR FUERA DEL OVERLAY ---
// Clic en el fondo (.modal-overlay) cierra el modal sin aplicar cambios.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });
});

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

document.getElementById('tituloSalaJuego').innerText = `Basta! - ${salaActiva.nombre}`;

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

// --- SISTEMA DE AUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function reproducirTick() {
    if (configGlobal.volumen <= 0) return; 
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
}

// --- SISTEMA DE MENSAJERÍA ---
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

const reglasBasta = `
    <h3>🎯 Objetivo</h3>
    <p>Acertar palabras que comiencen con cada letra del rosco según la categoría seleccionada.</p>
    
    <h3>⏱️ Mecánicas</h3>
    <ul>
        <li>Tenés <strong>15 segundos</strong> por letra para pensar una palabra.</p>
        <li>Podés usar <strong>Pasapalabra</strong> para saltar la letra (limitado por configuración).</p>
        <li>Si acertás, ganás puntos y seguís jugando.</p>
        <li>Si el tiempo se agota, quedás eliminado de la ronda.</p>
    </ul>
    
    <h3>🏆 Puntuación</h3>
    <ul>
        <li>Acierto: +50 puntos</li>
        <li>Sobrevivir ronda: +100 puntos</li>
        <li>Último en pie: +200 puntos</li>
    </ul>
    
    <h3>⚙️ Configuraciones</h3>
    <ul>
        <li>Podés ajustar tiempo, rondas y pasapalabras disponibles.</li>
        <li>Modo completitud da tiempo extra cuando queda 1 jugador.</li>
    </ul>
`;

// Mostrar reglas al cargar
document.addEventListener('DOMContentLoaded', () => {
    mostrarReglas('Basta', reglasBasta);
});

// --- CONFIGURACIÓN DE LA PARTIDA ---
let configJuego = {
    tiempo: 15,
    rondas: 3,
    pasapalabras: 2,
    formaTablero: 'disco', 
    reglaPasapalabra: 'reset', 
    completitud: false,
    tiempoExtraCompletitud: 0,
    letrasActivas: "ABCDEFGHIJLMNOPRSTUV".split(""),
    categoriasActivas: ["Película", "Comida", "Animal", "Marca", "País", "Profesión", "Color", "Serie", "Nombre Mujer", "Nombre Hombre"]
};

const todasLasLetrasPosibles = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

// --- ESTADOS DEL JUEGO ---
let rondaActual = 1;
let intervalo = null;
let tiempoRestante = configJuego.tiempo;
let tiempoDeTurnoFijo = configJuego.tiempo; 
let enJuego = false;
let juegoPausado = false;
let rondaFinalizada = false; 
let primerTurnoDeRonda = true; // Bandera para mostrar categoría solo al inicio

let categoriasUsadas = []; 

let jugadoresPartida = salaActiva.jugadores.map(j => ({
    ...j, puntosMesa: 0, pasapalabras: configJuego.pasapalabras
}));

let jugadoresVivos = [];
let turnoIndex = 0;
let letrasDisponibles = [];

const relojDOM = document.getElementById('contador');
const svgDOM = document.getElementById('roscoSVG');
const htmlContenedor = document.getElementById('letrasHTMLContenedor');
const btnPausaDOM = document.getElementById('btnPausa');

// --- MATEMÁTICA Y RENDERIZADO DEL TABLERO (RESPONSIVE) ---
const svgNS = "http://www.w3.org/2000/svg";
const centro = 300; 

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) };
}

function describirArcoDonut(x, y, rInt, rExt, anguloInicio, anguloFin) {
    const startExt = polarToCartesian(x, y, rExt, anguloFin);
    const endExt = polarToCartesian(x, y, rExt, anguloInicio);
    const startInt = polarToCartesian(x, y, rInt, anguloFin);
    const endInt = polarToCartesian(x, y, rInt, anguloInicio);
    const arcFlag = anguloFin - anguloInicio <= 180 ? "0" : "1";
    return ["M", startExt.x, startExt.y, "A", rExt, rExt, 0, arcFlag, 0, endExt.x, endExt.y, "L", endInt.x, endInt.y, "A", rInt, rInt, 0, arcFlag, 1, startInt.x, startInt.y, "Z"].join(" ");
}

function dibujarTablero() {
    svgDOM.innerHTML = '';
    htmlContenedor.innerHTML = '';
    
    // Convertimos el SVG en un lienzo 100% elástico
    svgDOM.setAttribute('viewBox', '0 0 600 600');
    svgDOM.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    if (configJuego.formaTablero === 'cuadrado') relojDOM.classList.add('forma-cuadrada');
    else relojDOM.classList.remove('forma-cuadrada');

    if (!enJuego) {
        relojDOM.innerText = "▶";
        relojDOM.style.backgroundColor = "#2c3e50";
    }

    if (configJuego.letrasActivas.length === 0) return;

    if (configJuego.formaTablero === 'disco') {
        svgDOM.style.display = 'block';
        htmlContenedor.style.display = 'none';
        dibujarDisco(configJuego.letrasActivas);
    } else if (configJuego.formaTablero === 'circulos') {
        svgDOM.style.display = 'none';
        htmlContenedor.style.display = 'block';
        dibujarCirculosFlotantes(configJuego.letrasActivas);
    } else if (configJuego.formaTablero === 'cuadrado') {
        svgDOM.style.display = 'none';
        htmlContenedor.style.display = 'block';
        dibujarCuadrado(configJuego.letrasActivas);
    }
}

function manejarClickLetra(letra, elementoVisual) {
    if (rondaFinalizada) return;

    if (juegoPausado) {
        if (elementoVisual.classList.contains('usada')) {
            elementoVisual.classList.remove('usada');
            letrasDisponibles.push(letra);
        } else {
            elementoVisual.classList.add('usada');
            letrasDisponibles = letrasDisponibles.filter(l => l !== letra);
        }
        return;
    }

    if (!enJuego || elementoVisual.classList.contains('usada')) return;
    
    elementoVisual.classList.add('usada');
    letrasDisponibles = letrasDisponibles.filter(l => l !== letra);
    
    if (letrasDisponibles.length === 0) verificarVictoria();
    else pasarTurno();
}

function dibujarDisco(letras) {
    const paddingAngular = 0.5; 
    const radioInt = 175; 
    const radioExt = 280; 
    const anguloPorPorcion = 360 / letras.length;

    letras.forEach((letra, index) => {
        const anguloInicio = index * anguloPorPorcion + paddingAngular;
        const anguloFin = (index + 1) * anguloPorPorcion - paddingAngular;

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', describirArcoDonut(centro, centro, radioInt, radioExt, anguloInicio, anguloFin));
        path.classList.add('segmento');

        const textRadius = (radioInt + radioExt) / 2;
        const posTexto = polarToCartesian(centro, centro, textRadius, (anguloInicio + anguloFin) / 2);
        
        const texto = document.createElementNS(svgNS, 'text');
        texto.setAttribute('x', posTexto.x);
        texto.setAttribute('y', posTexto.y + 10); 
        texto.setAttribute('text-anchor', 'middle');
        texto.classList.add('texto-letra');
        texto.textContent = letra;

        const grupo = document.createElementNS(svgNS, 'g');
        if (!letrasDisponibles.includes(letra)) grupo.classList.add('usada');

        grupo.appendChild(path);
        grupo.appendChild(texto);
        grupo.onclick = () => manejarClickLetra(letra, grupo);
        svgDOM.appendChild(grupo);
    });
}

function dibujarCirculosFlotantes(letras) {
    const anguloPorPorcion = (2 * Math.PI) / letras.length;
    letras.forEach((letra, index) => {
        const angulo = index * anguloPorPorcion - (Math.PI / 2);
        const x = 50 + 42 * Math.cos(angulo);
        const y = 50 + 42 * Math.sin(angulo);

        const div = document.createElement('div');
        div.className = 'letra-flotante forma-circulo';
        div.style.left = `${x}%`;
        div.style.top = `${y}%`;
        div.innerText = letra;

        if (!letrasDisponibles.includes(letra)) div.classList.add('usada');
        div.onclick = () => manejarClickLetra(letra, div);
        htmlContenedor.appendChild(div);
    });
}

function dibujarCuadrado(letras) {
    const N = letras.length;
    let lado = Math.ceil((N + 4) / 4);
    let cols = lado;
    let rows = lado;
    let slots = [];
    
    for (let c = 0; c < cols; c++) slots.push({c: c, r: 0});
    for (let r = 1; r < rows; r++) slots.push({c: cols - 1, r: r});
    for (let c = cols - 2; c >= 0; c--) slots.push({c: c, r: rows - 1});
    for (let r = rows - 2; r > 0; r--) slots.push({c: 0, r: r});

    letras.forEach((letra, index) => {
        const slot = slots[index];
        const x = 8 + slot.c * (84 / (cols - 1));
        const y = 8 + slot.r * (84 / (rows - 1));

        const div = document.createElement('div');
        div.className = 'letra-flotante forma-cuadrado';
        div.style.left = `${x}%`; 
        div.style.top = `${y}%`;
        div.innerText = letra;

        if (!letrasDisponibles.includes(letra)) div.classList.add('usada');
        div.onclick = () => manejarClickLetra(letra, div);
        htmlContenedor.appendChild(div);
    });
}

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
        
        const inicial = jugador.nombre.charAt(0).toUpperCase();
        
        div.innerHTML = `
            <div class="info-desktop">
                <div>
                    <div class="jugador-nombre">${jugador.nombre}</div>
                    <div class="jugador-pp">⏭️ Pasapalabras: ${jugador.pasapalabras}</div>
                </div>
                <div class="jugador-stats">
                    <div class="jugador-posicion">Orden #${index + 1}</div>
                    <div class="jugador-puntaje">${jugador.puntosMesa} pts</div>
                    <div class="jugador-global">Global: ${puntosGlobales} pts</div>
                </div>
            </div>
            
            <div class="info-mobile">
                <div class="jugador-inicial">${inicial}</div>
                <div class="badge-pp">${jugador.pasapalabras}</div>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

function iniciarTurno() {
    if (jugadoresVivos.length === 0) return;
    
    // Detener cualquier intervalo que esté corriendo
    if (intervalo) clearInterval(intervalo);
    
    // Paso 1: Mostrar categoría en grande SOLO al inicio de la ronda
    if (primerTurnoDeRonda) {
        const categoriaDOM = document.getElementById('textoCategoria');
        const categoriaActual = categoriaDOM.innerText;
        
        // Si no hay categoría seleccionada, tirar una automáticamente
        if (categoriaActual === "Toca para elegir" || categoriaActual === "Sin categorías") {
            tirarCategoria();
        }
        
        // Mostrar categoría en el centro grande
        const categoriaAMostrar = document.getElementById('textoCategoria').innerText;
        relojDOM.innerText = categoriaAMostrar;
        relojDOM.style.fontSize = "2em"; // Texto más grande
        relojDOM.style.fontWeight = "bold";
        relojDOM.style.backgroundColor = "#3498db"; // Color distintivo para categoría
        relojDOM.style.color = "#ffffff";
        
        // Bloquear interacción durante la pausa de categoría
        svgDOM.style.pointerEvents = "none";
        
        // Pausa de 2 segundos para que vean la categoría
        setTimeout(() => {
            iniciarContadorReal();
        }, 2000); // 2 segundos mostrando categoría
        
        primerTurnoDeRonda = false; // Ya no es el primer turno
    } else {
        // Para turnos subsiguientes, iniciar directamente el contador
        iniciarContadorReal();
    }
}

function iniciarContadorReal() {
    // Paso 2: Iniciar el contador normalmente
    enJuego = true;
    juegoPausado = false;
    
    tiempoDeTurnoFijo = configJuego.tiempo;
    if (configJuego.completitud && jugadoresVivos.length === 1) {
        tiempoDeTurnoFijo += configJuego.tiempoExtraCompletitud;
    }
    tiempoRestante = tiempoDeTurnoFijo;
    
    const jugadorActual = jugadoresVivos[turnoIndex];
    relojDOM.innerText = tiempoRestante;
    relojDOM.style.fontSize = ""; // Restaurar tamaño normal
    relojDOM.style.fontWeight = "";
    relojDOM.style.backgroundColor = jugadorActual.color;
    relojDOM.style.color = "var(--text-color)";
    
    // Restaurar interacción
    svgDOM.style.pointerEvents = "auto";
    
    if(jugadorActual.pasapalabras <= 0) relojDOM.classList.add('sin-pasapalabra');
    else relojDOM.classList.remove('sin-pasapalabra');

    renderizarJugadores();
    btnPausaDOM.querySelector('div').innerText = "Pausar Juego";
    btnPausaDOM.classList.remove('pausado');

    if (intervalo) clearInterval(intervalo);
    intervalo = setInterval(() => {
        if (!juegoPausado && !rondaFinalizada) {
            tiempoRestante--;
            relojDOM.innerText = tiempoRestante;
            
            if (tiempoRestante <= (tiempoDeTurnoFijo / 4) && tiempoRestante > 0) {
                reproducirTick();
            }

            if (tiempoRestante <= 0) {
                clearInterval(intervalo);
                eliminarJugadorActualConPausa();
            }
        }
    }, 1000);
}

function pasarTurno() {
    turnoIndex = (turnoIndex + 1) % jugadoresVivos.length;
    iniciarTurno();
}

function tocarReloj() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (rondaFinalizada || juegoPausado) return;
    if (!enJuego) { iniciarTurno(); return; } 
    
    const jugadorActual = jugadoresVivos[turnoIndex];
    if (jugadorActual.pasapalabras > 0) {
        jugadorActual.pasapalabras--;
        pasarTurno();
    }
}

function eliminarJugadorActual() {
    // Esta función ahora llama a la versión con pausa para consistencia
    eliminarJugadorActualConPausa();
}

function eliminarJugadorActualConPausa() {
    const jugadorEliminado = jugadoresVivos[turnoIndex];
    jugadoresVivos.splice(turnoIndex, 1);
    
    // Mostrar feedback visual de eliminación
    relojDOM.innerText = "💀"; // Emoji de eliminación
    relojDOM.style.backgroundColor = "#e74c3c"; // Rojo
    relojDOM.style.fontSize = "2em";
    
    // Mostrar toast informativo
    mostrarToast(`¡${jugadorEliminado.nombre} eliminado!`, 2000);
    
    // Bloquear interacción durante la pausa
    juegoPausado = true;
    svgDOM.style.pointerEvents = "none"; // Bloquear toques en tablero
    
    // Pausa de 2 segundos antes de pasar al siguiente turno
    setTimeout(() => {
        // Restaurar interacción
        juegoPausado = false;
        svgDOM.style.pointerEvents = "auto";
        relojDOM.style.fontSize = "";
        
        if (jugadoresVivos.length === 0) {
            enJuego = false; rondaFinalizada = true;
            relojDOM.innerText = "✖";
            relojDOM.style.backgroundColor = "#2c3e50";
            mostrarToast("Nadie superó la ronda. Fin sin puntos.", 4000);
            setTimeout(avanzarRonda, 3500);
        } else if (jugadoresVivos.length === 1 && !configJuego.completitud) {
            enJuego = false; rondaFinalizada = true;
            relojDOM.innerText = "🏆";
            relojDOM.style.backgroundColor = "#f1c40f";
            jugadoresVivos[0].puntosMesa += 100;
            renderizarJugadores();
            mostrarToast(`¡${jugadoresVivos[0].nombre} es el último en pie y gana 100 puntos!`, 4000);
            setTimeout(avanzarRonda, 3500);
        } else {
            if (turnoIndex >= jugadoresVivos.length) turnoIndex = 0;
            iniciarTurno(); 
        }
    }, 2000); // 2 segundos de pausa
}

function verificarVictoria() {
    clearInterval(intervalo);
    enJuego = false; rondaFinalizada = true;
    relojDOM.innerText = "🏆"; relojDOM.style.backgroundColor = "#2ecc71";
    jugadoresVivos.forEach(j => j.puntosMesa += 100);
    renderizarJugadores();
    mostrarToast("¡Tablero completado! Los sobrevivientes ganan 100 puntos.", 4000);
    setTimeout(avanzarRonda, 3500);
}

// --- CONTROLES Y RONDAS ---
function alternarPausa() {
    if (!enJuego || rondaFinalizada) return;
    juegoPausado = !juegoPausado;
    btnPausaDOM.classList.toggle('pausado', juegoPausado);
    btnPausaDOM.querySelector('div').innerText = juegoPausado ? "Reanudar" : "Juego Pausado";
}

function rotarJugadores() {
    if (jugadoresPartida.length > 1) {
        const primero = jugadoresPartida.shift();
        jugadoresPartida.push(primero);
    }
}

function prepararRonda() {
    letrasDisponibles = [...configJuego.letrasActivas];
    primerTurnoDeRonda = true; // Resetear bandera al inicio de ronda
    
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
    
    relojDOM.classList.remove('sin-pasapalabra');
    document.getElementById('rondaDisplay').innerText = `Ronda ${rondaActual} / ${configJuego.rondas}`;
    btnPausaDOM.classList.remove('pausado');
    btnPausaDOM.querySelector('div').innerText = "Pausar Juego";
    
    dibujarTablero();
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
    mostrarToast("¡Juego Terminado! Los puntos se guardaron en la sala.", 3000);
    setTimeout(() => { window.location.href = '../../index.html'; }, 3000);
}

function reiniciarRondaManual() {
    mostrarConfirmacion("¿Seguro que querés reiniciar esta ronda? (No afecta los puntos ya ganados)", () => {
        clearInterval(intervalo);
        prepararRonda();
        mostrarToast("Ronda reiniciada.");
    });
}

function pedirReinicioCompleto() {
    mostrarConfirmacion("ATENCIÓN: Esto borrará todos los puntos ganados en ESTA partida y volverá a la Ronda 1. ¿Estás seguro?", () => {
        clearInterval(intervalo);
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

function toggleTiempoExtra() {
    const isChecked = document.getElementById('checkCompletitud').checked;
    document.getElementById('divTiempoExtra').style.display = isChecked ? 'block' : 'none';
}

function abrirConfigJuego() { 
    document.getElementById('modalConfigJuego').style.display = 'flex'; 
    document.getElementById('inputTiempo').value = configJuego.tiempo;
    document.getElementById('inputRondas').value = configJuego.rondas;
    document.getElementById('inputPasapalabras').value = configJuego.pasapalabras;
    document.getElementById('selectFormaTablero').value = configJuego.formaTablero;
    document.getElementById('selectReglaPasapalabra').value = configJuego.reglaPasapalabra;
    
    document.getElementById('checkCompletitud').checked = configJuego.completitud;
    document.getElementById('inputTiempoExtra').value = configJuego.tiempoExtraCompletitud;
    toggleTiempoExtra();
    
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
    if(configTemporal.letras.length < 4) {
        mostrarToast("Debes seleccionar al menos 4 letras para que el tablero no se rompa.", 3000);
        return;
    }

    configJuego.tiempo = parseInt(document.getElementById('inputTiempo').value);
    configJuego.rondas = parseInt(document.getElementById('inputRondas').value);
    configJuego.pasapalabras = parseInt(document.getElementById('inputPasapalabras').value);
    configJuego.formaTablero = document.getElementById('selectFormaTablero').value;
    configJuego.reglaPasapalabra = document.getElementById('selectReglaPasapalabra').value;
    configJuego.completitud = document.getElementById('checkCompletitud').checked;
    configJuego.tiempoExtraCompletitud = parseInt(document.getElementById('inputTiempoExtra').value) || 0;
    
    configJuego.letrasActivas = [...configTemporal.letras];
    configJuego.categoriasActivas = [...configTemporal.categorias];
    
    document.getElementById('modalConfigJuego').style.display = 'none';
    
    clearInterval(intervalo);
    prepararRonda();
    mostrarToast("Ajustes aplicados. Se reinició la ronda actual.");
}

// Arranque inicial
prepararRonda();