// Controlador de préstamos y devoluciones.
const { pool, enTransaccion } = require('../config/db');
const { HttpError } = require('../middlewares/errores');
const { validarId, validarPrestamo } = require('../utils/validaciones');

// JOIN para devolver el préstamo con el título y tipo del material
// y el nombre del usuario (lo que muestra la tabla del frontend).
const SELECT_DETALLE = `
  SELECT p.id_prestamo, p.id_libro, p.id_usuario,
         p.fecha_prestamo, p.fecha_devolucion, p.fecha_entrega,
         l.titulo, l.tipo, u.nombre
    FROM prestamos p
    JOIN libros   l ON l.id_libro   = p.id_libro
    JOIN usuarios u ON u.id_usuario = p.id_usuario`;

async function buscarPorId(id, conexion = pool) {
  const [filas] = await conexion.query(`${SELECT_DETALLE} WHERE p.id_prestamo = ?`, [id]);
  if (filas.length === 0) throw new HttpError(404, 'Préstamo no encontrado');
  return filas[0];
}

// GET /api/prestamos → 200 (historial completo, el más reciente primero)
async function listar(req, res) {
  const [filas] = await pool.query(`${SELECT_DETALLE} ORDER BY p.id_prestamo DESC`);
  res.json(filas);
}

// GET /api/prestamos/:id → 200 | 400 | 404
async function obtener(req, res) {
  const id = validarId(req.params.id);
  res.json(await buscarPorId(id));
}

// POST /api/prestamos → 201 | 400 | 404 | 409
// REGLA DE NEGOCIO: no se presta un material que ya está prestado.
// Todo ocurre en una transacción: o se hacen el INSERT y el UPDATE, o ninguno.
async function crear(req, res) {
  const datos = validarPrestamo(req.body);

  const prestamo = await enTransaccion(async (conexion) => {
    // FOR UPDATE bloquea la fila del material hasta terminar la transacción,
    // así dos préstamos simultáneos del mismo material no pueden colarse.
    const [libros] = await conexion.query(
      'SELECT disponible FROM libros WHERE id_libro = ? FOR UPDATE',
      [datos.id_libro]
    );
    if (libros.length === 0) throw new HttpError(404, 'Material no encontrado');
    if (!libros[0].disponible) throw new HttpError(409, 'El material ya se encuentra prestado');

    const [usuarios] = await conexion.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [datos.id_usuario]);
    if (usuarios.length === 0) throw new HttpError(404, 'Usuario no encontrado');

    const [resultado] = await conexion.query(
      `INSERT INTO prestamos (id_libro, id_usuario, fecha_prestamo, fecha_devolucion)
       VALUES (?, ?, CURDATE(), ?)`,
      [datos.id_libro, datos.id_usuario, datos.fecha_devolucion]
    );
    await conexion.query('UPDATE libros SET disponible = FALSE WHERE id_libro = ?', [datos.id_libro]);

    return buscarPorId(resultado.insertId, conexion);
  }).catch((error) => {
    // Última barrera: el índice único de la base de datos (libro_activo).
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'El material ya se encuentra prestado');
    throw error;
  });

  res.status(201).json(prestamo);
}

// PUT /api/prestamos/:id/devolucion → 200 | 400 | 404 | 409
// Registra la fecha de entrega y vuelve a marcar el material como disponible.
async function devolver(req, res) {
  const id = validarId(req.params.id);

  const prestamo = await enTransaccion(async (conexion) => {
    const [filas] = await conexion.query(
      'SELECT id_libro, fecha_entrega FROM prestamos WHERE id_prestamo = ? FOR UPDATE',
      [id]
    );
    if (filas.length === 0) throw new HttpError(404, 'Préstamo no encontrado');
    if (filas[0].fecha_entrega) throw new HttpError(409, 'Este préstamo ya fue devuelto');

    await conexion.query('UPDATE prestamos SET fecha_entrega = CURDATE() WHERE id_prestamo = ?', [id]);
    await conexion.query('UPDATE libros SET disponible = TRUE WHERE id_libro = ?', [filas[0].id_libro]);

    return buscarPorId(id, conexion);
  });

  res.json(prestamo);
}

module.exports = { listar, obtener, crear, devolver };
