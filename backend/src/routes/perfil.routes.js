const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getPerfil, actualizarPerfil, cambiarPassword, subirFoto, quitarFoto } = require('../controllers/perfil.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const MAX_MB = 5;
// El archivo se queda en memoria: no se escribe nada en el disco del servidor
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 } });

router.get('/', verifyToken, getPerfil);
router.put('/', verifyToken, actualizarPerfil);
router.put('/password', verifyToken, cambiarPassword);

// Foto de perfil: cualquier cuenta con sesión. Los errores de multer se traducen a mensajes claros.
router.put('/foto', verifyToken, (req, res, next) => {
  upload.single('imagen')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `La imagen no puede pesar más de ${MAX_MB} MB` });
    }
    return res.status(400).json({ message: 'No se pudo leer el archivo enviado' });
  });
}, subirFoto);
router.delete('/foto', verifyToken, quitarFoto);

module.exports = router;
