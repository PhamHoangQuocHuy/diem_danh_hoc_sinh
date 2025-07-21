const express = require('express');
const router = express.Router();
const thucHienDiemDanhController = require('../controllers/thucHienDiemDanhController');
const AuthMiddleware = require('../middlewares/authMiddleware');

router.get('/', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.hienThiDiemDanh);
router.post('/them', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.themDiemDanhThuCong);
router.get('/xuat-excel', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.xuatExcel);
// Lấy dữ liệu
router.get('/lay-du-lieu', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.layDuLieuKhuonMat);
router.post('/ghi-nhan-diem-danh', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.ghiNhanDiemDanh);
router.post('/ghi-nhan-vang', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.ghiNhanVang);

module.exports = router;