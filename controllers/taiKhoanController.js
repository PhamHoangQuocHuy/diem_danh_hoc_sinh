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
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ email và mật khẩu'
                });
            }
            // Kiểm tra thông tin đăng nhập
            const taiKhoan = await TaiKhoan.dangNhap(email, mat_khau);
            if (!taiKhoan) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }
            // Lấy thông tin chi tiết tài khoản
            const chiTietTaiKhoan = await TaiKhoan.layTaiKhoanTheoId(taiKhoan.tai_khoan_id);

            // Trả về thông tin tài khoản
            return res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công',
                data: {
                    tai_khoan_id: chiTietTaiKhoan.tai_khoan_id,
                    ho_ten: chiTietTaiKhoan.ho_ten,
                    email: chiTietTaiKhoan.email,
                    vai_tro_id: chiTietTaiKhoan.vai_tro_id,
                    ten_vai_tro: chiTietTaiKhoan.ten_vai_tro,
                    giao_vien_id: chiTietTaiKhoan.giao_vien_id,
                    phu_huynh_id: chiTietTaiKhoan.phu_huynh_id
                }
            });
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}

module.exports = TaiKhoanController;