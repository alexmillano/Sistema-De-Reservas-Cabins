const express = require('express');
const router = express.Router();
const { getResumen, getDetalleReservas } = require('../controllers/finanzas.controller');
const { verifyAdmin, verifySuperadmin } = require('../middlewares/auth.middleware');

router.get('/resumen', verifyAdmin, getResumen);
// El detalle de cada reserva (con comisión y tarifa) es solo del superadmin
router.get('/reservas', verifySuperadmin, getDetalleReservas);

module.exports = router;
