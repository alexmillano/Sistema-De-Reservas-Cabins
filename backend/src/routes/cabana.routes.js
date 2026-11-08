const express = require('express');
const router = express.Router();
const {
  getCabanas, getCabanasPanel, getCabanaById, createCabana, updateCabana, deleteCabana
} = require('../controllers/cabana.controller');
const { verifyAdmin, verifyDueno } = require('../middlewares/auth.middleware');

router.get('/', getCabanas);
// El panel va antes de /:id para que "panel" no se tome como un id
router.get('/panel', verifyAdmin, getCabanasPanel);
router.get('/:id', getCabanaById);
router.post('/', verifyDueno, createCabana);
router.put('/:id', verifyDueno, updateCabana);
router.delete('/:id', verifyDueno, deleteCabana);

module.exports = router;
