const express = require('express');
const router = express.Router();
const LopHocController = require('../controllers/lopHocController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, LopHocController.hienThiLopHoc);
router.post('/them', AuthMiddleware.kiemTraToken, LopHocController.themLopHoc);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, LopHocController.xoaLopHoc);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, LopHocController.suaLopHoc);
router.get('/tim', AuthMiddleware.kiemTraToken, LopHocController.timLopHoc);

module.exports = router;