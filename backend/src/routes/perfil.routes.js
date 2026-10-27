const express = require('express');
const router = express.Router();
const { getPerfil, actualizarPerfil, cambiarPassword } = require('../controllers/perfil.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, getPerfil);
router.put('/', verifyToken, actualizarPerfil);
router.put('/password', verifyToken, cambiarPassword);

module.exports = router;