const TaiKhoanModel = require('../models/taiKhoanModel');
class TaiKhoanController {
    static async hienThiDanhSachTaiKhoan(req, res) {
        try {
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
            res.status(200).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan,
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin .' });
        }
    }
    static async themTaiKhoan(req, res) {
        try {
            const {
                ho_ten,
                ngaysinh,
                gioi_tinh,
                so_cmnd,
                dia_chi,
                email,
                sdt,
                mat_khau,
                ten_vai_tro,
                loai_bang_cap,
            } = req.body;
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();

            if (await TaiKhoanModel.kiemTraEmail(email)) {
                return res.status(400).render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan,
                    message: 'Email đã tồn tại',
                    messageType: 'error'
                });
            }

            if (await TaiKhoanModel.kiemTraSoDienThoai(sdt)) {
                return res.status(400).render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan,
                    message: 'Số điện thoại đã tồn tại',
                    messageType: 'error'
                });
            }

            if (await TaiKhoanModel.kiemTraSoCMND(so_cmnd)) {
                return res.status(400).render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan,
                    message: 'CMND đã tồn tại',
                    messageType: 'error'
                });
            }

            // Bắt buộc nhập ít nhất 1 loại bằng cấp nếu là giáo viên
            let loaiBangCapArray = [];
            if (ten_vai_tro === 'Giáo viên') {
                if (!loai_bang_cap) {
                    return res.status(400).render('admin_index', {
                        page: 'pages/quanLyTaiKhoan',
                        danhSachTaiKhoan,
                        message: 'Giáo viên phải có ít nhất một bằng cấp',
                        messageType: 'error'
                    });
                }

                loaiBangCapArray = Array.isArray(loai_bang_cap) ? loai_bang_cap : [loai_bang_cap];

                if (loaiBangCapArray.length === 0 || loaiBangCapArray.some(cap => cap.trim() === '')) {
                    return res.status(400).render('admin_index', {
                        page: 'pages/quanLyTaiKhoan',
                        danhSachTaiKhoan,
                        message: 'Giáo viên phải có ít nhất một bằng cấp hợp lệ',
                        messageType: 'error'
                    });
                }
            }

            const result = await TaiKhoanModel.themTaiKhoan({
                ho_ten,
                ngaysinh,
                gioi_tinh,
                so_cmnd,
                dia_chi,
                email,
                sdt,
                mat_khau,
                ten_vai_tro,
                loai_bang_cap: loaiBangCapArray,
            });

            if (result.success) {
                return res.redirect('/tai-khoan');
            } else {
                return res.status(500).render('error', { message: result.message });
            }
        } catch (error) {
            console.error(error);
            res.status(500).render('error', { message: 'Đã xảy ra lỗi khi thêm tài khoản' });
        }
    }
    static async xoaTaiKhoan(req, res) {
        const taiKhoanId = req.params.id;
        try {
            const result = await TaiKhoanModel.xoaTaiKhoan(taiKhoanId);
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
            return res.render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan,
                message: result.message,
                messageType: result.success ? 'success' : 'error'
            });

        } catch (error) {
            console.error(error);
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
            res.status(500).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan,
                message: 'Đã xảy ra lỗi khi xóa tài khoản',
                messageType: 'error'
            });
        }
    }
    static async suaTaiKhoan(req, res) {
        const id = req.params.id;
        const taiKhoan = req.body;
        try {
            await TaiKhoanModel.suaTaiKhoan(id, taiKhoan);
            res.status(200).redirect('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                message: 'Cập nhật tài khoản thành công',
                messageType: 'success'
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                message: 'Đã xảy ra lỗi khi cập nhật tài khoản',
                messageType: 'error'
            });
        }
    }
}
module.exports = TaiKhoanController;