const jwt = require('jsonwebtoken');
require('dotenv').config();
const authModel = require('../models/authModel');
const DashboardModel = require('../models/dashboardModel');

class AuthMiddleware {
    static async kiemTraToken(req, res, next) {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.status(401).render('auth/login', { message: 'Vui lòng đăng nhập để tiếp tục', messageType: 'error' });
        }
        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
            req.tai_khoan_id = decoded.tai_khoan_id; // Lấy ID tài khoản để truy vấn DB sau
            req.ten_vai_tro = decoded.ten_vai_tro; // Có thể dùng nếu cần kiểm tra vai trò
            // Lấy thông tin chi tiết tài khoản từ DB
            const taiKhoan = await authModel.layThongTinTaiKhoan(req.tai_khoan_id);
            const thongTin = await DashboardModel.layThongTinDashboard(req.tai_khoan_id);
            if (!taiKhoan) {
                return res.status(401).render('auth/login', { message: 'Tài khoản không tồn tại', messageType: 'error' });
            }
            req.taiKhoan = taiKhoan; // gán để xử lý 
            res.locals.taiKhoan = taiKhoan; // gán để sử dụng trong view
            res.locals.thongTin = thongTin; // gán để sử dụng trong view
            next();
        }
        catch (err) {
            return res.status(401).render('auth/login', { message: 'Token không hợp lệ hoặc đã hết hạn', messageType: 'error' });
        }
    }
}
module.exports = AuthMiddleware;