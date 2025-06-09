const TruongHocModel = require('../models/truongHocModel');
class truongHocController {
    static async hienThiTruongHoc(req, res) {
        const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
        try {
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc,
                message: req.query.message || '',
                messageType: req.query.messageType || '',
            });
        } catch (error) {
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc: [],
                message: 'Đã xảy ra lỗi khi lấy thông tin.',
                messageType: 'error',
            });
        }
    }
    static async themTruongHoc(req, res) {
        try {
            const { ten_truong, dia_chi } = req.body;
            const result = await TruongHocModel.themTruongHoc({ ten_truong, dia_chi });
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();

            if (result.success) {
                return res.redirect(`/truong-hoc?message=Thêm trường học thành công&messageType=success`);
            } else {
                return res.redirect(`/truong-hoc?message=Thêm trường học thất bại&messageType=error`);
            }
        } catch (error) {
            console.log(error);
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc,
                message: 'Có lỗi khi thêm trường học',
                messageType: 'error',
            });
        }
    }
    static async xoaTruongHoc(req, res) {
        try {
            const { id } = req.params;
            const kiemTra = await TruongHocModel.kiemTraHocKy(id);
            if(kiemTra.length > 0) {
                const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
                return res.render('admin_index', {
                    page: 'pages/quanLyTruongHoc',
                    danhSachTruongHoc,
                    message: 'Trường học đang có học kỳ, không thể xóa',
                    messageType: 'error',
                });
            }
            const result = await TruongHocModel.xoaTruongHoc(id);
            if (result.success) {
                const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
                res.render('admin_index', {
                    page: 'pages/quanLyTruongHoc',
                    danhSachTruongHoc,
                    message: 'Xóa trường học thành công',
                    messageType: 'success',
                });
            } else {
                const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
                res.render('admin_index', {
                    page: 'pages/quanLyTruongHoc',
                    danhSachTruongHoc,
                    message: 'Xóa trường học thất bại',
                    messageType: 'error',
                });
            }
        } catch (error) {
            console.log(error);
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc,
                message: 'Có lỗi khi xóa trường học',
                messageType: 'info',
            });
        }
    }
    static async suaTruongHoc(req, res) {
        try {
            const { id } = req.params;
            const { ten_truong, dia_chi } = req.body;
            const result = await TruongHocModel.suaThongTinTruongHoc(id, { ten_truong, dia_chi });
            if (result.success) {
                return res.redirect(`/truong-hoc?message=Sửa trường học thành công&messageType=success`);
            } else {
                return res.redirect(`/truong-hoc?message=Sửa trường học thất bại&messageType=error`);
            }
        } catch (error) {
            console.log(error);
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc,
                message: 'Có lỗi khi cập nhật trường học',
                messageType: 'error',
            });
        }
    }
    static async timTruongHoc(req, res) {
        try {
            const { tim_kiem } = req.query;
            if (!tim_kiem || tim_kiem.trim() === '') {
                const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
                return res.render('admin_index', {
                    page: 'pages/quanLyTruongHoc',
                    danhSachTruongHoc,
                    message: 'Vui lòng nhập từ khóa tìm kiếm',
                    messageType: 'error',
                });
            }

            const danhSachTruongHoc = await TruongHocModel.timTruongTheoTen(tim_kiem);
            if(danhSachTruongHoc.length === 0) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTruongHoc',
                    danhSachTruongHoc,
                    message: `Không tìm thấy trường học: ${tim_kiem}`,
                    messageType: 'error',
                });
            }
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc,
                message: `Tìm thấy trường học: ${tim_kiem}`,
                messageType: 'success',
            });
        } catch (error) {
            console.log(error);
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            res.render('admin_index', {
                page: 'pages/quanLyTruongHoc',
                danhSachTruongHoc,
                message: 'Có lỗi khi tìm kếm trường học',
                messageType: 'error',
            });
        }
    }
}
module.exports = truongHocController;