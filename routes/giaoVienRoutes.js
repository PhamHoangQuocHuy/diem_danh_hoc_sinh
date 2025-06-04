const express = require('express');
const router = express.Router();
const giaoVienController = require('../controllers/giaoVienController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/quan-ly-giao-vien', AuthMiddleware.kiemTraToken, giaoVienController.hienThiGiaoVien);

module.exports = router;