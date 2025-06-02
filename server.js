const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const PORT = 3000;
// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const connection = require('./config/connect_database');

// Import routes
const taiKhoanRoute = require('./routes/taiKhoanRoute');
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/tai-khoan', taiKhoanRoute);

app.get('/', (req, res) => {
    const { message, messageType } = req.query;
    res.render('auth/login', { message, messageType });
});
app.get('/tongquan', (req, res) => {
    res.render('partials/dashboard');
});
// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});