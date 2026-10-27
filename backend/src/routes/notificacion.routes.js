const express = require('express');
const router = express.Router();
const {
  getNotificaciones, marcarLeida, marcarTodasLeidas
} = require('../controllers/notificacion.controller');
const { verifyAdmin } = require('../middlewares/auth.middleware');

router.use(verifyAdmin);

router.get('/', getNotificaciones);
router.put('/leer-todas', marcarTodasLeidas);
router.put('/:id/leer', marcarLeida);

module.exports = router;