const db = require('../config/db');

const getProvincias = async (req, res) => {
  try {
    // Además del nombre, cuántas cabañas activas tiene cada provincia (para el inicio de la web)
    const result = await db.query(
      `SELECT p.id, p.nombre, COUNT(c.id)::int AS cabanas
       FROM provincia p
       LEFT JOIN localidad l ON l.provincia_id = p.id
       LEFT JOIN cabana c ON c.localidad_id = l.id AND c.activa = TRUE AND c.estado_aprobacion = 'aprobada'
       GROUP BY p.id, p.nombre
       ORDER BY p.nombre`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const getLocalidadesPorProvincia = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre FROM localidad WHERE provincia_id = $1 ORDER BY nombre',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { getProvincias, getLocalidadesPorProvincia };