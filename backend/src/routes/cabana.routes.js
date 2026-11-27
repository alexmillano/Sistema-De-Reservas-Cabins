const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getDestacadas, getMejores, getCabanas, getCabanasPanel, getCabanaById, createCabana, updateCabana, deleteCabana
} = require('../controllers/cabana.controller');
const {
  listarDocumentos, subirDocumentoCabana, borrarDocumentoCabana, listarRevision, revisarCabana
} = require('../controllers/cabana.revision.controller');
const { verifyAdmin, verifyDueno, verifySuperadmin } = require('../middlewares/auth.middleware');

const MAX_MB = 8;
// El documento se queda en memoria: no se escribe nada en el disco del servidor
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 } });
const recibirArchivo = (req, res, next) => {
  upload.single('archivo')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: `El archivo no puede pesar más de ${MAX_MB} MB` });
    return res.status(400).json({ message: 'No se pudo leer el archivo enviado' });
  });
};

router.get('/', getCabanas);
// Las rutas fijas van antes de /:id para que no se tomen como un id
router.get('/destacadas', getDestacadas);
router.get('/mejores', getMejores);
router.get('/panel', verifyAdmin, getCabanasPanel);
router.get('/revision', verifySuperadmin, listarRevision);
router.get('/:id', getCabanaById);
router.post('/', verifyDueno, createCabana);
router.put('/:id', verifyDueno, updateCabana);
router.delete('/:id', verifyDueno, deleteCabana);

// Revisión (solo superadmin) y documentos de la propiedad (dueño sube; dueño y superadmin ven)
router.put('/:id/revision', verifySuperadmin, revisarCabana);
router.get('/:id/documentos', verifyAdmin, listarDocumentos);
router.post('/:id/documentos', verifyDueno, recibirArchivo, subirDocumentoCabana);
router.delete('/:id/documentos/:docId', verifyDueno, borrarDocumentoCabana);

module.exports = router;
