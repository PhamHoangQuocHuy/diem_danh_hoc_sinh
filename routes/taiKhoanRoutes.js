const express = require('express');
const router = express.Router();
const taiKhoanController = require('../controllers/taiKhoanController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/quan-ly-tai-khoan', AuthMiddleware.kiemTraToken, taiKhoanController.hienThiTaiKhoan);

module.exports = router;