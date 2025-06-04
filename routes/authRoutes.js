const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleWare = require('../middlewares/authMiddleWare');

router.post('/login', authController.dangNhap);

module.exports = router;