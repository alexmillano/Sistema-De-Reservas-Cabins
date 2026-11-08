const db = require('../config/db');
const { hoy, estaOcupada, bloqueadaPorOtro, MINUTOS_BLOQUEO } = require('../utils/reservas');
const { CABANA_VISIBLE } = require('../utils/cabanas');

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

// Pago SIMULADO: solo valida el formato. Los datos de la tarjeta
// nunca se guardan en la base ni se escriben en los logs.
const validarPagoSimulado = ({ numero_tarjeta, vencimiento, cvv, titular }) => {
  const numero = String(numero_tarjeta || '').replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(numero)) return 'El número de tarjeta no es válido';

  const venc = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(vencimiento || ''));
  if (!venc) return 'El vencimiento debe tener formato MM/AA';

  const mes = Number(venc[1]);
  const anio = 2000 + Number(venc[2]);
  const [anioActual, mesActual] = hoy().split('-').map(Number);
  if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
    return 'La tarjeta está vencida';
  }

  if (!/^\d{3,4}$/.test(String(cvv || ''))) return 'El CVV debe tener 3 o 4 dígitos';
  if (!titular || !String(titular).trim()) return 'El titular es obligatorio';
  return null;
};

// Lee el carrito. Se ordena por cabaña para que dos personas que pagan a la vez
// bloqueen las filas siempre en el mismo orden y no se traben entre sí.
const leerCarrito = async (executor, usuarioId) => {
  const result = await executor.query(
    `SELECT id, cabana_id, cantidad_personas,
            to_char(fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
            to_char(fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout
     FROM carrito WHERE usuario_id = $1 ORDER BY cabana_id, id`,
    [usuarioId]
  );
  return result.rows;
};

// Comprueba que un ítem del carrito se pueda reservar y devuelve los datos de la cabaña.
// FOR UPDATE bloquea la fila de la cabaña: dos personas que pagan o empiezan el checkout
// de la misma cabaña se ejecutan de a una.
const validarItemCheckout = async (client, item, usuarioId) => {
  const cab = await client.query(
    `SELECT c.nombre, c.admin_id, c.capacidad_personas, ${CABANA_VISIBLE} AS activa
     FROM cabana c WHERE c.id = $1 FOR UPDATE OF c`,
    [item.cabana_id]
  );
  const cabana = cab.rows[0];

  if (!cabana || !cabana.activa) {
    throw errorHttp(409, 'Una cabaña de tu carrito ya no está disponible');
  }
  if (item.cantidad_personas > cabana.capacidad_personas) {
    throw errorHttp(400, `"${cabana.nombre}" admite hasta ${cabana.capacidad_personas} personas. Actualizalo en el carrito`);
  }
  if (item.fecha_checkin < hoy()) {
    throw errorHttp(400, `Las fechas de "${cabana.nombre}" ya pasaron. Actualizalas en el carrito`);
  }
  if (await estaOcupada(client, item.cabana_id, item.fecha_checkin, item.fecha_checkout)) {
    throw errorHttp(409, `"${cabana.nombre}" ya fue reservada para esas fechas`);
  }
  if (await bloqueadaPorOtro(client, item.cabana_id, item.fecha_checkin, item.fecha_checkout, usuarioId)) {
    throw errorHttp(409, `"${cabana.nombre}" está siendo reservada por otra persona. Probá de nuevo en unos minutos`);
  }
  return cabana;
};

const responderError = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  // 23P01: la restricción de la base impidió una reserva superpuesta
  if (error.code === '23P01') {
    return res.status(409).json({ message: 'Una de las cabañas ya fue reservada para esas fechas' });
  }
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

// ---------- Empezar el checkout: bloquea las cabañas del carrito durante unos minutos ----------
const iniciarCheckout = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const items = await leerCarrito(client, req.user.id);
    if (items.length === 0) {
      throw errorHttp(400, 'El carrito está vacío');
    }
    for (const item of items) {
      await validarItemCheckout(client, item, req.user.id);
    }

    // Se reemplazan los bloqueos anteriores de esta persona y se limpian los vencidos
    await client.query('DELETE FROM bloqueo WHERE usuario_id = $1 OR expira_at <= NOW()', [req.user.id]);

    let segundos = 0;
    for (const item of items) {
      const nuevo = await client.query(
        `INSERT INTO bloqueo (usuario_id, cabana_id, fecha_checkin, fecha_checkout, expira_at)
         VALUES ($1, $2, $3, $4, NOW() + make_interval(mins => $5))
         RETURNING EXTRACT(EPOCH FROM (expira_at - NOW()))::int AS segundos`,
        [req.user.id, item.cabana_id, item.fecha_checkin, item.fecha_checkout, MINUTOS_BLOQUEO]
      );
      segundos = nuevo.rows[0].segundos;
    }

    await client.query('COMMIT');
    res.json({
      message: 'Cabañas bloqueadas mientras completás el pago',
      minutos: MINUTOS_BLOQUEO,
      segundos_restantes: segundos
    });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

// ---------- Cuánto tiempo le queda al bloqueo (para retomar el checkout) ----------
const estadoCheckout = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT EXTRACT(EPOCH FROM (MIN(expira_at) - NOW()))::int AS segundos
       FROM bloqueo WHERE usuario_id = $1 AND expira_at > NOW()`,
      [req.user.id]
    );
    const segundos = result.rows[0].segundos;
    res.json({ activo: segundos !== null, segundos_restantes: segundos ?? 0 });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- Salir del checkout: libera las cabañas ----------
const liberarCheckout = async (req, res) => {
  try {
    await db.query('DELETE FROM bloqueo WHERE usuario_id = $1', [req.user.id]);
    res.json({ message: 'Bloqueo liberado' });
  } catch (error) {
    responderError(res, error);
  }
};

const pagar = async (req, res) => {
  const errorPago = validarPagoSimulado(req.body);
  if (errorPago) {
    return res.status(400).json({ message: errorPago });
  }

  const client = await db.connect();
  try {
    // Todo o nada: si algo falla, no queda ninguna reserva a medias
    await client.query('BEGIN');

    const items = await leerCarrito(client, req.user.id);
    if (items.length === 0) {
      throw errorHttp(400, 'El carrito está vacío');
    }

    const reservas = [];
    const porDueno = new Map(); // id del dueño -> { total, cantidad }

    for (const item of items) {
      const cabana = await validarItemCheckout(client, item, req.user.id);

      // El precio lo calcula la base de datos: noches * precio por noche
      const nueva = await client.query(
        `INSERT INTO reserva
           (usuario_id, cabana_id, cantidad_personas, fecha_checkin, fecha_checkout, precio_total)
         VALUES ($1, $2, $3, $4, $5,
                 ($5::date - $4::date) * (SELECT precio_por_noche FROM cabana WHERE id = $2))
         RETURNING id, precio_total::float AS precio_total`,
        [req.user.id, item.cabana_id, item.cantidad_personas, item.fecha_checkin, item.fecha_checkout]
      );

      reservas.push({
        id: nueva.rows[0].id,
        cabana: cabana.nombre,
        fecha_checkin: item.fecha_checkin,
        fecha_checkout: item.fecha_checkout,
        precio_total: nueva.rows[0].precio_total,
        estado: 'pendiente'
      });

      // El aviso de nueva reserva le llega solo al dueño de esa cabaña
      if (cabana.admin_id) {
        const acumulado = porDueno.get(cabana.admin_id) || { total: 0, cantidad: 0 };
        acumulado.total += nueva.rows[0].precio_total;
        acumulado.cantidad += 1;
        porDueno.set(cabana.admin_id, acumulado);

        await client.query(
          `INSERT INTO notificacion (admin_id, tipo, mensaje, reserva_id)
           VALUES ($1, 'nueva_reserva', $2, $3)`,
          [
            cabana.admin_id,
            `Nueva reserva de ${req.user.usuario}: ${cabana.nombre} (${item.fecha_checkin} al ${item.fecha_checkout})`,
            nueva.rows[0].id
          ]
        );
      }
    }

    const total = Math.round(reservas.reduce((acc, r) => acc + r.precio_total, 0) * 100) / 100;

    // Aviso de pago aprobado: uno por dueño, con el total de SUS cabañas en esta compra
    for (const [adminId, acumulado] of porDueno) {
      const monto = Math.round(acumulado.total * 100) / 100;
      await client.query(
        `INSERT INTO notificacion (admin_id, tipo, mensaje)
         VALUES ($1, 'pago_aprobado', $2)`,
        [
          adminId,
          `Pago aprobado de ${req.user.usuario}: $ ${monto.toLocaleString('es-AR')} (${acumulado.cantidad} ${acumulado.cantidad === 1 ? 'reserva' : 'reservas'})`
        ]
      );
    }

    // La compra terminó: se vacía el carrito y se liberan los bloqueos
    await client.query('DELETE FROM carrito WHERE usuario_id = $1', [req.user.id]);
    await client.query('DELETE FROM bloqueo WHERE usuario_id = $1', [req.user.id]);
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Pago simulado aprobado. Tus reservas quedaron registradas',
      total,
      reservas
    });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

const getMisReservas = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.cantidad_personas, r.estado, r.created_at,
              to_char(r.fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(r.fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout,
              r.precio_total::float AS precio_total,
              c.id AS cabana_id, c.nombre AS cabana_nombre,
              c.descripcion, c.imagen_url,
              l.nombre AS localidad, p.nombre AS provincia
       FROM reserva r
       JOIN cabana c ON r.cabana_id = c.id
       JOIN localidad l ON c.localidad_id = l.id
       JOIN provincia p ON l.provincia_id = p.id
       WHERE r.usuario_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { pagar, getMisReservas, iniciarCheckout, estadoCheckout, liberarCheckout };
