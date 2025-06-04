const phuHuynhModel = require('../models/phuHuynhModel');
class phuHuynhController {
    static async hienThiPhuHuynh(req, res) {
        try {
            res.status(200).render('admin_index', { page: 'pages/quanLyPhuHuynh' });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin tài khoản.' });
        }
    }
}
module.exports = phuHuynhController;