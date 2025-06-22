const pool = require('../config/connect_database');
class quenMatKhauModel {
    static async layThongTinTaiKhoan(email) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.execute(
                `SELECT * FROM tai_khoan WHERE email = ? AND daXoa = 0 LIMIT 1`,
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            console.log(error);
            return null;
        } finally {
            if (conn) conn.release();
        }
    }
    static async capNhatMatKhau(email, mat_khau_moi) {
        const conn = await pool.getConnection();
        try {
            await conn.execute(
                `UPDATE tai_khoan SET mat_khau = ? WHERE email = ? AND daXoa = 0`,
                [mat_khau_moi, email]
            );
        } catch (error) {
            console.log(error);
        } finally {
            if (conn) conn.release();
        }
    }

}
module.exports = quenMatKhauModel