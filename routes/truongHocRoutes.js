const express = require('express');
const router = express.Router();
const truongHocController = require('../controllers/truongHocController');
const AuthMiddleware = require('../middlewares/authMiddleware');

router.get('/', AuthMiddleware.kiemTraToken, truongHocController.hienThiTruongHoc);
router.post('/them', AuthMiddleware.kiemTraToken, truongHocController.themTruongHoc);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, truongHocController.xoaTruongHoc);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, truongHocController.suaTruongHoc);
router.get('/tim', AuthMiddleware.kiemTraToken, truongHocController.timTruongHoc);

module.exports = router;