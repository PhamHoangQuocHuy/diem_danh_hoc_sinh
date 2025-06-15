const pool = require('../config/connect_database');
class HocSinhModel {
    static async layDanhSachHocSinh() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM hoc_sinh where daXoa=0`);
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
            const [rows] = await conn.query(`SELECT * FROM phu_huynh 
                JOIN tai_khoan ON phu_huynh.tai_khoan_id = tai_khoan.tai_khoan_id 
                where tai_khoan.daXoa=0`);
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
        try {
            await conn.beginTransaction();

            const {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids = [],
                moi_quan_he = []
            } = hocSinh;

            // 1. Kiểm tra dữ liệu bắt buộc
            if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi || !loai_hoc_sinh) {
                return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!', messageType: 'error' };
            }
            // Kiểm tra định dạng ngày sinh
            const today = new Date();
            const dob = new Date(ngay_sinh);

            if (dob > today) {
                return { success: false, message: 'Ngày sinh không hợp lệ (trong tương lai)', messageType: 'error' };
            }
            // 2. Kiểm tra ít nhất một phụ huynh
            if (phu_huynh_ids.length === 0) {
                return { success: false, message: 'Phải chọn ít nhất một phụ huynh!', messageType: 'error' };
            }

            // Kiểm tra mối quan hệ hợp lệ
            if (phu_huynh_ids.length !== moi_quan_he.length || moi_quan_he.some(r => !['Cha', 'Mẹ', 'Người giám hộ'].includes(r))) {
                return { success: false, message: 'Mỗi phụ huynh phải có mối quan hệ hợp lệ!', messageType: 'error' };
            }

            // Kiểm tra phụ huynh tồn tại
            const [kqPhuHuynh] = await conn.query(`SELECT COUNT(*) AS total FROM phu_huynh WHERE phu_huynh_id IN (?)`, [phu_huynh_ids]);
            if (kqPhuHuynh[0].total !== phu_huynh_ids.length) {
                return { success: false, message: 'Một hoặc nhiều phụ huynh không tồn tại!', messageType: 'error' };
            }

            // 3. Kiểm tra trùng học sinh
            const [trung] = await conn.execute(`SELECT COUNT(*) AS count FROM hoc_sinh WHERE ho_ten = ? AND ngay_sinh = ?`, [ho_ten, ngay_sinh]);
            if (trung[0].count > 0) {
                return { success: false, message: 'Học sinh đã tồn tại!', messageType: 'error' };
            }

            // 4. Thêm học sinh
            const [result] = await conn.execute(`
                INSERT INTO hoc_sinh (ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh)
                VALUES (?, ?, ?, ?, ?)
            `, [ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh]);

            const hoc_sinh_id = result.insertId;

            // 5. Thêm mối quan hệ phụ huynh
            for (let i = 0; i < phu_huynh_ids.length; i++) {
                const ph_id = parseInt(phu_huynh_ids[i]);
                const quan_he = moi_quan_he[i];
                await conn.execute(`
                    INSERT INTO phu_huynh_hoc_sinh (hoc_sinh_id, phu_huynh_id, moi_quan_he)
                    VALUES (?, ?, ?)
                `, [hoc_sinh_id, ph_id, quan_he]);
            }
            // 6. Commit transaction
            await conn.commit();

            // 7. Trả về kết quả với hoc_sinh_id, nam_hoc và ho_ten
            return {
                success: true,
                message: 'Thêm học sinh thành công!',
                messageType: 'success',
                hoc_sinh_id
            };
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi thêm học sinh: ', error);
            return { success: false, message: 'Them hoc sinh that bai', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async xoaThongTinHocSinh(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Kiểm tra học sinh có tồn tại không
            const [check] = await conn.query(`SELECT COUNT(*) AS count FROM hoc_sinh WHERE hoc_sinh_id = ? AND daXoa = 0`, [id]);
            if (check[0].count === 0) {
                return { success: false, message: 'Học sinh không tồn tại hoặc đã bị xóa!', messageType: 'error' };
            }

            // 2. Cập nhật trường daXoa thành 1 (đã xóa)
            await conn.query(`UPDATE hoc_sinh SET daXoa = 1 WHERE hoc_sinh_id = ?`, [id]);

            // 3. Commit transaction
            await conn.commit();

            return { success: true, message: 'Xóa học sinh thành công!', messageType: 'success' };
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi xóa học sinh: ', error);
            return { success: false, message: 'Xóa học sinh thất bại', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async suaThongTinHocSinh(id,hocSinh) {

    }
    static async ThongTinChiTietHocSinh(id) {
    }
    static async TimKiemHocSinh(tenHocSinh) {}
}
module.exports = HocSinhModel;