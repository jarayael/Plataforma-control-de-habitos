// =============================================================
//  Mis Hábitos — lógica de la aplicación
//  Los datos se guardan en el navegador (localStorage), así que
//  no necesitas servidor ni base de datos por ahora.
// =============================================================

const CLAVE_STORAGE = 'habitos';
const DIAS_VISIBLES = 7;

// --- Referencias a elementos del HTML ---
const form = document.getElementById('form-habito');
const input = document.getElementById('input-habito');
const lista = document.getElementById('lista-habitos');
const mensajeVacio = document.getElementById('mensaje-vacio');
const fechaHoy = document.getElementById('fecha-hoy');
const textoProgreso = document.getElementById('texto-progreso');
const barraRelleno = document.getElementById('barra-relleno');

// --- Utilidades de fechas ---

// Convierte una fecha a texto "AAAA-MM-DD" usando la hora local.
// (No usamos toISOString() porque usa hora UTC y puede cambiar el día.)
function fechaATexto(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Devuelve la fecha de hace "n" días.
function haceDias(n) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - n);
  return fecha;
}

// --- Guardar y cargar datos ---

// Cada hábito tiene esta forma:
// { id: "abc123", nombre: "Leer", completados: ["2026-11-24", ...] }
function cargarHabitos() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];
  } catch {
    return [];
  }
}

function guardarHabitos() {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(habitos));
}

let habitos = cargarHabitos();

// --- Acciones ---

function agregarHabito(nombre) {
  habitos.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nombre: nombre,
    completados: [],
  });
  guardarHabitos();
  dibujar();
}

function eliminarHabito(id) {
  const habito = habitos.find((h) => h.id === id);
  if (!confirm(`¿Eliminar el hábito "${habito.nombre}"?`)) return;

  habitos = habitos.filter((h) => h.id !== id);
  guardarHabitos();
  dibujar();
}

// Marca o desmarca un día como completado.
function alternarDia(id, fecha) {
  const habito = habitos.find((h) => h.id === id);
  const posicion = habito.completados.indexOf(fecha);

  if (posicion === -1) {
    habito.completados.push(fecha);
  } else {
    habito.completados.splice(posicion, 1);
  }
  guardarHabitos();
  dibujar();
}

// Cuenta cuántos días seguidos se ha cumplido el hábito.
// Si hoy todavía no lo marcas, la racha se cuenta desde ayer
// (así no se "rompe" hasta que termine el día).
function calcularRacha(habito) {
  const hechos = new Set(habito.completados);
  let dia = hechos.has(fechaATexto(new Date())) ? 0 : 1;
  let racha = 0;

  while (hechos.has(fechaATexto(haceDias(dia)))) {
    racha++;
    dia++;
  }
  return racha;
}

// --- Dibujar la interfaz ---

function dibujarEncabezado() {
  const hoy = fechaATexto(new Date());
  const total = habitos.length;
  const hechosHoy = habitos.filter((h) => h.completados.includes(hoy)).length;
  const porcentaje = total === 0 ? 0 : Math.round((hechosHoy / total) * 100);

  fechaHoy.textContent = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  textoProgreso.textContent =
    total === 0
      ? 'Agrega hábitos para ver tu progreso'
      : `Hoy: ${hechosHoy} de ${total} completados (${porcentaje}%)`;
  barraRelleno.style.width = `${porcentaje}%`;
}

function crearTarjeta(habito) {
  const hoy = fechaATexto(new Date());

  const li = document.createElement('li');
  li.className = 'habito';

  // Nombre y racha
  const info = document.createElement('div');
  const nombre = document.createElement('span');
  nombre.className = 'habito-nombre';
  nombre.textContent = habito.nombre; // textContent evita inyectar HTML
  const racha = document.createElement('span');
  racha.className = 'habito-racha';
  const dias = calcularRacha(habito);
  racha.textContent = dias > 0 ? `🔥 Racha de ${dias} día${dias === 1 ? '' : 's'}` : 'Sin racha aún';
  info.append(nombre, racha);

  // Botón eliminar
  const botonEliminar = document.createElement('button');
  botonEliminar.className = 'eliminar';
  botonEliminar.textContent = '×';
  botonEliminar.setAttribute('aria-label', `Eliminar ${habito.nombre}`);
  botonEliminar.addEventListener('click', () => eliminarHabito(habito.id));

  // Fila de los últimos 7 días (de más antiguo a hoy)
  const semana = document.createElement('div');
  semana.className = 'semana';

  for (let i = DIAS_VISIBLES - 1; i >= 0; i--) {
    const fecha = haceDias(i);
    const texto = fechaATexto(fecha);
    const hecho = habito.completados.includes(texto);

    const boton = document.createElement('button');
    boton.className = 'dia';
    if (hecho) boton.classList.add('hecho');
    if (texto === hoy) boton.classList.add('hoy');
    boton.setAttribute('aria-pressed', hecho);
    boton.title = fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

    const letra = document.createElement('span');
    letra.textContent = fecha.toLocaleDateString('es', { weekday: 'narrow' });
    const numero = document.createElement('strong');
    numero.textContent = fecha.getDate();
    boton.append(letra, numero);

    boton.addEventListener('click', () => alternarDia(habito.id, texto));
    semana.appendChild(boton);
  }

  li.append(info, botonEliminar, semana);
  return li;
}

function dibujar() {
  dibujarEncabezado();

  lista.innerHTML = '';
  habitos.forEach((habito) => lista.appendChild(crearTarjeta(habito)));

  mensajeVacio.hidden = habitos.length > 0;
}

// --- Eventos ---

form.addEventListener('submit', (evento) => {
  evento.preventDefault(); // evita que la página se recargue
  const nombre = input.value.trim();
  if (nombre === '') return;

  agregarHabito(nombre);
  input.value = '';
  input.focus();
});

// Primer dibujo al abrir la página
dibujar();
