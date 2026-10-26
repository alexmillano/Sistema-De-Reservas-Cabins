const express = require('express');
const router = express.Router();
const {
  getCabanas, getCabanaById, createCabana, updateCabana, deleteCabana
} = require('../controllers/cabana.controller');
const { verifyAdmin } = require('../middlewares/auth.middleware');

router.get('/', getCabanas);
router.get('/:id', getCabanaById);
router.post('/', verifyAdmin, createCabana);
router.put('/:id', verifyAdmin, updateCabana);
router.delete('/:id', verifyAdmin, deleteCabana);

module.exports = router;