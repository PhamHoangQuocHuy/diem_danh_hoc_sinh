const diemDanhModel = require('../models/diemDanhModel');
class DiemDanhController {
    static async hienThiDiemDanh(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyDiemDanh' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin .' });
        }
    }
}
module.exports = DiemDanhController;