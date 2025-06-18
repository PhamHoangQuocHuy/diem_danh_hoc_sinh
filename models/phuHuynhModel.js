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
            SELECT hs.*, GROUP_CONCAT(ha.duong_dan_anh) AS anh
            FROM phu_huynh_hoc_sinh phs
            JOIN hoc_sinh hs ON phs.hoc_sinh_id = hs.hoc_sinh_id
            LEFT JOIN hinh_anh_hoc_sinh ha ON hs.hoc_sinh_id = ha.hoc_sinh_id
            WHERE phs.phu_huynh_id = ? AND hs.daXoa = 0
            GROUP BY hs.hoc_sinh_id
        `, [phuHuynhId]);

            // Xử lý ảnh thành mảng
            const hocSinhWithImage = hocSinh.map(hs => ({
                ...hs,
                duong_dan_anh: hs.anh ? hs.anh.split(',') : []
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

}

module.exports = PhuHuynhModel;