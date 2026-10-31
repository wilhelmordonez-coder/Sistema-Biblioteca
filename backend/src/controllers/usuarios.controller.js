// Controlador de usuarios (lectores): registrar y consultar.
const { pool } = require('../config/db');
const { HttpError } = require('../middlewares/errores');
const { validarId, validarUsuario } = require('../utils/validaciones');

const COLUMNAS = 'id_usuario, nombre, correo, telefono';

async function buscarPorId(id) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuarios WHERE id_usuario = ?`, [id]);
  if (filas.length === 0) throw new HttpError(404, 'Usuario no encontrado');
  return filas[0];
}

// GET /api/usuarios → 200
async function listar(req, res) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuarios ORDER BY nombre`);
  res.json(filas);
}

// GET /api/usuarios/:id → 200 | 400 | 404
async function obtener(req, res) {
  const id = validarId(req.params.id);
  res.json(await buscarPorId(id));
}

// POST /api/usuarios → 201 | 400 | 409
async function crear(req, res) {
  const u = validarUsuario(req.body);
  try {
    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, telefono) VALUES (?, ?, ?)',
      [u.nombre, u.correo, u.telefono]
    );
    res.status(201).json(await buscarPorId(resultado.insertId));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Ya existe un usuario registrado con ese correo');
    throw error;
  }
}

module.exports = { listar, obtener, crear };
