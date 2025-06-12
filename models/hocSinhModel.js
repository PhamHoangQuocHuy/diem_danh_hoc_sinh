const pool = require('../config/connect_database');
class HocSinhModel {
    static async layDanhSachHocSinh() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM hoc_sinh`);
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
    static async layDanhSachPhuHuynh() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM phu_huynh JOIN tai_khoan ON phu_huynh.tai_khoan_id = tai_khoan.tai_khoan_id`);
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
    static async layDanhSachLopHoc_HocKy() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM lop_hoc
            JOIN hoc_ky ON lop_hoc.hoc_ky_id = hoc_ky.hoc_ky_id`);
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
    static async themThongTinHocSinh(hocSinh) {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        try {
            const {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids = [],
                lop_hoc_ids = [],
                moi_quan_he = '',
                duong_dan_anh = []
            } = hocSinh
            // 1. Kiểm tra dữ liệu bắt buộc
            if (!ho_ten || !ngay_sinh || gioi_tinh === undefined || !dia_chi || !loai_hoc_sinh) {
                return { success: false, message: 'Vui lòng nhỏ dữ liệu bắt buộc', messageType: 'error' };
            }
            // 2. Kiểm tra định dạng ảnh 
            if (!Array.isArray(duong_dan_anh) && duong_dan_anh.length < 3) {
                return { success: false, message: 'Vui lòng thêm đủ 3 ảnh học sinh', messageType: 'error' };
            }
            const dinhDangAnhHopLe = duong_dan_anh.every((path) =>
                /\.(jpg|jpeg|png)$/i.test(path)
            );
            if (!dinhDangAnhHopLe) {
                return { success: false, message: 'Ảnh chỉ được có định dạng .jpg, .jpeg hoặc .png', messageType: 'error' };
            }
            // 3. Kiểm tra trùng học sinh
            const [trung] = await conn.execute(`SELECT * FROM hoc_sinh WHERE ho_ten = ? AND ngay_sinh = ?`, [ho_ten, ngay_sinh]);
            if (trung.length > 0) {
                return { success: false, message: 'Học sinh đã tồn tại', messageType: 'error' };
            }
            // 4. Kiểm tra phụ huynh tồn tại
            if (phu_huynh_ids.length > 0) {
                const [kqPhuHuynh] = await conn.query(`SELECT COUNT(*) AS total FROM phu_huynh WHERE phu_huynh_id IN (?)`, [phu_huynh_ids]);
                if (kqPhuHuynh[0].total !== phu_huynh_ids.length) {
                    return { success: false, message: 'Một hoặc nhiều phụ huynh không tồn tại', messageType: 'error' }
                }
            }
            // 5. Kiểm tra lớp học tồn tại
            if (lop_hoc_ids.length > 0) {
                const [kqLop] = await conn.query(`SELECT COUNT(*) AS total FROM lop_hoc WHERE lop_hoc_id IN (?)`, [lop_hoc_ids]);
                if (kqLop[0].total !== lop_hoc_ids.length) {
                    return { success: false, message: 'Một hoặc nhiều lớp học không tồn tại', messageType: 'error' }
                }
            }
            // 6. Bắt đầu transaction
            await conn.beginTransaction();
            // 7. Thêm học sinh (học sinh)
            const [result] = await conn.execute(`
                INSERT INTO hoc_sinh (ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh)
                VALUES (?, ?, ?, ?, ?)
            `, [ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh]);
            const hoc_sinh_id = result.insertId;
            // 8. Thêm ảnh học sinh (học sinh - hình ảnh học sinh)
            for (const duong_dan of duong_dan_anh) {
                await conn.execute(`
                    INSERT INTO hinh_anh_hoc_sinh (hoc_sinh_id, duong_dan_anh)
                    VALUES (?, ?)
                `, [hoc_sinh_id, duong_dan]);
            }
            // 9. Thêm mối quan hệ (học sinh - phụ huynh)
            for (let i = 0; i < phu_huynh_ids.length; i++) {
                const ph_id = phu_huynh_ids[i];
                const quan_he = moi_quan_he[i] || 'Không rõ';
                await conn.execute(`
                    INSERT INTO phu_huynh_hoc_sinh (hoc_sinh_id, phu_huynh_id, moi_quan_he)
                    VALUES (?, ?, ?)
                `, [hoc_sinh_id, ph_id, quan_he]);
            }
            // 10. Thêm vào lớp học (học sinh - lớp học)
            for(let i = 0; i < lop_hoc_ids.length; i++) {
                const lop_id = lop_hoc_ids[i];
                await conn.execute(`
                    INSERT INTO hoc_sinh_lop_hoc (hoc_sinh_id, lop_hoc_id)
                    VALUES (?, ?)
                `, [hoc_sinh_id, lop_id]);
            }
            // 11. Commit
            await conn.commit();
            return { success: true, message: 'Them hoc sinh thanh cong', messageType: 'success' };
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi thêm học sinh: ', error);
            return { success: false, message: 'Them hoc sinh that bai', messageType: 'error' };
        }
        finally {
            conn.release();
        }
    }
}
module.exports = HocSinhModel;