const truongHocModel = require('../models/truongHocModel');
class truongHocController {
    static async hienThiTruongHoc(req, res) {
        try {
            res.status(200).render('admin_index', {
                page: 'pages/quanLyTruongHoc',
            });
        } catch (error) {
            res.status(500).send('Lỗi khi lấy danh sách trường học');
        }
    }
}
module.exports = truongHocController;