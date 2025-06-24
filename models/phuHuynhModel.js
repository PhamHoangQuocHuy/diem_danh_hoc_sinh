const pool = require('../config/connect_database');

class PhuHuynhModel {
    static async layDanhSachPhuHuynh() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await pool.query(`SELECT * FROM phu_huynh 
            JOIN tai_khoan ON phu_huynh.tai_khoan_id = tai_khoan.tai_khoan_id 
            WHERE tai_khoan.daXoa=0 AND ten_vai_tro = 'Phụ huynh'`);
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
    static async thongTinChiTietPhuHuynh(phuHuynhId) {
        const conn = await pool.getConnection();
        try {
            // Lấy thông tin phụ huynh
            const [phuHuynh] = await conn.query(`
            SELECT t.ho_ten, t.ngaysinh, t.gioi_tinh, t.dia_chi, t.email, t.anh_dai_dien
            FROM phu_huynh p
            JOIN tai_khoan t ON p.tai_khoan_id = t.tai_khoan_id
            WHERE p.phu_huynh_id = ? AND t.daXoa = 0
        `, [phuHuynhId]);

            if (phuHuynh.length === 0) {
                return { success: false, message: 'Không tìm thấy phụ huynh' };
            }

            // Lấy học sinh liên kết với phụ huynh này
            const [hocSinh] = await conn.query(`
            SELECT hs.*, GROUP_CONCAT(DISTINCT ha.duong_dan_anh) AS anh, lh.ten_lop
            FROM phu_huynh_hoc_sinh phs
            JOIN hoc_sinh hs ON phs.hoc_sinh_id = hs.hoc_sinh_id
            LEFT JOIN hinh_anh_hoc_sinh ha ON hs.hoc_sinh_id = ha.hoc_sinh_id
            LEFT JOIN hoc_sinh_lop_hoc hslh ON hs.hoc_sinh_id = hslh.hoc_sinh_id
            LEFT JOIN lop_hoc lh ON hslh.lop_hoc_id = lh.lop_hoc_id
            WHERE phs.phu_huynh_id = ? AND hs.daXoa = 0
            GROUP BY hs.hoc_sinh_id
        `, [phuHuynhId]);

            // Xử lý ảnh thành mảng
            const hocSinhWithImage = hocSinh.map(hs => ({
                ...hs,
                duong_dan_anh: hs.anh ? hs.anh.split(',') : [],
                ten_lop: hs.ten_lop || ''
            }));

            return {
                success: true,
                data: {
                    phu_huynh: phuHuynh[0],
                    hoc_sinh: hocSinhWithImage
                }
            };
        } catch (error) {
            console.log(error);
            return { success: false, message: 'Lỗi truy vấn cơ sở dữ liệu' };
        } finally {
            conn.release();
        }
    }
    static async layThongTinPhuHuynh(tim_kiem) {
        const conn = await pool.getConnection();
        try {
            if (!tim_kiem || tim_kiem.trim() === '') {
                return { success: false, data: [], message: 'Vui lòng nhập từ khóa tìm kiếm' };
            }

            const [rows] = await conn.query(`
            SELECT * FROM phu_huynh
            JOIN tai_khoan ON phu_huynh.tai_khoan_id = tai_khoan.tai_khoan_id
            WHERE tai_khoan.daXoa = 0
            AND tai_khoan.ten_vai_tro = 'Phụ huynh'
            AND tai_khoan.ho_ten LIKE ?`, [`%${tim_kiem}%`]);

            if (rows.length === 0) {
                return { success: false, data: [], message: `Không tìm thấy phụ huynh: ${tim_kiem}` };
            }

            return { success: true, data: rows, message: `Đã tìm thấy phụ huynh: ${tim_kiem}`, messageType: 'success' };
        } catch (error) {
            console.error(error);
            return { success: false, data: [], message: 'Lỗi truy vấn dữ liệu' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async layThongTinPhuHuynh_GiaoVien(tai_khoan_id) {
        const conn = await pool.getConnection();
        try {
            // 1. Lấy tất cả lớp học của giáo viên
            const [lopHocResults] = await conn.query(`
            SELECT lop_hoc_id FROM lop_hoc
            JOIN giao_vien ON lop_hoc.giao_vien_id = giao_vien.giao_vien_id
            WHERE lop_hoc.daXoa = 0 AND giao_vien.tai_khoan_id = ?
        `, [tai_khoan_id]);

            if (lopHocResults.length === 0) {
                return [];
            }

            let allPhuHuynh = [];

            // 2. Duyệt qua từng lớp học
            for (const lop of lopHocResults) {
                // Lấy học sinh trong lớp
                const [hocSinhResults] = await conn.query(`
                SELECT hoc_sinh_id FROM hoc_sinh_lop_hoc
                WHERE lop_hoc_id = ?
            `, [lop.lop_hoc_id]);

                // 3. Duyệt qua từng học sinh
                for (const hs of hocSinhResults) {
                    // Lấy phụ huynh của học sinh
                    const [phuHuynhResults] = await conn.query(`
                    SELECT phu_huynh.*, tai_khoan.*, phu_huynh_hoc_sinh.moi_quan_he
                    FROM phu_huynh
                    JOIN tai_khoan ON phu_huynh.tai_khoan_id = tai_khoan.tai_khoan_id
                    JOIN phu_huynh_hoc_sinh ON phu_huynh.phu_huynh_id = phu_huynh_hoc_sinh.phu_huynh_id
                    WHERE phu_huynh_hoc_sinh.hoc_sinh_id = ? AND tai_khoan.daXoa = 0
                `, [hs.hoc_sinh_id]);

                    // Thêm vào mảng kết quả nếu chưa có
                    phuHuynhResults.forEach(ph => {
                        if (!allPhuHuynh.some(p => p.phu_huynh_id === ph.phu_huynh_id)) {
                            allPhuHuynh.push(ph);
                        }
                    });
                }
            }

            return allPhuHuynh;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin phụ huynh:', error);
            return [];
        } finally {
            conn.release();
        }
    }
}

module.exports = PhuHuynhModel;