const $ = s => document.querySelector(s);
const param = clave => new URLSearchParams(location.search).get(clave) || '';
const hoy = () => new Date().toLocaleDateString('en-CA');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
// ESTUDIANTE A: configurar dateStrings: true en el pool de mysql2 para que las fechas lleguen como 'YYYY-MM-DD'.
const iso = v => String(v ?? '').slice(0, 10);
const fecha = v => v ? iso(v).split('-').reverse().join('/') : '—';
const badge = ([texto, tipo]) => `<span class="badge ${tipo}">${texto}</span>`;
const estadoPrestamo = p => p.fecha_entrega ? ['Devuelto', 'fin'] : iso(p.fecha_devolucion) < hoy() ? ['Vencido', 'vencido'] : ['Activo', 'ok'];

const paginas = [['index.html', 'Inicio'], ['libros.html', 'Catálogo'], ['usuarios.html', 'Usuarios'], ['prestamos.html', 'Préstamos']];
const actual = location.pathname.split('/').pop() || 'index.html';
$('header').innerHTML = `<a class="marca" href="index.html">Biblioteca<span>Panel administrativo</span></a>
  <nav>${paginas.map(([href, texto]) => `<a href="${href}"${href === actual ? ' aria-current="page"' : ''}>${texto}</a>`).join('')}</nav>
  ${USE_MOCK ? '<span class="demo" title="Datos simulados en el navegador">Modo demostración</span>' : ''}`;
$('footer').textContent = 'Grupo 4, Desarrollo Web, Universidad Mariano Gálvez de Guatemala, 2026';

function toast(mensaje, tipo = 'ok') {
  const t = Object.assign(document.createElement('div'), { className: `toast ${tipo}`, textContent: mensaje, role: 'status' });
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

async function intentar(accion, boton) {
  if (boton) boton.disabled = true;
  try { await accion(); } catch (e) { toast(e.message, 'error'); } finally { if (boton) boton.disabled = false; }
}

function renderTabla(tbody, filas, columnas, acciones) {
  tbody.innerHTML = filas.length
    ? filas.map(f => `<tr>${columnas.map(c => `<td>${typeof c === 'function' ? c(f) : esc(f[c])}</td>`).join('')}${acciones ? `<td><div class="acciones">${acciones(f)}</div></td>` : ''}</tr>`).join('')
    : `<tr><td colspan="${columnas.length + !!acciones}" class="vacio">No hay registros para mostrar</td></tr>`;
}

function segmento(selector, inicial, alCambiar) {
  const cont = $(selector), marcar = v => cont.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.value === v));
  marcar(inicial);
  cont.addEventListener('click', ({ target: b }) => b.tagName === 'BUTTON' && (marcar(b.value), alCambiar(b.value)));
}

const opciones = (lista, clave, texto, vacio) => `<option value="">${vacio}</option>` + lista.map(r => `<option value="${r[clave]}">${esc(texto(r))}</option>`).join('');
const leerForm = form => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, v.trim()]));
const llenarForm = (form, datos) => Object.entries(datos).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v ?? ''));

function limpiarErrores(form) {
  form.querySelectorAll('small').forEach(s => s.textContent = '');
  form.querySelectorAll('.invalido').forEach(i => i.classList.remove('invalido'));
}

function validar(form, reglas) {
  limpiarErrores(form);
  const datos = leerForm(form);
  const errores = Object.entries(reglas).map(([campo, regla]) => [campo, regla(datos[campo] ?? '', datos)]).filter(([, msg]) => msg);
  errores.forEach(([campo, msg]) => {
    const input = form.elements[campo];
    input.classList.add('invalido');
    input.nextElementSibling.textContent = msg;
  });
  errores[0] && form.elements[errores[0][0]].focus();
  return errores.length ? null : datos;
}

const regla = (...pruebas) => v => pruebas.map(([ok, msg]) => !ok(v) && msg).find(Boolean) || '';
const obligatorio = nombre => [v => v !== '', `${nombre} es obligatorio`];
