// ESTUDIANTE A: los nombres de campos de estos datos deben coincidir con las columnas de MySQL que devuelve la API.
const semilla = {
  libros: [
    { id_libro: 1, precio: '185.00', portada_url: null, tipo: 'Libro', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', codigo: '9780307474728', anio_publicacion: 1967, disponible: false },
    { id_libro: 2, precio: '120.00', portada_url: null, tipo: 'Libro', titulo: 'El Señor Presidente', autor: 'Miguel Ángel Asturias', codigo: '9788437604183', anio_publicacion: 1946, disponible: true },
    { id_libro: 3, precio: '420.50', portada_url: null, tipo: 'Libro', titulo: 'Clean Code', autor: 'Robert C. Martin', codigo: '9780132350884', anio_publicacion: 2008, disponible: true },
    { id_libro: 4, precio: '310.00', portada_url: null, tipo: 'Libro', titulo: 'JavaScript: The Good Parts', autor: 'Douglas Crockford', codigo: '9780596517748', anio_publicacion: 2008, disponible: false },
    { id_libro: 5, precio: '95.00', portada_url: null, tipo: 'Revista', titulo: 'Communications of the ACM', autor: 'Association for Computing Machinery', codigo: '0001-0782', anio_publicacion: 2024, disponible: true },
    { id_libro: 6, precio: '110.00', portada_url: null, tipo: 'Revista', titulo: 'IEEE Software', autor: 'IEEE Computer Society', codigo: '0740-7459', anio_publicacion: 2025, disponible: true },
    { id_libro: 7, precio: null, portada_url: null, tipo: 'Tesis', titulo: 'Sistema web para el control de inventario hospitalario', autor: 'Luis Herrera', codigo: null, anio_publicacion: 2024, disponible: true },
    { id_libro: 8, precio: null, portada_url: null, tipo: 'Tesis', titulo: 'Análisis de seguridad en redes universitarias', autor: 'Sofía Morales', codigo: null, anio_publicacion: 2023, disponible: true }
  ],
  usuarios: [
    { id_usuario: 1, nombre: 'Ana López', correo: 'ana.lopez@miumg.edu.gt', telefono: '55123456' },
    { id_usuario: 2, nombre: 'Carlos Pérez', correo: 'carlos.perez@miumg.edu.gt', telefono: '44987654' },
    { id_usuario: 3, nombre: 'María Gómez', correo: 'maria.gomez@miumg.edu.gt', telefono: '30456789' }
  ],
  prestamos: [
    { id_prestamo: 1, id_libro: 1, id_usuario: 1, fecha_prestamo: '2026-10-15', fecha_devolucion: '2026-10-22', fecha_entrega: null },
    { id_prestamo: 2, id_libro: 4, id_usuario: 2, fecha_prestamo: '2026-10-25', fecha_devolucion: '2026-11-01', fecha_entrega: null },
    { id_prestamo: 3, id_libro: 3, id_usuario: 3, fecha_prestamo: '2026-10-10', fecha_devolucion: '2026-10-17', fecha_entrega: '2026-10-16' }
  ]
};

const db = JSON.parse(localStorage.getItem('mockDB_v3')) || structuredClone(semilla);
const guardar = () => localStorage.setItem('mockDB_v3', JSON.stringify(db));
const fallo = (status, error) => { throw Object.assign(new Error(error), { status }); };
const buscar = (tabla, id) => db[tabla].find(r => r[`id_${tabla.slice(0, -1)}`] == id) || fallo(404, 'Registro no encontrado');
const nuevoId = tabla => Math.max(0, ...db[tabla].map(r => r[`id_${tabla.slice(0, -1)}`])) + 1;
const conDetalle = p => { const l = buscar('libros', p.id_libro); return { ...p, titulo: l.titulo, tipo: l.tipo, nombre: buscar('usuarios', p.id_usuario).nombre }; };

const requeridos = { libros: ['tipo', 'titulo', 'autor', 'anio_publicacion'], usuarios: ['nombre', 'correo', 'telefono'], prestamos: ['id_libro', 'id_usuario', 'fecha_devolucion'] };

async function mockRequest(endpoint, method, body = {}) {
  await new Promise(r => setTimeout(r, 250));
  const [, tabla, id, accion] = endpoint.split('/');
  const clave = `id_${tabla.slice(0, -1)}`;
  if (['POST', 'PUT'].includes(method) && !accion && requeridos[tabla].some(c => !body[c])) fallo(400, 'Faltan campos obligatorios');
  if (tabla === 'libros' && body.tipo && !['Libro', 'Revista', 'Tesis'].includes(body.tipo)) fallo(400, 'Tipo de material no válido');

  if (method === 'GET') {
    const datos = id ? buscar(tabla, id) : db[tabla];
    return structuredClone(tabla === 'prestamos' ? (id ? conDetalle(datos) : datos.map(conDetalle)) : datos);
  }

  if (tabla === 'prestamos' && method === 'POST') {
    const libro = buscar('libros', body.id_libro);
    buscar('usuarios', body.id_usuario);
    if (!libro.disponible) fallo(409, 'El material ya se encuentra prestado');
    const prestamo = { id_prestamo: nuevoId('prestamos'), ...body, fecha_prestamo: hoy(), fecha_entrega: null };
    db.prestamos.push(prestamo);
    libro.disponible = false;
    guardar();
    return conDetalle(prestamo);
  }

  if (accion === 'devolucion') {
    const prestamo = buscar('prestamos', id);
    if (prestamo.fecha_entrega) fallo(409, 'Este préstamo ya fue devuelto');
    prestamo.fecha_entrega = hoy();
    buscar('libros', prestamo.id_libro).disponible = true;
    guardar();
    return conDetalle(prestamo);
  }

  if (method === 'POST') {
    const registro = { [clave]: nuevoId(tabla), ...body, ...(tabla === 'libros' && { disponible: true }) };
    db[tabla].push(registro);
    guardar();
    return registro;
  }

  const registro = buscar(tabla, id);
  if (method === 'PUT') {
    Object.assign(registro, body);
    guardar();
    return registro;
  }

  if (method === 'DELETE') {
    if (tabla !== 'prestamos' && db.prestamos.some(p => p[clave] == id)) fallo(409, 'No se puede eliminar: tiene préstamos registrados');
    db[tabla].splice(db[tabla].indexOf(registro), 1);
    guardar();
    return { mensaje: 'Registro eliminado' };
  }
}
