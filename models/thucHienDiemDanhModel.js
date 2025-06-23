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
    static async layDanhSachLopHoc(tai_khoan_id) {
        try {
            // Lấy giao_vien_id từ tài_khoan_id
            const [gvRows] = await pool.query(
                'SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?',
                [tai_khoan_id]
            );

            if (gvRows.length === 0) return [];

            const giao_vien_id = gvRows[0].giao_vien_id;

            // Lấy danh sách lớp giáo viên chủ nhiệm trong học kỳ hiện tại
            const [lopRows] = await pool.query(
                `SELECT lop_hoc_id, ten_lop, ten_hoc_ky, ten_nam_hoc 
             FROM lop_hoc 
             JOIN hoc_ky ON lop_hoc.hoc_ky_id = hoc_ky.hoc_ky_id
             JOIN nam_hoc ON hoc_ky.nam_hoc_id = nam_hoc.nam_hoc_id
             WHERE lop_hoc.daXoa = 0 
               AND giao_vien_id = ?
               AND hoc_ky.ngay_bat_dau <= CURDATE()
               AND hoc_ky.ngay_ket_thuc >= CURDATE()`,
                [giao_vien_id]
            );

            return lopRows;
        } catch (error) {
            console.error('Lỗi lấy danh sách lớp học:', error);
            return [];
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