const express = require('express');
const router = express.Router();
const { register, login, loginAdmin } = require('../controllers/auth.controller');
const { olvideClave, restablecerClave } = require('../controllers/recuperacion.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/login-admin', loginAdmin);

router.post('/olvide-clave', olvideClave);
router.post('/restablecer-clave', restablecerClave);

module.exports = router;