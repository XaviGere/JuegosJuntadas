// Configuración por defecto inicial
let tiempoMaximo = 15;
let tiempo = tiempoMaximo;
let intervalo = null;
let pausado = true;

const todasLasLetras = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
// Empezamos con tu lista personalizada de 20 letras
let letrasActivas = "ABCDEFGHIJLMNOPRSTUV".split(""); 

let categoriasBasta = [
    "Nombre Mujer", "Nombre Hombre", "Héroes/Villanos", "Banda de música", "Animal", 
    "Color", "Fruta o Verdura", "Cosa", "País o Ciudad", "Profesión", "Marca", "Película/Serie"
];

// Elementos del DOM
const displayContador = document.getElementById('contador');
const btnPausa = document.getElementById('btnPausa');
const ruletaContenedor = document.getElementById('ruletaContenedor');
const textoCategoria = document.getElementById('textoCategoria');
const modalConfig = document.getElementById('modalConfig');

// DIBUJAR LA RULETA DE FORMA DINÁMICA
function renderizarRuleta() {
    // Limpiar letras viejas del HTML sin borrar el reloj central
    const letrasViejas = ruletaContenedor.querySelectorAll('.letra');
    letrasViejas.forEach(el => el.remove());

    const cantidad = letrasActivas.length;
    if (cantidad === 0) return;

    const radioCirculo = 190; 
    const centroX = 230; // Mitad del contenedor de 460px
    const centroY = 230;
    const anguloPaso = (2 * Math.PI) / cantidad;

    letrasActivas.forEach((letra, index) => {
        const divLetra = document.createElement('div');
        divLetra.className = 'letra';
        divLetra.innerText = letra;

        // Distribución angular
        const anguloActual = index * anguloPaso - (Math.PI / 2);
        const posX = centroX + radioCirculo * Math.cos(anguloActual);
        const posY = centroY + radioCirculo * Math.sin(anguloActual);

        divLetra.style.left = `${posX}px`;
        divLetra.style.top = `${posY}px`;

        divLetra.onclick = function() {
            this.classList.toggle('usada');
        };

        ruletaContenedor.appendChild(divLetra);
    });
}

// LÓGICA DEL TEMPORIZADOR
function actualizarDisplay() {
    displayContador.innerText = tiempo;
}

function arrancarReloj() {
    if (intervalo) clearInterval(intervalo);
    pausado = false;
    btnPausa.innerText = "PAUSA";
    
    intervalo = setInterval(() => {
        if (!pausado && tiempo > 0) {
            tiempo--;
            actualizarDisplay();
        } else if (tiempo === 0) {
            clearInterval(intervalo);
        }
    }, 1000);
}

function tocarReloj() {
    tiempo = tiempoMaximo;
    actualizarDisplay();
    arrancarReloj();
}

function alternarPausa() {
    if (tiempo === 0) return;
    pausado = !pausado;
    btnPausa.innerText = pausado ? "REANUDAR" : "PAUSA";
    
    if (!pausado) arrancarReloj();
    else clearInterval(intervalo);
}

function reiniciarTodo() {
    clearInterval(intervalo);
    tiempo = tiempoMaximo;
    pausado = true;
    actualizarDisplay();
    btnPausa.innerText = "PAUSA";
    textoCategoria.innerText = "Toca para elegir";
    document.querySelectorAll('.letra').forEach(el => el.classList.remove('usada'));
}

function tirarCategoria() {
    if(categoriasBasta.length === 0) {
        textoCategoria.innerText = "Sin categorías";
        return;
    }
    const indiceAleatorio = Math.floor(Math.random() * categoriasBasta.length);
    textoCategoria.innerText = categoriasBasta[indiceAleatorio];
}

// LOGICA DEL MODAL DE CONFIGURACIÓN
function abrirModal() {
    // Frenar juego actual por las dudas
    clearInterval(intervalo);
    pausado = true;
    btnPausa.innerText = "PAUSA";

    document.getElementById('inputTiempo').value = tiempoMaximo;
    renderizarLetrasConfig();
    renderizarCategoriasConfig();
    modalConfig.style.display = 'flex';
}

function renderizarLetrasConfig() {
    const grid = document.getElementById('selectorLetrasGrid');
    grid.innerHTML = '';
    todasLasLetras.forEach(letra => {
        const item = document.createElement('div');
        item.className = 'letra-opcion';
        if (letrasActivas.includes(letra)) item.classList.add('activa');
        item.innerText = letra;
        
        item.onclick = function() {
            if (letrasActivas.includes(letra)) {
                letrasActivas = letrasActivas.filter(l => l !== letra);
                this.classList.remove('activa');
            } else {
                letrasActivas.push(letra);
                letrasActivas.sort(); // Mantiene orden alfabético si querés
                this.classList.add('activa');
            }
        };
        grid.appendChild(item);
    });
}

function renderizarCategoriasConfig() {
    const manager = document.getElementById('listaCategoriasManager');
    manager.innerHTML = '';
    categoriasBasta.forEach((cat, index) => {
        const item = document.createElement('div');
        item.className = 'item-categoria';
        item.innerHTML = `<span>${cat}</span><button class="btn-borrar-cat" onclick="eliminarCategoria(${index})">❌</button>`;
        manager.appendChild(item);
    });
}

function agregarNuevaCategoria() {
    const input = document.getElementById('nuevaCategoriaInput');
    const valor = input.value.trim();
    if (valor) {
        categoriasBasta.push(valor);
        input.value = '';
        renderizarCategoriasConfig();
    }
}

function eliminarCategoria(index) {
    categoriasBasta.splice(index, 1);
    renderizarCategoriasConfig();
}

function guardarConfiguracion() {
    const nuevoTiempo = parseInt(document.getElementById('inputTiempo').value);
    if(nuevoTiempo && nuevoTiempo >= 5) {
        tiempoMaximo = nuevoTiempo;
    }
    modalConfig.style.display = 'none';
    reiniciarTodo();
    renderizarRuleta(); // El algoritmo recalcula el círculo según las letras que quedaron
}

// Inicialización automática de la primera carga
renderizarRuleta();
actualizarDisplay();