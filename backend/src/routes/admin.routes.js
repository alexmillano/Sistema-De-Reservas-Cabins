const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  listarAdmins, crearAdmin, verDniAdmin, editarAdmin, banearAdmin, desbanearAdmin, eliminarAdmin
} = require('../controllers/admin.controller');
const { verifySuperadmin } = require('../middlewares/auth.middleware');

const MAX_MB = 5;
// Las fotos del DNI se quedan en memoria: no se escribe nada en el disco del servidor
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 2 } });
const recibirDni = (req, res, next) => {
  upload.fields([{ name: 'dni_frente', maxCount: 1 }, { name: 'dni_dorso', maxCount: 1 }])(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: `Cada foto del DNI no puede pesar más de ${MAX_MB} MB` });
    return res.status(400).json({ message: 'No se pudieron leer los archivos enviados' });
  });
};

router.use(verifySuperadmin);

router.get('/', listarAdmins);
router.post('/', recibirDni, crearAdmin);
router.get('/:id/dni', verDniAdmin);
router.put('/:id', editarAdmin);
router.put('/:id/banear', banearAdmin);
router.put('/:id/desbanear', desbanearAdmin);
router.delete('/:id', eliminarAdmin);

module.exports = router;
