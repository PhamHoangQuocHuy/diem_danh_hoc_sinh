const thucHienDiemDanhModel = require('../models/thucHienDiemDanhModel');

class thucHienDiemDanhController {
    static async hienThiDiemDanh(req, res) {
        try {
            const activeTab = req.query.tab || 'morning'; // Lấy tab từ query param, mặc định là 'morning'

            // Lấy các dữ liệu cần thiết từ model với tham số buổi
            const danhSachHocSinh = await thucHienDiemDanhModel.layDanhSachHocSinh(activeTab);
            const danhSachLopHoc = await thucHienDiemDanhModel.layDanhSachLopHoc(activeTab);
            const tongLopHoc = await thucHienDiemDanhModel.layTongLopHoc(activeTab);
            const tongCoMat = await thucHienDiemDanhModel.layTongCoMat(activeTab);
            const tongVang = await thucHienDiemDanhModel.layTongVang(activeTab);

            return res.render('user_index', {
                page: 'pages/thucHienDiemDanh',
                danhSachHocSinh,
                danhSachLopHoc,
                tongLopHoc,
                tongCoMat,
                tongVang,
                activeTab,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (err) {
            console.log(err);
            return res.render('user_index', {
                page: 'pages/thucHienDiemDanh',
                message: 'Đã xảy ra lỗi khi lấy danh sách điểm danh',
                messageType: 'error'
            });
        }
    }
}

module.exports = thucHienDiemDanhController;