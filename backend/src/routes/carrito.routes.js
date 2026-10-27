const express = require('express');
const router = express.Router();
const {
  getCarrito, agregarAlCarrito, actualizarItem, quitarDelCarrito
} = require('../controllers/carrito.controller');
const { verifyUsuario } = require('../middlewares/auth.middleware');

router.use(verifyUsuario);

router.get('/', getCarrito);
router.post('/', agregarAlCarrito);
router.put('/:id', actualizarItem);
router.delete('/:id', quitarDelCarrito);

module.exports = router;