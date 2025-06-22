const path = require('path');
const pool = require('../config/connect_database');
const fs = require('fs');
class LopHocModel {
    static async layDanhSachLopHoc() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT lh.*, hk.ten_hoc_ky, nh.ten_nam_hoc, nh.nam_hoc_id
            FROM lop_hoc lh
            JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
            WHERE lh.daXoa = 0`);
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
    static async layDanhSachGiaoVien() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT giao_vien.giao_vien_id, tai_khoan.ho_ten 
                FROM giao_vien JOIN tai_khoan 
                ON giao_vien.tai_khoan_id = tai_khoan.tai_khoan_id
                WHERE tai_khoan.daXoa = 0`);
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
    static async layDanhSachHocKy() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query('SELECT * FROM hoc_ky WHERE daXoa = 0');
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
    static async layDanhSachNamHoc() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query('SELECT * FROM nam_hoc JOIN hoc_ky ON nam_hoc.nam_hoc_id = hoc_ky.nam_hoc_id WHERE nam_hoc.daXoa = 0');
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
    static async layThongTinHocSinh() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query('SELECT * FROM hoc_sinh WHERE daXoa = 0');
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
    static async themThongTinLopHoc(lopHoc) {
        const { ten_lop, giao_vien_id, hoc_ky_ids } = lopHoc;
        let conn;
        try {
            if (!ten_lop || !giao_vien_id || !hoc_ky_ids || hoc_ky_ids.length === 0) {
                throw new Error('Thiếu thông tin bắt buộc: tên lớp, giáo viên, hoặc học kỳ');
            }

            conn = await pool.getConnection();
            await conn.beginTransaction();

            // 1. Kiểm tra giáo viên tồn tại
            const [gvCheck] = await conn.query('SELECT 1 FROM giao_vien WHERE giao_vien_id = ?', [giao_vien_id]);
            if (gvCheck.length === 0) {
                throw new Error('Giáo viên không tồn tại');
            }

            // 2. Lấy nam_hoc_id và ten_nam_hoc từ học_ky đầu tiên
            const [hkNamHoc] = await conn.query(`
            SELECT hk.nam_hoc_id, nh.ten_nam_hoc
            FROM hoc_ky hk
            JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
            WHERE hk.hoc_ky_id = ?
        `, [hoc_ky_ids[0]]);

            if (hkNamHoc.length === 0) {
                throw new Error(`Học kỳ ID ${hoc_ky_ids[0]} không tồn tại`);
            }

            const { nam_hoc_id, ten_nam_hoc } = hkNamHoc[0];

            // 3. Kiểm tra giáo viên đã chủ nhiệm lớp nào khác trong cùng năm học chưa
            const [lopDangChuNhiem] = await conn.query(`
                SELECT lh.lop_hoc_id, lh.ten_lop, hk.ten_hoc_ky, nh.ten_nam_hoc
                FROM lop_hoc lh
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE lh.giao_vien_id = ? 
                AND nh.nam_hoc_id = ?
            `, [giao_vien_id, nam_hoc_id]);

            if (lopDangChuNhiem.length > 0) {
                await conn.rollback();
                return {
                    success: false,
                    message: `Giáo viên này đã chủ nhiệm lớp (${lopDangChuNhiem[0].ten_lop}) trong năm học ${ten_nam_hoc} (${lopDangChuNhiem.map(r => r.ten_hoc_ky).join(', ')})`,
                    messageType: 'error'
                };
            }


            // 4. Kiểm tra trùng lớp trong mỗi học kỳ
            for (const hoc_ky_id of hoc_ky_ids) {
                const [hkCheck] = await conn.query(`
                SELECT hk.hoc_ky_id, hk.nam_hoc_id, nh.ten_nam_hoc 
                FROM hoc_ky hk 
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE hk.hoc_ky_id = ?
            `, [hoc_ky_id]);

                if (hkCheck.length === 0) {
                    throw new Error(`Học kỳ ID ${hoc_ky_id} không tồn tại`);
                }

                const { nam_hoc_id: nhId, ten_nam_hoc: tenNh } = hkCheck[0];

                const [checkTrungLopHoc] = await conn.query(`
                SELECT 1 
                FROM lop_hoc lh 
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id 
                WHERE lh.ten_lop = ? AND lh.hoc_ky_id = ? AND hk.nam_hoc_id = ?
            `, [ten_lop, hoc_ky_id, nhId]);

                if (checkTrungLopHoc.length > 0) {
                    await conn.rollback();
                    return {
                        success: false,
                        message: `Lớp ${ten_lop} đã tồn tại`,
                        messageType: 'error'
                    };
                }
            }

            // 5. Chèn lớp học cho từng học kỳ
            for (const hoc_ky_id of hoc_ky_ids) {
                await conn.query(
                    `INSERT INTO lop_hoc (ten_lop, giao_vien_id, hoc_ky_id) VALUES (?, ?, ?)`,
                    [ten_lop, giao_vien_id, hoc_ky_id]
                );
            }

            await conn.commit();
            return { success: true, message: 'Thêm lớp học thành công', messageType: 'success' };
        } catch (error) {
            if (conn) await conn.rollback();
            console.error('Lỗi khi thêm lớp học: ', error);
            return { success: false, message: `Lỗi khi thêm lớp học: ${error.message}`, messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async xoaThongTinLopHoc(id) {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            const [checkRows] = await conn.query(`SELECT 1 FROM hoc_sinh_lop_hoc WHERE lop_hoc_id = ?`, [id]);
            if (checkRows.length > 0) {
                await conn.rollback();
                return { success: false, message: 'Không thể xóa lớp học do đang có học sinh', messageType: 'error' };
            }

            const [result] = await conn.query(`UPDATE lop_hoc SET daXoa=1 WHERE lop_hoc_id = ?`, [id]);
            await conn.commit();
            return { success: true, message: 'Xóa lớp học thành công', messageType: 'success' };
        }
        catch (error) {
            if (conn) await conn.rollback();
            console.log('Lỗi khi xóa lớp học: ', error);
            return { success: false, message: 'Xóa lớp học thất bại', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async suaThongTinLopHoc(id, lopHoc) {
        const { ten_lop, giao_vien_id } = lopHoc;
        let conn;
        try {
            // Kiểm tra thông tin bắt buộc
            if (!ten_lop || !giao_vien_id) {
                throw new Error('Thiếu thông tin bắt buộc: tên lớp hoặc giáo viên');
            }

            conn = await pool.getConnection();
            await conn.beginTransaction();

            // Kiểm tra giáo viên tồn tại
            const [gvCheck] = await conn.query('SELECT 1 FROM giao_vien WHERE giao_vien_id = ?', [giao_vien_id]);
            if (gvCheck.length === 0) {
                throw new Error('Giáo viên không tồn tại');
            }

            // Lấy học kỳ và năm học hiện tại của lớp học
            const [lopHocHienTai] = await conn.query(`
            SELECT lh.hoc_ky_id, hk.ten_hoc_ky, nh.nam_hoc_id, nh.ten_nam_hoc
            FROM lop_hoc lh
            JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
            WHERE lh.lop_hoc_id = ?
        `, [id]);

            if (lopHocHienTai.length === 0) {
                throw new Error('Lớp học không tồn tại');
            }

            const { hoc_ky_id, ten_hoc_ky, nam_hoc_id, ten_nam_hoc } = lopHocHienTai[0];

            // Ràng buộc 1: Kiểm tra nếu giáo viên đã chủ nhiệm lớp khác trong cùng năm học (trừ lớp hiện tại)
            const [lopDangChuNhiem] = await conn.query(`
                SELECT lh.lop_hoc_id, lh.ten_lop, hk.ten_hoc_ky, nh.ten_nam_hoc
                FROM lop_hoc lh
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE lh.giao_vien_id = ?
                AND nh.nam_hoc_id = ?
                AND lh.ten_lop != ?
            `, [giao_vien_id, nam_hoc_id, ten_lop]);
            // Ràng buộc không trùng giáo viên không đổi lại được
            // const [lopDangChuNhiem] = await conn.query(`
            //     SELECT lh.lop_hoc_id
            //     FROM lop_hoc lh
            //     JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            //     JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
            //     WHERE lh.giao_vien_id = ?
            //     AND nh.nam_hoc_id = ?
            //     AND lh.lop_hoc_id != ?
            // `, [giao_vien_id, nam_hoc_id, id]);


            if (lopDangChuNhiem.length > 0) {
                await conn.rollback();
                return {
                    success: false,
                    message: `Giáo viên này đã chủ nhiệm lớp (${lopDangChuNhiem[0].ten_lop}) trong năm học ${ten_nam_hoc} (${lopDangChuNhiem.map(r => r.ten_hoc_ky).join(', ')})`,
                    messageType: 'error'
                };
            }

            // Ràng buộc 2: Kiểm tra trùng tên lớp trong cùng học kỳ và năm học (trừ lớp hiện tại)
            const [checkTrungLopHoc] = await conn.query(`
            SELECT lh.lop_hoc_id
            FROM lop_hoc lh
            JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            WHERE lh.ten_lop = ? 
              AND hk.ten_hoc_ky = ? 
              AND hk.nam_hoc_id = ? 
              AND lh.lop_hoc_id != ?
        `, [ten_lop, ten_hoc_ky, nam_hoc_id, id]);

            if (checkTrungLopHoc.length > 0) {
                await conn.rollback();
                return {
                    success: false,
                    message: `Lớp '${ten_lop}' đã tồn tại`,
                    messageType: 'error'
                };
            }

            // Cập nhật thông tin lớp học
            await conn.query(
                'UPDATE lop_hoc SET ten_lop = ?, giao_vien_id = ? WHERE lop_hoc_id = ?',
                [ten_lop, giao_vien_id, id]
            );

            await conn.commit();
            return { success: true, message: 'Sửa lớp học thành công', messageType: 'success' };
        } catch (error) {
            if (conn) await conn.rollback();
            console.error('Lỗi khi sửa lớp học: ', error);
            return { success: false, message: `Sửa lớp học thất bại: ${error.message}`, messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async timThongTinLopHoc(tim_kiem) {
        try {
            if (!tim_kiem || tim_kiem.trim() === '') {
                return { success: false, message: 'Vui lòng nhập tìm kiếm', messageType: 'error' };
            }
            const conn = await pool.getConnection();
            const [rows] = await conn.query(`
            SELECT * FROM lop_hoc 
            JOIN giao_vien ON lop_hoc.giao_vien_id = giao_vien.giao_vien_id
            JOIN tai_khoan ON giao_vien.tai_khoan_id = tai_khoan.tai_khoan_id
            WHERE ten_lop LIKE ? OR ho_ten LIKE ?
        `, [`%${tim_kiem}%`, `%${tim_kiem}%`]);
            return rows;
        } catch (error) {
            console.error('Lỗi khi tìm kiếm lớp học: ', error);
            return { success: false, message: `Tìm kiếm lớp học thất bại: ${error.message}`, messageType: 'error' };
        }
    }
    static async themTheoDanhSach(hocSinhIds, lopHocId) {
        if (!hocSinhIds || hocSinhIds.length === 0) {
            return {
                success: false,
                message: 'Vui lòng chọn học sinh',
                messageType: 'error'
            };
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Lấy thông tin lớp hiện tại: ten_lop, hoc_ky_id, nam_hoc_id
            const [[lopHienTai]] = await conn.query(`
            SELECT lh.ten_lop, hk.hoc_ky_id, nh.nam_hoc_id
            FROM lop_hoc lh
            JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
            WHERE lh.lop_hoc_id = ?
            LIMIT 1
        `, [lopHocId]);

            if (!lopHienTai) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không tìm thấy lớp học',
                    messageType: 'error'
                };
            }

            const { ten_lop, hoc_ky_id, nam_hoc_id } = lopHienTai;

            // 2. Duyệt qua từng học sinh
            for (const hocSinhId of hocSinhIds) {
                // 2.1. Kiểm tra học sinh đã tồn tại trong lớp hiện tại chưa
                const [trungLopHienTai] = await conn.query(`
                SELECT * FROM hoc_sinh_lop_hoc
                WHERE lop_hoc_id = ? AND hoc_sinh_id = ?
            `, [lopHocId, hocSinhId]);

                if (trungLopHienTai.length > 0) {
                    await conn.rollback();
                    return {
                        success: false,
                        message: `Học sinh ${hocSinhId} đã tồn tại trong lớp học hiện tại`,
                        messageType: 'error'
                    };
                }

                // 2.2. Kiểm tra nếu học sinh đã học lớp KHÁC tên trong cùng học kỳ và năm học → lỗi
                const [trungKhacTenLop] = await conn.query(`
                SELECT lh.ten_lop
                FROM hoc_sinh_lop_hoc hslh
                JOIN lop_hoc lh ON hslh.lop_hoc_id = lh.lop_hoc_id
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE hslh.hoc_sinh_id = ? 
                AND hk.hoc_ky_id = ? 
                AND nh.nam_hoc_id = ? 
                AND lh.ten_lop != ?
            `, [hocSinhId, hoc_ky_id, nam_hoc_id, ten_lop]);

                if (trungKhacTenLop.length > 0) {
                    await conn.rollback();
                    return {
                        success: false,
                        message: `Học sinh ${hocSinhId} đã học lớp "${trungKhacTenLop[0].ten_lop}" trong học kỳ này`,
                        messageType: 'error'
                    };
                }

                // 2.3. Thêm vào lớp học
                await conn.query(`
                INSERT INTO hoc_sinh_lop_hoc (lop_hoc_id, hoc_sinh_id)
                VALUES (?, ?)
            `, [lopHocId, hocSinhId]);
            }

            await conn.commit();
            return {
                success: true,
                message: `Thêm học sinh vào lớp học thành công`,
                messageType: 'success'
            };
        } catch (error) {
            await conn.rollback();
            console.error(error);
            return {
                success: false,
                message: `Thêm học sinh vào lớp học thất bại: ${error.message}`,
                messageType: 'error'
            };
        } finally {
            if (conn) conn.release();
        }
    }
    static async themHangLoatTuExcel(hocSinhList, lopHocId) {
        const conn = await pool.getConnection();
        const danhSachLoi = [];
        try {
            await conn.beginTransaction();

            // 1. Lấy thông tin lớp hiện tại: ten_lop, hoc_ky_id, nam_hoc_id
            const [[lopHienTai]] = await conn.query(`
            SELECT lh.ten_lop, hk.hoc_ky_id, nh.nam_hoc_id
            FROM lop_hoc lh
            JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
            JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
            WHERE lh.lop_hoc_id = ?
            LIMIT 1
        `, [lopHocId]);

            if (!lopHienTai) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không tìm thấy lớp học',
                    messageType: 'error'
                };
            }

            const { ten_lop, hoc_ky_id, nam_hoc_id } = lopHienTai;

            for (let i = 0; i < hocSinhList.length; i++) {
                const hs = hocSinhList[i];
                const rowNum = i + 2;
                const hocSinhId = hs['Học sinh id'];

                if (!hocSinhId) {
                    danhSachLoi.push({ dong: rowNum, loi: 'Thiếu học sinh id' });
                    continue;
                }

                // 1. Kiểm tra đã tồn tại trong chính lớp đó chưa
                const [trungLopHienTai] = await conn.query(`
                SELECT * FROM hoc_sinh_lop_hoc
                WHERE lop_hoc_id = ? AND hoc_sinh_id = ?
            `, [lopHocId, hocSinhId]);

                if (trungLopHienTai.length > 0) {
                    danhSachLoi.push({
                        dong: rowNum,
                        loi: `Học sinh ${hocSinhId} đã tồn tại trong lớp học hiện tại`
                    });
                    continue;
                }

                // 2. Kiểm tra: Cùng năm học + cùng học kỳ + KHÁC tên lớp => lỗi
                const [trungKhacTenLop] = await conn.query(`
                SELECT lh.ten_lop
                FROM hoc_sinh_lop_hoc hslh
                JOIN lop_hoc lh ON hslh.lop_hoc_id = lh.lop_hoc_id
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE hslh.hoc_sinh_id = ? 
                AND hk.hoc_ky_id = ? 
                AND nh.nam_hoc_id = ? 
                AND lh.ten_lop != ?
            `, [hocSinhId, hoc_ky_id, nam_hoc_id, ten_lop]);

                if (trungKhacTenLop.length > 0) {
                    danhSachLoi.push({
                        dong: rowNum,
                        loi: `Học sinh ${hocSinhId} đã học lớp "${trungKhacTenLop[0].ten_lop}" trong học kỳ này`
                    });
                    continue;
                }
            }

            if (danhSachLoi.length > 0) {
                await conn.rollback();
                const messageLoi = danhSachLoi.map(err => `Dòng ${err.dong}: ${err.loi}`).join('\n');
                return {
                    success: false,
                    message: messageLoi,
                    messageType: 'error'
                };
            }

            // 3. Thêm học sinh
            for (let i = 0; i < hocSinhList.length; i++) {
                const hs = hocSinhList[i];
                const hocSinhId = hs['Học sinh id'];
                await conn.query(`
                INSERT INTO hoc_sinh_lop_hoc (lop_hoc_id, hoc_sinh_id)
                VALUES (?, ?)
            `, [lopHocId, hocSinhId]);
            }

            await conn.commit();
            return {
                success: true,
                message: `Đã thêm ${hocSinhList.length} học sinh vào lớp học`,
                messageType: 'success'
            };
        } catch (error) {
            await conn.rollback();
            console.error(error);
            return {
                success: false,
                message: `Thêm học sinh vào lớp học thất bại: ${error.message}`,
                messageType: 'error'
            };
        } finally {
            if (conn) conn.release();
        }
    }
    static async capNhatDuongDanAnhTheoNamHoc(lopHocId, hocSinhIds) {
        const conn = await pool.getConnection();
        try {
            // 1. Lấy ten_nam_hoc từ lop_hoc_id
            const [rows] = await conn.query(`
                SELECT nh.ten_nam_hoc FROM lop_hoc lh
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE lh.lop_hoc_id = ? 
                `, [lopHocId]);
            if (rows.length === 0) {
                throw new Error(`Lớp học ID ${lopHocId} khôn tồn tại`);
            }
            const tenNamHoc = rows[0].ten_nam_hoc;
            const thuMucMoi = path.join('public', 'images', tenNamHoc);
            // 2. Tạo năm học nếu chưa tồn tại
            if (!fs.existsSync(thuMucMoi)) {
                fs.mkdirSync(thuMucMoi, { recursive: true });
            }
            for (const hocSinhId of hocSinhIds) {
                const [anhRows] = await conn.query(`
                    SELECT hinh_anh_hoc_sinh_id, duong_dan_anh FROM hinh_anh_hoc_sinh
                    WHERE hoc_sinh_id = ?
                    `, [hocSinhId]);
                for (const anh of anhRows) {
                    const tenAnh = path.basename(anh.duong_dan_anh);
                    const duongDanCu = path.join('public', anh.duong_dan_anh);
                    const duongDanMoi = path.join('public', 'images', tenNamHoc, tenAnh);
                    //console.log(`→ Di chuyển từ: ${duongDanCu}`);

                    // 3. Di chuyển ảnh
                    if (fs.existsSync(duongDanCu)) {
                        fs.copyFileSync(duongDanCu, duongDanMoi);
                        //console.log(`✓ Di chuyển tới: ${duongDanMoi}`);
                    }
                    // else {
                    //     console.warn(`✗ File không tồn tại để di chuyển: ${duongDanCu}`);
                    // }
                    // 4. Cập nhật lại đường dẫn trong DB
                    const duongDanAnhMoi = `images/${tenNamHoc}/${tenAnh}`;
                    await conn.query(`
                        UPDATE hinh_anh_hoc_sinh
                        SET duong_dan_anh = ?
                        WHERE hinh_anh_hoc_sinh_id = ?
                        `, [duongDanAnhMoi, anh.hinh_anh_hoc_sinh_id]);
                }
            }
        }
        catch (error) {
            console.log(error);
        }
        finally {
            if (conn) conn.release();
        }
    }

}
module.exports = LopHocModel