# Sistema de Gestión de Biblioteca

Proyecto final del curso **Desarrollo Web**, Ingeniería en Sistemas, Universidad Mariano Gálvez de Guatemala, 2026.

**Grupo 4**

| Integrante | Responsabilidad principal |
|---|---|
| Cobar | Base de datos y Backend/API (MySQL, Express, CRUD, códigos HTTP) |
| Wilhelm Ordóñez | Frontend e integración (HTML, CSS, JavaScript, fetch, validaciones) y QA con Postman |

## Descripción

Aplicación web full stack para el **personal de la biblioteca**. Permite administrar el material bibliográfico (libros, revistas y tesis), registrar a los lectores y controlar los préstamos y devoluciones.

Es un **panel administrativo**: lo opera el bibliotecario. Los "usuarios" del sistema son los lectores a quienes se les presta material, no cuentas que inician sesión.

## Problema que resuelve

Sin un sistema, el control de préstamos se lleva en papel o en hojas de cálculo. Eso provoca que no se sepa con certeza qué material está disponible, quién tiene cada ejemplar ni qué préstamos están vencidos. El sistema centraliza esa información en una base de datos MySQL y la muestra actualizada en todo momento.

## Funcionalidades

- **Catálogo:**
  - Registrar, consultar, actualizar y eliminar libros, revistas y tesis.
  - Cada material guarda su código (ISBN o ISSN), año, valor de reposición y portada.
  - Búsqueda por título, autor o código, y filtros por sección y disponibilidad.
  - Vista de tabla o de tarjetas.
- **Usuarios:** registrar y consultar lectores.
- **Préstamos:**
  - Registrar préstamos y devoluciones.
  - Consultar el historial con filtros por estado: activo, vencido y devuelto.
- **Inicio:** resumen por sección y préstamos pendientes de devolución.
- **Validaciones** en frontend y backend, con mensajes claros por campo.

### Regla de negocio

No se permite prestar un material que ya está prestado y no ha sido devuelto. El frontend solo ofrece material disponible y la API responde `409 Conflict` si se intenta de todas formas.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (DOM, eventos, `fetch`, `async/await`) |
| Backend | Node.js, Express |
| Base de datos | MySQL (paquete `mysql2`) |
| Pruebas de API | Postman |
| Control de versiones | Git y GitHub |

## Arquitectura

```
Usuario (bibliotecario)
   │  acciones en la interfaz
   ▼
Frontend (HTML + CSS + JavaScript)
   │  fetch() con JSON
   ▼
API REST (Node.js + Express)
   │  consultas SQL parametrizadas
   ▼
MySQL  →  persistencia de datos
```

**Ejemplo del recorrido completo: registrar un préstamo**

1. El bibliotecario completa el formulario de préstamo y presiona "Registrar préstamo".
2. El frontend valida los datos y llama a `api.prestamos.crear()`, que ejecuta `fetch('/api/prestamos', { method: 'POST', body })`.
3. Express recibe el JSON en `req.body`, valida los datos y verifica que el material esté disponible.
4. Si está disponible, ejecuta un `INSERT` en `prestamos` y un `UPDATE` en `libros`, y responde `201 Created`.
5. Si ya está prestado, responde `409 Conflict` con un mensaje de error.
6. El frontend muestra el resultado y recarga la tabla con los datos actualizados.

## Estructura del proyecto

```
├── frontend/
│   ├── index.html        Panel de inicio
│   ├── libros.html       Catálogo de material
│   ├── usuarios.html     Usuarios (lectores)
│   ├── prestamos.html    Préstamos y devoluciones
│   ├── css/styles.css
│   └── js/
│       ├── config.js     URL de la API y modo demostración
│       ├── api.js        Única capa que usa fetch()
│       ├── mock.js       API simulada para trabajar sin backend
│       ├── ui.js         Utilidades: tablas, validación, mensajes
│       └── inicio.js, libros.js, usuarios.js, prestamos.js
├── backend/              API REST con Express
├── database.sql          Script de creación de la base de datos
├── .env.example          Variables de entorno de ejemplo
└── README.md
```

## Modelo de datos

| Tabla | Campos principales |
|---|---|
| `libros` | `id_libro` PK, `tipo` (Libro, Revista, Tesis), `titulo`, `autor`, `codigo` (ISBN o ISSN, NULL en tesis), `anio_publicacion`, `precio`, `portada_url`, `disponible` |
| `usuarios` | `id_usuario` PK, `nombre`, `correo` (único), `telefono` |
| `prestamos` | `id_prestamo` PK, `id_libro` FK → `libros`, `id_usuario` FK → `usuarios`, `fecha_prestamo`, `fecha_devolucion`, `fecha_entrega` (NULL mientras no se devuelva) |

## Endpoints de la API

| Método | Ruta | Descripción | Respuesta correcta | Errores |
|---|---|---|---|---|
| GET | `/api/libros` | Listar material | 200 | 500 |
| GET | `/api/libros/:id` | Obtener un material | 200 | 404 |
| POST | `/api/libros` | Registrar material | 201 | 400 |
| PUT | `/api/libros/:id` | Actualizar material | 200 | 400, 404 |
| DELETE | `/api/libros/:id` | Eliminar material | 200 | 404, 409 |
| GET | `/api/usuarios` | Listar usuarios | 200 | 500 |
| GET | `/api/usuarios/:id` | Obtener un usuario | 200 | 404 |
| POST | `/api/usuarios` | Registrar usuario | 201 | 400 |
| GET | `/api/prestamos` | Historial con título, tipo y nombre del usuario | 200 | 500 |
| POST | `/api/prestamos` | Registrar préstamo | 201 | 400, 404, 409 |
| PUT | `/api/prestamos/:id/devolucion` | Registrar devolución | 200 | 404, 409 |

Todos los errores se devuelven como JSON con la forma `{ "error": "mensaje" }`.

## Validaciones

| Campo | Regla |
|---|---|
| Título y autor | Obligatorios |
| ISBN (libros) | 10 o 13 dígitos |
| ISSN (revistas) | Formato `1234-567X` |
| Código (tesis) | No se pide |
| Año de publicación | Entre 1450 y el año actual |
| Valor de reposición | Opcional; número positivo con hasta 2 decimales |
| URL de portada | Opcional; debe iniciar con `http://` o `https://` |
| Usuario | Nombre con solo letras, correo con formato válido y teléfono de 8 dígitos |
| Préstamo | Usuario y material obligatorios; la fecha de devolución no puede ser anterior a hoy |

## Seguridad

- Validación de entradas en el frontend y en el backend.
- Consultas SQL parametrizadas (`?` en `mysql2`) para prevenir inyección SQL.
- Credenciales de la base de datos en variables de entorno (`.env`), fuera del código fuente y excluidas del repositorio.
- Los datos se escapan antes de insertarse en el HTML para prevenir XSS.

## Instalación y ejecución

**Requisitos:** Node.js 18 o superior, MySQL 8 y Git.

1. Clonar el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd <carpeta-del-repositorio>
   ```
2. Crear la base de datos ejecutando el script en MySQL:
   ```bash
   mysql -u root -p < database.sql
   ```
3. Configurar las variables de entorno: copiar `.env.example` como `.env` y completar los datos de conexión.
4. Instalar dependencias e iniciar la API:
   ```bash
   cd backend
   npm install
   npm start
   ```
5. Abrir `http://localhost:3000` en el navegador.

### Modo demostración

El frontend incluye una API simulada (`frontend/js/mock.js`) para probar la interfaz sin backend. Se activa con `USE_MOCK = true` en `frontend/js/config.js`. Para la entrega debe quedar en `false`, de modo que todos los datos vengan de MySQL.

## Pruebas

Las pruebas de la API se realizaron con Postman. Cubren cada endpoint en los casos correctos y en los de error: campos faltantes, registros inexistentes, préstamo de material ya prestado y devolución duplicada. Las capturas de evidencia están en la carpeta `pruebas/`.
