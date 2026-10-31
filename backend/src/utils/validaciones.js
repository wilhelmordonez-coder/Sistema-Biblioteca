// Validaciones del backend.
// Repiten las reglas del frontend porque cualquiera puede llamar a la API
// directamente (por ejemplo, desde Postman) sin pasar por el formulario.
const { HttpError } = require('../middlewares/errores');

const texto = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const vacio = (v) => v === undefined || v === null || texto(v) === '';

// Fecha local de hoy en formato YYYY-MM-DD
const hoy = () => new Date().toLocaleDateString('en-CA');

// Valida que :id sea un entero positivo; si no, 400.
function validarId(valor, nombre = 'id') {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `El ${nombre} debe ser un número entero positivo`);
  }
  return id;
}

// Lanza 400 con todos los mensajes encontrados.
function revisar(errores) {
  if (errores.length) throw new HttpError(400, errores.join('. '));
}

// ---------------------------------------------------------------------
// Material bibliográfico
// Devuelve los datos limpios y normalizados, listos para el SQL.
// ---------------------------------------------------------------------
const TIPOS = ['Libro', 'Revista', 'Tesis'];

function validarLibro(body = {}) {
  const errores = [];
  const tipo = texto(body.tipo);
  const titulo = texto(body.titulo);
  const autor = texto(body.autor);
  let codigo = texto(body.codigo);
  const anio = Number(body.anio_publicacion);
  const anioActual = new Date().getFullYear();
  const precioTexto = texto(body.precio);
  const portada = texto(body.portada_url);

  if (!TIPOS.includes(tipo)) errores.push('El tipo debe ser Libro, Revista o Tesis');
  if (!titulo) errores.push('El título es obligatorio');
  else if (titulo.length > 150) errores.push('El título admite máximo 150 caracteres');
  if (!autor) errores.push('El autor es obligatorio');
  else if (autor.length > 100) errores.push('El autor admite máximo 100 caracteres');

  if (tipo === 'Libro') {
    codigo = codigo.replace(/-/g, '');
    if (!/^(\d{10}|\d{13})$/.test(codigo)) errores.push('El ISBN debe tener 10 o 13 dígitos');
  } else if (tipo === 'Revista') {
    if (!/^\d{4}-?\d{3}[\dX]$/i.test(codigo)) errores.push('El ISSN tiene el formato 1234-567X');
    codigo = codigo.replace('-', '').toUpperCase().replace(/^(\d{4})/, '$1-');
  } else {
    codigo = null; // las tesis no llevan código
  }

  if (vacio(body.anio_publicacion)) errores.push('El año es obligatorio');
  else if (!Number.isInteger(anio) || anio < 1450 || anio > anioActual) {
    errores.push(`El año debe estar entre 1450 y ${anioActual}`);
  }

  let precio = null;
  if (precioTexto !== '') {
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(precioTexto)) errores.push('El valor de reposición debe ser positivo con hasta 2 decimales');
    else precio = Number(precioTexto);
  }

  if (portada !== '' && (!/^https?:\/\/\S+$/i.test(portada) || portada.length > 500)) {
    errores.push('La URL de portada debe iniciar con http:// o https://');
  }

  revisar(errores);
  return { tipo, titulo, autor, codigo, anio_publicacion: anio, precio, portada_url: portada || null };
}

// ---------------------------------------------------------------------
// Usuarios (lectores)
// ---------------------------------------------------------------------
function validarUsuario(body = {}) {
  const errores = [];
  const nombre = texto(body.nombre).replace(/\s+/g, ' ');
  const correo = texto(body.correo).toLowerCase();
  const telefono = texto(body.telefono);

  if (!nombre) errores.push('El nombre es obligatorio');
  else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]{3,100}$/.test(nombre)) errores.push('El nombre solo admite letras (mínimo 3)');

  if (!correo) errores.push('El correo es obligatorio');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 100) errores.push('El correo no es válido');

  if (!telefono) errores.push('El teléfono es obligatorio');
  else if (!/^\d{8}$/.test(telefono)) errores.push('El teléfono debe tener 8 dígitos');

  revisar(errores);
  return { nombre, correo, telefono };
}

// ---------------------------------------------------------------------
// Préstamos
// ---------------------------------------------------------------------
function validarPrestamo(body = {}) {
  const errores = [];
  const idUsuario = Number(body.id_usuario);
  const idLibro = Number(body.id_libro);
  const fechaDevolucion = texto(body.fecha_devolucion);

  if (!Number.isInteger(idUsuario) || idUsuario <= 0) errores.push('Seleccione un usuario válido');
  if (!Number.isInteger(idLibro) || idLibro <= 0) errores.push('Seleccione un material válido');

  if (!fechaDevolucion) errores.push('La fecha de devolución es obligatoria');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucion) || Number.isNaN(Date.parse(fechaDevolucion))) {
    errores.push('La fecha de devolución debe tener el formato AAAA-MM-DD');
  } else if (fechaDevolucion < hoy()) {
    errores.push('La fecha de devolución no puede ser anterior a hoy');
  }

  revisar(errores);
  return { id_usuario: idUsuario, id_libro: idLibro, fecha_devolucion: fechaDevolucion };
}

module.exports = { validarId, validarLibro, validarUsuario, validarPrestamo, hoy };
