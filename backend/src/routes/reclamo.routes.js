const express = require('express');
const {
  crearReclamo, getMisReclamos, getNoLeidosUsuario, getReclamosAdmin,
  getMensajes, enviarMensaje, cerrarReclamo
} = require('../controllers/reclamo.controller');
const { verifyToken, verifyUsuario, verifyAdmin, verifyDueno } = require('../middlewares/auth.middleware');

const router = express.Router();

// Usuario
router.get('/mis-reclamos', verifyUsuario, getMisReclamos);
router.get('/no-leidos', verifyUsuario, getNoLeidosUsuario);
router.post('/', verifyUsuario, crearReclamo);

// Dueño (ve solo los de sus cabañas) y superadmin (ve todos, solo lectura)
router.get('/', verifyAdmin, getReclamosAdmin);
router.put('/:id/cerrar', verifyDueno, cerrarReclamo);

// Chat: el permiso fino (usuario del reclamo / dueño de la cabaña / superadmin) está en el controlador
router.get('/:id/mensajes', verifyToken, getMensajes);
router.post('/:id/mensajes', verifyToken, enviarMensaje);

module.exports = router;
