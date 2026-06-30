// --- ESTADO GLOBAL Y CONEXIÓN CON EL HUB ---
let salasHub = JSON.parse(localStorage.getItem('arcade_salas')) || [];
let idSalaActiva = localStorage.getItem('arcade_sala_activa');
let salaActiva = salasHub.find(s => s.idSala === idSalaActiva);

if (!salaActiva || salaActiva.jugadores.length === 0) {
    alert("No hay una sala activa con jugadores. Volvé al Hub para crear una.");
    window.location.href = '../../index.html';
}

document.getElementById('tituloSalaJuego').innerText = `Basta! - ${salaActiva.nombre}`;

// --- CONFIGURACIÓN DE LA PARTIDA ---
let configJuego = {
    tiempo: 15,
    rondas: 3,
    pasapalabras: 2,
    formaTablero: 'disco', // 'disco', 'circulos', 'cuadrado'
    reglaPasapalabra: 'reset', // 'reset', 'add1', 'none'
    completitud: false,
    letrasActivas: "ABCDEFGHIJLMNOPRSTUV".split(""),
    categoriasActivas: ["Película", "Comida", "Animal", "Marca", "País", "Profesión", "Color", "Serie", "Nombre Mujer", "Nombre Hombre"]
};

const todasLasLetrasPosibles = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

// --- ESTADOS DEL JUEGO ---
let rondaActual = 1;
let intervalo = null;
let tiempoRestante = configJuego.tiempo;
let enJuego = false;
let juegoPausado = false;

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

// --- MATEMÁTICA Y RENDERIZADO DEL TABLERO ---
const svgNS = "http://www.w3.org/2000/svg";
const centro = 270;

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
    
    // Configurar reloj
    if (configJuego.formaTablero === 'cuadrado') {
        relojDOM.classList.add('forma-cuadrada');
    } else {
        relojDOM.classList.remove('forma-cuadrada');
    }

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
        dibujarCirculosFlotantes(configJuego.letrasActivas, true);
    } else if (configJuego.formaTablero === 'cuadrado') {
        svgDOM.style.display = 'none';
        htmlContenedor.style.display = 'block';
        dibujarCuadrado(configJuego.letrasActivas);
    }
}

function manejarClickLetra(letra, elementoVisual) {
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
    const paddingAngular = 0.5; // Mínimo espacio posible
    const radioInt = 160; // Deja un diámetro interno de 320px para el botón de 310px
    const radioExt = 260;
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
    const radio = 230;
    const anguloPorPorcion = (2 * Math.PI) / letras.length;

    letras.forEach((letra, index) => {
        const angulo = index * anguloPorPorcion - (Math.PI / 2);
        const x = centro + radio * Math.cos(angulo);
        const y = centro + radio * Math.sin(angulo);

        const div = document.createElement('div');
        div.className = 'letra-flotante forma-circulo';
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.innerText = letra;

        if (!letrasDisponibles.includes(letra)) div.classList.add('usada');
        div.onclick = () => manejarClickLetra(letra, div);
        htmlContenedor.appendChild(div);
    });
}

function dibujarCuadrado(letras) {
    const W = 460;
    const H = 460;
    const P = 2 * W + 2 * H;
    const dist = P / letras.length;

    letras.forEach((letra, index) => {
        const d = (index * dist) % P;
        let x, y;
        if (d <= W) { x = d; y = 0; }
        else if (d <= W + H) { x = W; y = d - W; }
        else if (d <= 2 * W + H) { x = W - (d - (W + H)); y = H; }
        else { x = 0; y = H - (d - (2 * W + H)); }

        const div = document.createElement('div');
        div.className = 'letra-flotante forma-cuadrado';
        div.style.left = (x + 40) + 'px'; 
        div.style.top = (y + 40) + 'px';
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
        
        div.innerHTML = `
            <div>
                <div class="jugador-nombre">${jugador.nombre}</div>
                <div class="jugador-pp">⏭️ Pasapalabras: ${jugador.pasapalabras}</div>
            </div>
            <div class="jugador-stats">
                <div class="jugador-posicion">Orden #${index + 1}</div>
                <div class="jugador-puntaje">${jugador.puntosMesa} pts</div>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

function iniciarTurno() {
    if (jugadoresVivos.length === 0) return;
    
    enJuego = true;
    juegoPausado = false;
    tiempoRestante = configJuego.tiempo;
    
    const jugadorActual = jugadoresVivos[turnoIndex];
    relojDOM.innerText = tiempoRestante;
    relojDOM.style.backgroundColor = jugadorActual.color;
    
    if(jugadorActual.pasapalabras <= 0) relojDOM.classList.add('sin-pasapalabra');
    else relojDOM.classList.remove('sin-pasapalabra');

    renderizarJugadores();
    btnPausaDOM.querySelector('div').innerText = "Pausar Juego";
    btnPausaDOM.classList.remove('pausado');

    if (intervalo) clearInterval(intervalo);
    intervalo = setInterval(() => {
        if (!juegoPausado) {
            tiempoRestante--;
            relojDOM.innerText = tiempoRestante;
            if (tiempoRestante <= 0) {
                clearInterval(intervalo);
                eliminarJugadorActual();
            }
        }
    }, 1000);
}

function pasarTurno() {
    turnoIndex = (turnoIndex + 1) % jugadoresVivos.length;
    iniciarTurno();
}

function tocarReloj() {
    if (juegoPausado) return;
    if (!enJuego) { iniciarTurno(); return; } 
    
    const jugadorActual = jugadoresVivos[turnoIndex];
    if (jugadorActual.pasapalabras > 0) {
        jugadorActual.pasapalabras--;
        pasarTurno();
    }
}

function eliminarJugadorActual() {
    jugadoresVivos.splice(turnoIndex, 1);
    
    if (jugadoresVivos.length === 0) {
        alert("Nadie superó la ronda. Fin sin puntos.");
        avanzarRonda();
    } else if (jugadoresVivos.length === 1 && !configJuego.completitud) {
        jugadoresVivos[0].puntosMesa += 100;
        alert(`¡${jugadoresVivos[0].nombre} es el último en pie y gana 100 puntos!`);
        avanzarRonda();
    } else {
        if (turnoIndex >= jugadoresVivos.length) turnoIndex = 0;
        iniciarTurno();
    }
}

function verificarVictoria() {
    clearInterval(intervalo);
    enJuego = false;
    
    jugadoresVivos.forEach(j => j.puntosMesa += 100);
    alert("¡Tablero completado! Los sobrevivientes ganan 100 puntos.");
    avanzarRonda();
}

// --- CONTROLES Y RONDAS ---
function alternarPausa() {
    if (!enJuego) return;
    juegoPausado = !juegoPausado;
    btnPausaDOM.classList.toggle('pausado', juegoPausado);
    btnPausaDOM.querySelector('div').innerText = juegoPausado ? "Reanudar" : "Juego Pausado";
}

function prepararRonda() {
    letrasDisponibles = [...configJuego.letrasActivas];
    
    // Lógica inteligente de Pasapalabras al cambiar de ronda
    if (rondaActual === 1) {
        jugadoresVivos = jugadoresPartida.map(j => { j.pasapalabras = configJuego.pasapalabras; return j; });
    } else {
        jugadoresVivos = jugadoresPartida.map(j => {
            if (configJuego.reglaPasapalabra === 'reset') j.pasapalabras = configJuego.pasapalabras;
            else if (configJuego.reglaPasapalabra === 'add1') j.pasapalabras = Math.min(configJuego.pasapalabras, j.pasapalabras + 1);
            // 'none' mantiene el valor sin tocarlo
            return j;
        });
    }
    
    turnoIndex = 0;
    enJuego = false;
    juegoPausado = false;
    
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
    alert("¡Juego Terminado! Los puntos se han sumado al acumulado global de la sala.");
    window.location.href = '../../index.html';
}

function reiniciarRondaManual() {
    if(confirm("¿Seguro que querés reiniciar esta ronda? (No afecta los puntos ya ganados)")) {
        clearInterval(intervalo);
        prepararRonda();
    }
}

function reiniciarPartidaCompleta() {
    if(confirm("ATENCIÓN: Esto borrará todos los puntos ganados en ESTA partida y volverá a la Ronda 1. ¿Estás seguro?")) {
        clearInterval(intervalo);
        rondaActual = 1;
        jugadoresPartida.forEach(j => j.puntosMesa = 0);
        document.getElementById('modalConfigJuego').style.display = 'none';
        prepararRonda();
    }
}

function tirarCategoria() {
    const cats = configJuego.categoriasActivas;
    if(cats.length === 0) { document.getElementById('textoCategoria').innerText = "Sin categorías"; return; }
    document.getElementById('textoCategoria').innerText = cats[Math.floor(Math.random() * cats.length)];
}

// --- CONFIGURACIÓN MODAL ---
let configTemporal = { letras: [], categorias: [] };

function abrirConfigJuego() { 
    document.getElementById('modalConfigJuego').style.display = 'flex'; 
    document.getElementById('inputTiempo').value = configJuego.tiempo;
    document.getElementById('inputRondas').value = configJuego.rondas;
    document.getElementById('inputPasapalabras').value = configJuego.pasapalabras;
    document.getElementById('selectFormaTablero').value = configJuego.formaTablero;
    document.getElementById('selectReglaPasapalabra').value = configJuego.reglaPasapalabra;
    document.getElementById('checkCompletitud').checked = configJuego.completitud;
    
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
                configTemporal.letras.sort(); 
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
    if(configTemporal.letras.length < 3) {
        alert("Debes seleccionar al menos 3 letras para jugar.");
        return;
    }

    configJuego.tiempo = parseInt(document.getElementById('inputTiempo').value);
    configJuego.rondas = parseInt(document.getElementById('inputRondas').value);
    configJuego.pasapalabras = parseInt(document.getElementById('inputPasapalabras').value);
    configJuego.formaTablero = document.getElementById('selectFormaTablero').value;
    configJuego.reglaPasapalabra = document.getElementById('selectReglaPasapalabra').value;
    configJuego.completitud = document.getElementById('checkCompletitud').checked;
    
    configJuego.letrasActivas = [...configTemporal.letras];
    configJuego.categoriasActivas = [...configTemporal.categorias];
    
    document.getElementById('modalConfigJuego').style.display = 'none';
    
    clearInterval(intervalo);
    prepararRonda(); 
}

// Arranque inicial
prepararRonda();