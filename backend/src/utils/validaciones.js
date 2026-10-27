const { esFechaValida, hoy } = require('./reservas');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_REGEX = /^[A-Za-z0-9._-]{3,50}$/;
const COLUMNAS_EDITABLES = ['nombre', 'apellido', 'email', 'usuario', 'fecha_nacimiento'];
const MAX_MOTIVO = 500;

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

  // La fecha de nacimiento siempre es opcional; null o vacío la borra
  if (b.fecha_nacimiento !== undefined) {
    if (b.fecha_nacimiento === null || b.fecha_nacimiento === '') {
      valores.fecha_nacimiento = null;
    } else if (!esFechaValida(b.fecha_nacimiento) ||
               b.fecha_nacimiento > hoy() ||
               b.fecha_nacimiento < '1900-01-01') {
      return { error: 'La fecha de nacimiento no es válida (formato AAAA-MM-DD)' };
    } else {
      valores.fecha_nacimiento = b.fecha_nacimiento;
    }
  }

  return { valores };
};

// bcrypt solo procesa los primeros 72 bytes, por eso se limita el largo
const validarPassword = (password) => {
  if (typeof password !== 'string' || password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
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

module.exports = { validarCuenta, validarPassword, armarSet, validarMotivo };