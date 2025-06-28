const thucHienDiemDanhModel = require('../models/thucHienDiemDanhModel');
const pool = require('../config/connect_database');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

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
                    tongHocSang: [{ tong: 0 }],
                    tongHocChieu: [{ tong: 0 }],
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
            const ngayHienTai = new Date().toISOString().slice(0, 10);
            const tongLopHoc = await thucHienDiemDanhModel.layTongLopHoc(activeTab);
            const tongCoMat = await thucHienDiemDanhModel.layTongCoMat(ngayHienTai, activeTab);
            const tongVang = await thucHienDiemDanhModel.layTongVang(ngayHienTai, activeTab);
            const tongHocSang = await thucHienDiemDanhModel.layTongHocSang(ngayHienTai, activeTab);
            const tongHocChieu = await thucHienDiemDanhModel.layTongHocChieu(ngayHienTai, activeTab);

            return res.render('user_index', {
                page: 'pages/thucHienDiemDanh',
                danhSachDiemDanh,
                danhSachLopHoc,
                tongLopHoc,
                tongCoMat,
                tongVang,
                tongHocSang,
                tongHocChieu,
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
    static async themDiemDanhThuCong(req, res) {
        try {
            const { lop_hoc_id, ngay_diem_danh, tab } = req.body;
            const buoi = tab === 'morning' ? 'morning' : 'afternoon';
            // Tách thông tin điểm danh từ body
            const danhSachDiemDanh = [];
            for (const key in req.body) {
                if (key.startsWith('trang_thai_')) { // name ở FE
                    const hoc_sinh_id = key.split('_')[2]; // lấy học sinh id thông qua cắt chuỗi
                    // Lấy giá trị trạng thái value bên FE (present / absent)
                    const value = req.body[key];
                    let trang_thai = '';
                    if (value === 'present') trang_thai = 'Có mặt';
                    else if (value === 'absent') trang_thai = 'Vắng';
                    else if (value === 'Học sáng') trang_thai = 'Học sáng';
                    else if (value === 'Học chiều') trang_thai = 'Học chiều';
                    else trang_thai = 'Không xác định';

                    // Lấy ghi chú nếu có
                    const ghi_chu = req.body[`ghi_chu_${hoc_sinh_id}`] || '';
                    // Thêm vào danh sách
                    danhSachDiemDanh.push({ hoc_sinh_id, trang_thai, ghi_chu });
                }
            }
            const ketQua = await thucHienDiemDanhModel.themThongTinDiemDanh({
                lop_hoc_id,
                ngay_diem_danh,
                buoi,
                danhSachDiemDanh
            });

            if (ketQua.success) {
                return res.redirect(`/thuc-hien-diem-danh?tab=${tab}&lop_hoc_id=${lop_hoc_id}&ngay_diem_danh=${ngay_diem_danh}&message=${ketQua.message}&messageType=${ketQua.messageType}`);
            } else {
                return res.redirect(`/thuc-hien-diem-danh?tab=${tab}&lop_hoc_id=${lop_hoc_id}&ngay_diem_danh=${ngay_diem_danh}&message=${ketQua.message}&messageType=${ketQua.messageType}`);
            }
        }
        catch (err) {
            console.log(err);
            return res.redirect('/thuc-hien-diem-danh?message=Lỗi server&messageType=error');
        }
    }
    static async xuatExcel(req, res) {
        try {
            const { lop_hoc_id, ngay_diem_danh } = req.query;
            if (!lop_hoc_id || !ngay_diem_danh) {
                return res.redirect('/thuc-hien-diem-danh?message=Chưa chọn lớp hoặc ngày để xuất excel&messageType=error');
            }
            const danhSach = await thucHienDiemDanhModel.xuatThongTinExcel(lop_hoc_id, ngay_diem_danh);
            if (!danhSach || danhSach.length === 0) {
                return res.redirect('/thuc-hien-diem-danh?message=Không có dữ liệu để xuất Excel&messageType=error');
            }
            const formatDate = (dateStr) => {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const formatTime = (dateStr) => {
                const date = new Date(dateStr);
                const h = String(date.getHours()).padStart(2, '0');
                const m = String(date.getMinutes()).padStart(2, '0');
                const s = String(date.getSeconds()).padStart(2, '0');
                return `${h}:${m}:${s}`;
            };
            const data = danhSach.map((dd, index) => ({
                'STT': index + 1,
                'Học sinh': dd['Họ tên'],
                'Ngày sinh': formatDate(dd['Ngày sinh']),
                'Lớp': dd['Tên lớp'],
                'Trạng thái': dd['Trạng thái'],
                'Ghi chú': dd['Ghi chú'],
                'Ngày điểm danh': formatDate(dd['Ngày điểm danh']),
                'Thời gian': formatTime(dd['Thời gian'])
            }))
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.json_to_sheet(data);
            xlsx.utils.book_append_sheet(workbook, worksheet, `Kết quả điểm danh`);  // sheet -> workbook 
            // Tạo đường dẫn thư mục và file
            const dirPath = path.join(__dirname, '../../export/excel');
            const fileName = `DiemDanh_Lop${lop_hoc_id}_${ngay_diem_danh}.xlsx`;
            const filePath = path.join(dirPath, fileName);

            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            // Ghi file
            xlsx.writeFile(workbook, filePath);
            // Trả file về trình duyệt
            res.download(filePath, fileName, err => {
                if (err) console.log('Lỗi gửi file:', err);
                fs.unlink(filePath, () => { }); // Xóa file sau khi gửi
            });

        } catch (err) {
            console.log(err);
            return res.redirect('/thuc-hien-diem-danh?message=Lỗi khi xuất excel&messageType=error');
        }
    }
    static async layDuLieuKhuonMat(req, res) {
        try {
            const { lop_hoc_id, ngay_diem_danh } = req.query;
            if (!lop_hoc_id || !ngay_diem_danh) {
                return res.redirect('/thuc-hien-diem-danh?message=Chưa chọn lớp hoặc ngày để điểm danh&messageType=error');
            }
            const data = await thucHienDiemDanhModel.loadDuLieuKhuonMat(lop_hoc_id, ngay_diem_danh);
            res.json(data);
        }
        catch (err) {
            console.log('Lỗi khi lấy dữ liệu điểm danh khuôn mặt: ', err);
            return res.redirect('/thuc-hien-diem-danh?message=Lỗi server&messageType=error');
        }
    }
    static async ghiNhanDiemDanh(req, res) {
        try {

            const { hoc_sinh_id, anh_ghi_nhan, lop_hoc_id } = req.body;

            // Lấy lớp học từ token hoặc body
            const lopHocId = req.taiKhoan?.lop_hoc_id || lop_hoc_id;

            // Xác định ngày hiện tại và buổi hiện tại
            const ngay_diem_danh = new Date().toISOString().slice(0, 10);
            const buoi = req.query.tab === 'morning' ? 'morning' : 'afternoon';
            //console.log('==> Điểm danh:', { hoc_sinh_id, lop_hoc_id, buoi, ngay_diem_danh });

            // Gửi qua model xử lý
            const ketQua = await thucHienDiemDanhModel.ghiNhanDiemDanhKhuonMat({
                hoc_sinh_id,
                lop_hoc_id: lopHocId,
                ngay_diem_danh,
                buoi,
                anh_ghi_nhan
            });

            // Trả về kết quả tương tự như điểm danh thủ công
            if (ketQua.success) {
                return res.status(200).json({
                    success: true,
                    message: ketQua.message,
                    messageType: ketQua.messageType
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: ketQua.message,
                    messageType: ketQua.messageType
                });
            }

        } catch (err) {
            console.error('Lỗi server khi ghi nhận điểm danh khuôn mặt:', err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi ghi nhận điểm danh khuôn mặt',
                messageType: 'error'
            });
        }
    }
}
module.exports = thucHienDiemDanhController;