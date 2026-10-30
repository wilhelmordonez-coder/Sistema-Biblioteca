// Controlador del material bibliográfico (CRUD completo).
// Todas las consultas son PARAMETRIZADAS: los valores van en el arreglo
// y mysql2 los sustituye en cada "?" de forma segura (evita inyección SQL).
const { pool } = require('../config/db');
const { HttpError } = require('../middlewares/errores');
const { validarId, validarLibro } = require('../utils/validaciones');

const COLUMNAS = 'id_libro, tipo, titulo, autor, codigo, anio_publicacion, precio, portada_url, disponible';

async function buscarPorId(id) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM libros WHERE id_libro = ?`, [id]);
  if (filas.length === 0) throw new HttpError(404, 'Material no encontrado');
  return filas[0];
}

// Traduce el error de código duplicado (UNIQUE) a un mensaje claro.
function codigoDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    return new HttpError(409, 'Ya existe un material registrado con ese código (ISBN o ISSN)');
  }
  return error;
}

// GET /api/libros → 200
async function listar(req, res) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM libros ORDER BY id_libro`);
  res.json(filas);
}

// GET /api/libros/:id → 200 | 400 | 404
async function obtener(req, res) {
  const id = validarId(req.params.id);
  res.json(await buscarPorId(id));
}

// POST /api/libros → 201 | 400 | 409
async function crear(req, res) {
  const l = validarLibro(req.body);
  try {
    const [resultado] = await pool.query(
      `INSERT INTO libros (tipo, titulo, autor, codigo, anio_publicacion, precio, portada_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [l.tipo, l.titulo, l.autor, l.codigo, l.anio_publicacion, l.precio, l.portada_url]
    );
    res.status(201).json(await buscarPorId(resultado.insertId));
  } catch (error) {
    throw codigoDuplicado(error);
  }
}

// PUT /api/libros/:id → 200 | 400 | 404 | 409
// "disponible" no se modifica aquí: solo cambia con préstamos y devoluciones.
async function actualizar(req, res) {
  const id = validarId(req.params.id);
  const l = validarLibro(req.body);
  try {
    const [resultado] = await pool.query(
      `UPDATE libros
          SET tipo = ?, titulo = ?, autor = ?, codigo = ?, anio_publicacion = ?, precio = ?, portada_url = ?
        WHERE id_libro = ?`,
      [l.tipo, l.titulo, l.autor, l.codigo, l.anio_publicacion, l.precio, l.portada_url, id]
    );
    if (resultado.affectedRows === 0) throw new HttpError(404, 'Material no encontrado');
    res.json(await buscarPorId(id));
  } catch (error) {
    throw codigoDuplicado(error);
  }
}

// DELETE /api/libros/:id → 200 | 400 | 404 | 409
async function eliminar(req, res) {
  const id = validarId(req.params.id);
  await buscarPorId(id); // 404 si no existe

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM prestamos WHERE id_libro = ?', [id]);
  if (total > 0) throw new HttpError(409, 'No se puede eliminar: el material tiene préstamos registrados');

  await pool.query('DELETE FROM libros WHERE id_libro = ?', [id]);
  res.json({ mensaje: 'Material eliminado' });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
