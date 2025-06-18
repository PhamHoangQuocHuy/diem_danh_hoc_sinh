const pool = require('../config/connect_database');

class GiaoVienModel {
    static async layDanhSachGiaoVien() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT *
                FROM giao_vien JOIN tai_khoan 
                ON giao_vien.tai_khoan_id = tai_khoan.tai_khoan_id
                WHERE tai_khoan.daXoa = 0 AND tai_khoan.ten_vai_tro = 'Giáo viên'`);
            return rows;
        }
        catch (error) {
            console.log(error);
            return [];
        }
        finally {
            conn.release();
        }
    }
    static async thongTinChiTietGiaoVien(id) {
        const conn = await pool.getConnection();
        try {
            // Lấy thông tin tài khoản
            const [rows] = await conn.query(`SELECT * FROM tai_khoan
                JOIN giao_vien ON tai_khoan.tai_khoan_id = giao_vien.tai_khoan_id
                WHERE giao_vien.tai_khoan_id = ? AND tai_khoan.daXoa = 0 AND tai_khoan.ten_vai_tro = 'Giáo viên'
                `, [id]);
            if (rows.length === 0) {
                return null; // không tìm thấy tài khoản
            }
            const giaoVien = rows[0];
            const [bangCaps] = await conn.query(`
                    SELECT * 
                    FROM bang_cap JOIN giao_vien on bang_cap.giao_vien_id = giao_vien.giao_vien_id
                    WHERE giao_vien.tai_khoan_id = ?`, [id]);
            giaoVien.bang_cap = bangCaps; // thêm thuộc tính bang_cap vào đối tượng tài khoản
            return giaoVien;

        } catch (error) {
            console.error('Lỗi lấy tài khoản theo ID:', error);
            return null;
        } finally {
            conn.release();
        }

    }
    static async timGiaoVienTheoTen(tim_kiem) {
        const conn = await pool.getConnection();
        try {
            if(!tim_kiem || tim_kiem.trim() === ''){
                return {success: false, message: 'Vui lồn nhập tìm kiếm', messageType: 'error'}
            }
            const [rows] = await conn.query(`SELECT *
                FROM giao_vien JOIN tai_khoan 
                ON giao_vien.tai_khoan_id = tai_khoan.tai_khoan_id
                WHERE tai_khoan.daXoa = 0 AND tai_khoan.ten_vai_tro = 'Giáo viên' AND tai_khoan.ho_ten LIKE '%${tim_kiem}%'`);
            return rows;
        }
        catch (error) {
            console.log(error);
            return [];
        }
        finally {
            if (conn) conn.release();
        }
    }
}
module.exports = GiaoVienModel;