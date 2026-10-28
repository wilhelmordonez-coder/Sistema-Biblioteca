const stat = (href, cifra, texto, detalle) => `<a class="stat" href="${href}"><strong>${cifra}</strong>${texto}<span class="sub">${detalle}</span></a>`;

intentar(async () => {
  const [libros, usuarios, prestamos] = await Promise.all([api.libros.listar(), api.usuarios.listar(), api.prestamos.listar()]);
  $('#stats').innerHTML = [['Libro', 'Libros'], ['Revista', 'Revistas'], ['Tesis', 'Tesis']].map(([tipo, nombre]) => {
    const grupo = libros.filter(l => l.tipo === tipo);
    return stat(`libros.html?tipo=${tipo}`, grupo.length, nombre, `${grupo.filter(l => +l.disponible).length} disponibles`);
  }).join('') + stat('usuarios.html', usuarios.length, 'Usuarios', 'Lectores registrados');

  renderTabla($('#tabla-activos tbody'),
    prestamos.filter(p => !p.fecha_entrega).sort((a, b) => iso(a.fecha_devolucion).localeCompare(iso(b.fecha_devolucion))),
    [p => `${esc(p.titulo)}<span class="sub">${esc(p.tipo)}</span>`, 'nombre', p => fecha(p.fecha_prestamo), p => fecha(p.fecha_devolucion), p => badge(estadoPrestamo(p))]);
});
