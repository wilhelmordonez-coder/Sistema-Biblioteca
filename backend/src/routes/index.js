// Rutas de la API. Cada ruta conecta un método HTTP + URL con su controlador.
//   req.params → datos en la URL         (/api/libros/:id  → req.params.id)
//   req.body   → datos JSON del cuerpo   (POST y PUT)
const { Router } = require('express');
const { pool } = require('../config/db');
const { manejar } = require('../middlewares/errores');

const libros = require('../controllers/libros.controller');
const usuarios = require('../controllers/usuarios.controller');
const prestamos = require('../controllers/prestamos.controller');

const router = Router();

// Estado de la API y de MySQL (útil para la demo con MySQL apagado → 503)
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ api: 'activa', baseDeDatos: 'conectada' });
  } catch {
    res.status(503).json({ error: 'La base de datos no está disponible', api: 'activa' });
  }
});

// Material bibliográfico: CRUD completo
router.get('/libros', manejar(libros.listar));
router.get('/libros/:id', manejar(libros.obtener));
router.post('/libros', manejar(libros.crear));
router.put('/libros/:id', manejar(libros.actualizar));
router.delete('/libros/:id', manejar(libros.eliminar));

// Usuarios: registrar y consultar
router.get('/usuarios', manejar(usuarios.listar));
router.get('/usuarios/:id', manejar(usuarios.obtener));
router.post('/usuarios', manejar(usuarios.crear));

// Préstamos y devoluciones
router.get('/prestamos', manejar(prestamos.listar));
router.get('/prestamos/:id', manejar(prestamos.obtener));
router.post('/prestamos', manejar(prestamos.crear));
router.put('/prestamos/:id/devolucion', manejar(prestamos.devolver));

module.exports = router;
