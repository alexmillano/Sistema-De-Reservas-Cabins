const db = require('../config/db');

const ESTADOS = ['nuevo', 'en_proceso', 'finalizado'];
const MAX_ASUNTO = 200;
const MAX_MENSAJE = 2000;

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

const responderError = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  res.status(500).json({ message: 'Error en el servidor' });
};

const idValido = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= 2147483647;
};

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Devuelve el reclamo si el actor tiene acceso. Un usuario solo accede a los suyos;
// si no es suyo se responde 404 para no revelar que existe.
// Con bloquear = true se bloquea la fila: un cierre y un mensaje simultáneos se ejecutan de a uno.
const obtenerReclamo = async (executor, id, user, bloquear = false) => {
  const result = await executor.query(
    `SELECT r.id, r.usuario_id, r.asunto, r.estado, r.created_at,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
     FROM reclamo r
     JOIN usuario u ON r.usuario_id = u.id
     WHERE r.id = $1
     ${bloquear ? 'FOR UPDATE OF r' : ''}`,
    [id]
  );
  const reclamo = result.rows[0];
  if (!reclamo || (user.rol === 'usuario' && reclamo.usuario_id !== user.id)) {
    throw errorHttp(404, 'Reclamo no encontrado');
  }
  return reclamo;
};

// Cantidad de reclamos por estado (para los contadores de las pestañas)
const contarPorEstado = async (usuarioId = null) => {
  const result = await db.query(
    `SELECT estado, COUNT(*)::int AS total
     FROM reclamo
     WHERE ($1::int IS NULL OR usuario_id = $1)
     GROUP BY estado`,
    [usuarioId]
  );
  const conteo = { nuevo: 0, en_proceso: 0, finalizado: 0 };
  result.rows.forEach((fila) => { conteo[fila.estado] = fila.total; });
  return conteo;
};

const SELECT_LISTA = `
  SELECT r.id, r.asunto, r.estado, r.created_at,
         u.id AS usuario_id, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
         um.mensaje AS ultimo_mensaje, um.created_at AS ultimo_mensaje_fecha
  FROM reclamo r
  JOIN usuario u ON r.usuario_id = u.id
  LEFT JOIN LATERAL (
    SELECT mensaje, created_at
    FROM mensaje_reclamo
    WHERE reclamo_id = r.id
    ORDER BY id DESC
    LIMIT 1
  ) um ON TRUE
`;

// ---------- USUARIO: crear un reclamo ----------
const crearReclamo = async (req, res) => {
  const asunto = texto(req.body?.asunto);
  const mensaje = texto(req.body?.mensaje);

  if (!asunto) {
    return res.status(400).json({ message: 'El asunto es obligatorio' });
  }
  if (asunto.length > MAX_ASUNTO) {
    return res.status(400).json({ message: `El asunto no puede superar los ${MAX_ASUNTO} caracteres` });
  }
  if (mensaje.length > MAX_MENSAJE) {
    return res.status(400).json({ message: `El mensaje no puede superar los ${MAX_MENSAJE} caracteres` });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const nuevo = await client.query(
      'INSERT INTO reclamo (usuario_id, asunto) VALUES ($1, $2) RETURNING id, asunto, estado, created_at',
      [req.user.id, asunto]
    );
    const reclamo = nuevo.rows[0];

    // El primer mensaje es opcional: si viene, queda como apertura del chat
    if (mensaje) {
      await client.query(
        `INSERT INTO mensaje_reclamo (reclamo_id, remitente_id, remitente_tipo, mensaje)
         VALUES ($1, $2, 'usuario', $3)`,
        [reclamo.id, req.user.id, mensaje]
      );
    }

    await client.query(
      `INSERT INTO notificacion (admin_id, tipo, mensaje)
       SELECT id, 'reclamo', $1::text FROM admin`,
      [`Nuevo reclamo de ${req.user.usuario}: ${asunto}`]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Reclamo creado exitosamente', reclamo });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

// ---------- USUARIO: listar sus reclamos ----------
const getMisReclamos = async (req, res) => {
  const { estado } = req.query;
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS.join(', ')}` });
  }

  const params = [req.user.id];
  let filtro = 'WHERE r.usuario_id = $1';
  if (estado) {
    params.push(estado);
    filtro += ` AND r.estado = $${params.length}`;
  }

  try {
    const lista = await db.query(
      `${SELECT_LISTA} ${filtro} ORDER BY COALESCE(um.created_at, r.created_at) DESC`,
      params
    );
    res.json({ conteo: await contarPorEstado(req.user.id), reclamos: lista.rows });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- ADMIN: listar todos los reclamos ----------
const getReclamosAdmin = async (req, res) => {
  const { estado } = req.query;
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS.join(', ')}` });
  }

  const params = [];
  let filtro = '';
  if (estado) {
    params.push(estado);
    filtro = 'WHERE r.estado = $1';
  }

  try {
    const lista = await db.query(
      `${SELECT_LISTA} ${filtro} ORDER BY COALESCE(um.created_at, r.created_at) DESC`,
      params
    );
    res.json({ conteo: await contarPorEstado(), reclamos: lista.rows });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- USUARIO / ADMIN: leer el chat ----------
// Con ?despues_de=<id> devuelve solo los mensajes nuevos (para actualizar el chat sin recargarlo)
const getMensajes = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const despuesDe = req.query.despues_de === undefined ? 0 : Number(req.query.despues_de);
  if (!Number.isInteger(despuesDe) || despuesDe < 0) {
    return res.status(400).json({ message: 'despues_de debe ser un número entero' });
  }

  try {
    const reclamo = await obtenerReclamo(db, id, req.user);

    const mensajes = await db.query(
      `SELECT m.id, m.remitente_tipo, m.mensaje, m.created_at,
              CASE WHEN m.remitente_tipo = 'usuario' THEN u.nombre ELSE a.nombre END AS remitente_nombre
       FROM mensaje_reclamo m
       LEFT JOIN usuario u ON m.remitente_tipo = 'usuario' AND u.id = m.remitente_id
       LEFT JOIN admin a ON m.remitente_tipo = 'admin' AND a.id = m.remitente_id
       WHERE m.reclamo_id = $1 AND m.id > $2
       ORDER BY m.id`,
      [id, despuesDe]
    );

    res.json({
      reclamo: {
        id: reclamo.id,
        asunto: reclamo.asunto,
        estado: reclamo.estado,
        bloqueado: reclamo.estado === 'finalizado',
        usuario_nombre: reclamo.usuario_nombre,
        usuario_apellido: reclamo.usuario_apellido,
        created_at: reclamo.created_at
      },
      mensajes: mensajes.rows
    });
  } catch (error) {
    responderError(res, error);
  }
};

// ---------- USUARIO / ADMIN: enviar un mensaje ----------
const enviarMensaje = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const mensaje = texto(req.body?.mensaje);
  if (!mensaje) {
    return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
  }
  if (mensaje.length > MAX_MENSAJE) {
    return res.status(400).json({ message: `El mensaje no puede superar los ${MAX_MENSAJE} caracteres` });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const reclamo = await obtenerReclamo(client, id, req.user, true);
    if (reclamo.estado === 'finalizado') {
      throw errorHttp(409, 'El reclamo está finalizado. Solo se puede ver el historial');
    }

    const nuevo = await client.query(
      `INSERT INTO mensaje_reclamo (reclamo_id, remitente_id, remitente_tipo, mensaje)
       VALUES ($1, $2, $3, $4)
       RETURNING id, remitente_tipo, mensaje, created_at`,
      [id, req.user.id, req.user.rol, mensaje]
    );

    // La primera respuesta del admin pasa el reclamo de "nuevo" a "en_proceso"
    let estado = reclamo.estado;
    if (req.user.rol === 'admin' && estado === 'nuevo') {
      await client.query("UPDATE reclamo SET estado = 'en_proceso' WHERE id = $1", [id]);
      estado = 'en_proceso';
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Mensaje enviado', mensaje: nuevo.rows[0], estado });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

// ---------- ADMIN: cerrar un reclamo ----------
const cerrarReclamo = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const reclamo = await obtenerReclamo(client, id, req.user, true);
    if (reclamo.estado === 'finalizado') {
      throw errorHttp(400, 'El reclamo ya está finalizado');
    }

    await client.query("UPDATE reclamo SET estado = 'finalizado' WHERE id = $1", [id]);

    await client.query('COMMIT');
    res.json({ message: 'Reclamo cerrado. El chat quedó en modo historial' });
  } catch (error) {
    await client.query('ROLLBACK');
    responderError(res, error);
  } finally {
    client.release();
  }
};

module.exports = {
  crearReclamo, getMisReclamos, getReclamosAdmin, getMensajes, enviarMensaje, cerrarReclamo
};