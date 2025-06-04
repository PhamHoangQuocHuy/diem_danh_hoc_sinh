const giaoVienModel = require('../models/giaoVienModel');
class GiaoVienController {
    static async hienThiGiaoVien(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyGiaoVien' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin .' });
        }
    }
}
module.exports = GiaoVienController;