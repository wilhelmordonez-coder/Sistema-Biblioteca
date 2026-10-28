const form = $('#form-libro'), resultados = $('#resultados'), vistaPrevia = $('#vista-portada');
const anioActual = new Date().getFullYear();
const quetzales = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
let libros = [], tipoActivo = param('tipo'), vista = 'tabla';

const codigos = {
  Libro: regla(obligatorio('El ISBN'), [v => /^(\d{10}|\d{13})$/.test(v.replace(/-/g, '')), 'El ISBN debe tener 10 o 13 dígitos']),
  Revista: regla(obligatorio('El ISSN'), [v => /^\d{4}-?\d{3}[\dX]$/i.test(v), 'El ISSN tiene el formato 1234-567X']),
  Tesis: () => ''
};
const esUrl = v => /^https?:\/\/\S+$/i.test(v);
const reglas = {
  tipo: regla([v => v in codigos, 'Seleccione un tipo válido']),
  titulo: regla(obligatorio('El título')),
  autor: regla(obligatorio('El autor')),
  codigo: (v, datos) => (codigos[datos.tipo] || codigos.Tesis)(v),
  anio_publicacion: regla(obligatorio('El año'), [v => Number.isInteger(+v) && v >= 1450 && v <= anioActual, `El año debe estar entre 1450 y ${anioActual}`]),
  precio: regla([v => v === '' || /^\d{1,6}(\.\d{1,2})?$/.test(v), 'Ingrese un valor positivo con hasta 2 decimales']),
  portada_url: regla([v => v === '' || esUrl(v), 'La URL debe iniciar con http:// o https://'])
};
const normalizar = { Libro: v => v.replace(/-/g, ''), Revista: v => v.replace('-', '').toUpperCase().replace(/^(\d{4})/, '$1-'), Tesis: () => null };

const estadoLibro = l => +l.disponible ? ['Disponible', 'ok'] : ['Prestado', 'no'];
const precio = l => l.precio == null ? '—' : quetzales.format(l.precio);
const urlPortada = l => l.portada_url || (l.tipo === 'Libro' && l.codigo ? `https://covers.openlibrary.org/b/isbn/${l.codigo}-M.jpg?default=false` : '');
const portada = (l, clase = '') => `<div class="portada ${clase}" data-letra="${esc(l.titulo[0])}">${urlPortada(l) ? `<img src="${esc(urlPortada(l))}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
const acciones = l => `<button class="btn-sec" data-editar="${l.id_libro}">Editar</button><button class="btn-peligro" data-eliminar="${l.id_libro}">Eliminar</button>`;
const ficha = l => `<article class="ficha">${portada(l)}<span class="sub">${esc(l.tipo)}, ${esc(l.anio_publicacion)}</span><h3>${esc(l.titulo)}</h3>
  <span class="autor">${esc(l.autor)}</span><span class="sub">${[esc(l.codigo ?? ''), l.precio == null ? '' : precio(l)].filter(Boolean).join(', ') || 'Sin código'}</span>
  <div class="pie">${badge(estadoLibro(l))}<div>${acciones(l)}</div></div></article>`;

function pintar() {
  const q = $('#buscar').value.toLowerCase(), f = $('#filtro').value;
  const filas = libros.filter(l => (!tipoActivo || l.tipo === tipoActivo) && (f === '' || +l.disponible == f) && `${l.titulo} ${l.autor} ${l.codigo ?? ''}`.toLowerCase().includes(q));
  $('#conteo').textContent = `${filas.length} ${filas.length === 1 ? 'resultado' : 'resultados'}`;
  if (vista === 'tarjetas') return resultados.innerHTML = filas.length ? `<div class="fichas">${filas.map(ficha).join('')}</div>` : '<p class="vacio">No hay material que coincida con la búsqueda.</p>';
  resultados.innerHTML = '<div class="tabla"><table><thead><tr><th>ID</th><th>Material</th><th>Tipo</th><th>Valor</th><th>Estado</th><th></th></tr></thead><tbody></tbody></table></div>';
  renderTabla(resultados.querySelector('tbody'), filas, ['id_libro',
    l => `<div class="celda-material">${portada(l, 'mini')}<div>${esc(l.titulo)}<span class="sub">${esc(l.autor)}, ${esc(l.anio_publicacion)}</span></div></div>`,
    l => `${esc(l.tipo)}<span class="sub">${esc(l.codigo ?? 'Sin código')}</span>`, precio, l => badge(estadoLibro(l))], acciones);
}

const cargar = () => intentar(async () => { libros = await api.libros.listar(); pintar(); });

function ajustarCodigo() {
  const tipo = form.tipo.value, campo = form.codigo.closest('label');
  campo.hidden = tipo === 'Tesis';
  campo.firstChild.textContent = tipo === 'Revista' ? 'ISSN' : 'ISBN';
  form.codigo.placeholder = tipo === 'Revista' ? '1234-567X' : '10 o 13 dígitos';
}

function mostrarPortada() {
  const url = form.portada_url.value.trim();
  vistaPrevia.hidden = !esUrl(url);
  if (!vistaPrevia.hidden) vistaPrevia.src = url;
}

function modoEdicion(activo) {
  $('#titulo-form').textContent = activo ? 'Editar material' : 'Nuevo material';
  form.querySelector('[type=submit]').textContent = activo ? 'Guardar cambios' : 'Guardar material';
  $('#cancelar').hidden = !activo;
  if (!activo) { form.reset(); form.id_libro.value = ''; form.tipo.value = tipoActivo || 'Libro'; limpiarErrores(form); }
  ajustarCodigo();
  mostrarPortada();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const datos = validar(form, reglas);
  if (!datos) return;
  const { id_libro, ...libro } = datos;
  Object.assign(libro, {
    codigo: normalizar[libro.tipo](libro.codigo),
    anio_publicacion: +libro.anio_publicacion,
    precio: libro.precio === '' ? null : +libro.precio,
    portada_url: libro.portada_url || null
  });
  intentar(async () => {
    await (id_libro ? api.libros.actualizar(id_libro, libro) : api.libros.crear(libro));
    toast(id_libro ? 'Cambios guardados' : 'Material registrado');
    modoEdicion(false);
    cargar();
  }, e.submitter);
});

resultados.addEventListener('click', ({ target: { dataset: { editar, eliminar } } }) => {
  if (editar) intentar(async () => { llenarForm(form, await api.libros.obtener(editar)); modoEdicion(true); form.titulo.focus(); });
  if (eliminar && confirm('¿Eliminar este material? Esta acción no se puede deshacer.'))
    intentar(async () => { await api.libros.eliminar(eliminar); toast('Material eliminado'); cargar(); });
});

form.tipo.addEventListener('change', () => { ajustarCodigo(); limpiarErrores(form); });
form.portada_url.addEventListener('input', mostrarPortada);
vistaPrevia.addEventListener('error', () => vistaPrevia.hidden = true);
$('#cancelar').addEventListener('click', () => modoEdicion(false));
$('#buscar').addEventListener('input', pintar);
$('#filtro').addEventListener('change', pintar);
$('#tipo-filtro').value = tipoActivo;
$('#tipo-filtro').addEventListener('change', e => { tipoActivo = e.target.value; if (!form.id_libro.value) modoEdicion(false); pintar(); });
segmento('#vista', vista, v => { vista = v; pintar(); });
modoEdicion(false);
cargar();
