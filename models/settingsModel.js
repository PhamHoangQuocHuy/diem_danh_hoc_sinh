const pool = require('../config/connect_database');

class SettingsModel {
    static async layTaiKhoanTheoId(taiKhoanId) {
        try {
            const [rows] = await pool.query('SELECT * FROM tai_khoan WHERE tai_khoan_id = ?', [taiKhoanId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Lỗi lấy thông tin tài khoản:', error);
            return null;
        }
    }
}

module.exports = SettingsModel;