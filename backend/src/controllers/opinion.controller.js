const db = require('../config/db');
const { paginar } = require('../utils/paginacion');

const responderError = (res, error) => {
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

const idValido = (valor) =>
  (typeof valor === 'number' || typeof valor === 'string') &&
  /^\d+$/.test(String(valor)) &&
  Number(valor) > 0 &&
  Number(valor) <= 2147483647;

// ---------- PÚBLICO: opiniones de una cabaña (detalle de la cabaña) ----------
const getOpinionesCabana = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }
  const { pagina, limite, offset } = paginar(req.query);

  try {
    const cabana = await db.query(
      'SELECT 1 FROM cabana WHERE id = $1 AND activa = TRUE',
      [id]
    );
    if (cabana.rows.length === 0) {
      return res.status(404).json({ message: 'Cabaña no encontrada' });
    }

    const result = await db.query(
      `SELECT o.id, o.contenido, o.created_at, k.puntaje,
              u.nombre || ' ' || LEFT(u.apellido, 1) || '.' AS autor
       FROM opinion o
       JOIN usuario u ON u.id = o.usuario_id
       LEFT JOIN calificacion k ON k.usuario_id = o.usuario_id AND k.cabana_id = o.cabana_id
       WHERE o.cabana_id = $1
       ORDER BY o.id DESC
       LIMIT $2 OFFSET $3`,
      [id, limite, offset]
    );

    res.json({ pagina, limite, opiniones: result.rows });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- ADMIN: todas las opiniones, con filtro por cabaña ----------
const getOpinionesAdmin = async (req, res) => {
  const { cabana_id } = req.query;
  if (cabana_id !== undefined && !idValido(cabana_id)) {
    return res.status(400).json({ message: 'El filtro cabana_id debe ser un número entero' });
  }

  const filtro = cabana_id === undefined ? null : Number(cabana_id);
  const { pagina, limite, offset } = paginar(req.query);

  try {
    const total = await db.query(
      'SELECT COUNT(*)::int AS total FROM opinion o WHERE ($1::int IS NULL OR o.cabana_id = $1)',
      [filtro]
    );

    const result = await db.query(
      `SELECT o.id, o.contenido, o.created_at, k.puntaje,
              u.id AS usuario_id, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
              c.id AS cabana_id, c.nombre AS cabana_nombre
       FROM opinion o
       JOIN usuario u ON u.id = o.usuario_id
       JOIN cabana c ON c.id = o.cabana_id
       LEFT JOIN calificacion k ON k.usuario_id = o.usuario_id AND k.cabana_id = o.cabana_id
       WHERE ($1::int IS NULL OR o.cabana_id = $1)
       ORDER BY o.id DESC
       LIMIT $2 OFFSET $3`,
      [filtro, limite, offset]
    );

    res.json({ total: total.rows[0].total, pagina, limite, opiniones: result.rows });
  } catch (error) {
    responderError(res, error);
  }
};

module.exports = { getOpinionesCabana, getOpinionesAdmin };