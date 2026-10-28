const form = $('#form-usuario'), tbody = $('#tabla-usuarios tbody');
let usuarios = [];

const reglas = {
  nombre: regla(obligatorio('El nombre'), [v => /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]{3,100}$/.test(v), 'Use solo letras (mínimo 3)']),
  correo: regla(obligatorio('El correo'), [v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Ingrese un correo válido']),
  telefono: regla(obligatorio('El teléfono'), [v => /^\d{8}$/.test(v), 'El teléfono debe tener 8 dígitos'])
};

function pintar() {
  const q = $('#buscar').value.toLowerCase();
  renderTabla(tbody, usuarios.filter(u => `${u.nombre} ${u.correo}`.toLowerCase().includes(q)), ['id_usuario', 'nombre', 'correo', 'telefono']);
}

const cargar = () => intentar(async () => { usuarios = await api.usuarios.listar(); pintar(); });

form.addEventListener('submit', e => {
  e.preventDefault();
  const datos = validar(form, reglas);
  if (datos) intentar(async () => {
    await api.usuarios.crear(datos);
    toast('Usuario registrado');
    form.reset();
    cargar();
  }, e.submitter);
});

$('#buscar').addEventListener('input', pintar);
cargar();
