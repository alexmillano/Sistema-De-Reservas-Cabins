const express = require('express');
const router = express.Router();
const { pagar, getMisReservas } = require('../controllers/reserva.controller');
const { verifyUsuario } = require('../middlewares/auth.middleware');

router.post('/pagar', verifyUsuario, pagar);
router.get('/mis-reservas', verifyUsuario, getMisReservas);

module.exports = router;