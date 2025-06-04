const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
// Import routes
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser'); 
const AuthMiddleware = require('./middlewares/authMiddleWare');
const dashboardRoutes = require('./routes/dashboardRoutes');
const truongHocRoutes = require('./routes/truongHocRoutes');
const taiKhoanRoutes = require('./routes/taiKhoanRoutes');
const lopHocRoutes = require('./routes/lopHocRoutes');
const hocKyRoutes = require('./routes/hocKyRoutes');
const hocSinhRoutes = require('./routes/hocSinhRoutes');
const phuHuynhRoutes = require('./routes/phuHuynhRoutes');
const giaoVienRoutes = require('./routes/giaoVienRoutes');
const diemDanhRoutes = require('./routes/diemDanhRoutes');
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api/auth', authRoutes);
app.get('/admin-dashboard', AuthMiddleware.kiemTraToken, (req, res) => {
    res.render('admin_index'); 
});
app.use('/', AuthMiddleware.kiemTraToken,  dashboardRoutes);
app.use('/', AuthMiddleware.kiemTraToken ,truongHocRoutes);
app.use('/', AuthMiddleware.kiemTraToken, taiKhoanRoutes);
app.use('/', AuthMiddleware.kiemTraToken, lopHocRoutes);
app.use('/', AuthMiddleware.kiemTraToken, hocKyRoutes);
app.use('/', AuthMiddleware.kiemTraToken, hocSinhRoutes);
app.use('/', AuthMiddleware.kiemTraToken, giaoVienRoutes);
app.use('/', AuthMiddleware.kiemTraToken, phuHuynhRoutes);
app.use('/', AuthMiddleware.kiemTraToken, diemDanhRoutes);



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