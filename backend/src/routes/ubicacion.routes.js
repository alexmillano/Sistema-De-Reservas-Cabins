const express = require('express');
const router = express.Router();
const { getProvincias, getLocalidadesPorProvincia } = require('../controllers/ubicacion.controller');

router.get('/provincias', getProvincias);
router.get('/provincias/:id/localidades', getLocalidadesPorProvincia);

module.exports = router;