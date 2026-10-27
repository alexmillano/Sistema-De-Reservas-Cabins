const db = require('../config/db');
const { esFechaValida, hoy, estaOcupada } = require('../utils/reservas');

const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'completada'];

// Transiciones permitidas: estado actual -> estados a los que puede pasar
const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['completada', 'cancelada'],
  cancelada: [],
  completada: []
};

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

// ---------- USUARIO: modificar una reserva ----------
const modificarReserva = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const body = req.body || {};
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(
      `SELECT cabana_id, estado, cantidad_personas,
              to_char(fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout
       FROM reserva
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [id, req.user.id]
    );
    if (actual.rows.length === 0) {
      throw errorHttp(404, 'Reserva no encontrada');
    }

    const reserva = actual.rows[0];
    if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
      throw errorHttp(400, 'Solo se pueden modificar reservas pendientes o confirmadas');
    }
    if (reserva.fecha_checkin < hoy()) {
      throw errorHttp(400, 'No se puede modificar una reserva cuyo check-in ya pasó');
    }

    // Lo que no se envía se conserva
    const fecha_checkin = body.fecha_checkin ?? reserva.fecha_checkin;
    const fecha_checkout = body.fecha_checkout ?? reserva.fecha_checkout;
    const personas = body.cantidad_personas === undefined
      ? reserva.cantidad_personas
      : Number(body.cantidad_personas);

    if (!esFechaValida(fecha_checkin) || !esFechaValida(fecha_checkout)) {
      throw errorHttp(400, 'Las fechas deben tener formato AAAA-MM-DD');
    }
    if (fecha_checkin < hoy()) {
      throw errorHttp(400, 'La fecha de check-in no puede ser anterior a hoy');
    }
    if (fecha_checkout <= fecha_checkin) {
      throw errorHttp(400, 'El check-out debe ser posterior al check-in');
    }
    if (!Number.isInteger(personas) || personas < 1) {
      throw errorHttp(400, 'La cantidad de personas debe ser un número entero mayor o igual a 1');
    }

    // Se bloquea la cabaña para que dos cambios simultáneos no choquen
    const cab = await client.query(
      'SELECT capacidad_personas, activa FROM cabana WHERE id = $1 FOR UPDATE',
      [reserva.cabana_id]
    );
    if (!cab.rows[0].activa) {
      throw errorHttp(409, 'La cabaña ya no está disponible');
    }
    if (personas > cab.rows[0].capacidad_personas) {
      throw errorHttp(400, `Esta cabaña admite hasta ${cab.rows[0].capacidad_personas} personas`);
    }

    // Se excluye esta misma reserva: no puede chocar consigo misma
    if (await estaOcupada(client, reserva.cabana_id, fecha_checkin, fecha_checkout, Number(id))) {
      throw errorHttp(409, 'La cabaña no está disponible para esas fechas');
    }

    const upd = await client.query(
      `UPDATE reserva
       SET fecha_checkin = $1, fecha_checkout = $2, cantidad_personas = $3,
           precio_total = ($2::date - $1::date) *
                          (SELECT precio_por_noche FROM cabana WHERE id = $4),
           updated_at = NOW()
       WHERE id = $5
       RETURNING precio_total::float AS precio_total`,
      [fecha_checkin, fecha_checkout, personas, reserva.cabana_id, id]
    );

    await client.query('COMMIT');
    res.json({
      message: 'Reserva modificada exitosamente',
      precio_total: upd.rows[0].precio_total
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === '23P01') {
      return res.status(409).json({ message: 'La cabaña no está disponible para esas fechas' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    client.release();
  }
};

// ---------- USUARIO: cancelar una reserva ----------
const cancelarReserva = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(
      `SELECT r.estado, c.nombre AS cabana_nombre,
              to_char(r.fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(r.fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout
       FROM reserva r
       JOIN cabana c ON r.cabana_id = c.id
       WHERE r.id = $1 AND r.usuario_id = $2
       FOR UPDATE OF r`,
      [id, req.user.id]
    );
    if (actual.rows.length === 0) {
      throw errorHttp(404, 'Reserva no encontrada');
    }

    const reserva = actual.rows[0];
    if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
      throw errorHttp(400, 'Solo se pueden cancelar reservas pendientes o confirmadas');
    }

    await client.query(
      "UPDATE reserva SET estado = 'cancelada', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Aviso para todos los admins
    await client.query(
      `INSERT INTO notificacion (admin_id, tipo, mensaje)
       SELECT id, 'cancelacion', $1::text FROM admin`,
      [`${req.user.usuario} canceló la reserva de ${reserva.cabana_nombre} (${reserva.fecha_checkin} al ${reserva.fecha_checkout})`]
    );

    await client.query('COMMIT');
    res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    client.release();
  }
};

// ---------- ADMIN: listar reservas (con filtro por estado y paginación) ----------
const getReservasAdmin = async (req, res) => {
  const { estado } = req.query;
  const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 20, 1), 100);

  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS.join(', ')}` });
  }

  const params = [];
  let where = '';
  if (estado) {
    params.push(estado);
    where = `WHERE r.estado = $${params.length}`;
  }

  try {
    const total = await db.query(
      `SELECT COUNT(*)::int AS total FROM reserva r ${where}`,
      params
    );

    params.push(limite, (pagina - 1) * limite);
    const result = await db.query(
      `SELECT r.id, r.estado, r.cantidad_personas, r.created_at,
              to_char(r.fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(r.fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout,
              r.precio_total::float AS precio_total,
              u.id AS usuario_id, u.nombre AS usuario_nombre,
              u.apellido AS usuario_apellido, u.email AS usuario_email,
              c.id AS cabana_id, c.nombre AS cabana_nombre,
              l.nombre AS localidad, p.nombre AS provincia
       FROM reserva r
       JOIN usuario u ON r.usuario_id = u.id
       JOIN cabana c ON r.cabana_id = c.id
       JOIN localidad l ON c.localidad_id = l.id
       JOIN provincia p ON l.provincia_id = p.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ total: total.rows[0].total, pagina, limite, reservas: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- ADMIN: cambiar el estado de una reserva ----------
const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const estado = req.body?.estado;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS.join(', ')}` });
  }

  try {
    const actual = await db.query('SELECT estado FROM reserva WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const estadoActual = actual.rows[0].estado;
    if (!TRANSICIONES[estadoActual].includes(estado)) {
      return res.status(400).json({
        message: `No se puede pasar una reserva de "${estadoActual}" a "${estado}"`
      });
    }

    // La condición "AND estado = actual" evita pisar un cambio hecho por otro admin al mismo tiempo
    const result = await db.query(
      `UPDATE reserva SET estado = $1, updated_at = NOW()
       WHERE id = $2 AND estado = $3
       RETURNING id`,
      [estado, id, estadoActual]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'La reserva cambió de estado mientras la editabas. Volvé a intentar' });
    }

    res.json({ message: 'Estado de la reserva actualizado', estado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { modificarReserva, cancelarReserva, getReservasAdmin, cambiarEstado };