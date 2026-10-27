const db = require('../config/db');
const { paginar } = require('../utils/paginacion');

const MAX_OPINION = 1000;

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

const responderError = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

// Solo acepta enteros positivos escritos como número o texto (rechaza true, null, "1.5", etc.)
const idValido = (valor) =>
  (typeof valor === 'number' || typeof valor === 'string') &&
  /^\d+$/.test(String(valor)) &&
  Number(valor) > 0 &&
  Number(valor) <= 2147483647;

const leerPuntaje = (valor) => {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) return Number(valor);
  return NaN;
};

// ---------- USUARIO: calificar una cabaña (con opinión opcional) ----------
const crearCalificacion = async (req, res) => {
  const body = req.body || {};
  const puntaje = leerPuntaje(body.puntaje);
  const opinion = typeof body.opinion === 'string' ? body.opinion.trim() : '';

  if (!idValido(body.cabana_id)) {
    return res.status(400).json({ message: 'La cabaña seleccionada no es válida' });
  }
  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    return res.status(400).json({ message: 'El puntaje debe ser un número entero entre 1 y 5' });
  }
  if (opinion.length > MAX_OPINION) {
    return res.status(400).json({ message: `La opinión no puede superar los ${MAX_OPINION} caracteres` });
  }

  const cabanaId = Number(body.cabana_id);
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Tiene que haber completado una estadía en esa cabaña
    const estadia = await client.query(
      `SELECT c.nombre
       FROM reserva r
       JOIN cabana c ON c.id = r.cabana_id
       WHERE r.usuario_id = $1 AND r.cabana_id = $2 AND r.estado = 'completada'
       LIMIT 1`,
      [req.user.id, cabanaId]
    );
    if (estadia.rows.length === 0) {
      throw errorHttp(403, 'Solo podés calificar cabañas en las que completaste una estadía');
    }

    const yaCalificada = await client.query(
      'SELECT 1 FROM calificacion WHERE usuario_id = $1 AND cabana_id = $2',
      [req.user.id, cabanaId]
    );
    if (yaCalificada.rows.length > 0) {
      throw errorHttp(409, 'Ya calificaste esta cabaña');
    }

    await client.query(
      'INSERT INTO calificacion (usuario_id, cabana_id, puntaje) VALUES ($1, $2, $3)',
      [req.user.id, cabanaId, puntaje]
    );

    if (opinion) {
      await client.query(
        'INSERT INTO opinion (usuario_id, cabana_id, contenido) VALUES ($1, $2, $3)',
        [req.user.id, cabanaId, opinion]
      );
    }

    // Aviso para los admins
    await client.query(
      `INSERT INTO notificacion (admin_id, tipo, mensaje)
       SELECT id, 'opinion', $1::text FROM admin`,
      [`${req.user.usuario} calificó "${estadia.rows[0].nombre}" con ${puntaje}/5${opinion ? ' y dejó una opinión' : ''}`]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Calificación enviada exitosamente',
      puntaje,
      opinion_publicada: Boolean(opinion)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // 23505: otro pedido simultáneo ya había guardado la calificación
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya calificaste esta cabaña' });
    }
    responderError(res, error);
  } finally {
    client.release();
  }
};

// ---------- USUARIO: cabañas que ya puede calificar y todavía no calificó ----------
const getPendientes = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id AS cabana_id, c.nombre, c.imagen_url,
              to_char(MAX(r.fecha_checkout), 'YYYY-MM-DD') AS ultima_estadia
       FROM reserva r
       JOIN cabana c ON c.id = r.cabana_id
       WHERE r.usuario_id = $1
         AND r.estado = 'completada'
         AND NOT EXISTS (
           SELECT 1 FROM calificacion k
           WHERE k.usuario_id = r.usuario_id AND k.cabana_id = r.cabana_id
         )
       GROUP BY c.id
       ORDER BY MAX(r.fecha_checkout) DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- ADMIN: calificaciones por cabaña ----------
const getCalificacionesAdmin = async (req, res) => {
  const { cabana_id } = req.query;
  if (cabana_id !== undefined && !idValido(cabana_id)) {
    return res.status(400).json({ message: 'El filtro cabana_id debe ser un número entero' });
  }

  const filtro = cabana_id === undefined ? null : Number(cabana_id);
  const { pagina, limite, offset } = paginar(req.query);

  try {
    const resumen = await db.query(
      `SELECT c.id AS cabana_id, c.nombre,
              ROUND(AVG(k.puntaje), 1)::float AS promedio,
              COUNT(k.id)::int AS total
       FROM cabana c
       JOIN calificacion k ON k.cabana_id = c.id
       WHERE ($1::int IS NULL OR c.id = $1)
       GROUP BY c.id
       ORDER BY c.nombre`,
      [filtro]
    );

    const total = await db.query(
      'SELECT COUNT(*)::int AS total FROM calificacion k WHERE ($1::int IS NULL OR k.cabana_id = $1)',
      [filtro]
    );

    const lista = await db.query(
      `SELECT k.id, k.puntaje, k.created_at,
              u.id AS usuario_id, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
              c.id AS cabana_id, c.nombre AS cabana_nombre
       FROM calificacion k
       JOIN usuario u ON u.id = k.usuario_id
       JOIN cabana c ON c.id = k.cabana_id
       WHERE ($1::int IS NULL OR k.cabana_id = $1)
       ORDER BY c.nombre, k.id DESC
       LIMIT $2 OFFSET $3`,
      [filtro, limite, offset]
    );

    res.json({
      total: total.rows[0].total,
      pagina,
      limite,
      resumen: resumen.rows,
      calificaciones: lista.rows
    });
  } catch (error) {
    responderError(res, error);
  }
};

module.exports = { crearCalificacion, getPendientes, getCalificacionesAdmin };