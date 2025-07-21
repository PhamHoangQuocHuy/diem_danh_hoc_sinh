const express = require('express');
const router = express.Router();
const taiKhoanController = require('../controllers/taiKhoanController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../config/multerTaiKhoan')
const uploadExcel = require('../config/multerExcel');

router.get('/', AuthMiddleware.kiemTraToken, taiKhoanController.hienThiDanhSachTaiKhoan);
router.post('/them', AuthMiddleware.kiemTraToken, upload.single('anh_dai_dien'), taiKhoanController.themTaiKhoan);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, taiKhoanController.xoaTaiKhoan);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, upload.single('anh_dai_dien'), taiKhoanController.suaTaiKhoan);
router.get('/tim', AuthMiddleware.kiemTraToken, taiKhoanController.timTaiKhoan);
router.get('/chi-tiet/:id', AuthMiddleware.kiemTraToken, taiKhoanController.chiTietTaiKhoan);
router.get('/loc', AuthMiddleware.kiemTraToken, taiKhoanController.locTheoVaiTro);
router.post('/them-hang-loat', AuthMiddleware.kiemTraToken, uploadExcel, taiKhoanController.themHangLoat);

module.exports = router;