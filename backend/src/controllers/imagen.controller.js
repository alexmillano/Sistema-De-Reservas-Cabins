const { subirImagen } = require('../utils/almacenamiento');

// El archivo ya fue leído por multer (en memoria) y está en req.file
const subirImagenCabana = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Elegí una imagen para subir' });
  }
  try {
    // Cada dueño guarda en su propia carpeta
    const url = await subirImagen(req.file.buffer, `dueno-${req.user.id}`);
    res.status(201).json({ url });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { subirImagenCabana };
