const db = require('../config/db');

const getProvincias = async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre FROM provincia ORDER BY nombre');
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