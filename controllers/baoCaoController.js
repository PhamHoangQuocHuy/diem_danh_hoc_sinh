const baoCaoModel = require('../models/baoCaoModel');
class BaoCaoController {
    static async hienThiBaoCao(req, res) {
        const { ten_vai_tro } = req.taiKhoan;
        try {
            const namHocId = await baoCaoModel.layNamHocHienTai();

            if (!namHocId) {
                return res.redirect('/bao-cao?message="Không tìm thấy năm học hiện tại"&messageType="error"');
            }

            const danhSach = await baoCaoModel.layHocSinhVangNhieu(namHocId);

            const renderData = {
                page: 'pages/quanLyBaoCao',
                danhSachHocSinhVangNhieu: danhSach
            };

            if (ten_vai_tro === 'Admin') {
                res.render('admin_index', renderData);
            } else {
                res.render('user_index', renderData);
            }
        } catch (error) {
            console.error(error);
            return res.redirect('/bao-cao?message="Lỗi server"&messageType="error"');
        }
    }
}
module.exports = BaoCaoController;