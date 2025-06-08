const express = require('express');
const router = express.Router();
const taiKhoanController = require('../controllers/taiKhoanController');
const AuthMiddleware = require('../middlewares/authMiddleWare');
const {upload} = require('../config/multerTaiKhoan')

router.get('/', AuthMiddleware.kiemTraToken, taiKhoanController.hienThiDanhSachTaiKhoan);
router.post('/them', AuthMiddleware.kiemTraToken,upload.single('anh_dai_dien') ,taiKhoanController.themTaiKhoan);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, taiKhoanController.xoaTaiKhoan);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, upload.single('anh_dai_dien') ,taiKhoanController.suaTaiKhoan);
router.get('/tim', AuthMiddleware.kiemTraToken, taiKhoanController.timTaiKhoan);
router.get('/chi-tiet/:id', AuthMiddleware.kiemTraToken, taiKhoanController.chiTietTaiKhoan);
//router.post('/send-mail', AuthMiddleware.kiemTraToken, taiKhoanController.guiMailTaiKhoan);
router.get('/loc', AuthMiddleware.kiemTraToken, taiKhoanController.locTheoVaiTro);
module.exports = router;