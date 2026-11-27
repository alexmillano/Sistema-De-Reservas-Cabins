const db = require('../config/db');
const { CABANA_VISIBLE } = require('../utils/cabanas');
const { JOIN_PLAN, PLAN_EFECTIVO, PLAN_NIVEL } = require('../utils/planes');

// Orden permitido (lista blanca: nunca se arma el ORDER BY con texto del usuario)
const ORDENES = {
  precio_asc: 'c.precio_por_noche ASC',
  precio_desc: 'c.precio_por_noche DESC',
  valoracion: 'valoracion DESC',
  recientes: 'c.created_at DESC',
  // Primero Premium, después Plus y Free; dentro de cada plan, las mejor calificadas
  recomendado: 'plan_nivel DESC, valoracion DESC, total_calificaciones DESC, c.created_at DESC'
};

// Galería de la cabaña (URLs en orden). La primera es la portada.
const MAX_IMAGENES = 10;
const IMAGENES = `COALESCE((SELECT json_agg(i.url ORDER BY i.orden, i.id) FROM cabana_imagen i WHERE i.cabana_id = c.id), '[]'::json)`;

const SELECT_CABANA = `
  SELECT c.id, c.nombre, c.descripcion,
         c.precio_por_noche::float AS precio_por_noche,
         c.capacidad_personas, c.imagen_url, c.metodos_pago, c.activa,
         c.created_at,
         ${IMAGENES} AS imagenes,
         l.id AS localidad_id, l.nombre AS localidad,
         p.id AS provincia_id, p.nombre AS provincia,
         ROUND(COALESCE(AVG(cal.puntaje), 0), 1)::float AS valoracion,
         COUNT(cal.id)::int AS total_calificaciones,
         ${PLAN_EFECTIVO} AS plan,
         ${PLAN_NIVEL} AS plan_nivel
  FROM cabana c
  JOIN localidad l ON c.localidad_id = l.id
  JOIN provincia p ON l.provincia_id = p.id
  LEFT JOIN calificacion cal ON cal.cabana_id = c.id
  ${JOIN_PLAN}
`;

// Avisa a todos los superadmin activos que hay una cabaña esperando revisión
const avisarSuperadmins = async (cabanaId, texto) => {
  try {
    const r = await db.query('SELECT nombre, apellido FROM admin WHERE id = (SELECT admin_id FROM cabana WHERE id = $1)', [cabanaId]);
    const dueno = r.rows[0] ? `${r.rows[0].nombre} ${r.rows[0].apellido}` : 'Un dueño';
    await db.query(
      `INSERT INTO notificacion (admin_id, tipo, mensaje)
       SELECT id, 'revision_pendiente', $1 FROM admin WHERE es_superadmin = TRUE AND baneado = FALSE`,
      [`${dueno} ${texto}`.slice(0, 500)]
    );
  } catch (error) {
    // El aviso es un extra: si falla, la cabaña igual se guardó
    console.error('No se pudo avisar a los superadmin:', error.message);
  }
};

// La galería es opcional: si viene, debe ser una lista de hasta 10 enlaces http(s) sin repetir
const validarImagenes = (imagenes) => {
  if (imagenes === undefined) return null;
  if (!Array.isArray(imagenes)) return 'Las imágenes deben enviarse como una lista';
  if (imagenes.length > MAX_IMAGENES) return `Podés cargar hasta ${MAX_IMAGENES} fotos por cabaña`;
  const vistas = new Set();
  for (const url of imagenes) {
    if (typeof url !== 'string' || url.length > 500 || !/^https?:\/\//i.test(url)) {
      return 'Cada foto debe ser un enlace válido (http o https) de hasta 500 caracteres';
    }
    if (vistas.has(url)) return 'Hay fotos repetidas en la galería';
    vistas.add(url);
  }
  return null;
};

// Reemplaza la galería de una cabaña y deja la primera foto como portada
const guardarGaleria = async (cliente, cabanaId, imagenes) => {
  await cliente.query('DELETE FROM cabana_imagen WHERE cabana_id = $1', [cabanaId]);
  for (let i = 0; i < imagenes.length; i += 1) {
    await cliente.query('INSERT INTO cabana_imagen (cabana_id, url, orden) VALUES ($1, $2, $3)', [cabanaId, imagenes[i], i]);
  }
  await cliente.query('UPDATE cabana SET imagen_url = $1 WHERE id = $2', [imagenes[0] || null, cabanaId]);
};

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

  const errorImagenes = validarImagenes(datos.imagenes);
  if (errorImagenes) return errorImagenes;

  const loc = await db.query('SELECT id FROM localidad WHERE id = $1', [localidad_id]);
  if (loc.rows.length === 0) {
    return 'La localidad seleccionada no existe';
  }
  return null;
};

// ---------- PÚBLICO: catálogo ----------
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
              ' GROUP BY c.id, l.id, p.id, pa.plan';

  if (valoracion_min) {
    params.push(valoracion_min);
    query += ` HAVING COALESCE(AVG(cal.puntaje), 0) >= $${params.length}`;
  }

  query += ' ORDER BY ' + (ORDENES[orden] || ORDENES.recomendado);

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- PÚBLICO: cabañas destacadas del inicio (solo Premium vigentes que cumplen los requisitos) ----------
const getDestacadas = async (req, res) => {
  try {
    const result = await db.query(
      SELECT_CABANA + ` WHERE ${CABANA_VISIBLE} GROUP BY c.id, l.id, p.id, pa.plan
       HAVING ${PLAN_EFECTIVO} = 'premium'
       ORDER BY valoracion DESC, total_calificaciones DESC, c.created_at DESC
       LIMIT 6`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- PÚBLICO: las 3 cabañas mejor valoradas (portada, «Dónde estamos») ----------
// Se calcula en cada consulta: una cabaña nueva entra sola si su promedio la ubica entre las 3 primeras.
const getMejores = async (req, res) => {
  try {
    const result = await db.query(
      SELECT_CABANA + ` WHERE ${CABANA_VISIBLE} GROUP BY c.id, l.id, p.id, pa.plan
       ORDER BY valoracion DESC, total_calificaciones DESC, c.created_at DESC
       LIMIT 3`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- ADMINISTRADOR: panel de cabañas ----------
// El dueño ve sus cabañas (activas e inactivas). El superadmin ve todas, con el nombre del dueño.
const getCabanasPanel = async (req, res) => {
  const dueno = req.user.es_superadmin ? null : req.user.id;

  try {
    const result = await db.query(
      `SELECT c.id, c.nombre, c.descripcion,
              c.precio_por_noche::float AS precio_por_noche,
              c.capacidad_personas, c.imagen_url, c.metodos_pago, c.activa, c.created_at,
              c.estado_aprobacion, c.motivo_rechazo,
              (SELECT COUNT(*)::int FROM cabana_documento d WHERE d.cabana_id = c.id) AS total_documentos,
              ${IMAGENES} AS imagenes,
              l.id AS localidad_id, l.nombre AS localidad,
              p.id AS provincia_id, p.nombre AS provincia,
              c.admin_id, a.nombre AS dueno_nombre, a.apellido AS dueno_apellido,
              ROUND(COALESCE(AVG(cal.puntaje), 0), 1)::float AS valoracion,
              COUNT(cal.id)::int AS total_calificaciones
       FROM cabana c
       JOIN localidad l ON c.localidad_id = l.id
       JOIN provincia p ON l.provincia_id = p.id
       LEFT JOIN admin a ON a.id = c.admin_id
       LEFT JOIN calificacion cal ON cal.cabana_id = c.id
       WHERE ($1::int IS NULL OR c.admin_id = $1)
       GROUP BY c.id, l.id, p.id, a.id
       ORDER BY c.created_at DESC, c.id DESC`,
      [dueno]
    );
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
      SELECT_CABANA + ` WHERE c.id = $1 AND ${CABANA_VISIBLE} GROUP BY c.id, l.id, p.id, pa.plan`,
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

// ---------- DUEÑO: crear una cabaña (queda a su nombre) ----------
const createCabana = async (req, res) => {
  try {
    const error = await validarDatos(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { nombre, descripcion, localidad_id, precio_por_noche,
            capacidad_personas, imagen_url, metodos_pago, imagenes } = req.body;

    const cliente = await db.connect();
    let nuevoId;
    try {
      await cliente.query('BEGIN');
      const result = await cliente.query(
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
      nuevoId = result.rows[0].id;
      // Si llega la galería se usa; si llega solo imagen_url (versiones anteriores), esa foto es la única
      const galeria = imagenes !== undefined ? imagenes : (imagen_url ? [imagen_url] : []);
      await guardarGaleria(cliente, nuevoId, galeria);
      await cliente.query('COMMIT');
    } catch (errorTx) {
      await cliente.query('ROLLBACK');
      throw errorTx;
    } finally {
      cliente.release();
    }

    await avisarSuperadmins(nuevoId, `envió la cabaña «${nombre}» para su revisión.`);
    res.status(201).json({ message: 'Cabaña enviada a revisión. Se publicará cuando el equipo de Cabins la apruebe', id: nuevoId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Busca la cabaña y comprueba que sea del dueño que hace el pedido.
// Devuelve { status, message } si no puede seguir, o null si todo está bien.
const comprobarDueno = async (id, usuarioId) => {
  const result = await db.query('SELECT admin_id FROM cabana WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    return { status: 404, message: 'Cabaña no encontrada' };
  }
  if (result.rows[0].admin_id !== usuarioId) {
    return { status: 403, message: 'Solo podés gestionar tus propias cabañas' };
  }
  return null;
};

// ---------- DUEÑO: editar una cabaña propia ----------
const updateCabana = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const problema = await comprobarDueno(id, req.user.id);
    if (problema) {
      return res.status(problema.status).json({ message: problema.message });
    }

    const error = await validarDatos(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }
    const previo = await db.query('SELECT estado_aprobacion FROM cabana WHERE id = $1', [id]);
    const eraRechazada = previo.rows[0]?.estado_aprobacion === 'rechazada';

    const { nombre, descripcion, localidad_id, precio_por_noche,
            capacidad_personas, imagen_url, metodos_pago, activa, imagenes } = req.body;

    const cliente = await db.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(
        `UPDATE cabana SET
           nombre = $1, descripcion = $2, localidad_id = $3,
           precio_por_noche = $4, capacidad_personas = $5,
           imagen_url = $6, metodos_pago = $7,
           activa = COALESCE($8, activa),
           -- Si estaba rechazada, al corregirla vuelve a revisión
           estado_aprobacion = CASE WHEN estado_aprobacion = 'rechazada' THEN 'pendiente' ELSE estado_aprobacion END,
           motivo_rechazo = CASE WHEN estado_aprobacion = 'rechazada' THEN NULL ELSE motivo_rechazo END,
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
      // Solo se toca la galería si el pedido la trae (activar o desactivar no la modifica)
      if (imagenes !== undefined) await guardarGaleria(cliente, id, imagenes);
      await cliente.query('COMMIT');
    } catch (errorTx) {
      await cliente.query('ROLLBACK');
      throw errorTx;
    } finally {
      cliente.release();
    }

    if (eraRechazada) await avisarSuperadmins(id, `corrigió la cabaña «${nombre}» y la envió de nuevo a revisión.`);
    res.json({ message: 'Cabaña actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- DUEÑO: desactivar una cabaña propia ----------
const deleteCabana = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }

  try {
    const problema = await comprobarDueno(id, req.user.id);
    if (problema) {
      return res.status(problema.status).json({ message: problema.message });
    }

    await db.query(
      'UPDATE cabana SET activa = FALSE, updated_at = NOW() WHERE id = $1',
      [id]
    );
    res.json({ message: 'Cabaña eliminada del catálogo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  getDestacadas, getMejores, getCabanas, getCabanasPanel, getCabanaById, createCabana, updateCabana, deleteCabana };
