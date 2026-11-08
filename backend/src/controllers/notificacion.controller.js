const db = require('../config/db');
const { hoy } = require('../utils/reservas');

const INTERVALO_MS = 60 * 1000;
let ultimaGeneracion = 0;

// Crea un aviso de check-out por cada reserva confirmada cuya fecha de salida ya llegó.
// El aviso le llega solo al dueño de la cabaña. Se genera una sola vez por reserva
// (lo garantiza el índice único de la base) y, como mucho, una vez por minuto.
const generarAvisosCheckout = async () => {
  const ahora = Date.now();
  if (ahora - ultimaGeneracion < INTERVALO_MS) return;
  ultimaGeneracion = ahora;

  try {
    await db.query(
      `INSERT INTO notificacion (admin_id, tipo, mensaje, reserva_id)
       SELECT c.admin_id, 'checkout',
              'Llegó el check-out de ' || u.nombre || ' ' || u.apellido || ' en ' || c.nombre ||
              ' (' || to_char(r.fecha_checkout, 'DD/MM/YYYY') || '). Marcá la reserva como completada.',
              r.id
       FROM reserva r
       JOIN usuario u ON u.id = r.usuario_id
       JOIN cabana c ON c.id = r.cabana_id
       WHERE r.estado = 'confirmada' AND r.fecha_checkout <= $1::date
         AND c.admin_id IS NOT NULL
       ON CONFLICT DO NOTHING`,
      [hoy()]
    );
  } catch (error) {
    // Si falla, el listado sigue funcionando: solo se omite la generación de avisos
    console.error('No se pudieron generar los avisos de check-out:', error.message);
    ultimaGeneracion = 0;
  }
};

// Cada admin ve solo sus propias notificaciones
const getNotificaciones = async (req, res) => {
  const { leida } = req.query;
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 100);

  if (leida !== undefined && !['true', 'false'].includes(leida)) {
    return res.status(400).json({ message: 'El filtro leida debe ser true o false' });
  }

  await generarAvisosCheckout();

  const params = [req.user.id];
  let filtro = '';
  if (leida !== undefined) {
    params.push(leida === 'true');
    filtro = `AND leida = $${params.length}`;
  }
  params.push(limite);

  try {
    const lista = await db.query(
      `SELECT id, tipo, mensaje, reserva_id, leida, created_at
       FROM notificacion
       WHERE admin_id = $1 ${filtro}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
      params
    );
    const noLeidas = await db.query(
      'SELECT COUNT(*)::int AS total FROM notificacion WHERE admin_id = $1 AND leida = FALSE',
      [req.user.id]
    );

    res.json({ no_leidas: noLeidas.rows[0].total, notificaciones: lista.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const marcarLeida = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const result = await db.query(
      'UPDATE notificacion SET leida = TRUE WHERE id = $1 AND admin_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const marcarTodasLeidas = async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE notificacion SET leida = TRUE WHERE admin_id = $1 AND leida = FALSE',
      [req.user.id]
    );
    res.json({ message: 'Notificaciones marcadas como leídas', cantidad: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { getNotificaciones, marcarLeida, marcarTodasLeidas };
