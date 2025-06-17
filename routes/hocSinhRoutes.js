const express = require('express');
const router = express.Router();
const HocSinhController = require('../controllers/hocSinhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');
const uploadHocSinh = require('../config/multerHocSinh');
const uploadExcel = require('../config/multerExcel');

router.get('/', AuthMiddleware.kiemTraToken, HocSinhController.hienThiHocSinh);
router.post('/them', AuthMiddleware.kiemTraToken, uploadHocSinh ,HocSinhController.themHocSinh);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, HocSinhController.xoaHocSinh);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, uploadHocSinh ,HocSinhController.suaHocSinh);
router.get('/chi-tiet/:id', AuthMiddleware.kiemTraToken, HocSinhController.chiTietHocSinh);
router.get('/tim-kiem', AuthMiddleware.kiemTraToken, HocSinhController.timKiemHocSinh);
router.get('/loc', AuthMiddleware.kiemTraToken, HocSinhController.locHocSinh);
router.post('/them-hang-loat', AuthMiddleware.kiemTraToken, uploadExcel, HocSinhController.themHangLoat);
module.exports = router;