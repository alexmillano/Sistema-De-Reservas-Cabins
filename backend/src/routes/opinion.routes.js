const express = require('express');
const router = express.Router();
const { getOpinionesCabana, getOpinionesAdmin } = require('../controllers/opinion.controller');
const { verifyAdmin } = require('../middlewares/auth.middleware');

// Público: opiniones que se muestran en el detalle de la cabaña
router.get('/cabana/:id', getOpinionesCabana);

// Admin
router.get('/', verifyAdmin, getOpinionesAdmin);

module.exports = router;