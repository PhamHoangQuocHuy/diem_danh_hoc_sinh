const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/connect_database');
const authModel = require('../models/authModel');
require('dotenv').config();


exports.login = async (req, res) => {
    const { email, mat_khau } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM tai_khoan WHERE email = ?', [email]);
        if (!users.length) {
            return res.render('auth/login', { message: 'Sai email hoặc mật khẩu', messageType: 'error' });
        }

        const isMatch = await bcrypt.compare(mat_khau, users[0].mat_khau);
        if (!isMatch) {
            return res.render('auth/login', { message: 'Sai email hoặc mật khẩu', messageType: 'error' });
        }

        // Đăng nhập thành công, tạo JWT token
        const jwtToken = jwt.sign({ id: users[0].tai_khoan_id }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: '1d'
        });

        // Lưu JWT vào cookie
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: false, // true nếu dùng HTTPS (khi deploy)
            maxAge: 24 * 60 * 60 * 1000 // 1 ngày
        });

        // Lấy vai trò user
        const role = users[0].ten_vai_tro;

        // Chuyển hướng theo vai trò
        if (role === 'Admin') {
            return res.redirect('/admin-dashboard');
        } else if (role === 'GiaoVien') {
            return res.redirect('/teacher');
        } else if (role === 'PhuHuynh') {
            return res.redirect('/parent');
        } else {
            return res.render('auth/login', { message: 'Vai trò không hợp lệ', messageType: 'error' });
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.render('auth/login', { message: 'Lỗi máy chủ', messageType: 'error' });
    }
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
};

exports.getUserInfo = [verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT tai_khoan_id, ho_ten, email, ten_vai_tro FROM tai_khoan WHERE tai_khoan_id = ?', [req.user.id]);
        if (!users.length) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: users[0].tai_khoan_id,
            ho_ten: users[0].ho_ten,
            email: users[0].email,
            role: users[0].ten_vai_tro
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}];

