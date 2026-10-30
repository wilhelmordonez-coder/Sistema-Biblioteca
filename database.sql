-- =====================================================================
-- Sistema de Gestión de Biblioteca · Grupo 4 · Desarrollo Web 2026
-- Script de creación de la base de datos.
-- =====================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS biblioteca_db;
CREATE DATABASE biblioteca_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biblioteca_db;

-- ---------------------------------------------------------------------
-- Tabla: libros
-- Material bibliográfico: libros, revistas y tesis.
-- Cada fila es UN ejemplar físico que se puede prestar.
-- ---------------------------------------------------------------------
CREATE TABLE libros (
  id_libro          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tipo              ENUM('Libro', 'Revista', 'Tesis') NOT NULL,
  titulo            VARCHAR(150)  NOT NULL,
  autor             VARCHAR(100)  NOT NULL,
  codigo            VARCHAR(17)   NULL,          -- ISBN (libros) o ISSN (revistas); NULL en tesis
  anio_publicacion  SMALLINT UNSIGNED NOT NULL,
  precio            DECIMAL(8,2)  NULL,          -- valor de reposición en quetzales
  portada_url       VARCHAR(500)  NULL,
  disponible        BOOLEAN       NOT NULL DEFAULT TRUE,  -- FALSE mientras está prestado
  fecha_registro    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_libros PRIMARY KEY (id_libro),
  CONSTRAINT uq_libros_codigo UNIQUE (codigo),   -- UNIQUE permite varios NULL (tesis)
  CONSTRAINT ck_libros_codigo CHECK (tipo = 'Tesis' OR codigo IS NOT NULL),
  CONSTRAINT ck_libros_anio   CHECK (anio_publicacion BETWEEN 1450 AND 2100),
  CONSTRAINT ck_libros_precio CHECK (precio IS NULL OR precio >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- Lectores a quienes se les presta material (no inician sesión).
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id_usuario      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100)  NOT NULL,
  correo          VARCHAR(100)  NOT NULL,
  telefono        CHAR(8)       NOT NULL,
  fecha_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: prestamos
-- Relaciona un material con un lector.
-- ---------------------------------------------------------------------
CREATE TABLE prestamos (
  id_prestamo       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_libro          INT UNSIGNED NOT NULL,
  id_usuario        INT UNSIGNED NOT NULL,
  fecha_prestamo    DATE         NOT NULL,
  fecha_devolucion  DATE         NOT NULL,
  fecha_entrega     DATE         NULL,

  -- REGLA DE NEGOCIO, protegida también por MySQL:
  -- Esta columna se calcula sola. Vale id_libro mientras el préstamo está
  -- activo y NULL cuando ya se entregó. Como es UNIQUE (y UNIQUE acepta
  -- muchos NULL), es imposible tener DOS préstamos activos del mismo
  -- material. El backend valida antes; esto es la última barrera.
  libro_activo INT UNSIGNED
    AS (IF(fecha_entrega IS NULL, id_libro, NULL)) STORED,

  CONSTRAINT pk_prestamos PRIMARY KEY (id_prestamo),
  CONSTRAINT uq_prestamos_libro_activo UNIQUE (libro_activo),
  CONSTRAINT ck_prestamos_devolucion CHECK (fecha_devolucion >= fecha_prestamo),
  CONSTRAINT ck_prestamos_entrega    CHECK (fecha_entrega IS NULL OR fecha_entrega >= fecha_prestamo),
  CONSTRAINT fk_prestamos_libro FOREIGN KEY (id_libro)
    REFERENCES libros (id_libro) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_prestamos_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB;

-- =====================================================================
-- Datos de Prueba
-- =====================================================================

INSERT INTO libros (id_libro, tipo, titulo, autor, codigo, anio_publicacion, precio, portada_url, disponible) VALUES
  (1,  'Libro',   'Cien años de soledad',                                   'Gabriel García Márquez',               '9780307474728', 1967, 185.00, NULL, FALSE),
  (2,  'Libro',   'El Señor Presidente',                                    'Miguel Ángel Asturias',                '9788437604183', 1946, 120.00, NULL, TRUE),
  (3,  'Libro',   'Clean Code',                                             'Robert C. Martin',                     '9780132350884', 2008, 420.50, NULL, TRUE),
  (4,  'Libro',   'JavaScript: The Good Parts',                             'Douglas Crockford',                    '9780596517748', 2008, 310.00, NULL, FALSE),
  (5,  'Revista', 'Communications of the ACM',                              'Association for Computing Machinery',  '0001-0782',     2024,  95.00, NULL, TRUE),
  (6,  'Revista', 'IEEE Software',                                          'IEEE Computer Society',                '0740-7459',     2025, 110.00, NULL, TRUE),
  (7,  'Tesis',   'Sistema web para el control de inventario hospitalario', 'Luis Herrera',                         NULL,            2024,   NULL, NULL, TRUE),
  (8,  'Tesis',   'Análisis de seguridad en redes universitarias',          'Sofía Morales',                        NULL,            2023,   NULL, NULL, TRUE),
  (9,  'Libro',   'Hombres de maíz',                                        'Miguel Ángel Asturias',                '9788466338141', 1949, 135.00, NULL, TRUE),
  (10, 'Libro',   'Eloquent JavaScript',                                    'Marijn Haverbeke',                     '9781593279509', 2018, 350.00, NULL, FALSE);

INSERT INTO usuarios (id_usuario, nombre, correo, telefono) VALUES
  (1, 'Ana López',      'ana.lopez@miumg.edu.gt',      '55123456'),
  (2, 'Carlos Pérez',   'carlos.perez@miumg.edu.gt',   '44987654'),
  (3, 'María Gómez',    'maria.gomez@miumg.edu.gt',    '30456789'),
  (4, 'Luis Ramírez',   'luis.ramirez@miumg.edu.gt',   '55998877'),
  (5, 'Sofía Castillo', 'sofia.castillo@miumg.edu.gt', '42221133');

-- Los libros 1, 4 y 10 tienen préstamo sin entregar → disponible = FALSE arriba.
INSERT INTO prestamos (id_prestamo, id_libro, id_usuario, fecha_prestamo, fecha_devolucion, fecha_entrega) VALUES
  (1, 3,  3, '2026-10-01', '2026-10-08', '2026-10-07'),   -- devuelto
  (2, 1,  4, '2026-10-02', '2026-10-09', '2026-10-09'),   -- devuelto
  (3, 5,  5, '2026-10-05', '2026-10-12', '2026-10-14'),   -- devuelto con atraso
  (4, 3,  1, '2026-10-10', '2026-10-17', '2026-10-16'),   -- devuelto
  (5, 1,  1, '2026-10-15', '2026-10-22', NULL),           -- vencido
  (6, 4,  2, '2026-10-25', '2026-11-08', NULL),           -- activo
  (7, 10, 5, '2026-10-28', '2026-11-11', NULL);           -- activo

-- ---------------------------------------------------------------------
-- Consultas de verificación
-- ---------------------------------------------------------------------
-- SELECT * FROM libros;
-- SELECT p.id_prestamo, l.titulo, u.nombre, p.fecha_devolucion, p.fecha_entrega
--   FROM prestamos p JOIN libros l USING (id_libro) JOIN usuarios u USING (id_usuario);
--
-- Prueba de la regla de negocio: debe FALLAR con "Duplicate entry"
-- porque el material 1 ya está prestado y no se ha entregado:
-- INSERT INTO prestamos (id_libro, id_usuario, fecha_prestamo, fecha_devolucion)
--   VALUES (1, 2, CURDATE(), CURDATE() + INTERVAL 7 DAY);
