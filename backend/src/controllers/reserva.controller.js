const db = require('../config/db');
const { hoy, estaOcupada } = require('../utils/reservas');

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

const pagar = async (req, res) => {
  const errorPago = validarPagoSimulado(req.body);
  if (errorPago) {
    return res.status(400).json({ message: errorPago });
  }

  const client = await db.connect();
  try {
    // Todo o nada: si algo falla, no queda ninguna reserva a medias
    await client.query('BEGIN');

    const carrito = await client.query(
      `SELECT id, cabana_id, cantidad_personas,
              to_char(fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout
       FROM carrito WHERE usuario_id = $1 ORDER BY id`,
      [req.user.id]
    );
    if (carrito.rows.length === 0) {
      throw errorHttp(400, 'El carrito está vacío');
    }

    const reservas = [];

    for (const item of carrito.rows) {
      // FOR UPDATE bloquea la fila de la cabaña: dos pagos simultáneos
      // de la misma cabaña se ejecutan de a uno
      const cab = await client.query(
        'SELECT nombre, capacidad_personas, activa FROM cabana WHERE id = $1 FOR UPDATE',
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

      // Notificación para todos los admins
      await client.query(
        `INSERT INTO notificacion (admin_id, tipo, mensaje)
         SELECT id, 'nueva_reserva', $1::text FROM admin`,
        [`Nueva reserva de ${req.user.usuario}: ${cabana.nombre} (${item.fecha_checkin} al ${item.fecha_checkout})`]
      );
    }

    await client.query('DELETE FROM carrito WHERE usuario_id = $1', [req.user.id]);
    await client.query('COMMIT');

    const total = reservas.reduce((acc, r) => acc + r.precio_total, 0);
    res.status(201).json({
      message: 'Pago simulado aprobado. Tus reservas quedaron registradas',
      total: Math.round(total * 100) / 100,
      reservas
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    // 23P01: la restricción de la base impidió una reserva superpuesta
    if (error.code === '23P01') {
      return res.status(409).json({ message: 'Una de las cabañas ya fue reservada para esas fechas' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
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

module.exports = { pagar, getMisReservas };