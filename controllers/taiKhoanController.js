const taiKhoanModel = require('../models/taiKhoanModel');
class TaiKhoanController {
    static async hienThiTaiKhoan(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyTaiKhoan' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin tài khoản.' });
        }
    }
}
module.exports = TaiKhoanController;