const express = require('express');
const router = express.Router();
const DiemDanhController = require('../controllers/diemDanhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, DiemDanhController.hienThiDiemDanh);
router.get('/xuat-excel', AuthMiddleware.kiemTraToken, DiemDanhController.xuatExcel);

module.exports = router;