const pool = require('../config/connect_database');
const bcrypt = require('bcrypt');
const saltRounds = 10;

class AuthModel {
    static async kiemTraDangNhap(email, mat_khau) {
        const [rows] = await pool.query('SELECT * FROM tai_khoan WHERE email = ?', [email]);
        if (rows.length === 0) {
            return { success: false, message: 'Email không tồn tại' };
        }
        const taiKhoan = rows[0];
        const match = await bcrypt.compare(mat_khau, taiKhoan.mat_khau);
        if (!match) {
            return { success: false, message: 'Mật khẩu không đúng' };
        }
        return { success: true, taiKhoan };
    }
    static async layThongTinTaiKhoan(tai_khoan_id) {
        const [rows] = await pool.query('SELECT * FROM tai_khoan WHERE tai_khoan_id = ?', [tai_khoan_id]);
        if (rows.length === 0) {
            return null; // Không tìm thấy tài khoản
        }
        return rows[0]; // Trả về thông tin tài khoản
    }
}
module.exports = AuthModel;
