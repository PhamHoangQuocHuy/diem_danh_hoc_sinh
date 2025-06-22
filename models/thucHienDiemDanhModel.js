const pool = require('../config/connect_database');

class thucHienDiemDanhModel {
    static async layDanhSachHocSinh(buoi) {
        let query = 'SELECT * FROM hoc_sinh JOIN diem_danh ON hoc_sinh.hoc_sinh_id = diem_danh.hoc_sinh_id';

        // Nếu là buổi chiều thì chỉ lấy học sinh không bán trú
        if (buoi === 'afternoon') {
            query += ' WHERE loai_hoc_sinh = "Không bán trú" AND daXoa = 0';
        }

        const [rows] = await pool.query(query);
        return rows;
    }

    static async layTongLopHoc(buoi) {
        let query = 'SELECT COUNT(*) as tong FROM hoc_sinh';

        if (buoi === 'afternoon') {
            query += ' WHERE loai_hoc_sinh = "Không bán trú"';
        }

        const [rows] = await pool.query(query);
        return rows;
    }

    static async layTongCoMat(buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Có mặt"';

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query);
        return rows;
    }

    static async layTongVang(buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Vắng"';

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query);
        return rows;
    }
    static async layDanhSachLopHoc(){
        const conn = await pool.getConnection();
        try{
            const [rows] = await conn.query(`SELECT DISTINCT ten_lop
            FROM lop_hoc 
            JOIN giao_vien ON lop_hoc.giao_vien_id = giao_vien.giao_vien_id
            WHERE daXoa = 0`);
            return rows;
        }
        catch(error){
            console.log(error);
        }
        finally{
            if(conn) conn.release();
        }
    }
    static async diemDanhThuCong() {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            // Kiểm tra học sinh thuộc bán trú & không bán trú -> đang điểm danh buổi sáng (nếu tồn tại điểm danh rồi thì update chưa thì insert)
            // Kiểm tra học sinh bán trú và điểm danh buổi chiều (Không được điểm danh)
            // Kiểm tra chỉ học sinh không bán trú -> điểm danh buổi chiều (nếu tồn tại điểm danh rồi thì update chưa thì insert)
        }
        catch (error) {
            console.log(error);
        }
        finally {
            if (conn) conn.release();
        }
    }
}

module.exports = thucHienDiemDanhModel;