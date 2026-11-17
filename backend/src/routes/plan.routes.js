const express = require('express');
const router = express.Router();
const { getMisPlanes, contratarPlan } = require('../controllers/plan.controller');
const { verifyDueno } = require('../middlewares/auth.middleware');

// Solo el dueño contrata planes (el superadmin únicamente consulta, desde Finanzas)
router.get('/', verifyDueno, getMisPlanes);
router.post('/cabanas/:id/contratar', verifyDueno, contratarPlan);

module.exports = router;
