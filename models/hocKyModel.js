const pool = require('../config/connect_database');
const fs = require('fs');
const path = require('path');
class HocKyModel {
    static async hienthiHocKy() {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(`SELECT * FROM hoc_ky`);
        return rows;
    }
    static async themMoiHocKy(hocKy) {
        const {
            ten_hoc_ky,
            nam_hoc,
            ngay_bat_dau,
            ngay_ket_thuc,
            truong_hoc_id,
        } = hocKy
        // Chuẩn hóa nam_hoc: loại bỏ khoảng trắng
        const namHocChuanHoa = nam_hoc.replace(/\s+/g, '');

        if (new Date(ngay_bat_dau) > new Date(ngay_ket_thuc)) {
            return { success: false, message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc', messageType: 'error' };
        }
        const namHocMatch = namHocChuanHoa.match(/^(\d{4})-(\d{4})$/);
        if (!namHocMatch) {
            return { success: false, message: 'Năm học không đúng định dạng YYYY-YYYY', messageType: 'error' };
        }
        const namBatDau = parseInt(namHocMatch[1]);
        const namKetThuc = parseInt(namHocMatch[2]);

        const ngayBatDauHocKy = new Date(ngay_bat_dau);
        const ngayKetThucHocKy = new Date(ngay_ket_thuc);

        if (ten_hoc_ky === 'Học kỳ 1') {
            // Kiểm tra học kỳ 1 phải bắt đầu trong năm bắt đầu và kết thúc trong năm bắt đầu hoặc đầu năm kết thúc
            if (ngayBatDauHocKy.getFullYear() !== namBatDau || (ngayKetThucHocKy.getFullYear() !== namBatDau && ngayKetThucHocKy.getFullYear() !== namKetThuc)) {
                return {
                    success: false,
                    message: `Học kỳ 1 phải nằm trong năm học ${namBatDau} đến ${namKetThuc}`,
                    messageType: 'error'
                };
            }
        } else if (ten_hoc_ky === 'Học kỳ 2') {
            // Học kỳ 2 phải nằm hoàn toàn trong năm cuối (ví dụ 2025)
            if (ngayBatDauHocKy.getFullYear() !== namKetThuc || ngayKetThucHocKy.getFullYear() !== namKetThuc) {
                return {
                    success: false,
                    message: `Học kỳ 2 phải nằm trong năm ${namKetThuc}`,
                    messageType: 'error'
                };
            }
        } else {
            return {
                success: false,
                message: `Tên học kỳ không hợp lệ`,
                messageType: 'error'
            };
        }

        let conn;
        try {
            conn = await pool.getConnection();
            const [result] = await conn.execute(`
                INSERT INTO hoc_ky 
                (ten_hoc_ky, nam_hoc, ngay_bat_dau, ngay_ket_thuc, truong_hoc_id)
                VALUES (?, ?, ?, ?, ?)
                `, [ten_hoc_ky, namHocChuanHoa, ngay_bat_dau, ngay_ket_thuc, truong_hoc_id]);

            // Tạo folder nếu chưa tồn tại
            const folderPath = path.join(__dirname, '..', 'public', 'images', namHocChuanHoa);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log('Folder năm học đã được tạo:', folderPath);
            } else {
                console.log('Folder năm học đã tồn tại:', folderPath);
            }
            return { success: true, message: 'Thêm học kỳ thành công', messageType: 'success' };
        }
        catch (error) {
            console.log(error);
            return { success: false, message: 'Có lỗi khi thêm học kỳ', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async xoaThongTinHocKy(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [lopHocRows] = await conn.query(`SELECT * FROM lop_hoc WHERE hoc_ky_id = ?`, [id]);
            if (lopHocRows.length > 0) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không thể xóa học kỳ do đang có lớp học',
                    messageType: 'error'
                };
            }
            const [rows] = await conn.query(`DELETE FROM hoc_ky WHERE hoc_ky_id = ?`, [id]);
            await conn.commit();
            return { success: true, message: 'Xóa học kỳ thành công', messageType: 'success' }
        }
        catch (error) {
            await conn.rollback();
            console.log('Lỗi khi xóa học kỳ: ', error);
            return { success: false, message: 'Xóa học kỳ thất bại', messageType: 'error' }
        }
        finally {
            conn.release();
        }
    }
    static async suaThongTinHocKy(id, hocKy) {
        let conn;
        const {
            ten_hoc_ky,
            nam_hoc,
            ngay_bat_dau,
            ngay_ket_thuc,
            truong_hoc_id,
        } = hocKy;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            if (new Date(ngay_bat_dau) > new Date(ngay_ket_thuc)) {
                await conn.rollback();
                return { success: false, message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc', messageType: 'error' };
            }

            const namHocMatch = nam_hoc.match(/^(\d{4})-(\d{4})$/);
            if (!namHocMatch) {
                await conn.rollback();
                return { success: false, message: 'Năm học không đúng định dạng YYYY-YYYY', messageType: 'error' };
            }

            const namBatDau = parseInt(namHocMatch[1]);
            const namKetThuc = parseInt(namHocMatch[2]);

            const namNgayBatDau = new Date(ngay_bat_dau).getFullYear();
            const namNgayKetThuc = new Date(ngay_ket_thuc).getFullYear();

            if (namNgayBatDau !== namBatDau || namNgayKetThuc !== namKetThuc) {
                await conn.rollback();
                return {
                    success: false,
                    message: `Ngày bắt đầu phải thuộc năm ${namBatDau}, và ngày kết thúc phải thuộc năm ${namKetThuc}`,
                    messageType: 'error'
                };
            }

            const sql = `
            UPDATE hoc_ky 
            SET ten_hoc_ky = ?, nam_hoc = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, truong_hoc_id = ?
            WHERE hoc_ky_id = ?`;
            const [result] = await conn.query(sql, [ten_hoc_ky, nam_hoc, ngay_bat_dau, ngay_ket_thuc, truong_hoc_id, id]);

            if (result.affectedRows === 0) {
                await conn.rollback();
                return {
                    success: false,
                    message: 'Không tìm thấy học kỳ để sửa',
                    messageType: 'error'
                };
            }

            await conn.commit();
            return {
                success: true,
                message: 'Sửa học kỳ thành công',
                messageType: 'success'
            };
        } catch (error) {
            console.error('Lỗi khi sửa học kỳ: ', error);
            if (conn) await conn.rollback();
            return {
                success: false,
                message: 'Sửa học kỳ thất bại',
                messageType: 'error'
            };
        } finally {
            if (conn) conn.release();
        }
    }
    static async timHocKyTheoNamHoc(tim_kiem) {
        if(!tim_kiem || tim_kiem.trim() === '') {
            return res.render('admin_index', { 
                page: 'pages/quanLyHocKy', 
                danhSachHocKy: [], 
                danhSachTruongHoc: [], 
                message: 'Vui lòng nhập năm học', 
                messageType: 'error' 
            }); 
        }
        let conn;
        try {
            conn = await pool.getConnection();
            const searchPattern = `%${tim_kiem.trim()}%`;
            const [rows] = await conn.query(`SELECT * FROM hoc_ky WHERE nam_hoc LIKE ?`, [searchPattern]);
            return rows;
        }
        catch (error) {
            console.log('Lỗi khi tìm học kỳ: ', error);
            return [];
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async locTheoHocKy(tenHocKy){
        let conn;
        try {
            conn = await pool.getConnection();
            const [rows] = await conn.query(`SELECT * FROM hoc_ky WHERE ten_hoc_ky = ?`, [tenHocKy]);
            return rows;
        }
        catch (error) {
            console.log('Lỗi khi tìm học kỳ: ', error);
            return [];
        }
        finally {
            if (conn) conn.release();
        }
    }
}

module.exports = HocKyModel