const express = require('express');
const router = express.Router();
const {
  listarUsuarios, banearUsuario, desbanearUsuario, eliminarUsuario
} = require('../controllers/usuario.gestion.controller');
const { verifySuperadmin } = require('../middlewares/auth.middleware');

router.use(verifySuperadmin);

router.get('/', listarUsuarios);
router.put('/:id/banear', banearUsuario);
router.put('/:id/desbanear', desbanearUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;