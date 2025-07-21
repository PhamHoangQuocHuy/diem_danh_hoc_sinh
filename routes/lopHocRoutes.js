const express = require('express');
const router = express.Router();
const LopHocController = require('../controllers/lopHocController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const uploadExcel = require('../config/multerExcel');

router.get('/', AuthMiddleware.kiemTraToken, LopHocController.hienThiLopHoc);
router.post('/them', AuthMiddleware.kiemTraToken, LopHocController.themLopHoc);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, LopHocController.xoaLopHoc);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, LopHocController.suaLopHoc);
router.get('/tim', AuthMiddleware.kiemTraToken, LopHocController.timLopHoc);
router.post('/them-hoc-sinh', AuthMiddleware.kiemTraToken, LopHocController.themHocSinh);
router.post('/them-hang-loat', AuthMiddleware.kiemTraToken, uploadExcel ,LopHocController.themHangLoat);

module.exports = router;