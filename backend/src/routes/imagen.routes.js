const express = require('express');
const multer = require('multer');
const router = express.Router();
const { subirImagenCabana } = require('../controllers/imagen.controller');
const { verifyDueno } = require('../middlewares/auth.middleware');

const MAX_MB = 5;
// El archivo se queda en memoria: no se escribe nada en el disco del servidor
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 } });

// Solo el dueño sube fotos de sus cabañas. Los errores de multer se traducen a mensajes claros.
router.post('/', verifyDueno, (req, res, next) => {
  upload.single('imagen')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `La imagen no puede pesar más de ${MAX_MB} MB` });
    }
    return res.status(400).json({ message: 'No se pudo leer el archivo enviado' });
  });
}, subirImagenCabana);

module.exports = router;
