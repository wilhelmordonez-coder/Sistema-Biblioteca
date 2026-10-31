// Conexión a MySQL con un "pool" de conexiones (paquete mysql2).
// El pool mantiene varias conexiones abiertas y las reutiliza, en lugar de
// abrir y cerrar una conexión nueva en cada petición.
// Los datos de conexión vienen de variables de entorno (.env), nunca del código.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true // las fechas llegan como 'YYYY-MM-DD' (lo requiere el frontend)
});

// Se ejecuta al arrancar. Si MySQL está apagado solo muestra un aviso:
// la API sigue encendida y cada petición responderá 503.
async function probarConexion() {
  try {
    await pool.query('SELECT 1');
    console.log(`✔ Conectado a MySQL (${process.env.DB_NAME})`);
  } catch (error) {
    console.error('✖ No se pudo conectar a MySQL:', error.code || error.message);
  }
}

// Ejecuta varias consultas como una sola unidad (transacción).
// Si cualquiera falla, se deshacen todas (ROLLBACK).
async function enTransaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { pool, probarConexion, enTransaccion };
