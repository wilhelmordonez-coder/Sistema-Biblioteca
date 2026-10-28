// ESTUDIANTE A: toda respuesta de error debe ser JSON { "error": "mensaje" } con su código HTTP (400, 404, 409, 500).
async function request(endpoint, method = 'GET', body) {
  if (USE_MOCK) return mockRequest(endpoint, method, body);
  let res;
  try {
    res = await fetch(API_URL + endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifique que la API esté encendida.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Error ${res.status} en el servidor`);
  return data;
}

const crud = recurso => ({
  listar: () => request(`/${recurso}`),
  obtener: id => request(`/${recurso}/${id}`),
  crear: datos => request(`/${recurso}`, 'POST', datos),
  actualizar: (id, datos) => request(`/${recurso}/${id}`, 'PUT', datos),
  eliminar: id => request(`/${recurso}/${id}`, 'DELETE')
});

// ESTUDIANTE A: tabla libros con tipo ENUM('Libro','Revista','Tesis') NOT NULL, codigo VARCHAR(17) NULL (ISBN o ISSN; las tesis no llevan),
// precio DECIMAL(8,2) NULL (validar >= 0) y portada_url VARCHAR(500) NULL (validar que inicie con http:// o https://).
// ESTUDIANTE A: rutas que debe exponer Express.
// /api/libros         → GET, GET /:id, POST, PUT /:id, DELETE /:id (409 si el material tiene préstamos)
// /api/usuarios       → GET, GET /:id, POST
// /api/prestamos      → GET (con JOIN: incluir titulo y tipo del material y nombre del usuario), POST (409 si el material no está disponible)
// /api/prestamos/:id/devolucion → PUT (registra fecha_entrega y marca el libro como disponible; 409 si ya fue devuelto)
const api = {
  libros: crud('libros'),
  usuarios: crud('usuarios'),
  prestamos: { ...crud('prestamos'), devolver: id => request(`/prestamos/${id}/devolucion`, 'PUT') }
};
