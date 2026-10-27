const bcrypt = require('bcrypt');
const db = require('../config/db');
const { validarCuenta, validarPassword, armarSet } = require('../utils/validaciones');

// La tabla sale del rol firmado en el token, nunca de lo que manda el cliente
const TABLAS = { usuario: 'usuario', admin: 'admin' };

const SELECT_PERFIL = {
  usuario: `SELECT id, nombre, apellido, email, usuario,
                   to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, created_at
            FROM usuario WHERE id = $1`,
  admin: `SELECT id, nombre, apellido, email, usuario, es_superadmin,
                 to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, created_at
          FROM admin WHERE id = $1`
};

const responderError = (res, error) => {
  if (error.code === '23505') {
    return res.status(409).json({ message: 'El email o el usuario ya están en uso' });
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

  const { error, valores } = validarCuenta(req.body, false);
  if (error) {
    return res.status(400).json({ message: error });
  }
  if (Object.keys(valores).length === 0) {
    return res.status(400).json({ message: 'No se envió ningún dato para modificar' });
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

module.exports = { getPerfil, actualizarPerfil, cambiarPassword };