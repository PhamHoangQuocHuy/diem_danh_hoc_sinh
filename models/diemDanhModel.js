const pool = require('../config/connect_database');

class diemDanhModel {
    static async layDanhSachNamHoc() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query('SELECT * FROM nam_hoc WHERE daXoa = 0 ORDER BY ten_nam_hoc DESC');
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
    static async layDanhSachHocKy(namHocId) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM hoc_ky 
                WHERE nam_hoc_id = ? AND hoc_ky.daXoa = 0 
                ORDER BY hoc_ky_id DESC`, [namHocId]);
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
    static async layDanhSachLopHoc(hocKyId) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM lop_hoc 
                WHERE hoc_ky_id = ? AND lop_hoc.daXoa = 0 
                ORDER BY lop_hoc_id DESC`, [hocKyId]);
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
}

module.exports = diemDanhModel;