const express = require('express');
const router = express.Router();
const giaoVienController = require('../controllers/giaoVienController');
const AuthMiddleware = require('../middlewares/authMiddleware');

router.get('/', AuthMiddleware.kiemTraToken, giaoVienController.hienThiGiaoVien);
router.get('/chi-tiet/:id', AuthMiddleware.kiemTraToken, giaoVienController.chiTietGiaoVien);
router.get('/tim', AuthMiddleware.kiemTraToken, giaoVienController.timGiaoVien);

module.exports = router;