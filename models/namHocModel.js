const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');
class NamHocModel {
    static async hienThiDanhSachNamHoc() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await pool.query('SELECT * FROM nam_hoc WHERE daXoa = 0 ORDER BY nam_hoc_id DESC');
            return rows;
        } catch (error) {
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }
    static async hienThiDanhSachTruongHoc() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await pool.query('SELECT * FROM truong_hoc WHERE daXoa = 0 ORDER BY truong_hoc_id DESC');
            return rows;
        } catch (error) {
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }
    static async themThongTinNamHoc(namHoc) {
        const { ten_nam_hoc, truong_hoc_id } = namHoc;
        if (!ten_nam_hoc || !truong_hoc_id) {
            return { success: false, message: 'Tên năm học và trường học không được để trống', messageType: 'error' };
        }
        // Kiểm tra định dạng YYYY-YYYY và so sánh năm
        const yearPattern = /^(\d{4})-(\d{4})$/;
        const match = ten_nam_hoc.match(yearPattern);
        if (!match) {
            return { success: false, message: 'Định dạng năm học không hợp lệ. Vui lòng dùng YYYY-YYYY (ví dụ: 2024-2025)', messageType: 'error' };
        }
        const startYear = parseInt(match[1], 10);
        const endYear = parseInt(match[2], 10);
        if (endYear <= startYear) {
            return { success: false, message: 'Năm học sau không được nhỏ hơn hoặc bằng năm học trước', messageType: 'error' };
        }
        const conn = await pool.getConnection();
        try {
            // Kiểm tra tên năm học đã tồn tại trong cùng trường => Lỗi
            const [existRows] = await conn.query(
                'SELECT 1 FROM nam_hoc WHERE ten_nam_hoc = ? AND truong_hoc_id = ?',
                [ten_nam_hoc, truong_hoc_id]
            );
            if (existRows.length > 0) {
                return {
                    success: false,
                    message: 'Tên năm học đã tồn tại trong trường này',
                    messageType: 'error'
                };
            }
            const [result] = await conn.query('INSERT INTO nam_hoc (ten_nam_hoc, truong_hoc_id) VALUES (?, ?)', [ten_nam_hoc, truong_hoc_id]);
            await conn.commit();

            const folderPath = path.join(__dirname, '..', 'public', 'images', ten_nam_hoc);
            try {
                fs.mkdirSync(folderPath, { recursive: true });
                if (fs.existsSync(folderPath)) {
                    return { success: true, message: 'Thêm năm học thành công', messageType: 'success' };
                } else {
                    await conn.rollback();
                    return { success: false, message: 'Tạo thư mục thất bại', messageType: 'error' };
                }
            } catch (fsError) {
                await conn.rollback();
                console.error('Lỗi khi tạo thư mục:', fsError);
                return { success: false, message: 'Lỗi khi tạo thư mục', messageType: 'error' };
            }
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi thêm năm học:', error);
            return { success: false, message: 'Thêm năm học thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async xoaThongTinNamHoc(id) {
        const conn = await pool.getConnection();
        try {
            const tonTaiNamHoc = await conn.query(`SELECT 1 FROM nam_hoc JOIN hoc_ky
                ON nam_hoc.nam_hoc_id = hoc_ky.nam_hoc_id
                WHERE nam_hoc.nam_hoc_id = ? AND hoc_ky.daXoa = 0`, [id]);
            if (tonTaiNamHoc[0].length > 0) {
                // Nếu năm học đang được sử dụng trong học kỳ, không cho phép xóa
                return { success: false, message: 'Không thể xóa năm học đang được sử dụng', messageType: 'error' };
            }
            else {
                const [result] = await conn.query('UPDATE nam_hoc SET daXoa = 1 WHERE nam_hoc_id = ?', [id]);
                await conn.commit();
                return { success: true, message: 'Xóa năm học thành công', messageType: 'success' };
            }
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi xóa năm học:', error);
            return { success: false, message: 'Xóa năm học thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async suaThongTinNamHoc(id, namHoc) {
        const { ten_nam_hoc, truong_hoc_id } = namHoc;
        if (!ten_nam_hoc || !truong_hoc_id) {
            return { success: false, message: 'Tên năm học và trường học không được để trống', messageType: 'error' };
        }
        // Kiểm tra định dạng YYYY-YYYY và so sánh năm
        const yearPattern = /^(\d{4})-(\d{4})$/;
        const match = ten_nam_hoc.match(yearPattern);
        if (!match) {
            return { success: false, message: 'Định dạng năm học không hợp lệ. Vui lòng dùng YYYY-YYYY (ví dụ: 2024-2025)', messageType: 'error' };
        }
        const startYear = parseInt(match[1], 10);
        const endYear = parseInt(match[2], 10);
        if (endYear <= startYear) {
            return { success: false, message: 'Năm học sau không được nhỏ hơn hoặc bằng năm học trước', messageType: 'error' };
        }
        const conn = await pool.getConnection();
        try {
            // Lấy tên năm học cũ để đổi thư mục nếu cần
            const [oldRows] = await conn.query('SELECT ten_nam_hoc FROM nam_hoc WHERE nam_hoc_id = ?', [id]);
            if (!oldRows.length) {
                return { success: false, message: 'Không tìm thấy năm học cần sửa', messageType: 'error' };
            }
            const oldTenNamHoc = oldRows[0].ten_nam_hoc;
            // Kiểm tra ràng buộc: đã có học sinh nào thuộc năm học này chưa
            const [rows] = await conn.query(`
                SELECT COUNT(*) AS so_luong
                FROM hoc_sinh_lop_hoc hslh
                JOIN lop_hoc lh ON hslh.lop_hoc_id = lh.lop_hoc_id
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                WHERE hk.nam_hoc_id = ?
            `, [id]);

            if (rows[0].so_luong > 0) {
                return {
                    success: false,
                    message: 'Không thể sửa tên năm học vì đã có học sinh trong các lớp thuộc năm học này',
                    messageType: 'error'
                };
            }
            // Kiểm tra cùng tên năm học và cùng trường => Lỗi
            const [existRows] = await conn.query(
                'SELECT 1 FROM nam_hoc WHERE ten_nam_hoc = ? AND truong_hoc_id = ? AND nam_hoc_id != ?',
                [ten_nam_hoc, truong_hoc_id, id]
            );
            if (existRows.length > 0) {
                return {
                    success: false,
                    message: 'Tên năm học đã tồn tại trong trường này',
                    messageType: 'error'
                };
            }
            const [result] = await conn.query('UPDATE nam_hoc SET ten_nam_hoc = ?, truong_hoc_id = ? WHERE nam_hoc_id = ?', [ten_nam_hoc, truong_hoc_id, id]);
            await conn.commit();
            try {
                if (fs.existsSync(oldPath)) {
                    fs.renameSync(oldPath, newPath);
                } else {
                    // Nếu thư mục cũ không tồn tại thì tạo mới thư mục mới
                    fs.mkdirSync(newPath, { recursive: true });
                }
            } catch (fsError) {
                console.error('Lỗi khi đổi tên thư mục:', fsError);
                return {
                    success: false,
                    message: 'Sửa năm học thành công nhưng lỗi khi đổi tên thư mục',
                    messageType: 'error'
                };
            }
            return { success: true, message: 'Sửa năm học thành công', messageType: 'success' };
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi sửa năm học:', error);
            return { success: false, message: 'Sửa năm học thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async timNamHocTheoTen(tim_kiem) {
        if (!tim_kiem) {
            return { success: false, message: 'Vui lòng nhập tên năm học', messageType: 'error' };
        }
        const conn = await pool.getConnection();
        try {
            // Kiểm tra định dạng tim_kiem là 4 chữ số (năm)
            const yearPattern = /^\d{4}$/;
            if (!yearPattern.test(tim_kiem)) {
                return { success: false, message: 'Vui lòng nhập năm hợp lệ (4 chữ số, ví dụ: 2026)', messageType: 'error' };
            }

            // Tìm các năm học có phần năm bắt đầu hoặc kết thúc khớp với tim_kiem
            const [result] = await conn.query(
                'SELECT * FROM nam_hoc WHERE ten_nam_hoc LIKE ? OR ten_nam_hoc LIKE ?',
                [`${tim_kiem}-%`, `%-${tim_kiem}`]
            );

            if (result.length === 0) {
                return { success: false, message: 'Không tìm thấy năm học nào', messageType: 'warning' };
            }
            return { success: true, message: 'Tìm năm học thành công', messageType: 'success' };
        } catch (error) {
            console.error('Lỗi khi tìm năm học theo tên:', error);
            return { success: false, message: 'Tìm năm học thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
}
module.exports = NamHocModel;