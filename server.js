const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
// Import routes
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser'); 
const AuthMiddleware = require('./middlewares/authMiddleWare');
const dashboardRoutes = require('./routes/dashboardRoutes');

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
    res.render('admin_index', {taiKhoan: req.taiKhoan}); 
});
app.use('/',  dashboardRoutes);






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