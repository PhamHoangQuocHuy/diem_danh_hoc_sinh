const thucHienDiemDanhModel = require('../models/thucHienDiemDanhModel');
const pool = require('../config/connect_database');

class thucHienDiemDanhController {
    static async hienThiDiemDanh(req, res) {
        try {
            const activeTab = req.query.tab || 'morning'; // sáng là mặc định
            const danhSachLopHoc = await thucHienDiemDanhModel.layDanhSachLopHoc(req.taiKhoan.tai_khoan_id);

            // Lấy ngày điểm danh từ query hoặc gán mặc định là hôm nay
            let ngay_diem_danh = req.query.ngay_diem_danh;
            if (!ngay_diem_danh || isNaN(Date.parse(ngay_diem_danh))) {
                ngay_diem_danh = new Date().toISOString().slice(0, 10);
            }

            const ngayDiemDanhDate = new Date(ngay_diem_danh);

            // Xác định lop_hoc_id cần hiển thị:
            // 1. Nếu có query lop_hoc_id => dùng
            // 2. Nếu không => tìm lớp nào có học kỳ chứa ngày điểm danh
            let lop_hoc_id = req.query.lop_hoc_id;
            let lopTrongNgayChon = null;
            if (!lop_hoc_id) {
                lopTrongNgayChon = danhSachLopHoc.find(lop => {
                    const batDau = new Date(lop.ngay_bat_dau);
                    const ketThuc = new Date(lop.ngay_ket_thuc);
                    return ngayDiemDanhDate >= batDau && ngayDiemDanhDate <= ketThuc;
                });

                lop_hoc_id = lopTrongNgayChon
                    ? lopTrongNgayChon.lop_hoc_id
                    : (danhSachLopHoc[0]?.lop_hoc_id || null);
            } else {
                // Gán lại lớp được chọn nếu có lop_hoc_id
                lopTrongNgayChon = danhSachLopHoc.find(lop => lop.lop_hoc_id == lop_hoc_id);
            }

            // Lấy học kỳ hiện tại (theo ngày hôm nay)
            const [currentHocKy] = await pool.query(`
                SELECT ten_hoc_ky, ten_nam_hoc 
                FROM hoc_ky 
                JOIN nam_hoc ON hoc_ky.nam_hoc_id = nam_hoc.nam_hoc_id
                WHERE ngay_bat_dau <= CURDATE() AND ngay_ket_thuc >= CURDATE()
                LIMIT 1
                `);
            const hocKyHienTai = currentHocKy.length > 0 ? currentHocKy[0] : null;

            // Hiển thị ngày hôm nay dạng tiếng Việt
            const currentDate = new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });


            // Nếu không có lớp học nào tương ứng với ngày điểm danh 
            if (!lopTrongNgayChon || ngayDiemDanhDate < new Date(lopTrongNgayChon.ngay_bat_dau) || ngayDiemDanhDate > new Date(lopTrongNgayChon.ngay_ket_thuc)) {
                return res.render('user_index', {
                    page: 'pages/thucHienDiemDanh',
                    message: 'Không có lớp học nào tương ứng với ngày bạn chọn',
                    messageType: 'warning',
                    danhSachDiemDanh: [],
                    danhSachLopHoc,
                    tongLopHoc: [{ tong: 0 }],
                    tongCoMat: [{ tong: 0 }],
                    tongVang: [{ tong: 0 }],
                    hocKyHienTai,
                    currentDate,
                    activeTab,
                    lop_hoc_id: null,
                    ngay_diem_danh
                });
            }


            // Lấy danh sách điểm danh
            const danhSachDiemDanh = lop_hoc_id && ngay_diem_danh
                ? await thucHienDiemDanhModel.layDanhSachDiemDanh(lop_hoc_id, ngay_diem_danh, activeTab)
                : [];

            // Thống kê sĩ số
            const tongLopHoc = await thucHienDiemDanhModel.layTongLopHoc(activeTab);
            const tongCoMat = await thucHienDiemDanhModel.layTongCoMat(activeTab);
            const tongVang = await thucHienDiemDanhModel.layTongVang(activeTab);

            return res.render('user_index', {
                page: 'pages/thucHienDiemDanh',
                danhSachDiemDanh,
                danhSachLopHoc,
                tongLopHoc,
                tongCoMat,
                tongVang,
                hocKyHienTai,
                currentDate,
                activeTab,
                lop_hoc_id,
                ngay_diem_danh,
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