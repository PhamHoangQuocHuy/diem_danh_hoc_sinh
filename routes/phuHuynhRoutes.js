const express = require('express');
const router = express.Router();
const phuHuynhController = require('../controllers/phuHuynhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, phuHuynhController.hienThiPhuHuynh);

module.exports = router;