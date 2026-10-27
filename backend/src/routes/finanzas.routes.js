const express = require('express');
const router = express.Router();
const { getResumen } = require('../controllers/finanzas.controller');
const { verifyAdmin } = require('../middlewares/auth.middleware');

router.get('/resumen', verifyAdmin, getResumen);

module.exports = router;