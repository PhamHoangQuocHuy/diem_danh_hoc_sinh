const express = require('express');
const router = express.Router();
const phuHuynhController = require('../controllers/phuHuynhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');
const { route } = require('./authRoutes');

router.get('/', AuthMiddleware.kiemTraToken, phuHuynhController.hienThiPhuHuynh);
router.get('/chi-tiet/:id', AuthMiddleware.kiemTraToken, phuHuynhController.chiTietPhuHuynh);
router.get('/tim', AuthMiddleware.kiemTraToken, phuHuynhController.timPhuHuynh);
module.exports = router;