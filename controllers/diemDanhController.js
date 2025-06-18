const diemDanhModel = require('../models/diemDanhModel');
class DiemDanhController {
    static async hienThiDiemDanh(req, res) {
        try {
            const danhSachNamHoc = await diemDanhModel.layDanhSachNamHoc();
            const danhSachHocKy = await diemDanhModel.layDanhSachHocKy();
            const danhSachLopHoc = await diemDanhModel.layDanhSachLopHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyDiemDanh',
                danhSachNamHoc,
                danhSachHocKy,
                danhSachLopHoc,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyDiemDanh',
                danhSachNamHoc: [],
                danhSachHocKy: [],
                danhSachLopHoc: [],
                message: 'Đã xảy ra lỗi khi lấy danh sách năm học',
                messageType: 'error'
            });
        }
    }

}
module.exports = DiemDanhController;