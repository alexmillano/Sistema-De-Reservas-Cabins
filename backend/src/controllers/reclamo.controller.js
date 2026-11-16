const db = require('../config/db');

const ESTADOS = ['nuevo', 'en_proceso', 'finalizado'];
const MAX_ASUNTO = 200;
const MAX_MENSAJE = 2000;

const errorHttp = (status, message) => Object.assign(new Error(message), { status });
const responderError = (res, error) => {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: 'Error en el servidor' });
};

const esUsuario = (req) => req.user.rol === 'usuario';
const esSuperadmin = (req) => req.user.rol === 'admin' && req.user.es_superadmin === true;

// Los mensajes del otro lado que todavía no se leyeron
const NO_LEIDOS_USUARIO = `(SELECT COUNT(*)::int FROM mensaje_reclamo m
   WHERE m.reclamo_id = r.id AND m.remitente_tipo = 'admin' AND m.leido_at IS NULL)`;
const NO_LEIDOS_DUENO = `(SELECT COUNT(*)::int FROM mensaje_reclamo m
   WHERE m.reclamo_id = r.id AND m.remitente_tipo = 'usuario' AND m.leido_at IS NULL)`;

const SELECT_RECLAMO = `
  SELECT r.id, r.asunto, r.estado, r.created_at, r.reserva_id,
         to_char(res.fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
         to_char(res.fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout,
         c.id AS cabana_id, c.nombre AS cabana_nombre,
         u.id AS usuario_id, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
         (SELECT mensaje FROM mensaje_reclamo WHERE reclamo_id = r.id ORDER BY id DESC LIMIT 1) AS ultimo_mensaje,
         (SELECT created_at FROM mensaje_reclamo WHERE reclamo_id = r.id ORDER BY id DESC LIMIT 1) AS ultimo_mensaje_at
  FROM reclamo r
  JOIN usuario u ON r.usuario_id = u.id
  LEFT JOIN reserva res ON r.reserva_id = res.id
  LEFT JOIN cabana c ON res.cabana_id = c.id
`;

// Devuelve el reclamo solo si esta persona puede verlo; si no, 404 (no se revela que existe)
const obtenerReclamo = async (req, id, cliente = db) => {
  const r = await cliente.query(
    `SELECT r.id, r.estado, r.usuario_id, c.admin_id AS dueno_id
     FROM reclamo r
     LEFT JOIN reserva res ON r.reserva_id = res.id
     LEFT JOIN cabana c ON res.cabana_id = c.id
     WHERE r.id = $1`,
    [id]
  );
  const rec = r.rows[0];
  if (!rec) throw errorHttp(404, 'Reclamo no encontrado');

  if (esUsuario(req)) {
    if (rec.usuario_id !== req.user.id) throw errorHttp(404, 'Reclamo no encontrado');
  } else if (!esSuperadmin(req)) {
    if (rec.dueno_id !== req.user.id) throw errorHttp(404, 'Reclamo no encontrado');
  }
  return rec;
};

const idValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// ---------- USUARIO: crear reclamo (siempre sobre una reserva suya) ----------
const crearReclamo = async (req, res) => {
  const asunto = String(req.body?.asunto ?? '').trim();
  const mensaje = String(req.body?.mensaje ?? '').trim();
  const { reserva_id } = req.body || {};

  if (!asunto) return res.status(400).json({ message: 'El asunto es obligatorio' });
  if (asunto.length > MAX_ASUNTO) {
    return res.status(400).json({ message: `El asunto admite hasta ${MAX_ASUNTO} caracteres` });
  }
  if (mensaje.length > MAX_MENSAJE) {
    return res.status(400).json({ message: `El mensaje admite hasta ${MAX_MENSAJE} caracteres` });
  }
  if (!idValido(reserva_id)) {
    return res.status(400).json({ message: 'Tenés que elegir la reserva sobre la que hacés el reclamo' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // La reserva tiene que ser del propio usuario
    const reserva = await client.query(
      `SELECT res.id, c.nombre AS cabana_nombre, c.admin_id
       FROM reserva res JOIN cabana c ON res.cabana_id = c.id
       WHERE res.id = $1 AND res.usuario_id = $2`,
      [reserva_id, req.user.id]
    );
    if (reserva.rows.length === 0) throw errorHttp(404, 'Reserva no encontrada');
    const { cabana_nombre, admin_id } = reserva.rows[0];

    const nuevo = await client.query(
      'INSERT INTO reclamo (usuario_id, reserva_id, asunto) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, reserva_id, asunto]
    );
    const reclamoId = nuevo.rows[0].id;

    if (mensaje) {
      await client.query(
        `INSERT INTO mensaje_reclamo (reclamo_id, remitente_id, remitente_tipo, mensaje)
         VALUES ($1, $2, 'usuario', $3)`,
        [reclamoId, req.user.id, mensaje]
      );
    }

    // Aviso solo para el dueño de esa cabaña
    if (admin_id) {
      await client.query(
        `INSERT INTO notificacion (admin_id, tipo, mensaje, reserva_id)
         VALUES ($1, 'reclamo', $2, $3)`,
        [admin_id, `Nuevo reclamo de ${req.user.usuario} sobre ${cabana_nombre}: ${asunto}`.slice(0, 500), reserva_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Reclamo enviado', id: reclamoId });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

// ---------- USUARIO: mis reclamos ----------
const getMisReclamos = async (req, res) => {
  try {
    const result = await db.query(
      `${SELECT_RECLAMO.replace('FROM reclamo r', `, ${NO_LEIDOS_USUARIO} AS no_leidos FROM reclamo r`)}
       WHERE r.usuario_id = $1
       ORDER BY COALESCE((SELECT MAX(created_at) FROM mensaje_reclamo WHERE reclamo_id = r.id), r.created_at) DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- ADMIN: reclamos de mis cabañas (el superadmin ve todos) ----------
const getReclamosAdmin = async (req, res) => {
  const { estado } = req.query;
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS.join(', ')}` });
  }

  const params = [];
  const condiciones = [];
  if (!esSuperadmin(req)) {
    params.push(req.user.id);
    condiciones.push(`c.admin_id = $${params.length}`);
  }
  if (estado) {
    params.push(estado);
    condiciones.push(`r.estado = $${params.length}`);
  }
  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  // El superadmin solo mira: no tiene mensajes "sin leer" propios
  const noLeidos = esSuperadmin(req) ? '0' : NO_LEIDOS_DUENO;

  try {
    const result = await db.query(
      `${SELECT_RECLAMO.replace('FROM reclamo r', `, ${noLeidos} AS no_leidos FROM reclamo r`)}
       ${where}
       ORDER BY COALESCE((SELECT MAX(created_at) FROM mensaje_reclamo WHERE reclamo_id = r.id), r.created_at) DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- Chat: leer mensajes (polling con ?despues_de=<id>) ----------
const getMensajes = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ message: 'El id debe ser un número entero' });

  const despues = req.query.despues_de === undefined ? 0 : Number(req.query.despues_de);
  if (!Number.isInteger(despues) || despues < 0) {
    return res.status(400).json({ message: 'despues_de debe ser un número entero' });
  }

  try {
    await obtenerReclamo(req, id);

    // Al abrir el chat, los mensajes del otro lado quedan como vistos.
    // El superadmin solo mira: no marca nada.
    let propios = null;
    if (esUsuario(req)) {
      propios = 'usuario';
      await db.query(
        `UPDATE mensaje_reclamo SET leido_at = NOW()
         WHERE reclamo_id = $1 AND remitente_tipo = 'admin' AND leido_at IS NULL`, [id]);
    } else if (!esSuperadmin(req)) {
      propios = 'admin';
      await db.query(
        `UPDATE mensaje_reclamo SET leido_at = NOW()
         WHERE reclamo_id = $1 AND remitente_tipo = 'usuario' AND leido_at IS NULL`, [id]);
    }

    const [cabecera, mensajes, visto] = await Promise.all([
      db.query(`${SELECT_RECLAMO} WHERE r.id = $1`, [id]),
      db.query(
        `SELECT id, remitente_tipo, mensaje, created_at, leido_at,
                (leido_at IS NOT NULL) AS visto
         FROM mensaje_reclamo WHERE reclamo_id = $1 AND id > $2 ORDER BY id`,
        [id, despues]
      ),
      // Mis mensajes se ven ✓✓ hasta este id (se leen siempre en orden)
      propios
        ? db.query(
            `SELECT MAX(id) AS visto_hasta FROM mensaje_reclamo
             WHERE reclamo_id = $1 AND remitente_tipo = $2 AND leido_at IS NOT NULL`,
            [id, propios])
        : Promise.resolve({ rows: [{ visto_hasta: null }] })
    ]);

    res.json({
      reclamo: cabecera.rows[0],
      mensajes: mensajes.rows,
      visto_hasta: visto.rows[0].visto_hasta
    });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- Chat: enviar mensaje (usuario dueño del reclamo o dueño de la cabaña) ----------
const enviarMensaje = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ message: 'El id debe ser un número entero' });

  if (esSuperadmin(req)) {
    return res.status(403).json({ message: 'El superadmin solo consulta los chats, no responde' });
  }

  const mensaje = String(req.body?.mensaje ?? '').trim();
  if (!mensaje) return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
  if (mensaje.length > MAX_MENSAJE) {
    return res.status(400).json({ message: `El mensaje admite hasta ${MAX_MENSAJE} caracteres` });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM reclamo WHERE id = $1 FOR UPDATE', [id]);
    const reclamo = await obtenerReclamo(req, id, client);

    if (reclamo.estado === 'finalizado') {
      throw errorHttp(409, 'El reclamo está finalizado: ya no se pueden enviar mensajes');
    }

    const tipo = esUsuario(req) ? 'usuario' : 'admin';
    const nuevo = await client.query(
      `INSERT INTO mensaje_reclamo (reclamo_id, remitente_id, remitente_tipo, mensaje)
       VALUES ($1, $2, $3, $4)
       RETURNING id, remitente_tipo, mensaje, created_at, leido_at, FALSE AS visto`,
      [id, req.user.id, tipo, mensaje]
    );

    // La primera respuesta del dueño pasa el reclamo a "en proceso"
    if (tipo === 'admin' && reclamo.estado === 'nuevo') {
      await client.query("UPDATE reclamo SET estado = 'en_proceso' WHERE id = $1", [id]);
    }

    await client.query('COMMIT');
    res.status(201).json(nuevo.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

// ---------- DUEÑO: cerrar reclamo ----------
const cerrarReclamo = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ message: 'El id debe ser un número entero' });

  try {
    const reclamo = await obtenerReclamo(req, id);
    if (reclamo.estado === 'finalizado') {
      return res.status(409).json({ message: 'El reclamo ya estaba finalizado' });
    }
    await db.query("UPDATE reclamo SET estado = 'finalizado' WHERE id = $1", [id]);
    res.json({ message: 'Reclamo finalizado', estado: 'finalizado' });
  } catch (error) {
    responderError(res, error);
  }
};

module.exports = { crearReclamo, getMisReclamos, getReclamosAdmin, getMensajes, enviarMensaje, cerrarReclamo };
