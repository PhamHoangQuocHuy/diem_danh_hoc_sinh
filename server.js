require('dotenv').config({ override: true });
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Import routes
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
const AuthMiddleware = require('./middlewares/authMiddleware');
const dashboardRoutes = require('./routes/dashboardRoutes');
const truongHocRoutes = require('./routes/truongHocRoutes');
const taiKhoanRoutes = require('./routes/taiKhoanRoutes');
const lopHocRoutes = require('./routes/lopHocRoutes');
const hocKyRoutes = require('./routes/hocKyRoutes');
const namHocRoutes = require('./routes/namHocRoutes');
const hocSinhRoutes = require('./routes/hocSinhRoutes');
const phuHuynhRoutes = require('./routes/phuHuynhRoutes');
const giaoVienRoutes = require('./routes/giaoVienRoutes');
const diemDanhRoutes = require('./routes/diemDanhRoutes');
const thucHienDiemDanhRoutes = require('./routes/thucHienDiemDanhRoutes');
const baoCaoRoutes = require('./routes/baoCaoRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const quenMatKhauRoutes = require('./routes/quenMatKhauRoutes');
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(cookieParser());

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api/auth', authRoutes);
app.get('/admin-dashboard', AuthMiddleware.kiemTraToken, AuthMiddleware.kiemTraAdmin, (req, res) => {
    res.render('admin_index');
});
app.get('/user-dashboard', AuthMiddleware.kiemTraToken, (req, res) => {
    res.render('user_index');
});
// Routes
app.use('/dashboard', AuthMiddleware.kiemTraToken, dashboardRoutes);
app.use('/truong-hoc', AuthMiddleware.kiemTraToken, AuthMiddleware.kiemTraAdmin, truongHocRoutes);
app.use('/tai-khoan', AuthMiddleware.kiemTraToken, AuthMiddleware.kiemTraAdmin, taiKhoanRoutes);
app.use('/lop-hoc', AuthMiddleware.kiemTraToken, lopHocRoutes);
app.use('/nam-hoc', AuthMiddleware.kiemTraToken, AuthMiddleware.kiemTraAdmin, namHocRoutes);
app.use('/hoc-ky', AuthMiddleware.kiemTraToken, AuthMiddleware.kiemTraAdmin, hocKyRoutes);
app.use('/hoc-sinh', AuthMiddleware.kiemTraToken, hocSinhRoutes);
app.use('/giao-vien', AuthMiddleware.kiemTraToken, giaoVienRoutes);
app.use('/phu-huynh', AuthMiddleware.kiemTraToken, phuHuynhRoutes);
app.use('/thuc-hien-diem-danh', AuthMiddleware.kiemTraToken, AuthMiddleware.kiemTraGiaoVien, thucHienDiemDanhRoutes);
app.use('/diem-danh', AuthMiddleware.kiemTraToken, diemDanhRoutes);
app.use('/bao-cao', AuthMiddleware.kiemTraToken, baoCaoRoutes);
app.use('/settings', AuthMiddleware.kiemTraToken, settingsRoutes);

app.get('/quen-mat-khau', (req, res) => { // Quên mật khẩu
    const { message, messageType } = req.query;
    res.render('auth/quenMatKhau', { message, messageType });
});
app.use('/quen-mat-khau', quenMatKhauRoutes);




app.get('/', (req, res) => { // Trang chủ
    const { message, messageType } = req.query;
    res.render('auth/login', { message, messageType });
});
app.get('/logout', (req, res) => { // Đăng xuất
    res.clearCookie('accessToken');
    res.redirect('/');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});
