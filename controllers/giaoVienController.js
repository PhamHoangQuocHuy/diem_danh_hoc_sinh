const giaoVienModel = require('../models/giaoVienModel');
class GiaoVienController {
    static async hienThiGiaoVien(req, res) {
        if (req.taiKhoan.ten_vai_tro === 'Admin') {
            try {
                const danhSachGiaoVien = await giaoVienModel.layDanhSachGiaoVien();
                return res.render('admin_index', {
                    page: 'pages/quanLyGiaoVien',
                    danhSachGiaoVien,
                    message: req.query.message || '',
                    messageType: req.query.messageType || ''
                });
            } catch (error) {
                console.error(error);
                return res.render('admin_index', {
                    page: 'pages/quanLyGiaoVien',
                    danhSachGiaoVien: [],
                    message: 'Đã xảy ra lỗi khi lấy danh sách giáo viên',
                    messageType: 'error'
                })
            }
        } else if (req.taiKhoan.ten_vai_tro === 'Phụ huynh' || req.taiKhoan.ten_vai_tro === 'Hiệu trưởng') {
            try {
                const danhSachGiaoVien = await giaoVienModel.layDanhSachGiaoVien();
                return res.render('user_index', {
                    page: 'pages/quanLyGiaoVien',
                    danhSachGiaoVien,
                    message: req.query.message || '',
                    messageType: req.query.messageType || ''
                });
            } catch (error) {
                console.error(error);
                return res.render('user_index', {
                    page: 'pages/quanLyGiaoVien',
                    danhSachGiaoVien: [],
                    message: 'Đã xảy ra lỗi khi lấy danh sách giáo viên',
                    messageType: 'error'
                })
            }
        } else {
            console.log('Không có quyền truy cập');
            return res.redirect('/');
        }
    }
    static async chiTietGiaoVien(req, res) {
        const { id } = req.params;
        const tenVaiTroNguoiXem = req.taiKhoan?.ten_vai_tro || '';
        try {
            const giaoVien = await giaoVienModel.thongTinChiTietGiaoVien(id);
            if (!giaoVien) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }
            const anhDaiDien = giaoVien.anh_dai_dien || 'default_avatar.jpg';
            giaoVien.anh_dai_dien = `/images/${anhDaiDien}`;

            // Nếu người xem không phải Admin thì làm mờ số CMND
            if (tenVaiTroNguoiXem !== 'Admin') {
                if (giaoVien.so_cmnd) {
                    giaoVien.so_cmnd = '*'.repeat(giaoVien.so_cmnd.length);
                } else {
                    giaoVien.so_cmnd = '';
                }
            }

            res.json(giaoVien);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
    static async timGiaoVien(req, res) {
        const { tim_kiem } = req.query;
        try {
            if (!tim_kiem || tim_kiem.trim() === '') {
                return res.render('admin_index', {
                    page: 'pages/quanLyGiaoVien',
                    danhSachGiaoVien: [],
                    message: 'Vui lồn nhập tìm kiếm',
                    messageType: 'error'
                })
            }
            const danhSachGiaoVien = await giaoVienModel.timGiaoVienTheoTen(tim_kiem);
            if (danhSachGiaoVien.length === 0) {
                return res.render('admin_index', {
                    page: 'pages/quanLyGiaoVien',
                    danhSachGiaoVien: [],
                    message: `Không tìm thấy giáo viên với tên: ${tim_kiem}`,
                    messageType: 'error'
                })
            }
            return res.render('admin_index', {
                page: 'pages/quanLyGiaoVien',
                danhSachGiaoVien,
                message: `Đã tìm thấy giáo viên: ${tim_kiem}`,
                messageType: 'success'
            });
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyGiaoVien',
                danhSachGiaoVien: [],
                message: 'Đã xảy ra lỗi khi lấy danh sách giáo viên',
                messageType: 'error'
            })
        }
    }
}
module.exports = GiaoVienController;