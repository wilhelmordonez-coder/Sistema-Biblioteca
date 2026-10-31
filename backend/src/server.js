// Punto de entrada de la API.
// 1) Carga las variables de entorno desde backend/.env
// 2) Levanta el servidor Express
// 3) Comprueba si MySQL responde
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { probarConexion } = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  await probarConexion();
});
