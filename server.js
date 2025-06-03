const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
// Import routes
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser'); 
const getTaiKhoan = require('./middlewares/getTaiKhoanMiddleware');
const authController = require('./controllers/authController');
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

app.get('/admin-dashboard', getTaiKhoan, (req, res) => {
    res.render('admin_index');
});
app.get('/', (req, res) => { // Trang chủ
    const { message, messageType } = req.query;
    res.render('auth/login', { message, messageType });
});
app.get('/logout', (req, res) => { // Đăng xuất
  res.clearCookie('token');
  res.redirect('/');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});