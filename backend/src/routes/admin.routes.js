const express = require('express');
const router = express.Router();
const {
  listarAdmins, crearAdmin, editarAdmin, banearAdmin, desbanearAdmin, eliminarAdmin
} = require('../controllers/admin.controller');
const { verifySuperadmin } = require('../middlewares/auth.middleware');

router.use(verifySuperadmin);

router.get('/', listarAdmins);
router.post('/', crearAdmin);
router.put('/:id', editarAdmin);
router.put('/:id/banear', banearAdmin);
router.put('/:id/desbanear', desbanearAdmin);
router.delete('/:id', eliminarAdmin);

module.exports = router;