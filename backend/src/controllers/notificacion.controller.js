const db = require('../config/db');

// Cada admin ve solo sus propias notificaciones
const getNotificaciones = async (req, res) => {
  const { leida } = req.query;
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 100);

  if (leida !== undefined && !['true', 'false'].includes(leida)) {
    return res.status(400).json({ message: 'El filtro leida debe ser true o false' });
  }

  const params = [req.user.id];
  let filtro = '';
  if (leida !== undefined) {
    params.push(leida === 'true');
    filtro = `AND leida = $${params.length}`;
  }
  params.push(limite);

  try {
    const lista = await db.query(
      `SELECT id, tipo, mensaje, leida, created_at
       FROM notificacion
       WHERE admin_id = $1 ${filtro}
       ORDER BY created_at DESC
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