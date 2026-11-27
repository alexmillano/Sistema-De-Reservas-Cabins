const db = require('../config/db');
const { subirDocumento, urlFirmada, borrarDocumento } = require('../utils/almacenamiento');

const TIPOS_DOCUMENTO = ['titularidad', 'impuesto_inmobiliario', 'servicio', 'habilitacion', 'otro'];
const MAX_DOCUMENTOS = 5;
const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];

const idValido = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

// Devuelve { status, message } si la cabaña no existe o no es del dueño; si no, null
const comprobarDueno = async (cabanaId, usuarioId) => {
  const r = await db.query('SELECT admin_id FROM cabana WHERE id = $1', [cabanaId]);
  if (r.rows.length === 0) return { status: 404, message: 'Cabaña no encontrada' };
  if (r.rows[0].admin_id !== usuarioId) return { status: 403, message: 'Solo podés gestionar tus propias cabañas' };
  return null;
};

// Documentos de una cabaña con enlace temporal (10 min) para verlos
const documentosConEnlace = async (cabanaId) => {
  const r = await db.query(
    'SELECT id, tipo, ruta, nombre_original, created_at FROM cabana_documento WHERE cabana_id = $1 ORDER BY id',
    [cabanaId]
  );
  return Promise.all(r.rows.map(async (d) => ({
    id: d.id, tipo: d.tipo, nombre_original: d.nombre_original, created_at: d.created_at,
    url: await urlFirmada(d.ruta).catch(() => null)
  })));
};

// ---------- DUEÑO / SUPERADMIN: ver los documentos de una cabaña ----------
const listarDocumentos = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ message: 'El id debe ser un número entero' });
  try {
    if (!req.user.es_superadmin) {
      const problema = await comprobarDueno(id, req.user.id);
      if (problema) return res.status(problema.status).json({ message: problema.message });
    }
    res.json(await documentosConEnlace(id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- DUEÑO: subir un documento de la propiedad (opcional, hasta 5) ----------
const subirDocumentoCabana = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ message: 'El id debe ser un número entero' });
  const tipo = req.body.tipo;
  if (!TIPOS_DOCUMENTO.includes(tipo)) return res.status(400).json({ message: 'Indicá qué tipo de documento es' });
  if (!req.file) return res.status(400).json({ message: 'Elegí un archivo para subir' });

  try {
    const problema = await comprobarDueno(id, req.user.id);
    if (problema) return res.status(problema.status).json({ message: problema.message });

    const cant = await db.query('SELECT COUNT(*)::int AS n FROM cabana_documento WHERE cabana_id = $1', [id]);
    if (cant.rows[0].n >= MAX_DOCUMENTOS) {
      return res.status(400).json({ message: `Podés cargar hasta ${MAX_DOCUMENTOS} documentos por cabaña` });
    }

    const ruta = await subirDocumento(req.file.buffer, `cabanas/${id}`);
    const nombre = String(req.file.originalname || '').slice(0, 150) || null;
    const r = await db.query(
      'INSERT INTO cabana_documento (cabana_id, tipo, ruta, nombre_original) VALUES ($1, $2, $3, $4) RETURNING id',
      [id, tipo, ruta, nombre]
    );
    res.status(201).json({ message: 'Documento cargado', id: r.rows[0].id });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- DUEÑO: quitar un documento propio ----------
const borrarDocumentoCabana = async (req, res) => {
  const { id, docId } = req.params;
  if (!idValido(id) || !idValido(docId)) return res.status(400).json({ message: 'Identificador inválido' });
  try {
    const problema = await comprobarDueno(id, req.user.id);
    if (problema) return res.status(problema.status).json({ message: problema.message });

    const r = await db.query('DELETE FROM cabana_documento WHERE id = $1 AND cabana_id = $2 RETURNING ruta', [docId, id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Documento no encontrado' });
    await borrarDocumento(r.rows[0].ruta);
    res.json({ message: 'Documento eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- SUPERADMIN: cola de revisión ----------
const listarRevision = async (req, res) => {
  const estado = req.query.estado || 'pendiente';
  if (!ESTADOS.includes(estado)) return res.status(400).json({ message: 'Estado inválido' });
  try {
    const r = await db.query(
      `SELECT c.id, c.nombre, c.descripcion, c.precio_por_noche::float AS precio_por_noche,
              c.capacidad_personas, c.imagen_url, c.estado_aprobacion, c.motivo_rechazo,
              c.created_at, c.revisada_at,
              l.nombre AS localidad, p.nombre AS provincia,
              a.id AS dueno_id, a.nombre AS dueno_nombre, a.apellido AS dueno_apellido, a.email AS dueno_email,
              COALESCE((SELECT json_agg(i.url ORDER BY i.orden, i.id) FROM cabana_imagen i WHERE i.cabana_id = c.id), '[]'::json) AS imagenes,
              (SELECT COUNT(*)::int FROM cabana_documento d WHERE d.cabana_id = c.id) AS total_documentos
       FROM cabana c
       JOIN localidad l ON c.localidad_id = l.id
       JOIN provincia p ON l.provincia_id = p.id
       LEFT JOIN admin a ON a.id = c.admin_id
       WHERE c.estado_aprobacion = $1
       ORDER BY c.created_at ASC, c.id ASC`,
      [estado]
    );
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- SUPERADMIN: aprobar o rechazar una cabaña ----------
const revisarCabana = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ message: 'El id debe ser un número entero' });
  const { decision } = req.body;
  const motivo = typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';

  if (!['aprobar', 'rechazar'].includes(decision)) {
    return res.status(400).json({ message: 'La decisión debe ser aprobar o rechazar' });
  }
  if (decision === 'rechazar' && (motivo.length < 5 || motivo.length > 500)) {
    return res.status(400).json({ message: 'Indicá el motivo del rechazo (entre 5 y 500 caracteres)' });
  }

  try {
    const nuevo = decision === 'aprobar' ? 'aprobada' : 'rechazada';
    const r = await db.query(
      `UPDATE cabana SET estado_aprobacion = $1, motivo_rechazo = $2, revisada_at = NOW(), revisada_por = $3, updated_at = NOW()
       WHERE id = $4 RETURNING nombre, admin_id`,
      [nuevo, decision === 'rechazar' ? motivo : null, req.user.id, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Cabaña no encontrada' });

    const { nombre, admin_id: dueno } = r.rows[0];
    if (dueno) {
      const mensaje = decision === 'aprobar'
        ? `Tu cabaña «${nombre}» fue aprobada y ya está publicada en el catálogo.`
        : `Tu cabaña «${nombre}» fue rechazada: ${motivo}. Corregila y se enviará de nuevo a revisión.`;
      await db.query(
        `INSERT INTO notificacion (admin_id, tipo, mensaje) VALUES ($1, 'revision', $2)`,
        [dueno, mensaje.slice(0, 500)]
      );
    }
    res.json({ message: decision === 'aprobar' ? 'Cabaña aprobada' : 'Cabaña rechazada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { listarDocumentos, subirDocumentoCabana, borrarDocumentoCabana, listarRevision, revisarCabana };
