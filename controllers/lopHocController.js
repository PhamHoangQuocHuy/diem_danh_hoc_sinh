const LopHocModel = require('../models/lopHocModel');
const xlsx = require('xlsx');
class LopHocController {
    static async hienThiLopHoc(req, res) {
        try {
            const danhSachLopHoc = await LopHocModel.layDanhSachLopHoc();
            const danhSachGiaoVien = await LopHocModel.layDanhSachGiaoVien();
            const danhSachHocKy = await LopHocModel.layDanhSachHocKy();
            const danhSachNamHoc = await LopHocModel.layDanhSachNamHoc();
            const danhSachHocSinh = await LopHocModel.layThongTinHocSinh();
            res.render('admin_index', {
                page: 'pages/quanLyLopHoc',
                danhSachLopHoc,
                danhSachGiaoVien,
                danhSachHocKy,
                danhSachNamHoc,
                danhSachHocSinh,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            res.render('admin_index', {
                page: 'pages/quanLyLopHoc',
                danhSachLopHoc: [],
                danhSachGiaoVien: [],
                danhSachHocKy: [],
                danhSachNamHoc: [],
                danhSachHocSinh: [],
                message: 'Đã xảy ra lỗi khi lấy danh sách lớp học',
                messageType: 'error'
            });
        }
    }
    static async themLopHoc(req, res) {
        try {
            const { ten_lop, giao_vien_id } = req.body;
            let hoc_ky_ids = req.body.hoc_ky_ids;

            // Nếu chỉ chọn 1 checkbox, giá trị trả về là chuỗi
            if (typeof hoc_ky_ids === 'string') {
                hoc_ky_ids = [hoc_ky_ids];
            }
            if (!ten_lop || !giao_vien_id || !hoc_ky_ids || (Array.isArray(hoc_ky_ids) && hoc_ky_ids.length === 0)) {
                return res.redirect(`/lop-hoc?message=Vui lòng nhập đầy đủ thông tin&messageType=error`);
            }
            const result = await LopHocModel.themThongTinLopHoc({ ten_lop, giao_vien_id, hoc_ky_ids: Array.isArray(hoc_ky_ids) ? hoc_ky_ids : [hoc_ky_ids] });
            if (result.success) {
                res.redirect(`/lop-hoc?message=Thêm lớp học thành công&messageType=success`);
            } else {
                res.redirect(`/lop-hoc?message=${result.message}&messageType=${result.messageType}`);
            }
        }
        catch {
            console.error(error);
            res.redirect(`/lop-hoc?message=Đã xảy ra lỗi khi thêm lớp học&messageType=error`);
        }
    }
    static async xoaLopHoc(req, res) {
        try {
            const id = req.params.id;
            const result = await LopHocModel.xoaThongTinLopHoc(id);
            if (result.success) {
                res.redirect(`/lop-hoc?message=Xóa lớp học thành công&messageType=success`);
            }
            else {
                res.redirect(`/lop-hoc?message=${result.message}&messageType=${result.messageType}`);
            }
        }
        catch {
            console.error(error);
            res.redirect(`/lop-hoc?message=Đã xảy ra lỗi khi xóa lớp học&messageType=error`);
        }
    }
    static async suaLopHoc(req, res) {
        try {
            //console.log("Params:", req.params);
            const id = req.params.id;
            const { ten_lop, giao_vien_id } = req.body;

            // Kiểm tra dữ liệu bắt buộc
            if (!ten_lop || !giao_vien_id) {
                return res.redirect(`/lop-hoc?message=Vui lòng nhập đầy đủ thông tin&messageType=error`);
            }
            const result = await LopHocModel.suaThongTinLopHoc(id, { ten_lop, giao_vien_id });
            if (result.success) {
                res.redirect(`/lop-hoc?message=Cập nhật lớp học thành công&messageType=success`);
            }
            else {
                res.redirect(`/lop-hoc?message=${result.message}&messageType=${result.messageType}`);
            }

        }
        catch (error) {
            console.error(error);
            res.redirect(`/lop-hoc?message=Đã xảy ra lỗi khi cập nhật lớp học&messageType=error`);
        }

    }
    static async timLopHoc(req, res) {
        try {
            const { tim_kiem } = req.query;
            if (!tim_kiem || tim_kiem.trim() === '') {
                return res.redirect(`/lop-hoc?message=Vui lòng nhập tìm kiếm&messageType=error`);
            }
            const result = await LopHocModel.timThongTinLopHoc(tim_kiem);
            const danhSachLopHoc = await LopHocModel.layDanhSachLopHoc();
            const danhSachGiaoVien = await LopHocModel.layDanhSachGiaoVien();
            const danhSachHocKy = await LopHocModel.layDanhSachHocKy();
            if (result.length > 0) {
                res.render('admin_index', {
                    page: 'pages/quanLyLopHoc',
                    danhSachLopHoc,
                    danhSachGiaoVien,
                    danhSachHocKy,
                    message: `Đã tìm kiếm lớp học: ${tim_kiem}`,
                    messageType: 'success'
                });
            } else {
                res.render('admin_index', {
                    page: 'pages/quanLyLopHoc',
                    danhSachLopHoc: [],
                    danhSachGiaoVien: [],
                    danhSachHocKy: [],
                    message: `Không tìm kiếm lớp học: ${tim_kiem}`,
                    messageType: 'error'
                });
            }
        }
        catch (error) {
            console.error(error);
            res.render('admin_index', {
                page: 'pages/quanLyLopHoc',
                danhSachLopHoc: [],
                message: 'Đã xảy ra lỗi khi lấy danh sách lớp học',
                messageType: 'error'
            });
        }
    }
    static async themHocSinh(req, res) {
        try {
            const { hoc_sinh_ids, lop_hoc_id } = req.body;
            // Validate
            if (!lop_hoc_id || !hoc_sinh_ids || hoc_sinh_ids.length === 0) {
                return res.redirect(`/lop-hoc?message=Thiếu thông tin học sinh hoặc lớp học&messageType=error`);
            }
            // Nếu chỉ có 1 checkbox thì hoc_sinh_ids sẽ là chuỗi, ta ép về mảng
            const danhSachHocSinh = Array.isArray(hoc_sinh_ids) ? hoc_sinh_ids : [hoc_sinh_ids];
            const ketQua = await LopHocModel.themTheoDanhSach(danhSachHocSinh, lop_hoc_id);

            // Nếu thêm thành công thì cập nhật ảnh
            if (ketQua.success) {
                await LopHocModel.capNhatDuongDanAnhTheoNamHoc(lop_hoc_id, danhSachHocSinh);
            }
            return res.redirect(`/lop-hoc?message=${ketQua.message}&messageType=${ketQua.messageType}`);
        }
        catch {
            console.error(error);
            res.redirect(`/lop-hoc?message=Đã xảy ra lỗi khi thêm học sinh&messageType=error`);
        }
    }
    static async themHangLoat(req, res) {
        try {
            const lopHocId = req.body.lop_hoc_id;
            if (!lopHocId) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu mã lớp học',
                    messageType: 'error'
                });
            }
            // Kiểm tra file đã tải chưa ?
            if (!req.file || !req.file.path) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file Excel tải lên',
                    messageType: 'error'
                });
            }
            // Đọc file excel
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const hocSinhList = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            // Gọi model xử lý thêm vào lớp
            const result = await LopHocModel.themHangLoatTuExcel(hocSinhList, lopHocId);
            // Nếu thêm thành công thì cập nhật ảnh
            if (result.success) {
                const danhSachHocSinhId = hocSinhList.map(hs => hs['Học sinh id']);
                await LopHocModel.capNhatDuongDanAnhTheoNamHoc(lopHocId, danhSachHocSinhId);
            }
            res.status(result.success ? 200 : 400).json(result);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi thêm học sinh',
                messageType: 'error'
            });
        }
    }
}
module.exports = LopHocController;