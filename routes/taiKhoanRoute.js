const express = require('express');
const router = express.Router();
const TaiKhoanController = require('../controllers/taiKhoanController');

// TÀI KHOẢN ROUTES
router.get('/dashboard',TaiKhoanController.thongTinDashboard)
router.get('/all', TaiKhoanController.layDanhSachTaiKhoan); // GET /api/tai-khoan/all (Lấy hết danh sách tài khoản)
router.get('/all-gv', TaiKhoanController.layDanhSachTaiKhoanGiaoVien); // GET /api/tai-khoan/all-gv (Lấy danh sách tài khoản giáo viên)
router.get('/all-ph', TaiKhoanController.layDanhSachTaiKhoanPhuHuynh); // GET /api/tai-khoan/all-ph (Lấy danh sách tài khoản phụ huynh)

router.post('/add', TaiKhoanController.themTaiKhoan); // POST /api/tai-khoan/add (Thêm tài khoản mới)
router.get('/:id', TaiKhoanController.layTaiKhoanTheoId); // GET /api/tai-khoan/1

router.post('/login', TaiKhoanController.dangNhap); // POST /api/tai-khoan/login (Đăng nhập tài khoản)
module.exports = router;