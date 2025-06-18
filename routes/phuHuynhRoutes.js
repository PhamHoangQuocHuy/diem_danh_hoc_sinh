const express = require('express');
const router = express.Router();
const phuHuynhController = require('../controllers/phuHuynhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, phuHuynhController.hienThiPhuHuynh);
router.get('/chi-tiet/:id', AuthMiddleware.kiemTraToken, phuHuynhController.chiTietPhuHuynh);

module.exports = router;