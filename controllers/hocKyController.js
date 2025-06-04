const hocKyModel = require('../models/hocKyModel');
class HocKyController {
    static async hienThiHocKy(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyHocKy' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin tài khoản.' });
        }
    }
}
module.exports = HocKyController;