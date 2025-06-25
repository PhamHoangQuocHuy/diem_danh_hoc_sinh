const express = require('express');
const router = express.Router();
const thucHienDiemDanhController = require('../controllers/thucHienDiemDanhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.hienThiDiemDanh);
router.post('/them', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.themDiemDanhThuCong);
router.get('/xuat-excel', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.xuatExcel);

module.exports = router;