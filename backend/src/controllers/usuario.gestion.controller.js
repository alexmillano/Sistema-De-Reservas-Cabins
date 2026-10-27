const db = require('../config/db');
const { validarMotivo } = require('../utils/validaciones');
const { paginar } = require('../utils/paginacion');

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

const responderError = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

const idValido = (valor) =>
  /^\d+$/.test(String(valor)) && Number(valor) > 0 && Number(valor) <= 2147483647;

// ---------- SUPERADMIN: listar usuarios (filtro por suspendidos y búsqueda) ----------
const listarUsuarios = async (req, res) => {
  const { baneado, buscar } = req.query;
  if (baneado !== undefined && !['true', 'false'].includes(baneado)) {
    return res.status(400).json({ message: 'El filtro baneado debe ser true o false' });
  }

  const { pagina, limite, offset } = paginar(req.query);
  const filtroBaneado = baneado === undefined ? null : baneado === 'true';
  const termino = typeof buscar === 'string' && buscar.trim() ? `%${buscar.trim()}%` : null;

  const condicion = `
    ($1::boolean IS NULL OR baneado = $1)
    AND ($2::text IS NULL
         OR nombre ILIKE $2 OR apellido ILIKE $2 OR usuario ILIKE $2 OR email ILIKE $2)`;

  try {
    const total = await db.query(
      `SELECT COUNT(*)::int AS total FROM usuario WHERE ${condicion}`,
      [filtroBaneado, termino]
    );
    const lista = await db.query(
      `SELECT id, nombre, apellido, email, usuario,
              baneado, motivo_baneo, baneado_at, created_at
       FROM usuario
       WHERE ${condicion}
       ORDER BY id DESC
       LIMIT $3 OFFSET $4`,
      [filtroBaneado, termino, limite, offset]
    );

    res.json({ total: total.rows[0].total, pagina, limite, usuarios: lista.rows });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: suspender un usuario ----------
const banearUsuario = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const { error, motivo } = validarMotivo(req.body?.motivo);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const destino = await db.query('SELECT baneado FROM usuario WHERE id = $1', [id]);
    if (destino.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (destino.rows[0].baneado) {
      return res.status(409).json({ message: 'La cuenta ya está suspendida' });
    }

    await db.query(
      `UPDATE usuario
       SET baneado = TRUE, motivo_baneo = $1, baneado_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [motivo, id]
    );

    res.json({ message: 'Usuario suspendido. Perdió el acceso al sistema' });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: reactivar un usuario suspendido ----------
const desbanearUsuario = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const destino = await db.query('SELECT baneado FROM usuario WHERE id = $1', [id]);
    if (destino.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (!destino.rows[0].baneado) {
      return res.status(409).json({ message: 'La cuenta no está suspendida' });
    }

    await db.query(
      `UPDATE usuario
       SET baneado = FALSE, motivo_baneo = NULL, baneado_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Usuario reactivado' });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- SUPERADMIN: eliminar un usuario ----------
// Irreversible. Hay que suspenderlo antes. La base borra en cascada sus reservas,
// calificaciones, opiniones, reclamos (con sus mensajes) y carrito.
const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const destino = await client.query(
      'SELECT baneado FROM usuario WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (destino.rows.length === 0) {
      throw errorHttp(404, 'Usuario no encontrado');
    }
    if (!destino.rows[0].baneado) {
      throw errorHttp(409, 'Primero tenés que suspender la cuenta para poder eliminarla');
    }

    const conteo = await client.query(
      `SELECT (SELECT COUNT(*) FROM reserva WHERE usuario_id = $1)::int AS reservas,
              (SELECT COUNT(*) FROM reclamo WHERE usuario_id = $1)::int AS reclamos`,
      [id]
    );

    await client.query('DELETE FROM usuario WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({
      message: 'Usuario eliminado definitivamente',
      reservas_eliminadas: conteo.rows[0].reservas,
      reclamos_eliminados: conteo.rows[0].reclamos
    });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

module.exports = { listarUsuarios, banearUsuario, desbanearUsuario, eliminarUsuario };