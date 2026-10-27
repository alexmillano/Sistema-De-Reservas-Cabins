const db = require('../config/db');
const { esFechaValida, hoy, estaOcupada } = require('../utils/reservas');
const { CABANA_VISIBLE } = require('../utils/cabanas')

// Valida un ítem del carrito. Devuelve { status, error } si algo está mal
// o { valores } con los datos ya limpios.
const validarItem = async (usuarioId, body, excluirItemId = null) => {
  const { cabana_id, fecha_checkin, fecha_checkout } = body;
  const cantidad_personas = body.cantidad_personas === undefined ? 1 : Number(body.cantidad_personas);

  if (!Number.isInteger(Number(cabana_id))) {
    return { status: 400, error: 'La cabaña seleccionada no es válida' };
  }
  if (!esFechaValida(fecha_checkin) || !esFechaValida(fecha_checkout)) {
    return { status: 400, error: 'Las fechas deben tener formato AAAA-MM-DD' };
  }
  if (fecha_checkin < hoy()) {
    return { status: 400, error: 'La fecha de check-in no puede ser anterior a hoy' };
  }
  if (fecha_checkout <= fecha_checkin) {
    return { status: 400, error: 'El check-out debe ser posterior al check-in' };
  }
  if (!Number.isInteger(cantidad_personas) || cantidad_personas < 1) {
    return { status: 400, error: 'La cantidad de personas debe ser un número entero mayor o igual a 1' };
  }

  const cab = await db.query(
    `SELECT c.capacidad_personas FROM cabana c WHERE c.id = $1 AND ${CABANA_VISIBLE}`,
    [cabana_id]
  );
  if (cab.rows.length === 0) {
    return { status: 404, error: 'Cabaña no encontrada' };
  }

  const capacidad = cab.rows[0].capacidad_personas;
  if (cantidad_personas > capacidad) {
    return { status: 400, error: `Esta cabaña admite hasta ${capacidad} personas` };
  }

  if (await estaOcupada(db, cabana_id, fecha_checkin, fecha_checkout)) {
    return { status: 409, error: 'La cabaña no está disponible para esas fechas' };
  }

  // La misma cabaña no puede estar dos veces en el carrito con fechas superpuestas
  const superpuesto = await db.query(
    `SELECT id FROM carrito
     WHERE usuario_id = $1 AND cabana_id = $2
       AND fecha_checkin < $4 AND fecha_checkout > $3
       AND ($5::int IS NULL OR id <> $5)`,
    [usuarioId, cabana_id, fecha_checkin, fecha_checkout, excluirItemId]
  );
  if (superpuesto.rows.length > 0) {
    return { status: 409, error: 'Ya tenés esta cabaña en el carrito con fechas que se superponen' };
  }

  return {
    valores: {
      cabana_id: Number(cabana_id),
      fecha_checkin,
      fecha_checkout,
      cantidad_personas
    }
  };
};

const getCarrito = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ca.id, ca.cabana_id, ca.cantidad_personas,
              to_char(ca.fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(ca.fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout,
              (ca.fecha_checkout - ca.fecha_checkin)   AS noches,
              c.nombre, c.imagen_url, ${CABANA_VISIBLE} AS activa, c.capacidad_personas,
              c.precio_por_noche::float AS precio_por_noche,
              ((ca.fecha_checkout - ca.fecha_checkin) * c.precio_por_noche)::float AS subtotal,
              l.nombre AS localidad, p.nombre AS provincia
       FROM carrito ca
       JOIN cabana c ON ca.cabana_id = c.id
       JOIN localidad l ON c.localidad_id = l.id
       JOIN provincia p ON l.provincia_id = p.id
       WHERE ca.usuario_id = $1
       ORDER BY ca.id`,
      [req.user.id]
    );

    const total = result.rows.reduce((acc, item) => acc + item.subtotal, 0);
    res.json({ items: result.rows, total: Math.round(total * 100) / 100 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const agregarAlCarrito = async (req, res) => {
  try {
    const validacion = await validarItem(req.user.id, req.body);
    if (validacion.error) {
      return res.status(validacion.status).json({ message: validacion.error });
    }

    const v = validacion.valores;
    const result = await db.query(
      `INSERT INTO carrito
        (usuario_id, cabana_id, cantidad_personas, fecha_checkin, fecha_checkout)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.user.id, v.cabana_id, v.cantidad_personas, v.fecha_checkin, v.fecha_checkout]
    );

    res.status(201).json({ message: 'Cabaña agregada al carrito', id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const actualizarItem = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const actual = await db.query(
      `SELECT cabana_id, cantidad_personas,
              to_char(fecha_checkin, 'YYYY-MM-DD')  AS fecha_checkin,
              to_char(fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout
       FROM carrito WHERE id = $1 AND usuario_id = $2`,
      [id, req.user.id]
    );
    if (actual.rows.length === 0) {
      return res.status(404).json({ message: 'Ítem no encontrado en tu carrito' });
    }

    // Lo que no se envía se conserva; la cabaña nunca cambia
    const item = actual.rows[0];
    const datos = {
      cabana_id: item.cabana_id,
      fecha_checkin: req.body.fecha_checkin ?? item.fecha_checkin,
      fecha_checkout: req.body.fecha_checkout ?? item.fecha_checkout,
      cantidad_personas: req.body.cantidad_personas ?? item.cantidad_personas
    };

    const validacion = await validarItem(req.user.id, datos, Number(id));
    if (validacion.error) {
      return res.status(validacion.status).json({ message: validacion.error });
    }

    const v = validacion.valores;
    await db.query(
      `UPDATE carrito
       SET fecha_checkin = $1, fecha_checkout = $2, cantidad_personas = $3
       WHERE id = $4 AND usuario_id = $5`,
      [v.fecha_checkin, v.fecha_checkout, v.cantidad_personas, id, req.user.id]
    );

    res.json({ message: 'Carrito actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const quitarDelCarrito = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const result = await db.query(
      'DELETE FROM carrito WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ítem no encontrado en tu carrito' });
    }
    res.json({ message: 'Cabaña quitada del carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { getCarrito, agregarAlCarrito, actualizarItem, quitarDelCarrito };