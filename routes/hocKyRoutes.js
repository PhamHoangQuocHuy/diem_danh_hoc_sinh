const express = require('express');
const router = express.Router();
const hocKyController = require('../controllers/hocKyController');
const AuthMiddleware = require('../middlewares/authMiddleware');

router.get('/', AuthMiddleware.kiemTraToken, hocKyController.hienThiHocKy);
router.post('/them', AuthMiddleware.kiemTraToken, hocKyController.themHocKy);
router.post('/xoa/:id', AuthMiddleware.kiemTraToken, hocKyController.xoaHocKy);
router.post('/sua/:id', AuthMiddleware.kiemTraToken, hocKyController.suaHocKy);
router.get('/tim', AuthMiddleware.kiemTraToken, hocKyController.timHocKy);
router.get('/loc', AuthMiddleware.kiemTraToken, hocKyController.locHocKy);
module.exports = router;