const thucHienDiemDanhModel = require('../models/thucHienDiemDanhModel');
const pool = require('../config/connect_database');

class thucHienDiemDanhController {
    static async hienThiDiemDanh(req, res) {
        try {
            const activeTab = req.query.tab || 'morning'; // Lấy tab từ query param, mặc định là 'morning'

            // Lấy các dữ liệu cần thiết từ model với tham số buổi
            const danhSachHocSinh = await thucHienDiemDanhModel.layDanhSachHocSinh(activeTab);
            const danhSachLopHoc = await thucHienDiemDanhModel.layDanhSachLopHoc(req.taiKhoan.tai_khoan_id);
            const tongLopHoc = await thucHienDiemDanhModel.layTongLopHoc(activeTab);
            const tongCoMat = await thucHienDiemDanhModel.layTongCoMat(activeTab);
            const tongVang = await thucHienDiemDanhModel.layTongVang(activeTab);
            // Lấy học kỳ và năm học hiện tại
            const [currentHocKy] = await pool.query(`
                SELECT ten_hoc_ky, ten_nam_hoc 
                FROM hoc_ky 
                JOIN nam_hoc ON hoc_ky.nam_hoc_id = nam_hoc.nam_hoc_id
                WHERE ngay_bat_dau <= CURDATE() AND ngay_ket_thuc >= CURDATE()
                LIMIT 1
            `);
            const hocKyHienTai = currentHocKy.length > 0 ? currentHocKy[0] : null;
            const currentDate = new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            return res.render('user_index', {
                page: 'pages/thucHienDiemDanh',
                danhSachHocSinh,
                danhSachLopHoc,
                tongLopHoc,
                tongCoMat,
                tongVang,
                hocKyHienTai,
                currentDate,
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