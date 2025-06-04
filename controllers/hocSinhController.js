const hocSinhModel = require('../models/hocSinhModel');
class HocSinhController {
    static async hienThiHocSinh(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyHocSinh' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin .' });
        }
    }
}
module.exports = HocSinhController;