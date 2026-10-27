const express = require('express');
const router = express.Router();
const { pagar, getMisReservas } = require('../controllers/reserva.controller');
const {
  modificarReserva, cancelarReserva, getReservasAdmin, cambiarEstado
} = require('../controllers/reserva.gestion.controller');
const { verifyUsuario, verifyAdmin } = require('../middlewares/auth.middleware');

// Usuario
router.post('/pagar', verifyUsuario, pagar);
router.get('/mis-reservas', verifyUsuario, getMisReservas);
router.put('/:id', verifyUsuario, modificarReserva);
router.delete('/:id', verifyUsuario, cancelarReserva);

// Admin
router.get('/', verifyAdmin, getReservasAdmin);
router.put('/:id/estado', verifyAdmin, cambiarEstado);

module.exports = router;