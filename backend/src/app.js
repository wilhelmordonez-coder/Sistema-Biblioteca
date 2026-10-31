// Configuración de Express: middlewares, frontend estático y rutas de la API.
const path = require('path');
const express = require('express');
const cors = require('cors');

const rutasApi = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/errores');

const app = express();

// Permite llamar a la API desde otro origen (por ejemplo, Live Server en el puerto 5500).
app.use(cors());

// Convierte el cuerpo JSON de la petición en un objeto disponible en req.body.
app.use(express.json({ limit: '100kb' }));

// Sirve el frontend: http://localhost:3000 abre frontend/index.html
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Todas las rutas de la API empiezan con /api
app.use('/api', rutasApi);

// Manejo de errores: siempre al final.
app.use('/api', rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
