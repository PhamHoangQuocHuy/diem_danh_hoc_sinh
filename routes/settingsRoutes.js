const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const AuthMiddleware = require('../middlewares/authMiddleWare');
const { upload } = require('../config/multerTaiKhoan')

// Route để hiển thị và cập nhật thông tin cài đặt
router.get('/settings/:id', settingsController.hienThiCaiDat);
router.post('/tai-khoan-cap-nhat/:id', upload.single('anh_dai_dien'), AuthMiddleware.kiemTraToken ,settingsController.capNhatCaiDatCaNhan);

module.exports = router;