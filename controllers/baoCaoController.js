const baoCaoModel = require('../models/baoCaoModel');
class BaoCaoController {
    static async hienThiBaoCao(req, res) {
        const {ten_vai_tro} = req.taiKhoan;
        try {
            if(ten_vai_tro === 'Admin') {
                res.status(200).render('admin_index', { page: 'pages/quanLyBaoCao' });
            }else{
                res.status(200).render('user_index', { page: 'pages/quanLyBaoCao' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin .' });
        }
    }
}
module.exports = BaoCaoController;