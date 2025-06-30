const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');
class thucHienDiemDanhModel {
    static async layTongLopHoc(buoi) {
        let query = 'SELECT COUNT(*) as tong FROM hoc_sinh';

        if (buoi === 'afternoon') {
            query += ' WHERE loai_hoc_sinh = "Không bán trú"';
        }

        const [rows] = await pool.query(query);
        return rows;
    }
    static async layTongCoMat(ngay_diem_danh, buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Có mặt" AND ngay_diem_danh = ?';
        const params = [ngay_diem_danh];

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async layTongVang(ngay_diem_danh, buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Vắng" AND ngay_diem_danh = ?';
        const params = [ngay_diem_danh];

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async layTongHocSang(ngay_diem_danh, buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Học sáng" AND ngay_diem_danh = ?';
        const params = [ngay_diem_danh];

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async layTongHocChieu(ngay_diem_danh, buoi) {
        let query = 'SELECT COUNT(*) as tong FROM diem_danh WHERE trang_thai = "Học chiều" AND ngay_diem_danh = ?';
        const params = [ngay_diem_danh];

        if (buoi === 'afternoon') {
            query += ' AND hoc_sinh_id IN (SELECT hoc_sinh_id FROM hoc_sinh WHERE loai_hoc_sinh = "Không bán trú")';
        }

        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async layDanhSachLopHoc(tai_khoan_id) {
        try {
            // Lấy giao_vien_id từ tài_khoan_id
            const [gvRows] = await pool.query(
                'SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?',
                [tai_khoan_id]
            );

            if (gvRows.length === 0) return [];

            const giao_vien_id = gvRows[0].giao_vien_id;

            // Lấy danh sách lớp giáo viên chủ nhiệm trong học kỳ hiện tại
            const [lopRows] = await pool.query(`
                SELECT lop_hoc_id, ten_lop, ten_hoc_ky, ten_nam_hoc, hoc_ky.ngay_bat_dau, hoc_ky.ngay_ket_thuc
                FROM lop_hoc 
                JOIN hoc_ky ON lop_hoc.hoc_ky_id = hoc_ky.hoc_ky_id
                JOIN nam_hoc ON hoc_ky.nam_hoc_id = nam_hoc.nam_hoc_id
                WHERE lop_hoc.daXoa = 0 
                AND giao_vien_id = ?
                ORDER BY hoc_ky.ngay_bat_dau DESC, ten_lop ASC
            `, [giao_vien_id]);

            return lopRows;
        } catch (error) {
            console.error('Lỗi lấy danh sách lớp học:', error);
            return [];
        }
    }
    static async layDanhSachDiemDanh(lop_hoc_id, ngay_diem_danh, buoi) {
        const conn = await pool.getConnection();
        try {
            let query = `
            SELECT 
                hs.hoc_sinh_id,
                hs.*,
                ha.duong_dan_anh,
                dd.trang_thai,
                dd.ghi_chu,
                dd.ngay_diem_danh
            FROM hoc_sinh_lop_hoc hslh
            JOIN hoc_sinh hs ON hslh.hoc_sinh_id = hs.hoc_sinh_id
            LEFT JOIN (
                SELECT hoc_sinh_id, duong_dan_anh
                FROM hinh_anh_hoc_sinh
                WHERE hinh_anh_hoc_sinh_id IN (
                    SELECT MIN(hinh_anh_hoc_sinh_id) FROM hinh_anh_hoc_sinh GROUP BY hoc_sinh_id
                )
                ) ha ON hs.hoc_sinh_id = ha.hoc_sinh_id
            LEFT JOIN diem_danh dd 
                ON dd.hoc_sinh_id = hs.hoc_sinh_id 
                AND dd.lop_hoc_id = ? 
                AND dd.ngay_diem_danh = ?
            WHERE hslh.lop_hoc_id = ?
              AND hs.daXoa = 0
        `;

            const params = [lop_hoc_id, ngay_diem_danh, lop_hoc_id];

            // Nếu là buổi chiều => lọc học sinh không bán trú
            if (buoi === 'afternoon') {
                query += ` AND hs.loai_hoc_sinh = 'Không bán trú'`;
            }

            query += ` ORDER BY hs.hoc_sinh_id ASC`;

            const [rows] = await conn.query(query, params);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách điểm danh:', error);
            return [];
        } finally {
            if (conn) conn.release();
        }
    }
    static async themThongTinDiemDanh({ lop_hoc_id, ngay_diem_danh, buoi, danhSachDiemDanh }) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Chỉ cho điểm danh trong ngày hôm nay
            const today = new Date().toISOString().slice(0, 10);
            if (ngay_diem_danh !== today) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Chỉ được phép điểm danh cho ngày hôm nay',
                    messageType: 'error'
                };
            }

            for (const diemDanh of danhSachDiemDanh) {
                const { hoc_sinh_id, trang_thai, ghi_chu } = diemDanh;

                // Lấy thông tin học sinh
                const [hsRows] = await conn.query(
                    'SELECT ho_ten FROM hoc_sinh WHERE hoc_sinh_id = ?',
                    [hoc_sinh_id]
                );
                if (hsRows.length === 0) {
                    console.log(`Không tìm thấy học sinh với ID ${hoc_sinh_id}`);
                    continue;
                }

                // Kiểm tra xem đã có bản ghi điểm danh trong ngày chưa
                const [ddRows] = await conn.query(
                    'SELECT * FROM diem_danh WHERE hoc_sinh_id = ? AND lop_hoc_id = ? AND ngay_diem_danh = ?',
                    [hoc_sinh_id, lop_hoc_id, ngay_diem_danh]
                );

                if (ddRows.length > 0) {
                    // Đã có bản ghi → UPDATE (giữ nguyên anh_ghi_nhan nếu có)
                    const daCoAnh = !!ddRows[0].anh_ghi_nhan;

                    if (daCoAnh) {
                        await conn.query(`
                        UPDATE diem_danh
                        SET trang_thai = ?, ghi_chu = ?, thoi_gian = NOW()
                        WHERE diem_danh_id = ?
                    `, [trang_thai, ghi_chu, ddRows[0].diem_danh_id]);
                    } else {
                        await conn.query(`
                        UPDATE diem_danh
                        SET trang_thai = ?, ghi_chu = ?, anh_ghi_nhan = NULL, thoi_gian = NOW()
                        WHERE diem_danh_id = ?
                    `, [trang_thai, ghi_chu, ddRows[0].diem_danh_id]);
                    }
                } else {
                    // Chưa có bản ghi → INSERT
                    await conn.query(`
                    INSERT INTO diem_danh (hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu, anh_ghi_nhan)
                    VALUES (?, ?, ?, ?, ?, NULL)
                `, [hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu]);
                }
            }

            await conn.commit();
            return { success: true, message: 'Lưu điểm danh thành công', messageType: 'success' };
        } catch (error) {
            await conn.rollback();
            console.log(error);
            return { success: false, message: 'Lưu điểm danh thất bại', messageType: 'error' };
        } finally {
            if (conn) conn.release();
        }
    }
    static async xuatThongTinExcel(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
                SELECT
                    hs.ho_ten as 'Họ tên',
                    hs.ngay_sinh as 'Ngày sinh',
                    lh.ten_lop as 'Tên lớp',
                    dd.trang_thai as 'Trạng thái',
                    dd.ghi_chu as 'Ghi chú',
                    dd.ngay_diem_danh as 'Ngày điểm danh',
                    dd.thoi_gian as 'Thời gian'
                FROM diem_danh dd
                JOIN hoc_sinh hs ON dd.hoc_sinh_id = hs.hoc_sinh_id
                JOIN lop_hoc lh ON dd.lop_hoc_id = lh.lop_hoc_id
                WHERE dd.lop_hoc_id = ?
                AND dd.ngay_diem_danh = ?
                `, [lop_hoc_id, ngay_diem_danh]);

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
    static async loadDuLieuKhuonMat(lop_hoc_id, ngay_diem_danh) {
        let conn;
        try {
            // Kiểm tra ngày điểm danh có phải là hôm nay không
            const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
            if (ngay_diem_danh !== today) {
                throw new Error('Chỉ được phép điểm danh khuôn mặt vào ngày hiện tại');
            }
            conn = await pool.getConnection();
            const [rows] = await conn.query(`
                SELECT 
                    hs.hoc_sinh_id,
                    hs.ho_ten,
                    hs.ngay_sinh,
                    hahs.duong_dan_anh,
                    nh.ten_nam_hoc
                FROM hoc_sinh hs
                JOIN hoc_sinh_lop_hoc hslh ON hs.hoc_sinh_id = hslh.hoc_sinh_id
                JOIN lop_hoc lh ON hslh.lop_hoc_id = lh.lop_hoc_id
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                LEFT JOIN hinh_anh_hoc_sinh hahs ON hs.hoc_sinh_id = hahs.hoc_sinh_id
                WHERE lh.lop_hoc_id = ?
                ORDER BY hs.hoc_sinh_id, hahs.hinh_anh_hoc_sinh_id
                `, [lop_hoc_id]);
            // Gom 3 hình ảnh mỗi học sinh thành 1 object
            const hocSinhMap = {};
            rows.forEach(row => {
                if (!hocSinhMap[row.hoc_sinh_id]) {
                    hocSinhMap[row.hoc_sinh_id] = {
                        hoc_sinh_id: row.hoc_sinh_id,
                        ho_ten: row.ho_ten,
                        ngay_sinh: row.ngay_sinh,
                        duong_dan_anh: [],
                        ten_nam_hoc: row.ten_nam_hoc
                    }
                }
                if (row.duong_dan_anh) {
                    hocSinhMap[row.hoc_sinh_id].duong_dan_anh.push(`${row.duong_dan_anh}`);
                }
            });
            return Object.values(hocSinhMap);
        }
        catch (error) {
            console.log(error);
            throw error;
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async ghiNhanDiemDanhKhuonMat({ hoc_sinh_id, lop_hoc_id, buoi, anh_ghi_nhan }) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const ngay_diem_danh = new Date().toISOString().slice(0, 10);

            const [hsRows] = await conn.query(
                'SELECT * FROM hoc_sinh WHERE hoc_sinh_id = ?',
                [hoc_sinh_id]
            );
            if (hsRows.length === 0) {
                await conn.rollback();
                return { success: false, message: 'Không tìm thấy học sinh', messageType: 'error' };
            }

            const hocSinh = hsRows[0];

            if (hocSinh.loai_hoc_sinh === 'Bán trú' && buoi === 'afternoon') {
                await conn.rollback();
                return { success: false, message: 'Học sinh bán trú không cần điểm danh buổi chiều', messageType: 'error' };
            }

            const [ddRows] = await conn.query(
                'SELECT * FROM diem_danh WHERE hoc_sinh_id = ? AND lop_hoc_id = ? AND ngay_diem_danh = ?',
                [hoc_sinh_id, lop_hoc_id, ngay_diem_danh]
            );

            if (hocSinh.loai_hoc_sinh === 'Không bán trú' && buoi === 'afternoon' && ddRows.length === 0) {
                await conn.rollback();
                return { success: false, message: `Học sinh ${hocSinh.ho_ten} chưa được điểm danh buổi sáng`, messageType: 'error' };
            }

            // Xử lý lưu file ảnh ghi nhận
            let anhGhiNhanPath = null;
            if (anh_ghi_nhan) {
                const dir = path.join(__dirname, '../public/images/anh_ghi_nhan/thanh_cong/');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                const tenFileAnh = `${hoc_sinh_id}_${ngay_diem_danh}.jpg`;
                const duongDanLuu = path.join(dir, tenFileAnh);
                const duongDanDB = `images/anh_ghi_nhan/thanh_cong/${tenFileAnh}`;

                // Nếu dữ liệu là base64
                const base64Data = anh_ghi_nhan.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(duongDanLuu, base64Data, 'base64');
                anhGhiNhanPath = duongDanDB;
            }

            // INSERT hoặc UPDATE
            if (ddRows.length > 0) {
                await conn.query(`
                UPDATE diem_danh
                SET trang_thai = 'Có mặt', ghi_chu = '', anh_ghi_nhan = ?, thoi_gian = NOW()
                WHERE diem_danh_id = ?
            `, [anhGhiNhanPath, ddRows[0].diem_danh_id]);
            } else {
                await conn.query(`
                INSERT INTO diem_danh (hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu, anh_ghi_nhan)
                VALUES (?, ?, ?, 'Có mặt', '', ?)
            `, [hoc_sinh_id, lop_hoc_id, ngay_diem_danh, anhGhiNhanPath]);
            }

            await conn.commit();
            return { success: true, message: 'Điểm danh thành công', messageType: 'success' };
        }
        catch (error) {
            await conn.rollback();
            console.error('Lỗi ghi nhận điểm danh khuôn mặt:', error);
            return { success: false, message: 'Lỗi ghi nhận điểm danh', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async ghiNhanVang({ hoc_sinh_id, lop_hoc_id, ngay_diem_danh, buoi }) {
        const conn = await pool.getConnection();
        try {
            const [ddRows] = await conn.query(
                'SELECT * FROM diem_danh WHERE hoc_sinh_id = ? AND lop_hoc_id = ? AND ngay_diem_danh = ?',
                [hoc_sinh_id, lop_hoc_id, ngay_diem_danh]
            );

            if (ddRows.length > 0) {
                // Nếu đã tồn tại → update thành Vắng
                await conn.query(`
                UPDATE diem_danh
                SET trang_thai = 'Vắng', ghi_chu = '', anh_ghi_nhan = null
                WHERE diem_danh_id = ?
            `, [ddRows[0].diem_danh_id]);
            } else {
                // Nếu chưa tồn tại → insert mới
                await conn.query(`
                INSERT INTO diem_danh (hoc_sinh_id, lop_hoc_id, ngay_diem_danh, trang_thai, ghi_chu, anh_ghi_nhan)
                VALUES (?, ?, ?, 'Vắng', '', null)
            `, [hoc_sinh_id, lop_hoc_id, ngay_diem_danh]);
            }
        } catch (error) {
            console.error('Lỗi ghi nhận vắng:', error);
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }

}

module.exports = thucHienDiemDanhModel;