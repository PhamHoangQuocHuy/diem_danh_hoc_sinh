const express = require('express');
const router = express.Router();
const NamHocController = require('../controllers/namHocController');
const AuthMiddleware = require('../middlewares/authMiddleware');

router.get('/', AuthMiddleware.kiemTraToken, NamHocController.hienThiDanhSachNamHoc);
router.post('/them', AuthMiddleware.kiemTraToken, NamHocController.themNamHoc);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, NamHocController.xoaNamHoc);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, NamHocController.suaNamHoc);
router.get('/tim', AuthMiddleware.kiemTraToken, NamHocController.timNamHoc);

module.exports = router;