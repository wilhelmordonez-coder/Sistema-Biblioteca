// Manejo centralizado de errores.
// Los controladores lanzan errores y aquí se decide el código HTTP.
// Todas las respuestas de error tienen la forma: { "error": "mensaje" }

// Error con código HTTP propio. Ejemplo: throw new HttpError(404, 'Material no encontrado')
class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Express 4 no captura errores de funciones async por sí solo.
// Este envoltorio los atrapa y los pasa a manejadorErrores con next().
const manejar = (controlador) => (req, res, next) =>
  Promise.resolve(controlador(req, res, next)).catch(next);

// Cualquier ruta /api que no exista → 404
function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Códigos de error de MySQL cuando la base de datos no está disponible.
const SIN_CONEXION = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'];

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  // JSON mal escrito en el body → 400
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  // Errores que lanzamos nosotros (400, 404, 409)
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // MySQL apagado o credenciales incorrectas → 503 Service Unavailable
  if (SIN_CONEXION.includes(err.code)) {
    console.error('Base de datos no disponible:', err.code);
    return res.status(503).json({ error: 'La base de datos no está disponible. Intente más tarde.' });
  }

  // Restricciones de MySQL que se escaparon de las validaciones → 409
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar: tiene préstamos registrados' });
  }

  // Cualquier otro error → 500, sin mostrar detalles internos al cliente
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { HttpError, manejar, rutaNoEncontrada, manejadorErrores };
