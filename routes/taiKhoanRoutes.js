const express = require('express');
const router = express.Router();
const taiKhoanController = require('../controllers/taiKhoanController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, taiKhoanController.hienThiDanhSachTaiKhoan);
router.post('/them', AuthMiddleware.kiemTraToken, taiKhoanController.themTaiKhoan);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, taiKhoanController.xoaTaiKhoan);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, taiKhoanController.suaTaiKhoan);
module.exports = router;