const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');
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
            anh_dai_dien,
            ten_vai_tro,
            loai_bang_cap = [],
        } = taiKhoan;
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            // Mã hóa mật khẩu
            const hashedPassword = await bcrypt.hash(mat_khau, saltRounds);
            const query = 'INSERT INTO tai_khoan (ho_ten,ngaysinh,gioi_tinh,so_cmnd,dia_chi,email,sdt,mat_khau,anh_dai_dien,ten_vai_tro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)';
            const [result] = await conn.execute(query, [
                ho_ten,
                ngaysinh,
                gioi_tinh,
                so_cmnd,
                dia_chi,
                email,
                sdt,
                hashedPassword,
                anh_dai_dien,
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
            return { success: true, insertId: result.insertId, message: 'Thêm tài khoản thành công', messageType: 'success' };
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
    static async hienThiTaiKhoan(limit, offset) {
        if (limit === undefined || offset === undefined) {
            // Nếu không có phân trang, trả về tất cả bản ghi
            const [rows] = await pool.query('SELECT * FROM tai_khoan');
            return rows;
        }

        // Thực hiện truy vấn SQL với LIMIT và OFFSET
        const [rows] = await pool.query('SELECT * FROM tai_khoan LIMIT ? OFFSET ?', [limit, offset]);
        return rows;
    }
    static async demTongTaiKhoan() {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM tai_khoan');
        return rows[0].total;
    }
    static async xoaTaiKhoan(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Lấy vai trò và ảnh đại diện của tài khoản
            const [rows] = await conn.execute('SELECT ten_vai_tro, anh_dai_dien FROM tai_khoan WHERE tai_khoan_id = ?', [id]);
            if (rows.length === 0) {
                await conn.rollback();
                return { success: false, message: 'Tài khoản không tồn tại', messageType: 'error' };
            }

            const { ten_vai_tro, anh_dai_dien } = rows[0];

            // 2. Kiểm tra ràng buộc đặc biệt theo vai trò
            if (ten_vai_tro === 'Admin') {
                await conn.rollback();
                return { success: false, message: 'Không thể xóa tài khoản quản trị viên', messageType: 'error' };
            }

            if (ten_vai_tro === 'Giáo viên') {
                const [rowsGiaoVien] = await conn.execute('SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?', [id]);
                if (rowsGiaoVien.length > 0) {
                    const giaoVienId = rowsGiaoVien[0].giao_vien_id;
                    const [rowsLopHoc] = await conn.execute('SELECT 1 FROM lop_hoc WHERE giao_vien_id = ? LIMIT 1', [giaoVienId]);
                    if (rowsLopHoc.length > 0) {
                        await conn.rollback();
                        return { success: false, message: 'Giáo viên đang chủ nhiệm lớp không thể xóa', messageType: 'error' };
                    }
                }
            }

            if (ten_vai_tro === 'Phụ huynh') {
                const [rowsPhuHuynh] = await conn.execute('SELECT phu_huynh_id FROM phu_huynh WHERE tai_khoan_id = ?', [id]);
                if (rowsPhuHuynh.length > 0) {
                    const phuHuynhId = rowsPhuHuynh[0].phu_huynh_id;
                    const [rowsCon] = await conn.execute('SELECT 1 FROM phu_huynh_hoc_sinh WHERE phu_huynh_id = ? LIMIT 1', [phuHuynhId]);
                    if (rowsCon.length > 0) {
                        await conn.rollback();
                        return { success: false, message: 'Phụ huynh có con đang học không thể xóa', messageType: 'error' };
                    }
                }
            }

            if (ten_vai_tro === 'Giáo viên') {
                await conn.execute('DELETE FROM giao_vien WHERE tai_khoan_id = ?', [id]);
            }

            if (ten_vai_tro === 'Phụ huynh') {
                await conn.execute('DELETE FROM phu_huynh WHERE tai_khoan_id = ?', [id]);
            }

            // Xóa tài khoản
            await conn.execute('DELETE FROM tai_khoan WHERE tai_khoan_id = ?', [id]);

            // 4. Nếu có ảnh đại diện riêng thì xóa file
            if (anh_dai_dien && anh_dai_dien !== 'default_avatar.jpg') {
                const imagePath = path.join(__dirname, '..', 'images', anh_dai_dien);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await conn.commit();
            return { success: true, message: 'Xóa tài khoản thành công', messageType: 'success' };

        } catch (error) {
            console.error('Lỗi khi xóa tài khoản:', error);
            await conn.rollback();
            return { success: false, message: 'Lỗi khi xóa tài khoản', messageType: 'error' };
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
            SET ho_ten = ?, ngaysinh = ?, gioi_tinh = ?, so_cmnd = ?, dia_chi = ?, email = ?, sdt = ?, anh_dai_dien = ?
            WHERE tai_khoan_id = ?
        `;
            await conn.query(sql, [
                taiKhoan.ho_ten,
                taiKhoan.ngaysinh,
                taiKhoan.gioi_tinh,
                taiKhoan.so_cmnd,
                taiKhoan.dia_chi,
                taiKhoan.email,
                taiKhoan.sdt,
                taiKhoan.anh_dai_dien,
                id
            ]);

            if (taiKhoan.ten_vai_tro === 'Giáo viên') {
                const [rows] = await conn.query('SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?', [id]);
                if (rows.length > 0) {
                    const giaoVienId = rows[0].giao_vien_id;
                    const [oldRows] = await conn.query('SELECT loai_bang_cap FROM bang_cap WHERE giao_vien_id = ?', [giaoVienId]);
                    const oldBangCaps = oldRows.map(row => row.loai_bang_cap);

                    const newBangCaps = Array.isArray(taiKhoan.loai_bang_cap)
                        ? taiKhoan.loai_bang_cap
                        : (taiKhoan.loai_bang_cap ? [taiKhoan.loai_bang_cap] : []);

                    const toAdd = newBangCaps.filter(cap => !oldBangCaps.includes(cap));
                    const toDelete = oldBangCaps.filter(cap => !newBangCaps.includes(cap));

                    for (const cap of toAdd) {
                        await conn.query('INSERT INTO bang_cap (loai_bang_cap, giao_vien_id) VALUES (?, ?)', [cap, giaoVienId]);
                    }
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
    static async layTaiKhoanTheoVaiTro(ten_vai_tro) {
        let query = `SELECT * FROM tai_khoan`;
        const params = []
        if (ten_vai_tro) {
            query += ` WHERE ten_vai_tro = ?`;
            params.push(ten_vai_tro);
        }
        try {
            const conn = await pool.getConnection();
            const [rows] = await conn.execute(query, params);
            conn.release();
            return rows;
        }
        catch (error) {
            console.error('Lỗi khi lấy tài khoản theo vai trò: ', error);
            return []
        }
    }
    static async capNhatAnhDaiDien(taiKhoanId, tenFileAnh) {
        const sql = 'UPDATE tai_khoan SET anh_dai_dien = ? WHERE tai_khoan_id = ?';
        try {
            const [result] = await pool.execute(sql, [tenFileAnh, taiKhoanId]);

            if (result.affectedRows > 0) {
                return {
                    success: true,
                    message: 'Cập nhật ảnh đại diện thành công',
                    affectedRows: result.affectedRows
                };
            } else {
                return {
                    success: false,
                    message: 'Không tìm thấy tài khoản để cập nhật ảnh'
                };
            }
        } catch (error) {
            console.error('Lỗi cập nhật ảnh đại diện:', error);
            return {
                success: false,
                message: 'Cập nhật ảnh thất bại',
                error: error.message
            };
        }
    }
    static async themHangLoat(danhSachTaiKhoan) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const [index, taiKhoan] of danhSachTaiKhoan.entries()) {
                const {
                    ho_ten,
                    ngaysinh,
                    gioi_tinh,
                    so_cmnd,
                    dia_chi,
                    email,
                    sdt,
                    mat_khau,
                    anh_dai_dien = 'default_avatar.jpg',
                    ten_vai_tro,
                    loai_bang_cap = [],
                } = taiKhoan;

                // Kiểm tra trùng lặp trong DB
                const [emailCheck] = await conn.execute('SELECT 1 FROM tai_khoan WHERE email = ?', [email]);
                if (emailCheck.length > 0) {
                    throw new Error(`Email đã tồn tại: ${email} (dòng ${index + 2})`);
                }
                const [cmndCheck] = await conn.execute('SELECT 1 FROM tai_khoan WHERE so_cmnd = ?', [so_cmnd]);
                if (cmndCheck.length > 0) {
                    throw new Error(`CMND đã tồn tại: ${so_cmnd} (dòng ${index + 2})`);
                }
                const [sdtCheck] = await conn.execute('SELECT 1 FROM tai_khoan WHERE sdt = ?', [sdt]);
                if (sdtCheck.length > 0) {
                    throw new Error(`Số điện thoại đã tồn tại: ${sdt} (dòng ${index + 2})`);
                }
                if (ten_vai_tro === 'Giáo viên' && loai_bang_cap.length === 0) {
                    throw new Error(`Giáo viên phải có bằng cấp (dòng ${index + 2})`);
                }

                // Chèn tài khoản
                const hashedPassword = await bcrypt.hash(mat_khau.toString(), saltRounds);
                const [result] = await conn.execute(
                    `INSERT INTO tai_khoan (ho_ten, ngaysinh, gioi_tinh, so_cmnd, dia_chi, email, sdt, mat_khau, anh_dai_dien, ten_vai_tro)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [ho_ten, ngaysinh, gioi_tinh, so_cmnd, dia_chi, email, sdt, hashedPassword, anh_dai_dien, ten_vai_tro]
                );
                const taiKhoanId = result.insertId;

                // Chèn giáo viên hoặc phụ huynh
                if (ten_vai_tro === 'Giáo viên') {
                    const [gvResult] = await conn.execute('INSERT INTO giao_vien (tai_khoan_id) VALUES (?)', [taiKhoanId]);
                    const giaoVienId = gvResult.insertId;
                    for (const bangCap of loai_bang_cap) {
                        await conn.execute('INSERT INTO bang_cap (giao_vien_id, loai_bang_cap) VALUES (?, ?)', [giaoVienId, bangCap]);
                    }
                } else if (ten_vai_tro === 'Phụ huynh') {
                    await conn.execute('INSERT INTO phu_huynh (tai_khoan_id) VALUES (?)', [taiKhoanId]);
                }
            }

            await conn.commit();
            return { success: true, message: 'Thêm hàng loạt tài khoản thành công', messageType: 'success' };
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi khi thêm hàng loạt tài khoản: ', error);
            const errorDetails = {
                email: error.message.includes('Email') ? error.message.split(': ')[1].split(' (')[0] : 'Không xác định',
                loi: error.message,
                dong: parseInt(error.message.match(/dòng \d+/)?.[0]?.replace('dòng ', '') || 0),
            };
            return {
                success: false,
                message: 'Thêm hàng loạt tài khoản thất bại',
                messageType: 'error',
                errorDetails,
            };
        } finally {
            conn.release();
        }
    }
}
module.exports = TaiKhoanModel;