const pool = require('../config/connect_database');
const TaiKhoanModel = require('../models/taiKhoanModel');
class TaiKhoanController {
    static async hienThiDanhSachTaiKhoan(req, res) {
        try {
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
            const conn = await pool.getConnection();
            for (let taiKhoan of danhSachTaiKhoan) {
                if (taiKhoan.ten_vai_tro === 'Giáo viên') {
                    // Lấy giao_vien_id từ bảng giao_vien theo tai_khoan_id
                    const [giaoVienRows] = await conn.query('SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?', [taiKhoan.tai_khoan_id]);
                    if (giaoVienRows.length > 0) {
                        const giaoVienId = giaoVienRows[0].giao_vien_id;
                        const [bangCaps] = await conn.query('SELECT loai_bang_cap FROM bang_cap WHERE giao_vien_id = ?', [giaoVienId]);
                        taiKhoan.loai_bang_cap = bangCaps.map(bc => bc.loai_bang_cap);
                    } else {
                        taiKhoan.loai_bang_cap = [];
                    }
                } else {
                    taiKhoan.loai_bang_cap = [];
                }
            }
            res.status(200).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan: [],
                message: 'Đã xảy ra lỗi khi lấy thông tin.',
                messageType: 'error'
            });
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

            if (await TaiKhoanModel.kiemTraEmail(email)) {
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Email đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (await TaiKhoanModel.kiemTraSoDienThoai(sdt)) {
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số điện thoại đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (await TaiKhoanModel.kiemTraSoCMND(so_cmnd)) {
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số CMND đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            // Bắt buộc nhập ít nhất 1 loại bằng cấp nếu là giáo viên
            let loaiBangCapArray = [];
            if (ten_vai_tro === 'Giáo viên') {
                if (!loai_bang_cap || (Array.isArray(loai_bang_cap) && loai_bang_cap.length === 0) || (typeof loai_bang_cap === 'string' && loai_bang_cap.trim() === '')) {
                    const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                    return res.render('admin_index', {
                        page: 'pages/quanLyTaiKhoan',
                        message: 'Giáo viên phải có ít nhất một bằng cấp',
                        danhSachTaiKhoan,
                        messageType: 'error',
                        formData: req.body,
                    });
                }

                loaiBangCapArray = Array.isArray(loai_bang_cap) ? loai_bang_cap : [loai_bang_cap];
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
                return res.redirect(`/tai-khoan?message=Thêm tài khoản thành công&messageType=success`);
            } else {
                return res.redirect(`/tai-khoan?message=Thêm tài khoản thất bại&messageType=error`);
            }
        } catch (error) {
            console.error(error);
            res.redirect(`/tai-khoan?message=Thêm tài khoản thất bại&messageType=error`);
        }
    }
    static async xoaTaiKhoan(req, res) {
        const taiKhoanId = req.params.id;
        try {
            const result = await TaiKhoanModel.xoaTaiKhoan(taiKhoanId);
            if (!result.success) {
                return res.redirect(`/tai-khoan?message=${result.message}&messageType=${result.messageType}`);
            }
            return res.redirect('/tai-khoan?message=Xóa tài khoản thành công&messageType=success');

        } catch (error) {
            console.error(error);
            res.redirect(`/tai-khoan?message=Xóa tài khoản thất bại&messageType=error`);
        }
    }
    static async suaTaiKhoan(req, res) {
        const id = req.params.id;
        const taiKhoan = {
            ...req.body,
            loai_bang_cap: Array.isArray(req.body.loai_bang_cap)
                ? req.body.loai_bang_cap
                : (req.body.loai_bang_cap ? [req.body.loai_bang_cap] : []),
        };
        try {
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
            if (danhSachTaiKhoan.some(tk => tk.email === taiKhoan.email && tk.tai_khoan_id != id)) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Email đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (danhSachTaiKhoan.some(tk => tk.sdt === taiKhoan.sdt && tk.tai_khoan_id != id)) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số điện thoại đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (danhSachTaiKhoan.some(tk => tk.so_cmnd === taiKhoan.so_cmnd && tk.tai_khoan_id != id)) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số CMND đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            await TaiKhoanModel.suaTaiKhoan(id, taiKhoan);
            res.redirect('/tai-khoan?message=Cập nhật thành công&messageType=success');
        } catch (error) {
            console.error(error);
            res.redirect(`/tai-khoan?message=Cập nhật thất bại&messageType=error`);
        }
    }
    static async timTaiKhoan(req, res) {
        const { tim_kiem } = req.query;
        try {
            if (!tim_kiem || tim_kiem.trim() === '') {
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan,
                    message: 'Vui lòng nhập tên để tìm kiếm.',
                    messageType: 'error',
                });
            }
            const danhSachTaiKhoan = await TaiKhoanModel.timTaiKhoanTheoTen(tim_kiem);
            if (danhSachTaiKhoan.length > 0) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan,
                    message: `Đã tìm thấy tài khoản với "${tim_kiem}"`,
                    messageType: 'success',
                });
            }
            return res.render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan,
                message: `Không tìm thấy tài khoản với "${tim_kiem}"`,
                messageType: 'error',
            });
        }
        catch (error) {
            res.render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan: [],
                message: "Đã xảy ra lỗi",
                messageType: 'error',
            });
        }
    }
    static async chiTietTaiKhoan(req, res) {
        const { id } = req.params;
        try {
            const taiKhoan = await TaiKhoanModel.layTaiKhoanTheoId(id);
            if (!taiKhoan) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }
            res.json(taiKhoan);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
}
module.exports = TaiKhoanController;