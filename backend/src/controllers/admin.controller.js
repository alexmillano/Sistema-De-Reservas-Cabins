const bcrypt = require('bcrypt');
const db = require('../config/db');
const { validarCuenta, validarPassword, armarSet, validarMotivo, validarDni, validarTelefono } = require('../utils/validaciones');
const { subirDocumento, borrarDocumento, urlFirmada } = require('../utils/almacenamiento');
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
      `SELECT id, nombre, apellido, email, usuario, es_superadmin, dni, telefono,
              (dni_frente_ruta IS NOT NULL AND dni_dorso_ruta IS NOT NULL) AS tiene_dni_fotos,
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
// Llega como formulario multipart: datos de texto + fotos del DNI (frente y dorso)
const crearAdmin = async (req, res) => {
  const body = req.body || {};
  const subidas = [];

  const { error, valores } = validarCuenta(body, true);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const errorPassword = validarPassword(body.password);
  if (errorPassword) {
    return res.status(400).json({ message: errorPassword });
  }
  const { error: errorDni, dni } = validarDni(body.dni);
  if (errorDni) {
    return res.status(400).json({ message: errorDni });
  }
  const { error: errorTel, telefono } = validarTelefono(body.telefono);
  if (errorTel) {
    return res.status(400).json({ message: errorTel });
  }
  const frente = req.files?.dni_frente?.[0];
  const dorso = req.files?.dni_dorso?.[0];
  if (!frente || !dorso) {
    return res.status(400).json({ message: 'Subí la foto del DNI por delante y por detrás' });
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
      'SELECT email, usuario, dni FROM admin WHERE email = $1 OR usuario = $2 OR dni = $3',
      [valores.email, valores.usuario, dni]
    );
    if (existente.rows.some((a) => a.dni === dni)) {
      return res.status(409).json({ message: 'Ya existe un dueño con ese DNI' });
    }
    if (existente.rows.length > 0) {
      return res.status(409).json({ message: 'El email o el usuario ya están en uso' });
    }

    // Las fotos van al bucket privado; si algo falla después se borran para no dejar archivos sueltos
    const rutaFrente = await subirDocumento(frente.buffer, 'dni');
    subidas.push(rutaFrente);
    const rutaDorso = await subirDocumento(dorso.buffer, 'dni');
    subidas.push(rutaDorso);

    const hash = await bcrypt.hash(body.password, 10);
    const nuevo = await db.query(
      `INSERT INTO admin (nombre, apellido, email, usuario, password, fecha_nacimiento, es_superadmin,
                          dni, telefono, dni_frente_ruta, dni_dorso_ruta)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9, $10)
       RETURNING id, nombre, apellido, email, usuario, es_superadmin, created_at`,
      [valores.nombre, valores.apellido, valores.email, valores.usuario, hash, valores.fecha_nacimiento ?? null,
       dni, telefono, rutaFrente, rutaDorso]
    );

    res.status(201).json({ message: 'Dueño creado exitosamente', admin: nuevo.rows[0] });
  } catch (error) {
    await Promise.all(subidas.map((r) => borrarDocumento(r)));
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: ver las fotos del DNI de un dueño (enlaces temporales) ----------
const verDniAdmin = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }
  try {
    const r = await db.query('SELECT dni, dni_frente_ruta, dni_dorso_ruta FROM admin WHERE id = $1', [id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Dueño no encontrado' });
    }
    const { dni, dni_frente_ruta: f, dni_dorso_ruta: d } = r.rows[0];
    res.json({
      dni,
      frente: f ? await urlFirmada(f).catch(() => null) : null,
      dorso: d ? await urlFirmada(d).catch(() => null) : null
    });
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

  if (body.telefono !== undefined) {
    const { error: errorTel, telefono } = validarTelefono(body.telefono);
    if (errorTel) {
      return res.status(400).json({ message: errorTel });
    }
    valores.telefono = telefono;
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
      return res.status(404).json({ message: 'Dueño no encontrado' });
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

    res.json({ message: 'Dueño actualizado exitosamente' });
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
      return res.status(404).json({ message: 'Dueño no encontrado' });
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

    res.json({ message: 'Dueño suspendido. Perdió el acceso; sus cabañas se ocultan hasta que lo reactives' });
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
      return res.status(404).json({ message: 'Dueño no encontrado' });
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

    res.json({ message: 'Dueño reactivado' });
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
      throw errorHttp(404, 'Dueño no encontrado');
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

    // Al eliminar la cuenta también se borran las fotos de su DNI (dato personal sensible)
    const fotos = await client.query('SELECT dni_frente_ruta, dni_dorso_ruta FROM admin WHERE id = $1', [id]);
    await client.query('DELETE FROM admin WHERE id = $1', [id]);

    await client.query('COMMIT');
    for (const ruta of [fotos.rows[0]?.dni_frente_ruta, fotos.rows[0]?.dni_dorso_ruta]) {
      if (ruta) await borrarDocumento(ruta);
    }
    res.json({
      message: 'Dueño eliminado definitivamente',
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
  listarAdmins, crearAdmin, verDniAdmin, editarAdmin, banearAdmin, desbanearAdmin, eliminarAdmin
};