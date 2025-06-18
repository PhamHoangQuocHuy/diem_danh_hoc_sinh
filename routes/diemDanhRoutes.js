const express = require('express');
const router = express.Router();
const DiemDanhController = require('../controllers/diemDanhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, DiemDanhController.hienThiDiemDanh);


module.exports = router;