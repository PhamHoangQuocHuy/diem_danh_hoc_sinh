const NamHocModel = require('../models/namHocModel');

class NamHocController {
    static async hienThiDanhSachNamHoc(req, res) {
        try {
            const danhSachNamHoc = await NamHocModel.hienThiDanhSachNamHoc();
            const danhSachTruongHoc = await NamHocModel.hienThiDanhSachTruongHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyNamHoc',
                danhSachNamHoc,
                danhSachTruongHoc,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            })
        } catch (error) {
            console.error('Lỗi khi lấy danh sách năm học:', error);
            return res.render('admin_index', {
                page: 'pages/quanLyNamHoc',
                danhSachNamHoc: [],
                danhSachTruongHoc: [],
                message: 'Lỗi khi lấy danh sách năm học',
                messageType: 'error'
            });
        }
    }
    static async themNamHoc(req, res) {
        try {
            const { ten_nam_hoc, truong_hoc_id } = req.body;
            const result = await NamHocModel.themThongTinNamHoc({ ten_nam_hoc, truong_hoc_id });
            return res.redirect(`/nam-hoc?message=${result.message}&messageType=${result.messageType}`);
        } catch (error) {
            console.error('Lỗi khi thêm năm học:', error);
            return res.redirect('/nam-hoc?message=Lỗi khi thêm năm học&messageType=error');
        }
    }
    static async xoaNamHoc(req, res) {
        try {
            const id = req.params.id;
            const result = await NamHocModel.xoaThongTinNamHoc(id);
            return res.redirect(`/nam-hoc?message=${result.message}&messageType=${result.messageType}`);
        } catch (error) {
            console.error('Lỗi khi xóa năm học:', error);
            return res.redirect('/nam-hoc?message=Lỗi khi xóa năm học&messageType=error');
        }
    }
    static async suaNamHoc(req, res) {
        try {
            const id = req.params.id;
            const { ten_nam_hoc, truong_hoc_id } = req.body;
            const result = await NamHocModel.suaThongTinNamHoc(id, { ten_nam_hoc, truong_hoc_id });
            return res.redirect(`/nam-hoc?message=${result.message}&messageType=${result.messageType}`);
        } catch (error) {
            console.error('Lỗi khi sửa năm học:', error);
            return res.redirect('/nam-hoc?message=Lỗi khi sửa năm học&messageType=error');
        }
    }
    static async timNamHoc(req, res) {
        try {
            const { tim_kiem } = req.query;
            const danhSachNamHoc = await NamHocModel.hienThiDanhSachNamHoc();
            const danhSachTruongHoc = await NamHocModel.hienThiDanhSachTruongHoc();
            const result = await NamHocModel.timNamHocTheoTen(tim_kiem);
            if( !tim_kiem || tim_kiem.trim() === '') {
                return res.render('admin_index', {
                    page: 'pages/quanLyNamHoc',
                    danhSachNamHoc,
                    danhSachTruongHoc,
                    message: 'Vui lòng nhập từ khóa tìm kiếm',
                    messageType: 'error'
                });
            }
            if (result.success) {
                return res.render('admin_index', {
                    page: 'pages/quanLyNamHoc',
                    danhSachNamHoc,
                    danhSachTruongHoc,
                    message: `Kết quả tìm kiếm cho: ${tim_kiem}`,
                    messageType: 'success'
                });
            }else{
                return res.render('admin_index', {
                    page: 'pages/quanLyNamHoc',
                    danhSachNamHoc: [],
                    danhSachTruongHoc: [],
                    message: `Không tìm thấy năm học nào với từ khóa: ${tim_kiem}`,
                    messageType: 'error'
                });
            }
        } catch (error) {
            console.error('Lỗi khi tìm kiếm năm học:', error);
            return res.render('admin_index', {
                page: 'pages/quanLyNamHoc',
                danhSachNamHoc: [],
                danhSachTruongHoc: [],
                message: `Lỗi khi tìm kiếm năm học: ${error.message}`,
                messageType: 'error'
            });
        }
    }
}

module.exports = NamHocController