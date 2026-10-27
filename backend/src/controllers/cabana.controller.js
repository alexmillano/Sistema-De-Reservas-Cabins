const db = require('../config/db');
const { CABANA_VISIBLE } = require('../utils/cabanas');

// Orden permitido (lista blanca: nunca se arma el ORDER BY con texto del usuario)
const ORDENES = {
  precio_asc: 'c.precio_por_noche ASC',
  precio_desc: 'c.precio_por_noche DESC',
  valoracion: 'valoracion DESC',
  recientes: 'c.created_at DESC'
};

const SELECT_CABANA = `
  SELECT c.id, c.nombre, c.descripcion,
         c.precio_por_noche::float AS precio_por_noche,
         c.capacidad_personas, c.imagen_url, c.metodos_pago, c.activa,
         c.created_at,
         l.id AS localidad_id, l.nombre AS localidad,
         p.id AS provincia_id, p.nombre AS provincia,
         ROUND(COALESCE(AVG(cal.puntaje), 0), 1)::float AS valoracion,
         COUNT(cal.id)::int AS total_calificaciones
  FROM cabana c
  JOIN localidad l ON c.localidad_id = l.id
  JOIN provincia p ON l.provincia_id = p.id
  LEFT JOIN calificacion cal ON cal.cabana_id = c.id
`;

// Devuelve un mensaje de error, o null si los datos son válidos
const validarDatos = async (datos) => {
  const { nombre, descripcion, localidad_id, precio_por_noche, capacidad_personas } = datos;

  if (!nombre || !descripcion || !localidad_id ||
      precio_por_noche === undefined || precio_por_noche === '') {
    return 'Nombre, descripción, localidad y precio son obligatorios';
  }
  if (!Number.isInteger(Number(localidad_id))) {
    return 'La localidad seleccionada no es válida';
  }
  if (typeof precio_por_noche === 'string' && precio_por_noche.includes(',')) {
    return 'El precio debe usar punto como separador decimal (ejemplo: 45000.50)';
  }

  const precio = Number(precio_por_noche);
  if (!Number.isFinite(precio) || precio <= 0 || precio > 99999999.99) {
    return 'El precio debe ser un número válido mayor a cero';
  }

  const capacidad = Number(capacidad_personas);
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 50) {
    return 'La capacidad (personas) debe ser un número entero entre 1 y 50';
  }

  const loc = await db.query('SELECT id FROM localidad WHERE id = $1', [localidad_id]);
  if (loc.rows.length === 0) {
    return 'La localidad seleccionada no existe';
  }
  return null;
};

const getCabanas = async (req, res) => {
  const { provincia_id, localidad_id, precio_min, precio_max, valoracion_min, orden } = req.query;

  const filtrosNumericos = { provincia_id, localidad_id, precio_min, precio_max, valoracion_min };
  for (const [clave, valor] of Object.entries(filtrosNumericos)) {
    if (valor !== undefined && isNaN(Number(valor))) {
      return res.status(400).json({ message: `El filtro ${clave} debe ser un número` });
    }
  }

  const condiciones = [CABANA_VISIBLE];
  const params = [];

  if (provincia_id) {
    params.push(provincia_id);
    condiciones.push(`p.id = $${params.length}`);
  }
  if (localidad_id) {
    params.push(localidad_id);
    condiciones.push(`l.id = $${params.length}`);
  }
  if (precio_min) {
    params.push(precio_min);
    condiciones.push(`c.precio_por_noche >= $${params.length}`);
  }
  if (precio_max) {
    params.push(precio_max);
    condiciones.push(`c.precio_por_noche <= $${params.length}`);
  }

  let query = SELECT_CABANA + ' WHERE ' + condiciones.join(' AND ') +
              ' GROUP BY c.id, l.id, p.id';

  if (valoracion_min) {
    params.push(valoracion_min);
    query += ` HAVING COALESCE(AVG(cal.puntaje), 0) >= $${params.length}`;
  }

  query += ' ORDER BY ' + (ORDENES[orden] || ORDENES.recientes);

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const getCabanaById = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const result = await db.query(
      SELECT_CABANA + ` WHERE c.id = $1 AND ${CABANA_VISIBLE} GROUP BY c.id, l.id, p.id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cabaña no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const createCabana = async (req, res) => {
  try {
    const error = await validarDatos(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { nombre, descripcion, localidad_id, precio_por_noche,
            capacidad_personas, imagen_url, metodos_pago } = req.body;

    const result = await db.query(
      `INSERT INTO cabana
        (nombre, descripcion, localidad_id, precio_por_noche,
         capacidad_personas, imagen_url, metodos_pago, admin_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        nombre,
        descripcion,
        localidad_id,
        Number(precio_por_noche),
        Number(capacidad_personas),
        imagen_url || null,
        metodos_pago || null,
        req.user.id
      ]
    );

    res.status(201).json({ message: 'Cabaña creada exitosamente', id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const updateCabana = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const existe = await db.query('SELECT id FROM cabana WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ message: 'Cabaña no encontrada' });
    }

    const error = await validarDatos(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { nombre, descripcion, localidad_id, precio_por_noche,
            capacidad_personas, imagen_url, metodos_pago, activa } = req.body;

    await db.query(
      `UPDATE cabana SET
         nombre = $1, descripcion = $2, localidad_id = $3,
         precio_por_noche = $4, capacidad_personas = $5,
         imagen_url = $6, metodos_pago = $7,
         activa = COALESCE($8, activa),
         updated_at = NOW()
       WHERE id = $9`,
      [
        nombre,
        descripcion,
        localidad_id,
        Number(precio_por_noche),
        Number(capacidad_personas),
        imagen_url || null,
        metodos_pago || null,
        activa === undefined ? null : activa,
        id
      ]
    );

    res.json({ message: 'Cabaña actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const deleteCabana = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const result = await db.query(
      'UPDATE cabana SET activa = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cabaña no encontrada' });
    }
    res.json({ message: 'Cabaña eliminada del catálogo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { getCabanas, getCabanaById, createCabana, updateCabana, deleteCabana };