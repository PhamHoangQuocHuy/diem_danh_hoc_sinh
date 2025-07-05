const diemDanhModel = require('../models/diemDanhModel');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
class DiemDanhController {
    static async hienThiDiemDanh(req, res) {
        const taiKhoan = req.taiKhoan;
        const isAdmin = taiKhoan.ten_vai_tro === 'Admin';
        const layout = isAdmin ? 'admin_index' : 'user_index';

        try {
            const danhSachLopHoc = await diemDanhModel.layDanhSachLopHoc();
            const { lop_hoc_id, ngay_diem_danh } = req.query;

            let danhSachDiemDanh = [];
            let daysInMonth = 0;
            // Kiểm tra lớp học và ngày diem danh
            if (lop_hoc_id && ngay_diem_danh) {
                const lop = danhSachLopHoc.find(l => l.lop_hoc_id == lop_hoc_id);
                if (!lop) {
                    return res.render(layout, {
                        page: 'pages/quanLyDiemDanh',
                        danhSachLopHoc,
                        lop_hoc_id,
                        ngay_diem_danh,
                        danhSachDiemDanh: [],
                        daysInMonth: 0,
                        message: 'Không tìm thấy lớp học này.',
                        messageType: 'error'
                    });
                }

                const [year, month] = ngay_diem_danh.split('-').map(Number);
                const ngayChon = new Date(year, month - 1); // ngày đầu tháng đó
                const hocKyBatDau = new Date(lop.hoc_ky_bat_dau);
                const hocKyKetThuc = new Date(lop.hoc_ky_ket_thuc);
                // Chỉ so sánh tháng và năm
                const firstOfHocKy = new Date(hocKyBatDau.getFullYear(), hocKyBatDau.getMonth());
                const lastOfHocKy = new Date(hocKyKetThuc.getFullYear(), hocKyKetThuc.getMonth());
                if (ngayChon < firstOfHocKy || ngayChon > lastOfHocKy) {
                    return res.render(layout, {
                        page: 'pages/quanLyDiemDanh',
                        danhSachLopHoc,
                        lop_hoc_id,
                        ngay_diem_danh,
                        danhSachDiemDanh: [],
                        daysInMonth: 0,
                        message: 'Tháng bạn chọn không nằm trong thời gian học của lớp.',
                        messageType: 'error'
                    });
                }


                const rawDiemDanh = await diemDanhModel.layThongKeDiemDanh(parseInt(lop_hoc_id), ngay_diem_danh);
                const danhSachHocSinh = await diemDanhModel.layDanhSachHocSinhTheoLop(lop_hoc_id);
                daysInMonth = new Date(year, month, 0).getDate();

                // Khởi tạo map theo học sinh
                const hocSinhMap = new Map();

                for (const hs of danhSachHocSinh) {
                    hocSinhMap.set(hs.hoc_sinh_id, {
                        ho_ten: hs.ho_ten,
                        ngay_sinh: hs.ngay_sinh,
                        tong_co_mat: 0,
                        tong_vang: 0,
                        tong_hoc_sang: 0,
                        tong_hoc_chieu: 0,
                        diem_danh: {},
                        ghi_chu: {},
                        thoi_gian: {},
                        anh_ghi_nhan: {},
                        ten_lop: lop.ten_lop
                    });
                }

                // Áp dữ liệu điểm danh nếu có
                for (const record of rawDiemDanh) {
                    const id = record.hoc_sinh_id;
                    if (!hocSinhMap.has(id)) continue;

                    const hs = hocSinhMap.get(id);
                    const day = new Date(record.ngay_diem_danh).getDate();
                    const trangThai = (record.trang_thai || '').toLowerCase();
                    if (!hs.thoi_gian) hs.thoi_gian = {};
                    if (!hs.ghi_chu) hs.ghi_chu = {};
                    if (!hs.anh_ghi_nhan) hs.anh_ghi_nhan = {};

                    // Hiển thị thời gian trực tiếp từ UTC mà không điều chỉnh
                    hs.thoi_gian[day] = record.thoi_gian
                        ? (() => {
                            const date = new Date(record.thoi_gian);
                            const hours = String(date.getUTCHours()).padStart(2, '0'); // Giờ UTC
                            const minutes = String(date.getUTCMinutes()).padStart(2, '0'); // Phút UTC
                            const seconds = String(date.getUTCSeconds()).padStart(2, '0'); // Giây UTC
                            return `${hours}:${minutes}:${seconds}`;
                        })()
                        : '';
                    hs.ghi_chu[day] = record.ghi_chu || '';
                    hs.anh_ghi_nhan[day] = record.anh_ghi_nhan || '';

                    if (trangThai === 'có mặt') {
                        hs.diem_danh[day] = 'Có mặt';
                        hs.tong_co_mat++;
                    } else if (trangThai === 'vắng') {
                        hs.diem_danh[day] = 'Vắng';
                        hs.tong_vang++;
                    } else if (trangThai === 'học sáng') {
                        hs.diem_danh[day] = 'Học sáng';
                        hs.tong_hoc_sang++;
                    } else if (trangThai === 'học chiều') {
                        hs.diem_danh[day] = 'Học chiều';
                        hs.tong_hoc_chieu++;
                    } else {
                        hs.diem_danh[day] = '-';
                    }
                }

                // Chuyển Map thành Array
                danhSachDiemDanh = Array.from(hocSinhMap.values());

            }

            return res.render(layout, {
                page: 'pages/quanLyDiemDanh',
                danhSachLopHoc,
                tongCoMat: await diemDanhModel.layTongCoMat(lop_hoc_id, ngay_diem_danh),
                tongVang: await diemDanhModel.layTongVang(lop_hoc_id, ngay_diem_danh),
                tongHocSang: await diemDanhModel.tongHocSang(lop_hoc_id, ngay_diem_danh),
                tongHocChieu: await diemDanhModel.tongHocChieu(lop_hoc_id, ngay_diem_danh),
                lop_hoc_id: lop_hoc_id || '',
                ngay_diem_danh: ngay_diem_danh || '',
                danhSachDiemDanh,
                daysInMonth,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        }
        catch (error) {
            console.error(error);
            return res.render(layout, {
                page: 'pages/quanLyDiemDanh',
                danhSachLopHoc: [],
                lop_hoc_id: '',
                ngay_diem_danh: '',
                danhSachDiemDanh: [],
                daysInMonth: 0,
                message: 'Đã xảy ra lỗi khi tải dữ liệu.',
                messageType: 'error'
            });
        }
    }
    static async xuatExcel(req, res) {
        try {
            const { lop_hoc_id, ngay_diem_danh } = req.query;
            if (!lop_hoc_id || !ngay_diem_danh) {
                return res.redirect('/diem-danh?message=Thiếu thông tin lớp hoặc tháng&messageType=error');
            }

            const { hocSinhRows, diemDanhRows, daysInMonth } = await diemDanhModel.xuatThongTinExcelTheoThang(lop_hoc_id, ngay_diem_danh);

            if (!hocSinhRows.length) {
                return res.redirect('/diem-danh?message=Không có học sinh&messageType=error');
            }

            const formatDate = (dateStr) => {
                const d = new Date(dateStr);
                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            };

            // Tạo Map lưu dữ liệu điểm danh theo học sinh
            const diemDanhMap = new Map();
            hocSinhRows.forEach(hs => {
                const row = {
                    'STT': null,
                    'Học sinh': hs.ho_ten,
                    'Ngày sinh': formatDate(hs.ngay_sinh),
                    'Tổng có mặt': 0,
                    'Tổng vắng': 0,
                    'Tổng học sáng': 0,
                    'Tổng học chiều': 0
                };
                for (let d = 1; d <= daysInMonth; d++) {
                    row[String(d)] = '-';
                }
                diemDanhMap.set(hs.hoc_sinh_id, row);
            });

            // Gán dữ liệu điểm danh vào map
            diemDanhRows.forEach(record => {
                const hs = diemDanhMap.get(record.hoc_sinh_id);
                if (!hs) return;

                const day = String(new Date(record.ngay_diem_danh).getDate());
                const trangThai = (record.trang_thai || '').toLowerCase();

                if (trangThai === 'có mặt') {
                    hs[day] = 'Có mặt';
                    hs['Tổng có mặt']++;
                } else if (trangThai === 'vắng') {
                    hs[day] = 'Vắng';
                    hs['Tổng vắng']++;
                } else if (trangThai === 'học sáng') {
                    hs[day] = 'Học sáng';
                    hs['Tổng học sáng']++;
                } else if (trangThai === 'học chiều') {
                    hs[day] = 'Học chiều';
                    hs['Tổng học chiều']++;
                }
            });

            // Gán STT và gom dữ liệu
            const finalData = Array.from(diemDanhMap.values()).map((row, idx) => ({ ...row, STT: idx + 1 }));

            // Tạo headers đúng thứ tự
            const headers = ['STT', 'Học sinh', 'Ngày sinh', 'Tổng có mặt', 'Tổng vắng', 'Tổng học sáng', 'Tổng học chiều'];
            for (let i = 1; i <= daysInMonth; i++) {
                headers.push(String(i));
            }

            // Tạo worksheet với headers cố định
            const worksheet = xlsx.utils.json_to_sheet(finalData, { header: headers });
            xlsx.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

            // Tạo file Excel
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'DiemDanh');

            const dirPath = path.join(__dirname, '../../export/excel');
            const fileName = `BangDiemDanh_Thang_${ngay_diem_danh}_Lop${lop_hoc_id}.xlsx`;
            const filePath = path.join(dirPath, fileName);

            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
            xlsx.writeFile(workbook, filePath);

            res.download(filePath, fileName, err => {
                if (err) console.log('Lỗi gửi file:', err);
                fs.unlink(filePath, () => { });
            });

        } catch (error) {
            console.log(error);
            return res.redirect('/diem-danh?message=Đã xảy ra lỗi khi xuất file excel&messageType=error');
        }
    }
}

module.exports = DiemDanhController;
