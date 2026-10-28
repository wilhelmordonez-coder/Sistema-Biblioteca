const form = $('#form-prestamo'), tbody = $('#tabla-prestamos tbody');
let prestamos = [];

const enDias = n => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA');
const reglas = {
  id_usuario: regla([v => v, 'Seleccione un usuario']),
  id_libro: regla([v => v, 'Seleccione un material disponible']),
  fecha_devolucion: regla(obligatorio('La fecha'), [v => v >= hoy(), 'La fecha no puede ser anterior a hoy'])
};

function pintar() {
  const q = $('#buscar').value.toLowerCase();
  renderTabla(tbody,
    prestamos.filter(p => `${p.titulo} ${p.nombre}`.toLowerCase().includes(q) && (!$('#filtro').value || estadoPrestamo(p)[0] === $('#filtro').value)),
    ['id_prestamo', p => `${esc(p.titulo)}<span class="sub">${esc(p.tipo)}</span>`, 'nombre', p => fecha(p.fecha_prestamo), p => fecha(p.fecha_devolucion), p => fecha(p.fecha_entrega), p => badge(estadoPrestamo(p))],
    p => p.fecha_entrega ? '' : `<button class="btn-sec" data-devolver="${p.id_prestamo}">Devolver</button>`);
}

const cargar = () => intentar(async () => {
  const [lista, usuarios, libros] = await Promise.all([api.prestamos.listar(), api.usuarios.listar(), api.libros.listar()]);
  prestamos = lista.sort((a, b) => b.id_prestamo - a.id_prestamo);
  form.id_usuario.innerHTML = opciones(usuarios, 'id_usuario', u => u.nombre, 'Seleccione un usuario');
  form.id_libro.innerHTML = opciones(libros.filter(l => +l.disponible), 'id_libro', l => `${l.tipo}: ${l.titulo}`, 'Seleccione un material disponible');
  pintar();
});

function reiniciar() {
  form.reset();
  Object.assign(form.fecha_devolucion, { min: hoy(), value: enDias(7) });
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const datos = validar(form, reglas);
  if (datos) intentar(async () => {
    await api.prestamos.crear({ ...datos, id_usuario: +datos.id_usuario, id_libro: +datos.id_libro });
    toast('Préstamo registrado');
    reiniciar();
    cargar();
  }, e.submitter);
});

tbody.addEventListener('click', ({ target: { dataset: { devolver } } }) => {
  if (devolver && confirm('¿Registrar la devolución de este material?'))
    intentar(async () => { await api.prestamos.devolver(devolver); toast('Devolución registrada'); cargar(); });
});

$('#buscar').addEventListener('input', pintar);
$('#filtro').value = param('estado');
$('#filtro').addEventListener('change', pintar);
reiniciar();
cargar();
