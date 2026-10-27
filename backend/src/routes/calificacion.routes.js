const express = require('express');
const router = express.Router();
const {
  crearCalificacion, getPendientes, getCalificacionesAdmin
} = require('../controllers/calificacion.controller');
const { verifyUsuario, verifyAdmin } = require('../middlewares/auth.middleware');

// Usuario
router.get('/pendientes', verifyUsuario, getPendientes);
router.post('/', verifyUsuario, crearCalificacion);

// Admin
router.get('/', verifyAdmin, getCalificacionesAdmin);

module.exports = router;