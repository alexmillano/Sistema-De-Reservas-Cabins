const bcrypt = require('bcrypt');
const db = require('../config/db');
const { validarCuenta, validarPassword, armarSet, validarMotivo } = require('../utils/validaciones');
const { hoy } = require('../utils/reservas');

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

const responderError = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  // 23505: otro pedido simultáneo ya tomó ese email o usuario
  if (error.code === '23505') {
    return res.status(409).json({ message: 'El email o el usuario ya están en uso' });
  }
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

const idValido = (valor) =>
  /^\d+$/.test(String(valor)) && Number(valor) > 0 && Number(valor) <= 2147483647;

// ---------- SUPERADMIN: listar administradores ----------
const listarAdmins = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, apellido, email, usuario, es_superadmin,
              baneado, motivo_baneo, baneado_at, created_at
       FROM admin
       ORDER BY es_superadmin DESC, nombre`
    );
    res.json(result.rows);
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: crear un administrador (CU-30) ----------
const crearAdmin = async (req, res) => {
  const body = req.body || {};

  const { error, valores } = validarCuenta(body, true);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const errorPassword = validarPassword(body.password);
  if (errorPassword) {
    return res.status(400).json({ message: errorPassword });
  }
  if (typeof body.llave_maestra !== 'string' || !body.llave_maestra) {
    return res.status(400).json({ message: 'La llave maestra es obligatoria' });
  }

  try {
    // La llave se compara con la del superadmin que hace el pedido
    const yo = await db.query('SELECT llave_maestra FROM admin WHERE id = $1', [req.user.id]);
    const hashLlave = yo.rows[0]?.llave_maestra;
    const llaveCorrecta = hashLlave ? await bcrypt.compare(body.llave_maestra, hashLlave) : false;
    if (!llaveCorrecta) {
      return res.status(403).json({ message: 'Llave maestra incorrecta' });
    }

    const existente = await db.query(
      'SELECT 1 FROM admin WHERE email = $1 OR usuario = $2',
      [valores.email, valores.usuario]
    );
    if (existente.rows.length > 0) {
      return res.status(409).json({ message: 'El email o el usuario ya están en uso' });
    }

    const hash = await bcrypt.hash(body.password, 10);
    const nuevo = await db.query(
      `INSERT INTO admin (nombre, apellido, email, usuario, password, fecha_nacimiento, es_superadmin)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING id, nombre, apellido, email, usuario, es_superadmin, created_at`,
      [valores.nombre, valores.apellido, valores.email, valores.usuario, hash, valores.fecha_nacimiento ?? null]
    );

    res.status(201).json({ message: 'Administrador creado exitosamente', admin: nuevo.rows[0] });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: editar un administrador (CU-31) ----------
const editarAdmin = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const body = req.body || {};
  const { error, valores } = validarCuenta(body, false);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const cambiaPassword = body.password !== undefined;
  if (cambiaPassword) {
    const errorPassword = validarPassword(body.password);
    if (errorPassword) {
      return res.status(400).json({ message: errorPassword });
    }
  }
  if (Object.keys(valores).length === 0 && !cambiaPassword) {
    return res.status(400).json({ message: 'No se envió ningún dato para modificar' });
  }

  try {
    const destino = await db.query('SELECT es_superadmin FROM admin WHERE id = $1', [id]);
    if (destino.rows.length === 0) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }
    if (destino.rows[0].es_superadmin) {
      return res.status(403).json({ message: 'Las cuentas de superadmin no se modifican desde acá. Usá tu perfil' });
    }

    if (valores.email !== undefined || valores.usuario !== undefined) {
      const choque = await db.query(
        'SELECT 1 FROM admin WHERE id <> $3 AND (email = $1 OR usuario = $2)',
        [valores.email ?? null, valores.usuario ?? null, id]
      );
      if (choque.rows.length > 0) {
        return res.status(409).json({ message: 'El email o el usuario ya están en uso' });
      }
    }

    let { set, params } = armarSet(valores);
    if (cambiaPassword) {
      params.push(await bcrypt.hash(body.password, 10));
      set += `${set ? ', ' : ''}password = $${params.length}`;
    }
    params.push(id);

    await db.query(
      `UPDATE admin SET ${set}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );

    res.json({ message: 'Administrador actualizado exitosamente' });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: suspender un administrador ----------
const banearAdmin = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'No podés suspender tu propia cuenta' });
  }

  const { error, motivo } = validarMotivo(req.body?.motivo);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const destino = await db.query('SELECT es_superadmin, baneado FROM admin WHERE id = $1', [id]);
    if (destino.rows.length === 0) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }
    if (destino.rows[0].es_superadmin) {
      return res.status(403).json({ message: 'No se puede suspender una cuenta de superadmin' });
    }
    if (destino.rows[0].baneado) {
      return res.status(409).json({ message: 'La cuenta ya está suspendida' });
    }

    await db.query(
      `UPDATE admin
       SET baneado = TRUE, motivo_baneo = $1, baneado_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [motivo, id]
    );

    res.json({ message: 'Administrador suspendido. Perdió el acceso; sus cabañas se ocultan hasta que lo reactives' });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: reactivar un administrador suspendido ----------
const desbanearAdmin = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const destino = await db.query('SELECT baneado FROM admin WHERE id = $1', [id]);
    if (destino.rows.length === 0) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }
    if (!destino.rows[0].baneado) {
      return res.status(409).json({ message: 'La cuenta no está suspendida' });
    }

    await db.query(
      `UPDATE admin
       SET baneado = FALSE, motivo_baneo = NULL, baneado_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Administrador reactivado' });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: eliminar un administrador (CU-32) ----------
// Irreversible. Hay que suspenderlo antes.
const eliminarAdmin = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'No podés eliminar tu propia cuenta' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const destino = await client.query(
      'SELECT es_superadmin, baneado FROM admin WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (destino.rows.length === 0) {
      throw errorHttp(404, 'Administrador no encontrado');
    }
    if (destino.rows[0].es_superadmin) {
      throw errorHttp(403, 'No se puede eliminar una cuenta de superadmin');
    }
    if (!destino.rows[0].baneado) {
      throw errorHttp(409, 'Primero tenés que suspender la cuenta para poder eliminarla');
    }

    // Se bloquean sus cabañas (mismo orden que usa el pago): un pago en curso
    // termina antes de seguir, así el conteo de reservas es confiable
    await client.query('SELECT id FROM cabana WHERE admin_id = $1 ORDER BY id FOR UPDATE', [id]);

    // Reservas vigentes de sus cabañas: se cancelan para que nadie quede
    // con una reserva en una cabaña que desaparece
    const canceladas = await client.query(
      `UPDATE reserva SET estado = 'cancelada', updated_at = NOW()
       WHERE estado IN ('pendiente', 'confirmada')
         AND fecha_checkout >= $2
         AND cabana_id IN (SELECT id FROM cabana WHERE admin_id = $1)
       RETURNING id`,
      [id, hoy()]
    );

    // Sus cabañas salen de todos los carritos
    await client.query(
      'DELETE FROM carrito WHERE cabana_id IN (SELECT id FROM cabana WHERE admin_id = $1)',
      [id]
    );

    // Las cabañas sin ninguna reserva se borran de verdad
    const eliminadas = await client.query(
      `DELETE FROM cabana c
       WHERE c.admin_id = $1
         AND NOT EXISTS (SELECT 1 FROM reserva r WHERE r.cabana_id = c.id)
       RETURNING c.id`,
      [id]
    );

    // Las que tienen historial de reservas se desactivan y quedan sin admin
    const desactivadas = await client.query(
      `UPDATE cabana SET activa = FALSE, admin_id = NULL, updated_at = NOW()
       WHERE admin_id = $1
       RETURNING id`,
      [id]
    );

    await client.query('DELETE FROM admin WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({
      message: 'Administrador eliminado definitivamente',
      cabanas_eliminadas: eliminadas.rowCount,
      cabanas_desactivadas: desactivadas.rowCount,
      reservas_canceladas: canceladas.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

module.exports = {
  listarAdmins, crearAdmin, editarAdmin, banearAdmin, desbanearAdmin, eliminarAdmin
};