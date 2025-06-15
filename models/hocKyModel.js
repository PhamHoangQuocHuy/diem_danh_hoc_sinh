const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');
class HocKyModel {
    static async hienthiHocKy() {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(`SELECT * FROM hoc_ky WHERE daXoa=0`);
        return rows;
    }
    static async hienThiNamHoc() {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(`SELECT * FROM nam_hoc WHERE daXoa=0`);
        return rows;
    }
    static async themMoiHocKy(hocKy) {
        const { ten_hoc_ky, nam_hoc_id, ngay_bat_dau, ngay_ket_thuc } = hocKy;
        if (!ten_hoc_ky || !nam_hoc_id || !ngay_bat_dau || !ngay_ket_thuc) {
            return { success: false, message: 'Vui lòng điền đầy đủ thông tin', messageType: 'error' };
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Ràng buộc 1: Ngày bắt đầu không được >= ngày kết thúc
            const startDate = new Date(ngay_bat_dau);
            const endDate = new Date(ngay_ket_thuc);
            if (startDate >= endDate) {
                await conn.rollback();
                return { success: false, message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc', messageType: 'error' };
            }

            // Lấy ten_nam_hoc để kiểm tra phạm vi năm
            const [namHocResult] = await conn.query('SELECT ten_nam_hoc FROM nam_hoc WHERE nam_hoc_id = ?', [nam_hoc_id]);
            if (!namHocResult || namHocResult.length === 0) {
                await conn.rollback();
                return { success: false, message: 'Không tìm thấy thông tin năm học', messageType: 'error' };
            }
            const tenNamHoc = namHocResult[0].ten_nam_hoc;
            const [startYear, endYear] = tenNamHoc.split('-').map(year => parseInt(year, 10));

            // Ràng buộc 2: Kiểm tra năm dựa trên ten_hoc_ky
            const startYearDate = startDate.getFullYear();
            const endYearDate = endDate.getFullYear();
            if (ten_hoc_ky === 'Học kỳ 1') {
                if (startYearDate !== startYear || endYearDate !== endYear) {
                    await conn.rollback();
                    return { success: false, message: `Với Học kỳ 1, năm bắt đầu phải là ${startYear}, năm kết thúc phải là ${endYear}`, messageType: 'error' };
                }
            } else if (ten_hoc_ky === 'Học kỳ 2') {
                if (startYearDate !== endYear || endYearDate !== endYear) {
                    await conn.rollback();
                    return { success: false, message: `Với Học kỳ 2, năm bắt đầu và kết thúc phải là ${endYear}`, messageType: 'error' };
                }
            } else {
                await conn.rollback();
                return { success: false, message: 'Tên học kỳ chỉ được là Học kỳ 1 hoặc Học kỳ 2', messageType: 'error' };
            }

            const [result] = await conn.query(
                'INSERT INTO hoc_ky (ten_hoc_ky, nam_hoc_id, ngay_bat_dau, ngay_ket_thuc) VALUES (?, ?, ?, ?)',
                [ten_hoc_ky, nam_hoc_id, ngay_bat_dau, ngay_ket_thuc]
            );

            if (result.affectedRows > 0) {
                await conn.commit();

                
            } else {
                await conn.rollback();
                return { success: false, message: 'Lỗi khi thêm học kỳ', messageType: 'error' };
            }
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi thêm học kỳ:', error);
            return { success: false, message: 'Thêm học kỳ thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async xoaThongTinHocKy(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [lopHocRows] = await conn.query(`SELECT * FROM lop_hoc WHERE hoc_ky_id = ?`, [id]);
            if (lopHocRows.length > 0) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không thể xóa học kỳ do đang có lớp học',
                    messageType: 'error'
                };
            }
            const [rows] = await conn.query(`UPDATE hoc_ky SET daXoa=1 WHERE hoc_ky_id = ?`, [id]);
            await conn.commit();
            return { success: true, message: 'Xóa học kỳ thành công', messageType: 'success' }
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi xóa học kỳ: ', error);
            return { success: false, message: 'Xóa học kỳ thất bại', messageType: 'error' }
        }
        finally {
            conn.release();
        }
    }
    static async suaThongTinHocKy(id, hocKy) {
        let conn;
        const { ten_hoc_ky, nam_hoc_id, ngay_bat_dau, ngay_ket_thuc } = hocKy;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            if (!ten_hoc_ky || !nam_hoc_id || !ngay_bat_dau || !ngay_ket_thuc) {
                await conn.rollback();
                return { success: false, message: 'Vui lòng điền đầy đủ thông tin', messageType: 'error' };
            }

            // Ràng buộc 1: Ngày bắt đầu không được >= ngày kết thúc
            const startDate = new Date(ngay_bat_dau);
            const endDate = new Date(ngay_ket_thuc);
            if (startDate >= endDate) {
                await conn.rollback();
                return { success: false, message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc', messageType: 'error' };
            }

            // Lấy ten_nam_hoc để kiểm tra phạm vi năm
            const [namHocResult] = await conn.query('SELECT ten_nam_hoc FROM nam_hoc WHERE nam_hoc_id = ?', [nam_hoc_id]);
            if (!namHocResult || namHocResult.length === 0) {
                await conn.rollback();
                return { success: false, message: 'Không tìm thấy thông tin năm học', messageType: 'error' };
            }
            const tenNamHoc = namHocResult[0].ten_nam_hoc;
            const [startYear, endYear] = tenNamHoc.split('-').map(year => parseInt(year, 10));

            // Ràng buộc 2: Kiểm tra năm dựa trên ten_hoc_ky
            const startYearDate = startDate.getFullYear();
            const endYearDate = endDate.getFullYear();
            if (ten_hoc_ky === 'Học kỳ 1') {
                if (startYearDate !== startYear || endYearDate !== endYear) {
                    await conn.rollback();
                    return { success: false, message: `Với Học kỳ 1, năm bắt đầu phải là ${startYear}, năm kết thúc phải là ${endYear}`, messageType: 'error' };
                }
            } else if (ten_hoc_ky === 'Học kỳ 2') {
                if (startYearDate !== endYear || endYearDate !== endYear) {
                    await conn.rollback();
                    return { success: false, message: `Với Học kỳ 2, năm bắt đầu và kết thúc phải là ${endYear}`, messageType: 'error' };
                }
            } else {
                await conn.rollback();
                return { success: false, message: 'Tên học kỳ chỉ được là Học kỳ 1 hoặc Học kỳ 2', messageType: 'error' };
            }

            // Kiểm tra trùng lặp ten_hoc_ky và nam_hoc_id (trừ bản ghi hiện tại)
            const [checkTrungHocKyTrongNam] = await conn.query(
                'SELECT 1 FROM hoc_ky WHERE ten_hoc_ky = ? AND nam_hoc_id = ? AND hoc_ky_id != ?',
                [ten_hoc_ky, nam_hoc_id, id]
            );
            if (checkTrungHocKyTrongNam.length > 0) {
                await conn.rollback();
                return { success: false, message: `Học kỳ ${ten_hoc_ky} trong năm học ${tenNamHoc} đã tồn tại`, messageType: 'error' };
            }

            // Cập nhật học kỳ
            const sql = `
            UPDATE hoc_ky 
            SET ten_hoc_ky = ?, nam_hoc_id = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?
            WHERE hoc_ky_id = ?`;
            const [result] = await conn.query(sql, [ten_hoc_ky, nam_hoc_id, ngay_bat_dau, ngay_ket_thuc, id]);

            if (result.affectedRows === 0) {
                await conn.rollback();
                return { success: false, message: 'Không tìm thấy học kỳ để sửa', messageType: 'error' };
            }

            await conn.commit();
            return { success: true, message: 'Sửa học kỳ thành công', messageType: 'success' };
        } catch (error) {
            console.error('Lỗi khi sửa học kỳ: ', error);
            if (conn) await conn.rollback();
            return { success: false, message: 'Sửa học kỳ thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async timHocKyTheoNamHoc(tim_kiem) {
        if (!tim_kiem || tim_kiem.trim() === '') {
            return { success: false, message: 'Vui lòng nhập tên năm học', messageType: 'error' };
        }

        const conn = await pool.getConnection();
        try {
            // Kiểm tra định dạng tim_kiem là 4 chữ số (năm)
            const yearPattern = /^\d{4}$/;
            if (!yearPattern.test(tim_kiem.trim())) {
                return { success: false, message: 'Vui lòng nhập năm hợp lệ (4 chữ số, ví dụ: 2026)', messageType: 'error' };
            }

            // Tìm các học kỳ có phần năm bắt đầu hoặc kết thúc khớp với tim_kiem
            const searchPatternStart = `${tim_kiem.trim()}-%`;
            const searchPatternEnd = `%-${tim_kiem.trim()}`;
            const [rows] = await conn.query(
                `SELECT * FROM hoc_ky JOIN nam_hoc ON hoc_ky.nam_hoc_id = nam_hoc.nam_hoc_id 
            WHERE (nam_hoc.ten_nam_hoc LIKE ? OR nam_hoc.ten_nam_hoc LIKE ?) AND hoc_ky.daXoa = 0`,
                [searchPatternStart, searchPatternEnd]
            );

            if (rows.length === 0) {
                return { success: false, message: 'Không tìm thấy học kỳ nào', messageType: 'warning' };
            }
            return { success: true, data: rows, message: 'Tìm kiếm học kỳ thành công', messageType: 'success' };
        } catch (error) {
            console.error('Lỗi khi tìm học kỳ theo tên:', error);
            return { success: false, message: 'Tìm kiếm học kỳ thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async locTheoHocKy(tenHocKy) {
        let conn;
        try {
            conn = await pool.getConnection();
            const [rows] = await conn.query(`SELECT * FROM hoc_ky WHERE ten_hoc_ky = ?`, [tenHocKy]);
            return rows;
        }
        catch (error) {
            console.log('Lỗi khi tìm học kỳ: ', error);
            return [];
        }
        finally {
            if (conn) conn.release();
        }
    }
}

module.exports = HocKyModel