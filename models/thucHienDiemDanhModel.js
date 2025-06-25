const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');
class thucHienDiemDanhModel {
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
    static async layTongHocSang(buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Học sáng"';

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query);
        return rows;

    }
    static async layTongHocChieu(buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Học chiều"';

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
            const [lopRows] = await pool.query(`
                SELECT lop_hoc_id, ten_lop, ten_hoc_ky, ten_nam_hoc, hoc_ky.ngay_bat_dau, hoc_ky.ngay_ket_thuc
                FROM lop_hoc 
                JOIN hoc_ky ON lop_hoc.hoc_ky_id = hoc_ky.hoc_ky_id
                JOIN nam_hoc ON hoc_ky.nam_hoc_id = nam_hoc.nam_hoc_id
                WHERE lop_hoc.daXoa = 0 
                AND giao_vien_id = ?
                ORDER BY hoc_ky.ngay_bat_dau DESC, ten_lop ASC
            `, [giao_vien_id]);

            return lopRows;
        } catch (error) {
            console.error('Lỗi lấy danh sách lớp học:', error);
            return [];
        }
    }
    static async layDanhSachDiemDanh(lop_hoc_id, ngay_diem_danh, buoi) {
        const conn = await pool.getConnection();
        try {
            let query = `
            SELECT 
                hs.hoc_sinh_id,
                hs.*,
                ha.duong_dan_anh,
                dd.trang_thai,
                dd.ghi_chu,
                dd.ngay_diem_danh
            FROM hoc_sinh_lop_hoc hslh
            JOIN hoc_sinh hs ON hslh.hoc_sinh_id = hs.hoc_sinh_id
            LEFT JOIN (
                SELECT hoc_sinh_id, duong_dan_anh
                FROM hinh_anh_hoc_sinh
                WHERE hinh_anh_hoc_sinh_id IN (
                    SELECT MIN(hinh_anh_hoc_sinh_id) FROM hinh_anh_hoc_sinh GROUP BY hoc_sinh_id
                )
                ) ha ON hs.hoc_sinh_id = ha.hoc_sinh_id
            LEFT JOIN diem_danh dd 
                ON dd.hoc_sinh_id = hs.hoc_sinh_id 
                AND dd.lop_hoc_id = ? 
                AND dd.ngay_diem_danh = ?
            WHERE hslh.lop_hoc_id = ?
              AND hs.daXoa = 0
        `;

            const params = [lop_hoc_id, ngay_diem_danh, lop_hoc_id];

            // Nếu là buổi chiều => lọc học sinh không bán trú
            if (buoi === 'afternoon') {
                query += ` AND hs.loai_hoc_sinh = 'Không bán trú'`;
            }

            query += ` ORDER BY hs.hoc_sinh_id ASC`;

            const [rows] = await conn.query(query, params);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách điểm danh:', error);
            return [];
        } finally {
            if (conn) conn.release();
        }
    }
    static async themThongTinDiemDanh({ lop_hoc_id, ngay_diem_danh, buoi, danhSachDiemDanh }) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            // Kiểm tra ngày điểm danh
            const today = new Date().toISOString().slice(0, 10);
            if (ngay_diem_danh < today) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không thể điểm danh cho ngày đã qua',
                    messageType: 'error'
                };
            }
            if (ngay_diem_danh > today) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không thể điểm danh cho ngày trong tương lai',
                    messageType: 'error'
                };
            }

            for (const diemDanh of danhSachDiemDanh) {
                const { hoc_sinh_id, trang_thai, ghi_chu } = diemDanh;
                // Lấy loại học sinh (bán trú / không bán trú)
                const [hsRows] = await conn.query(
                    'SELECT * FROM hoc_sinh WHERE hoc_sinh_id = ?',
                    [hoc_sinh_id]
                );
                if (hsRows.length === 0) {
                    throw new Error('Không tìm thấy học sinh');
                }
                const loai_hoc_sinh = hsRows[0].loai_hoc_sinh;
                const ten_hoc_sinh = hsRows[0].ho_ten;

                // Lấy các bản ghi điểm danh trong ngày cho học sinh này
                const [ddRows] = await conn.query(
                    'SELECT * FROM diem_danh WHERE hoc_sinh_id = ? AND lop_hoc_id = ? AND ngay_diem_danh = ?',
                    [hoc_sinh_id, lop_hoc_id, ngay_diem_danh]
                );
                // HỌC SINH BÁN TRÚ
                if (loai_hoc_sinh === 'Bán trú' && buoi === 'afternoon') {
                    await conn.rollback();
                    return { success: false, message: 'Học sinh bán trú không điểm danh chiều', messageType: 'error' };
                }
                if (loai_hoc_sinh === 'Bán trú' && buoi === 'morning') {
                    if (ddRows.length > 0) { // Đã có điểm danh => Cập nhât
                        await conn.query(`
                            UPDATE diem_danh
                            SET trang_thai = ?, ghi_chu = ?, anh_ghi_nhan = NULL
                            WHERE diem_danh_id = ?
                        `, [trang_thai, ghi_chu, ddRows[0].diem_danh_id]);
                    } else {
                        // Chưa có => Thêm mới
                        await conn.query(`
                            INSERT INTO diem_danh (hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu, anh_ghi_nhan)
                            VALUES (?, ?, ?, ?, ?, NULL)
                        `, [hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu]);
                    }
                }
                // HỌC SINH KHÔNG BÁN TRÚ
                else if (loai_hoc_sinh === 'Không bán trú') {
                    if (buoi === 'morning') { // Nếu là buổi sáng và có danh sách rồi => UPDATE
                        if (ddRows.length > 0) {
                            await conn.query(`
                                UPDATE diem_danh
                                SET trang_thai = ?, ghi_chu = ?, anh_ghi_nhan = NULL
                                WHERE diem_danh_id = ?
                            `, [trang_thai, ghi_chu, ddRows[0].diem_danh_id]);
                        }
                        else { // Nếu chưa thì => INSERT
                            await conn.query(`
                                INSERT INTO diem_danh (hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu, anh_ghi_nhan)
                                VALUES (?, ?, ?, ?, ?, NULL)
                            `, [hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu]);
                        }
                    } else if (buoi === 'afternoon') {
                        // Kiểm tra xem đã điểm danh buổi sáng chưa
                        const [sangRows] = await conn.query(
                            'SELECT * FROM diem_danh WHERE hoc_sinh_id = ? AND lop_hoc_id = ? AND ngay_diem_danh = ?',
                            [hoc_sinh_id, lop_hoc_id, ngay_diem_danh]
                        );

                        if (sangRows.length === 0) {
                            await conn.rollback();
                            return {
                                success: false,
                                message: `Học sinh ${ten_hoc_sinh} chưa có kết quả điểm danh buổi sáng`,
                                messageType: 'error'
                            };
                        }

                        // Đã có bản ghi sáng, nên xử lý UPDATE hoặc INSERT chiều (tuỳ `ddRows`)
                        if (ddRows.length > 0) {
                            await conn.query(`
                                UPDATE diem_danh
                                SET trang_thai = ?, ghi_chu = ?, anh_ghi_nhan = NULL
                                WHERE diem_danh_id = ?
                            `, [trang_thai, ghi_chu, ddRows[0].diem_danh_id]);
                        }
                    }
                }
            }
            await conn.commit();
            return { success: true, message: 'Lưu điểm danh thành công', messageType: 'success' };
        }
        catch (error) {
            await conn.rollback();
            console.log(error);
            return { success: false, message: 'Lưu điểm danh thất bại', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async xuatThongTinExcel(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
                SELECT
                    hs.ho_ten as 'Họ tên',
                    hs.ngay_sinh as 'Ngày sinh',
                    lh.ten_lop as 'Tên lớp',
                    dd.trang_thai as 'Trạng thái',
                    dd.ghi_chu as 'Ghi chú',
                    dd.ngay_diem_danh as 'Ngày điểm danh',
                    dd.thoi_gian as 'Thời gian'
                FROM diem_danh dd
                JOIN hoc_sinh hs ON dd.hoc_sinh_id = hs.hoc_sinh_id
                JOIN lop_hoc lh ON dd.lop_hoc_id = lh.lop_hoc_id
                WHERE dd.lop_hoc_id = ?
                AND dd.ngay_diem_danh = ?
                `, [lop_hoc_id, ngay_diem_danh]);

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

module.exports = thucHienDiemDanhModel;