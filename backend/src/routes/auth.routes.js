const express = require('express');
const router = express.Router();
const { register, login, loginAdmin } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/login-admin', loginAdmin);

module.exports = router;