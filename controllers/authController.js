const jwt = require('jsonwebtoken');
const authModel = require('../models/authModel');
require('dotenv').config();

class AuthController {
    static async dangNhap(req, res) {
        const { email, mat_khau } = req.body;
        const ketQua = await authModel.kiemTraDangNhap(email, mat_khau);
        if (!ketQua.success) {
            return res.status(401).render('auth/login', { message: ketQua.message, messageType: 'error' });
        }
        else {
            const taiKhoan = ketQua.taiKhoan;
            // Tạo access token
            const accessToken = jwt.sign(
                {
                    tai_khoan_id: taiKhoan.tai_khoan_id,
                    ten_vai_tro: taiKhoan.ten_vai_tro
                },
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
            )
            // Tạo refresh token
            const refreshToken = jwt.sign(
                {
                    tai_khoan_id: taiKhoan.tai_khoan_id,
                    ten_vai_tro: taiKhoan.ten_vai_tro
                },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
            );
            // Lưu các token vào cookie
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                maxAge: 15 * 60 * 1000
            })
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
            });
            if (taiKhoan.ten_vai_tro === 'Admin') {
                return res.redirect('/admin-dashboard');
            }
        }
    }
}
module.exports = AuthController;


