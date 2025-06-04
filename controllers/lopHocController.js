const lopHochModel = require('../models/lopHocModel');
class LopHocController {
    static async hienThiLopHoc(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyLopHoc' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin .' });
        }
    }
}
module.exports = LopHocController;