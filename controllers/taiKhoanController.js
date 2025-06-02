const TaiKhoan = require('../models/taiKhoanModel');

class TaiKhoanController {
    static async themTaiKhoan(req, res) {
        try {
            const data = req.body;

            // Kiểm tra thông tin 
            const checks = await Promise.all([
                TaiKhoan.kiemTraEmailTonTai(data.email),
                TaiKhoan.kiemTraSoDienThoaiTonTai(data.sdt),
                TaiKhoan.kiemTraSoCMNDTonTai(data.so_cmnd)
            ]);

            if (checks[0]) return res.status(400).json({ message: 'Email đã tồn tại' });
            if (checks[1]) return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
            if (checks[2]) return res.status(400).json({ message: 'Số CMND đã tồn tại' });

            // Thêm tài khoản
            const { tai_khoan_id } = await TaiKhoan.themTaiKhoan(data);

            // Hiển thị lại thông tin chi tiết tài khoản vừa thêm thành công
            const taiKhoan = await TaiKhoan.layTaiKhoanTheoId(tai_khoan_id);

            res.status(201).json({
                message: 'Thêm tài khoản thành công',
                data: taiKhoan
            });
        } catch (error) {
            console.error('Lỗi khi thêm tài khoản:', error);
            res.status(500).json({
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    // Lấy danh sách tài khoản
    static async layDanhSachTaiKhoan(req, res) {
        try {
            const danhSach = await TaiKhoan.layDanhSachTaiKhoan();

            res.status(200).json({
                success: true,
                data: danhSach
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách tài khoản'
            });
        }
    }
    static async layTaiKhoanTheoId(req, res) {
        try {
            const { id } = req.params;
            const taiKhoan = await TaiKhoan.layTaiKhoanTheoId(id);

            if (!taiKhoan) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            res.status(200).json({
                success: true,
                data: taiKhoan
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin tài khoản'
            });
        }
    }
    // Lấy danh sách tài khoản với vai trò là giáo viên
    static async layDanhSachTaiKhoanGiaoVien(req, res) {
        try {
            const danhSach = await TaiKhoan.layDanhSachTaiKhoanGiaoVien();

            res.status(200).json({
                success: true,
                data: danhSach
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách tài khoản giáo viên'
            });
        }
    }
    // Lấy danh sách tài khoản với vai trò là phụ huynh
    static async layDanhSachTaiKhoanPhuHuynh(req, res) {
        try {
            const danhSach = await TaiKhoan.layDanhSachTaiKhoanPhuHuynh();

            res.status(200).json({
                success: true,
                data: danhSach
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách tài khoản phụ huynh'
            });
        }
    }
    // Đăng nhập
    static async dangNhap(req, res) {
        try {
            const { email, mat_khau } = req.body;
            if (!email || !mat_khau) {
                return res.render('auth/login', {
                    message: 'Vui lòng nhập đầy đủ email và mật khẩu',
                    messageType: 'error'
                });
            }

            // Kiểm tra thông tin đăng nhập
            const taiKhoan = await TaiKhoan.dangNhap(email, mat_khau);
            if (!taiKhoan) {
                return res.render('auth/login', {
                    message: 'Email hoặc mật khẩu không đúng',
                    messageType: 'error'
                });
            }

            // Kiểm tra vai trò và chuyển hướng
            if (taiKhoan.ten_vai_tro === 'Admin') {
                const thongTin = await TaiKhoan.thongTinDashboard();
                return res.render('admin_index', { taiKhoan, thongTin });
            }
            else {
                return res.render('auth/login', {
                    message: 'Bạn không có quyền truy cập vào trang Admin',
                    messageType: 'error'
                });
            }
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            return res.render('auth/login', {
                message: 'Lỗi server',
                messageType: 'error'
            });
        }
    }
    static async thongTinDashboard(req, res) {  // Thêm req, res vào tham số
        try {
            const thongTin = await TaiKhoan.thongTinDashboard();
            res.render('partials/dashboard', {  // Render file dashboard.ejs
                title: 'Dashboard Admin',
                thongTin: thongTin
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin dashboard:', error);
            res.status(500).send("Đã xảy ra lỗi khi tải dashboard");
        }
    }
}

module.exports = TaiKhoanController;