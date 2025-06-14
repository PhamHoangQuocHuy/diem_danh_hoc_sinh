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
    static async layDanhSachHocSinhKemLop() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
            SELECT 
                hs.hoc_sinh_id,
                hs.ho_ten,
                hs.ngay_sinh,
                hs.gioi_tinh,
                hs.dia_chi,
                hs.loai_hoc_sinh,
                GROUP_CONCAT(DISTINCT lh.ten_lop ORDER BY lh.ten_lop SEPARATOR ', ') AS ten_lop_hoc
            FROM hoc_sinh hs
            LEFT JOIN hoc_sinh_lop_hoc hslh ON hs.hoc_sinh_id = hslh.hoc_sinh_id
            LEFT JOIN lop_hoc lh ON hslh.lop_hoc_id = lh.lop_hoc_id
            GROUP BY hs.hoc_sinh_id
        `);
            return rows;
        } catch (error) {
            console.error(error);
            return [];
        } finally {
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
                lop_hoc_ids = [],
                moi_quan_he = []
            } = hocSinh;

            // 1. Kiểm tra dữ liệu bắt buộc
            if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi || !loai_hoc_sinh) {
                return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!', messageType: 'error' };
            }

            // Kiểm tra định dạng họ tên (chỉ chứa chữ cái và khoảng trắng)
            if (!ho_ten.match(/^[a-zA-ZÀ-ỹ\s]+$/)) {
                return { success: false, message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng!', messageType: 'error' };
            }

            // Kiểm tra giá trị hợp lệ cho giới tính và loại học sinh
            if (!['Nam', 'Nữ'].includes(gioi_tinh)) {
                return { success: false, message: 'Giới tính không hợp lệ!', messageType: 'error' };
            }

            if (!['Bán trú', 'Không bán trú'].includes(loai_hoc_sinh)) {
                return { success: false, message: 'Loại học sinh không hợp lệ!', messageType: 'error' };
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

            // 3. Kiểm tra lớp học
            if (lop_hoc_ids.length < 2) {
                return { success: false, message: 'Phải chọn ít nhất 2 học kỳ của cùng một lớp!', messageType: 'error' };
            }

            // Kiểm tra lớp học tồn tại
            const [kqLop] = await conn.query(`SELECT COUNT(*) AS total FROM lop_hoc WHERE lop_hoc_id IN (?)`, [lop_hoc_ids]);
            if (kqLop[0].total !== lop_hoc_ids.length) {
                return { success: false, message: 'Một hoặc nhiều lớp học không tồn tại!', messageType: 'error' };
            }

            // Kiểm tra lớp học có đúng 2 học kỳ (1 và 2) của cùng lớp và năm học
            const [validClasses] = await conn.query(`
                SELECT lop_hoc.lop_hoc_id, lop_hoc.ten_lop, hoc_ky.ten_hoc_ky AS hoc_ky, hoc_ky.nam_hoc
                FROM lop_hoc
                JOIN hoc_ky ON lop_hoc.hoc_ky_id = hoc_ky.hoc_ky_id
                WHERE lop_hoc.lop_hoc_id IN (?)
            `, [lop_hoc_ids]);

            console.log('validClasses:', validClasses);

            const grouped = validClasses.reduce((acc, cls) => {
                const key = `${cls.ten_lop?.trim() ?? 'unknown'}-${cls.nam_hoc ?? 'unknown'}`;
                if (!acc[key]) acc[key] = [];

                const hocKyStr = cls.hoc_ky ?? '';
                const normalizedHocKy = hocKyStr.includes('1') ? '1'
                    : hocKyStr.includes('2') ? '2' : '0';

                acc[key].push(normalizedHocKy);
                return acc;
            }, {});

            const validClass = Object.values(grouped).some(hocKy =>
                hocKy.includes('1') && hocKy.includes('2') && hocKy.length === 2
            );

            if (!validClass) {
                return {
                    success: false,
                    message: 'Phải chọn đúng 2 học kỳ (1 và 2) của cùng một lớp và năm học!',
                    messageType: 'error'
                };
            }


            // Lấy năm học từ lớp học đã chọn
            const nam_hoc = validClasses[0].nam_hoc;

            // 4. Kiểm tra trùng học sinh
            const [trung] = await conn.execute(`SELECT COUNT(*) AS count FROM hoc_sinh WHERE ho_ten = ? AND ngay_sinh = ?`, [ho_ten, ngay_sinh]);
            if (trung[0].count > 0) {
                return { success: false, message: 'Học sinh đã tồn tại!', messageType: 'error' };
            }

            // 5. Thêm học sinh
            const [result] = await conn.execute(`
                INSERT INTO hoc_sinh (ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh)
                VALUES (?, ?, ?, ?, ?)
            `, [ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh]);

            const hoc_sinh_id = result.insertId;

            // 6. Thêm mối quan hệ phụ huynh
            for (let i = 0; i < phu_huynh_ids.length; i++) {
                const ph_id = parseInt(phu_huynh_ids[i]);
                const quan_he = moi_quan_he[i];
                await conn.execute(`
                    INSERT INTO phu_huynh_hoc_sinh (hoc_sinh_id, phu_huynh_id, moi_quan_he)
                    VALUES (?, ?, ?)
                `, [hoc_sinh_id, ph_id, quan_he]);
            }

            // 7. Thêm vào lớp học
            for (const lop_id of lop_hoc_ids) {
                await conn.execute(`
                    INSERT INTO hoc_sinh_lop_hoc (hoc_sinh_id, lop_hoc_id)
                    VALUES (?, ?)
                `, [hoc_sinh_id, parseInt(lop_id)]);
            }

            // 8. Commit transaction
            await conn.commit();

            // 9. Trả về kết quả với hoc_sinh_id, nam_hoc và ho_ten
            return {
                success: true,
                message: 'Thêm học sinh thành công!',
                messageType: 'success',
                hoc_sinh_id,
                nam_hoc,
                ho_ten
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
}
module.exports = HocSinhModel;