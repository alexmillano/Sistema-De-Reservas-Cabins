const { esFechaValida, hoy } = require('./reservas');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_REGEX = /^[A-Za-z0-9._-]{3,50}$/;
const COLUMNAS_EDITABLES = ['nombre', 'apellido', 'email', 'usuario', 'fecha_nacimiento', 'dni', 'telefono'];
const MAX_MOTIVO = 500;

// DNI argentino: solo números, 7 u 8 dígitos (se aceptan puntos y espacios al escribirlo, se guardan sin ellos)
const normalizarDni = (valor) => String(valor ?? '').replace(/[.\s]/g, '');
const validarDni = (valor) => {
  const v = normalizarDni(valor);
  if (!/^[0-9]{7,8}$/.test(v)) return { error: 'El DNI debe tener 7 u 8 números, sin puntos ni letras' };
  return { dni: v };
};

// Teléfono: dígitos con +, espacios, guiones o paréntesis; al menos 8 dígitos
const validarTelefono = (valor) => {
  const v = typeof valor === 'string' ? valor.trim() : '';
  const digitos = v.replace(/\D/g, '').length;
  if (!/^[0-9+()\-\s]{8,25}$/.test(v) || digitos < 8 || digitos > 15) {
    return { error: 'El teléfono no es válido (ejemplo: +54 11 5555-1234)' };
  }
  return { telefono: v };
};

// Fecha de nacimiento obligatoria (AAAA-MM-DD) y mayoría de edad (18 años cumplidos)
const validarFechaNacimiento = (valor) => {
  if (!esFechaValida(valor) || valor < '1900-01-01' || valor > hoy()) {
    return { error: 'La fecha de nacimiento es obligatoria y debe tener el formato AAAA-MM-DD' };
  }
  const h = hoy();
  const limite = `${Number(h.slice(0, 4)) - 18}${h.slice(4)}`;
  if (valor > limite) return { error: 'Tenés que ser mayor de 18 años para usar Cabins' };
  return { fecha: valor };
};

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Valida los datos de una cuenta.
// completo = true  -> exige nombre, apellido, email y usuario (crear)
// completo = false -> valida solo los campos que vienen en el body (editar)
// Devuelve { error } o { valores } con los campos ya limpios.
const validarCuenta = (body, completo) => {
  const b = body || {};
  const valores = {};
  const requerido = (campo) => completo || b[campo] !== undefined;

  if (requerido('nombre')) {
    const v = texto(b.nombre);
    if (!v || v.length > 100) return { error: 'El nombre es obligatorio (hasta 100 caracteres)' };
    valores.nombre = v;
  }
  if (requerido('apellido')) {
    const v = texto(b.apellido);
    if (!v || v.length > 100) return { error: 'El apellido es obligatorio (hasta 100 caracteres)' };
    valores.apellido = v;
  }
  if (requerido('email')) {
    const v = texto(b.email);
    if (!EMAIL_REGEX.test(v) || v.length > 150) return { error: 'El email no es válido' };
    valores.email = v;
  }
  if (requerido('usuario')) {
    const v = texto(b.usuario);
    if (!USUARIO_REGEX.test(v)) {
      return { error: 'El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion y guion bajo' };
    }
    valores.usuario = v;
  }

  // Fecha de nacimiento: obligatoria al crear la cuenta, y la persona debe ser mayor de 18 años
  if (completo || b.fecha_nacimiento !== undefined) {
    const r = validarFechaNacimiento(b.fecha_nacimiento);
    if (r.error) return { error: r.error };
    valores.fecha_nacimiento = r.fecha;
  }

  return { valores };
};

// bcrypt solo procesa los primeros 72 bytes, por eso se limita el largo
const validarPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'La contraseña es demasiado larga (máximo 72 caracteres)';
  }
  return null;
};

// Arma "col1 = $1, col2 = $2" con una lista cerrada de columnas permitidas
const armarSet = (valores) => {
  const columnas = Object.keys(valores).filter((c) => COLUMNAS_EDITABLES.includes(c));
  return {
    set: columnas.map((c, i) => `${c} = $${i + 1}`).join(', '),
    params: columnas.map((c) => valores[c])
  };
};

// El motivo es opcional. Devuelve { error } o { motivo } (null si no viene)
const validarMotivo = (valor) => {
  if (valor === undefined || valor === null || valor === '') return { motivo: null };
  if (typeof valor !== 'string' || valor.trim().length > MAX_MOTIVO) {
    return { error: `El motivo no puede superar los ${MAX_MOTIVO} caracteres` };
  }
  return { motivo: valor.trim() };
};

module.exports = { validarFechaNacimiento, validarDni, validarTelefono, validarCuenta, validarPassword, armarSet, validarMotivo };