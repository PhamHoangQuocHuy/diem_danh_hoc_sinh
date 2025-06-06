const pool = require('../config/connect_database');
const bcrypt = require('bcrypt');
const saltRounds = 10;
class TaiKhoanModel {
    static async kiemTraEmail(email) {
        const query = 'SELECT * FROM tai_khoan WHERE email = ?';
        const [rows] = await pool.execute(query, [email]);
        return rows.length > 0; // Trả về true nếu email đã tồn tại
    }
    static async kiemTraSoDienThoai(sdt) {
        const query = 'SELECT * FROM tai_khoan WHERE sdt = ?';
        const [rows] = await pool.execute(query, [sdt]);
        return rows.length > 0; // Trả về true nếu số điện thoại đã tồn tại
    }
    static async kiemTraSoCMND(so_cmnd) {
        const query = 'SELECT * FROM tai_khoan WHERE so_cmnd = ?';
        const [rows] = await pool.execute(query, [so_cmnd]);
        return rows.length > 0; // Trả về true nếu CMND đã tồn tại
    }
    static async themTaiKhoan(taiKhoan) {
        const {
            ho_ten,
            ngaysinh,
            gioi_tinh,
            so_cmnd,
            dia_chi,
            email,
            sdt,
            mat_khau,
            ten_vai_tro,
            loai_bang_cap = [],
        } = taiKhoan;
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            // Mã hóa mật khẩu
            const hashedPassword = await bcrypt.hash(mat_khau, saltRounds);
            const query = 'INSERT INTO tai_khoan (ho_ten,ngaysinh,gioi_tinh,so_cmnd,dia_chi,email,sdt,mat_khau,ten_vai_tro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const [result] = await conn.execute(query, [
                ho_ten,
                ngaysinh,
                gioi_tinh,
                so_cmnd,
                dia_chi,
                email,
                sdt,
                hashedPassword,
                ten_vai_tro,
            ]);
            const taiKhoanId = result.insertId;
            if (ten_vai_tro === 'Giáo viên') {
                const queryGiaoVien = 'INSERT INTO giao_vien (tai_khoan_id) VALUES (?)';
                const [gvResult] = await conn.execute(queryGiaoVien, [taiKhoanId]);
                const giaoVienId = gvResult.insertId;

                // Thêm từng bang_cap cho giao_vien
                const queryBangCap = 'INSERT INTO bang_cap (loai_bang_cap, giao_vien_id) VALUES (?, ?)';
                for (const bangCap of loai_bang_cap) {
                    await conn.execute(queryBangCap, [bangCap, giaoVienId]);
                }
            } else if (ten_vai_tro === 'Phụ huynh') {
                const queryPhuHuynh = 'INSERT INTO phu_huynh (tai_khoan_id) VALUES (?)';
                await conn.execute(queryPhuHuynh, [taiKhoanId]);
            }
            await conn.commit();
            return { success: true, message: 'Thêm tài khoản thành công', messageType: 'success' };
        }
        catch (error) {
            await conn.rollback();
            console.error('Lỗi khi thêm tài khoản:', error);
            return { success: false, message: 'Đã xảy ra lỗi khi thêm tài khoản', messageType: 'error' };
        }
        finally {
            conn.release();
        }
    }
    static async hienThiTaiKhoan() {
        const query = 'SELECT * FROM tai_khoan';
        const [rows] = await pool.execute(query);
        return rows; // Trả về danh sách tài khoản
    }
    static async xoaTaiKhoan(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Kiểm tra nếu là giáo viên và đang chủ nhiệm lớp
            const [rowsGiaoVien] = await conn.execute('SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?', [id]);
            if (rowsGiaoVien.length > 0) {
                const giaoVienId = rowsGiaoVien[0].giao_vien_id;
                const [rowsLopHoc] = await conn.execute('SELECT * FROM lop_hoc WHERE giao_vien_id = ?', [giaoVienId]);
                if (rowsLopHoc.length > 0) {
                    await conn.rollback();
                    return { success: false, message: 'Giáo viên đang chủ nhiệm lớp không thể xóa', messageType: 'error' };
                }
            }

            // 2. Kiểm tra nếu là phụ huynh và có con đang học
            const [rowsPhuHuynh] = await conn.execute('SELECT phu_huynh_id FROM phu_huynh WHERE tai_khoan_id = ?', [id]);
            if (rowsPhuHuynh.length > 0) {
                const phuHuynhId = rowsPhuHuynh[0].phu_huynh_id;
                const [rowsCon] = await conn.execute('SELECT * FROM phu_huynh_hoc_sinh WHERE phu_huynh_id = ?', [phuHuynhId]);
                if (rowsCon.length > 0) {
                    await conn.rollback();
                    return { success: false, message: 'Phụ huynh có con đang học', messageType: 'error' };
                }
            }

            // 3. Kiểm tra không cho xóa tài khoản Admin
            const [rowsAdmin] = await conn.execute('SELECT ten_vai_tro FROM tai_khoan WHERE tai_khoan_id = ?', [id]);
            if (rowsAdmin.length > 0 && rowsAdmin[0].ten_vai_tro === 'Admin') {
                await conn.rollback();
                return { success: false, message: 'Không thể xóa tài khoản quản trị viên', messageType: 'error' };
            }

            // 4. Xóa các bảng liên quan
            await conn.execute('DELETE FROM giao_vien WHERE tai_khoan_id = ?', [id]);
            await conn.execute('DELETE FROM phu_huynh WHERE tai_khoan_id = ?', [id]);

            // 5. Xóa tài khoản chính
            await conn.execute('DELETE FROM tai_khoan WHERE tai_khoan_id = ?', [id]);

            await conn.commit();
            return { success: true, message: 'Xóa tài khoản thành công', messageType: 'success' };

        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi xóa tài khoản:', error);
            return { success: false, message: 'Đã xảy ra lỗi khi xóa tài khoản' };
        } finally {
            conn.release();
        }
    }
    static async suaTaiKhoan(id, taiKhoan) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const sql = `
            UPDATE tai_khoan
            SET ho_ten = ?, ngaysinh = ?, gioi_tinh = ?, so_cmnd = ?, dia_chi = ?, email = ?, sdt = ?
            WHERE tai_khoan_id = ?
            `
            await conn.query(sql, [
                taiKhoan.ho_ten,
                taiKhoan.ngaysinh,
                taiKhoan.gioi_tinh,
                taiKhoan.so_cmnd,
                taiKhoan.dia_chi,
                taiKhoan.email,
                taiKhoan.sdt,
                id
            ]);
            // Cập nhật bảng giao_vien nếu là giáo viên
            if (taiKhoan.ten_vai_tro === 'Giáo viên') {
                const [rows] = await conn.query('SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?', [id]);
                if (rows.length > 0) {
                    const giaoVienId = rows[0].giao_vien_id;
                    // Lấy danh sách bằng cấp cũ từ DB
                    const [oldRows] = await conn.query('SELECT loai_bang_cap FROM bang_cap WHERE giao_vien_id = ?', [giaoVienId]);
                    const oldBangCaps = oldRows.map(row => row.loai_bang_cap);

                    // Lấy danh sách bằng cấp mới từ form
                    const newBangCaps = Array.isArray(taiKhoan.loai_bang_cap)
                        ? taiKhoan.loai_bang_cap
                        : (taiKhoan.loai_bang_cap ? [taiKhoan.loai_bang_cap] : []);

                    // Tìm bằng cấp cần thêm
                    const toAdd = newBangCaps.filter(cap => !oldBangCaps.includes(cap));
                    // Tìm bằng cấp cần xoá
                    const toDelete = oldBangCaps.filter(cap => !newBangCaps.includes(cap));
                    // Thêm mới
                    for (const cap of toAdd) {
                        await conn.query('INSERT INTO bang_cap (loai_bang_cap, giao_vien_id) VALUES (?, ?)', [cap, giaoVienId]);
                    }
                    // Xoá
                    for (const cap of toDelete) {
                        await conn.query('DELETE FROM bang_cap WHERE giao_vien_id = ? AND loai_bang_cap = ?', [giaoVienId, cap]);
                    }
                }
            }
            await conn.commit();
            return { success: true, message: 'Cập nhật tài khoản thành công', messageType: 'success' };
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi sửa tài khoản:', error);
            return { success: false, message: 'Đã xảy ra lỗi khi sửa tài khoản', messageType: 'error' };
        } finally {
            conn.release();
        }
    }
    static async timTaiKhoanTheoTen(tim_kiem) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
                SELECT * FROM tai_khoan
                WHERE ho_ten LIKE ?
                `, [`%${tim_kiem}%`])
            return rows
        }
        catch (error) {
            console.error('Lỗi khi tìm tài khoản', error)
            return []
        } finally {
            conn.release();
        }
    }
    static async layTaiKhoanTheoId(id) {
        const conn = await pool.getConnection();
        try {
            // Lấy thông tin tài khoản
            const [rows] = await conn.query(`SELECT * FROM tai_khoan WHERE tai_khoan_id = ?`, [id]);
            if (rows.length === 0) {
                return null; // không tìm thấy tài khoản
            }

            const taiKhoan = rows[0];

            // Nếu là Giáo viên thì lấy thêm bằng cấp
            if (taiKhoan.ten_vai_tro === "Giáo viên") {
                const [bangCaps] = await conn.query(`
                    SELECT * 
                    FROM bang_cap JOIN giao_vien on bang_cap.giao_vien_id = giao_vien.giao_vien_id
                    WHERE giao_vien.tai_khoan_id = ?`, [id]);
                taiKhoan.bang_cap = bangCaps; // thêm thuộc tính bang_cap vào đối tượng tài khoản
            }

            return taiKhoan;

        } catch (error) {
            console.error('Lỗi lấy tài khoản theo ID:', error);
            return null;
        } finally {
            conn.release();
        }
    }
}
module.exports = TaiKhoanModel;