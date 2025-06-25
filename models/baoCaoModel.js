const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');

class BaoCaoModel {
    static async layHocSinhVangNhieu(namHocId) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
            SELECT 
                hs.hoc_sinh_id,
                hs.ho_ten AS ten_hoc_sinh,
                lh.ten_lop,
                COUNT(dd.diem_danh_id) AS tong_diem_danh,
                SUM(CASE WHEN dd.trang_thai = 'Vắng' THEN 1 ELSE 0 END) AS tong_vang,
                ROUND(SUM(CASE WHEN dd.trang_thai = 'Vắng' THEN 1 ELSE 0 END) * 100.0 / COUNT(dd.diem_danh_id), 2) AS ti_le_vang
            FROM diem_danh dd
            JOIN hoc_sinh hs ON dd.hoc_sinh_id = hs.hoc_sinh_id
            JOIN lop_hoc lh ON dd.lop_hoc_id = lh.lop_hoc_id
            JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            WHERE hk.ten_hoc_ky IN ('Học kỳ 1', 'Học kỳ 2')
              AND hk.nam_hoc_id = ?
            GROUP BY hs.hoc_sinh_id, hs.ho_ten, lh.ten_lop
            HAVING tong_diem_danh > 0
            ORDER BY ti_le_vang DESC
            LIMIT 10
        `, [namHocId]);
            return rows;
        } catch (err) {
            console.log(err);
            return [];
        } finally {
            conn.release();
        }
    }
    static async layNamHocHienTai() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
                SELECT nam_hoc_id
                FROM nam_hoc
                WHERE daXoa = 0
                ORDER BY ten_nam_hoc DESC
                LIMIT 1
            `);
            return rows[0]?.nam_hoc_id || null;
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            conn.release();
        }
    }
}

module.exports = BaoCaoModel;