const bcrypt = require('bcrypt');
const db = require('../config/db');
const { validarCuenta, validarPassword, armarSet, validarDni, validarTelefono } = require('../utils/validaciones');
const { subirImagen } = require('../utils/almacenamiento');

// La tabla sale del rol firmado en el token, nunca de lo que manda el cliente
const TABLAS = { usuario: 'usuario', admin: 'admin' };

const SELECT_PERFIL = {
  usuario: `SELECT id, nombre, apellido, email, usuario, foto_url, dni,
                   to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, created_at
            FROM usuario WHERE id = $1`,
  admin: `SELECT id, nombre, apellido, email, usuario, es_superadmin, foto_url, dni, telefono,
                 to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, created_at
          FROM admin WHERE id = $1`
};

const responderError = (res, error) => {
  if (error.code === '23505') {
    return res.status(409).json({ message: error.constraint && error.constraint.includes('dni') ? 'Ya existe una cuenta con ese DNI' : 'El email o el usuario ya están en uso' });
  }
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

const getPerfil = async (req, res) => {
  const tabla = TABLAS[req.user.rol];
  if (!tabla) {
    return res.status(403).json({ message: 'Rol no válido' });
  }

  try {
    const result = await db.query(SELECT_PERFIL[tabla], [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }
    res.json({ ...result.rows[0], rol: req.user.rol });
  } catch (error) {
    responderError(res, error);
  }
};

const actualizarPerfil = async (req, res) => {
  const tabla = TABLAS[req.user.rol];
  if (!tabla) {
    return res.status(403).json({ message: 'Rol no válido' });
  }

  const body = { ...(req.body || {}) };
  if (body.fecha_nacimiento === null || body.fecha_nacimiento === '') delete body.fecha_nacimiento;
  const { error, valores } = validarCuenta(body, false);
  if (error) {
    return res.status(400).json({ message: error });
  }

  // Nombre y apellido no se editan desde el perfil: se aceptan solo si coinciden con los guardados
  // (así una versión anterior de la app que los reenvía sin cambios no falla)
  const actual = await db.query(`SELECT nombre, apellido, dni, to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento FROM ${tabla} WHERE id = $1`, [req.user.id]);
  if (actual.rows.length === 0) {
    return res.status(404).json({ message: 'Cuenta no encontrada' });
  }
  if ((valores.nombre !== undefined && valores.nombre !== actual.rows[0].nombre) ||
      (valores.apellido !== undefined && valores.apellido !== actual.rows[0].apellido)) {
    return res.status(400).json({ message: 'El nombre y el apellido no se pueden modificar. Si hay un error, contactá a soporte' });
  }
  delete valores.nombre;
  delete valores.apellido;

  // La fecha de nacimiento tampoco se cambia: solo se carga si la cuenta aún no la tenía
  if (valores.fecha_nacimiento !== undefined) {
    if (actual.rows[0].fecha_nacimiento && actual.rows[0].fecha_nacimiento !== valores.fecha_nacimiento) {
      return res.status(400).json({ message: 'La fecha de nacimiento no se puede modificar' });
    }
    if (actual.rows[0].fecha_nacimiento) delete valores.fecha_nacimiento;
  }

  // El DNI no se cambia; solo se puede cargar una vez si la cuenta aún no lo tenía
  if (body.dni !== undefined && body.dni !== null && body.dni !== '') {
    const { error: errorDni, dni } = validarDni(body.dni);
    if (errorDni) return res.status(400).json({ message: errorDni });
    if (actual.rows[0].dni && actual.rows[0].dni !== dni) {
      return res.status(400).json({ message: 'El DNI no se puede modificar' });
    }
    if (!actual.rows[0].dni) valores.dni = dni;
  }
  // El teléfono es de los dueños
  if (body.telefono !== undefined && tabla === 'admin') {
    const { error: errorTel, telefono } = validarTelefono(body.telefono);
    if (errorTel) return res.status(400).json({ message: errorTel });
    valores.telefono = telefono;
  }

  if (Object.keys(valores).length === 0) {
    return res.json({ message: 'Perfil actualizado', perfil: { ...(await db.query(SELECT_PERFIL[tabla], [req.user.id])).rows[0], rol: req.user.rol } });
  }

  try {
    if (valores.email !== undefined || valores.usuario !== undefined) {
      const choque = await db.query(
        `SELECT 1 FROM ${tabla} WHERE id <> $3 AND (email = $1 OR usuario = $2)`,
        [valores.email ?? null, valores.usuario ?? null, req.user.id]
      );
      if (choque.rows.length > 0) {
        return res.status(409).json({ message: 'El email o el usuario ya están en uso' });
      }
    }

    const { set, params } = armarSet(valores);
    params.push(req.user.id);

    const upd = await db.query(
      `UPDATE ${tabla} SET ${set}, updated_at = NOW() WHERE id = $${params.length} RETURNING id`,
      params
    );
    if (upd.rows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    const perfil = await db.query(SELECT_PERFIL[tabla], [req.user.id]);
    res.json({ message: 'Perfil actualizado', perfil: { ...perfil.rows[0], rol: req.user.rol } });
  } catch (error) {
    responderError(res, error);
  }
};

const cambiarPassword = async (req, res) => {
  const tabla = TABLAS[req.user.rol];
  if (!tabla) {
    return res.status(403).json({ message: 'Rol no válido' });
  }

  const { password_actual, password_nueva } = req.body || {};
  if (typeof password_actual !== 'string' || !password_actual) {
    return res.status(400).json({ message: 'Ingresá tu contraseña actual' });
  }
  const errorPassword = validarPassword(password_nueva);
  if (errorPassword) {
    return res.status(400).json({ message: errorPassword });
  }
  if (password_actual === password_nueva) {
    return res.status(400).json({ message: 'La contraseña nueva tiene que ser distinta de la actual' });
  }

  try {
    const cuenta = await db.query(`SELECT password FROM ${tabla} WHERE id = $1`, [req.user.id]);
    if (cuenta.rows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    const correcta = await bcrypt.compare(password_actual, cuenta.rows[0].password);
    if (!correcta) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    const hash = await bcrypt.hash(password_nueva, 10);
    await db.query(
      `UPDATE ${tabla} SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, req.user.id]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- Foto de perfil (cualquier cuenta): sube la imagen y guarda su URL ----------
const subirFoto = async (req, res) => {
  const tabla = TABLAS[req.user.rol];
  if (!tabla) return res.status(403).json({ message: 'Rol no válido' });
  if (!req.file) return res.status(400).json({ message: 'Elegí una imagen para subir' });

  try {
    const url = await subirImagen(req.file.buffer, `perfil-${tabla}-${req.user.id}`);
    await db.query(`UPDATE ${tabla} SET foto_url = $1, updated_at = NOW() WHERE id = $2`, [url, req.user.id]);
    res.json({ message: 'Foto de perfil actualizada', foto_url: url });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    responderError(res, error);
  }
};

const quitarFoto = async (req, res) => {
  const tabla = TABLAS[req.user.rol];
  if (!tabla) return res.status(403).json({ message: 'Rol no válido' });
  try {
    await db.query(`UPDATE ${tabla} SET foto_url = NULL, updated_at = NOW() WHERE id = $1`, [req.user.id]);
    res.json({ message: 'Foto de perfil eliminada', foto_url: null });
  } catch (error) {
    responderError(res, error);
  }
};

module.exports = {
  subirFoto, quitarFoto, getPerfil, actualizarPerfil, cambiarPassword };