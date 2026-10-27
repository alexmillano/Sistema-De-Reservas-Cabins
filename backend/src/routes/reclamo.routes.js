const express = require('express');
const router = express.Router();
const {
  crearReclamo, getMisReclamos, getReclamosAdmin, getMensajes, enviarMensaje, cerrarReclamo
} = require('../controllers/reclamo.controller');
const { verifyToken, verifyUsuario, verifyAdmin } = require('../middlewares/auth.middleware');

// Usuario
router.get('/mis-reclamos', verifyUsuario, getMisReclamos);
router.post('/', verifyUsuario, crearReclamo);

// Admin
router.get('/', verifyAdmin, getReclamosAdmin);
router.put('/:id/cerrar', verifyAdmin, cerrarReclamo);

// Chat: usuario (solo sus reclamos) y admin (todos)
router.get('/:id/mensajes', verifyToken, getMensajes);
router.post('/:id/mensajes', verifyToken, enviarMensaje);

module.exports = router;