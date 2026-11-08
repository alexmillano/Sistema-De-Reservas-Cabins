const express = require('express');
const router = express.Router();
const {
  pagar, getMisReservas, iniciarCheckout, estadoCheckout, liberarCheckout
} = require('../controllers/reserva.controller');
const {
  modificarReserva, cancelarReserva, getReservasAdmin, cambiarEstado
} = require('../controllers/reserva.gestion.controller');
const { verifyUsuario, verifyAdmin, verifyDueno } = require('../middlewares/auth.middleware');

// Usuario. Las rutas /checkout van antes que /:id para que no se confundan con un id.
router.post('/pagar', verifyUsuario, pagar);
router.get('/mis-reservas', verifyUsuario, getMisReservas);
router.post('/checkout', verifyUsuario, iniciarCheckout);
router.get('/checkout', verifyUsuario, estadoCheckout);
router.delete('/checkout', verifyUsuario, liberarCheckout);
router.put('/:id', verifyUsuario, modificarReserva);
router.delete('/:id', verifyUsuario, cancelarReserva);

// Administrador: cada dueño ve las reservas de sus cabañas y el superadmin las ve todas.
// Solo el dueño puede cambiar el estado.
router.get('/', verifyAdmin, getReservasAdmin);
router.put('/:id/estado', verifyDueno, cambiarEstado);

module.exports = router;
