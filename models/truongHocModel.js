const pool = require('../config/connect_database');

class TruongHocModel {
    static async hienthiTruongHoc() {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(`SELECT * FROM truong_hoc where daXoa=0`);
        return rows;
    }
    static async themTruongHoc(truongHoc) {
        const { ten_truong, dia_chi } = truongHoc;
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [rows] = await conn.query(`INSERT INTO truong_hoc (ten_truong,dia_chi) VALUES (?,?)`, [ten_truong, dia_chi]);
            await conn.commit();
            return { success: true, message: 'Them truong hoc thanh cong', messageType: 'success' }
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi thêm trường học: ', error);
            return { success: false, message: 'Them truong hoc that bai', messageType: 'error' }
        }
        finally {
            conn.release();
        }
    }
    static async xoaTruongHoc(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            // Kiểm tra xem có năm học nào thuộc trường này không
            const tonTaiNamHoc = await conn.query(`SELECT 1 FROM nam_hoc WHERE truong_hoc_id = ? AND daXoa = 0`, [id]);
            if (tonTaiNamHoc[0].length > 0) {
                return { success: false, message: 'Không thể xóa trường học đang được sử dụng', messageType: 'error' };
            }
            const [rows] = await conn.query(`UPDATE truong_hoc SET daXoa=1 WHERE truong_hoc_id = ?`, [id]);
            await conn.commit();
            return { success: true, message: 'Xóa trường học thành công', messageType: 'success' }
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi xóa trường học: ', error);
            return { success: false, message: 'Xóa trường học thất bại', messageType: 'error' }
        }
        finally {
            conn.release();
        }
    }
    static async suaThongTinTruongHoc(id, truongHoc) {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            const sql = `UPDATE truong_hoc SET ten_truong = ?, dia_chi = ? WHERE truong_hoc_id = ?`;
            await conn.query(sql, [truongHoc.ten_truong, truongHoc.dia_chi, id]);
            const [result] = await conn.query(sql, [truongHoc.ten_truong, truongHoc.dia_chi, id]);
            await conn.commit();

            if (result.affectedRows === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy trường học để sửa',
                    messageType: 'error'
                };
            }

            return {
                success: true,
                message: 'Sửa trường học thành công',
                messageType: 'success'
            };
        } catch (error) {
            console.log('Lỗi khi sửa trường học: ', error);
            if (conn) await conn.rollback();
            return {
                success: false,
                message: 'Sửa trường học thất bại',
                messageType: 'error'
            };
        } finally {
            if (conn) conn.release();
        }
    }
    static async timTruongTheoTen(tim_kiem) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM truong_hoc WHERE ten_truong LIKE ?`, [`%${tim_kiem}%`]);
            return rows;
        } catch (error) {
            console.log('Lỗi khi tìm trường học: ', error);
            return [];
        } finally {
            conn.release();
        }
    }
}
module.exports = TruongHocModel;