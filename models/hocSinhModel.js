const path = require('path');
const fs = require('fs');
const pool = require('../config/connect_database');
class HocSinhModel {
    static async layDanhSachHocSinh() {
        const conn = await pool.getConnection();
        try {
            // Lấy thông tin học sinh cơ bản
            const [hocSinhRows] = await conn.query(`
            SELECT * FROM hoc_sinh 
            WHERE daXoa = 0
        `);

            // Lấy thông tin hình ảnh và phụ huynh cho từng học sinh
            const result = await Promise.all(hocSinhRows.map(async (hs) => {
                const [hinhAnh] = await conn.query(`
                SELECT duong_dan_anh FROM hinh_anh_hoc_sinh 
                WHERE hoc_sinh_id = ?
            `, [hs.hoc_sinh_id]);

                const [phuHuynh] = await conn.query(`
                SELECT p.phu_huynh_id, t.ho_ten, t.email, phs.moi_quan_he 
                FROM phu_huynh_hoc_sinh phs
                JOIN phu_huynh p ON phs.phu_huynh_id = p.phu_huynh_id
                JOIN tai_khoan t ON p.tai_khoan_id = t.tai_khoan_id
                WHERE phs.hoc_sinh_id = ?
            `, [hs.hoc_sinh_id]);

                return {
                    ...hs,
                    duong_dan_anh: hinhAnh.map(img => img.duong_dan_anh),
                    phu_huynh: phuHuynh
                };
            }));

            return result;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
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
    static async suaThongTinHocSinh(id, hocSinh) {
        const conn = await pool.getConnection();
        try {
            const {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids = [],
                moi_quan_he = [],
                duong_dan_anh = [],
                remove_images = [],
            } = hocSinh;
            await conn.beginTransaction();
            // 1. Kiểm tra học sinh có tồn tại không
            const [check] = await conn.query(`SELECT COUNT(*) AS count FROM hoc_sinh WHERE hoc_sinh_id = ? AND daXoa = 0`, [id]);
            if (check[0].count === 0) {
                return { success: false, message: 'Học sinh không tồn tại hoặc đã bị xóa!', messageType: 'error' };
            }
            // 2. Kiểm tra dữ liệu bắt buộc
            if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi || !loai_hoc_sinh) {
                return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!', messageType: 'error' };
            }
            // Kiểm tra định dạng ngày sinh
            const today = new Date();
            const dob = new Date(ngay_sinh);
            if (dob > today) {
                return { success: false, message: 'Ngày sinh không hợp lệ (trong tương lai)', messageType: 'error' };
            }
            // 3. Kiểm tra ít nhất một phụ huynh
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
            // 4. Kiểm tra trùng học sinh
            const [trung] = await conn.execute(`SELECT COUNT(*) AS count FROM hoc_sinh WHERE ho_ten = ? AND ngay_sinh = ? AND hoc_sinh_id != ?`, [ho_ten, ngay_sinh, id]);
            if (trung[0].count > 0) {
                return { success: false, message: 'Học sinh đã tồn tại!', messageType: 'error' };
            }
            // 5. Cập nhật thông tin học sinh
            await conn.execute(`
                UPDATE hoc_sinh 
                SET ho_ten = ?, ngay_sinh = ?, gioi_tinh = ?, dia_chi = ?, loai_hoc_sinh = ?
                WHERE hoc_sinh_id = ?
            `, [ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh, id]);
            // 6. Cập nhật ảnh học sinh
            const [currentImages] = await conn.query(`SELECT duong_dan_anh FROM hinh_anh_hoc_sinh WHERE hoc_sinh_id = ?`, [id]);
            const currentImageCount = currentImages.length;
            if (currentImageCount < 3 || (duong_dan_anh.length > 0 && duong_dan_anh.length !== 3)) {
                return { success: false, message: 'Học sinh phải có đúng 3 ảnh!', messageType: 'error' };
            }
            const currentImagePaths = currentImages.map(img => img.duong_dan_anh);
            // Kiểm tra và xử lý ảnh 
            if (duong_dan_anh && duong_dan_anh.length > 0) {
                if (!Array.isArray(duong_dan_anh) || duong_dan_anh.length !== 3) {
                    return { success: false, message: 'Phải tải lên đúng 3 ảnh học sinh!', messageType: 'error' };
                }
                await conn.query(`DELETE FROM hinh_anh_hoc_sinh WHERE hoc_sinh_id = ?`, [id]);
                for (let i = 0; i < duong_dan_anh.length; i++) {
                    await conn.execute(`
                        INSERT INTO hinh_anh_hoc_sinh (hoc_sinh_id, duong_dan_anh) 
                        VALUES (?, ?)
                    `, [id, duong_dan_anh[i]]);
                }
            } else {
                if (currentImagePaths.length !== 3) {
                    return { success: false, message: 'Học sinh phải có đúng 3 ảnh!', messageType: 'error' };
                }
            }
            // 7. Cập nhật mối quan hệ phụ huynh
            await conn.query(`DELETE FROM phu_huynh_hoc_sinh WHERE hoc_sinh_id = ?`, [id]);
            for (let i = 0; i < phu_huynh_ids.length; i++) {
                const ph_id = parseInt(phu_huynh_ids[i]);
                const quan_he = moi_quan_he[i];
                await conn.execute(`
                INSERT INTO phu_huynh_hoc_sinh (hoc_sinh_id, phu_huynh_id, moi_quan_he)
                VALUES (?, ?, ?)
            `, [id, ph_id, quan_he]);
            }
            await conn.commit();
            return { success: true, message: 'Sửa thông tin học sinh thành công!', messageType: 'success' };
        }
        catch (error) {
            console.log('Lỗi khi sửa thông tin học sinh: ', error);
            return { success: false, message: 'Sửa thông tin học sinh thất bại', messageType: 'error' };
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async timThongTinHocSinh(tim_kiem) {
        const conn = await pool.getConnection();
        try {
            if (!tim_kiem || tim_kiem.trim() === '') {
                return { success: false, message: 'Vui lòng nhập từ khóa tìm kiếm', messageType: 'error' };
            }

            const [rows] = await conn.query(`SELECT * FROM hoc_sinh WHERE ho_ten LIKE ?`, [`%${tim_kiem}%`]);
            // Bổ sung thông tin ảnh + phụ huynh cho mỗi học sinh
            const result = await Promise.all(rows.map(async (hs) => {
                const [hinhAnh] = await conn.query(`
                SELECT duong_dan_anh FROM hinh_anh_hoc_sinh 
                WHERE hoc_sinh_id = ?
            `, [hs.hoc_sinh_id]);

                const [phuHuynh] = await conn.query(`
                SELECT p.phu_huynh_id, t.ho_ten, t.email, phs.moi_quan_he 
                FROM phu_huynh_hoc_sinh phs
                JOIN phu_huynh p ON phs.phu_huynh_id = p.phu_huynh_id
                JOIN tai_khoan t ON p.tai_khoan_id = t.tai_khoan_id
                WHERE phs.hoc_sinh_id = ?
            `, [hs.hoc_sinh_id]);

                return {
                    ...hs,
                    duong_dan_anh: hinhAnh.map(img => img.duong_dan_anh),
                    phu_huynh: phuHuynh
                };
            }));

            return result;
        }
        catch (error) {
            console.log(error);
            return { success: false, message: 'Đã xảy ra lỗi khi tìm học sinh', messageType: 'error' };
        }
        finally {
            conn.release();
        }
    }
    static async thongTinChiTietHocSinh(id) {
        const conn = await pool.getConnection();
        try {
            // Lấy thông tin học sinh
            const [hocSinh] = await conn.query(`
                SELECT * FROM hoc_sinh WHERE hoc_sinh_id = ? AND daXoa = 0
                `, [id]);
            if (hocSinh.length === 0) {
                return {
                    success: false,
                    message: `Không tìm thấy học sinh với id: ${id}`,
                    messageType: 'error',
                    data: null
                };
            }
            // Lấy hình ảnh
            const [hinhAnh] = await conn.query(`
                SELECT duong_dan_anh FROM hinh_anh_hoc_sinh
                WHERE hoc_sinh_id = ?
                `, [id]);
            // Lấy thông tin phụ huynh
            const [phuHuynh] = await conn.query(`
                SELECT t.ho_ten, t.ngaysinh, t.gioi_tinh, t.dia_chi, t.email, t.anh_dai_dien, phs.moi_quan_he 
                FROM phu_huynh_hoc_sinh phs
                JOIN phu_huynh p ON phs.phu_huynh_id = p.phu_huynh_id
                JOIN tai_khoan t ON p.tai_khoan_id = t.tai_khoan_id
                WHERE phs.hoc_sinh_id = ? AND t.daXoa = 0
            `, [id]);
            return {
                success: true,
                message: 'Lấy thông tin thành công',
                messageType: 'success',
                data: {
                    ...hocSinh[0],
                    duong_dan_anh: hinhAnh.map(img => img.duong_dan_anh),
                    phu_huynh: phuHuynh
                }
            }
        }
        catch (error) {
            console.log(error);
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi tìm học sinh&messageType=error`);
        }
        finally {
            conn.release();
        }
    }
    static async locHocSinhTheoLoaiHocSinh(loai_hoc_sinh) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT * FROM hoc_sinh WHERE loai_hoc_sinh = ? AND daXoa = 0`, [loai_hoc_sinh]);
            // Bổ sung thông tin ảnh + phụ huynh cho mỗi học sinh
            const result = await Promise.all(rows.map(async (hs) => {
                const [hinhAnh] = await conn.query(`
                SELECT duong_dan_anh FROM hinh_anh_hoc_sinh 
                WHERE hoc_sinh_id = ?
            `, [hs.hoc_sinh_id]);

                const [phuHuynh] = await conn.query(`
                SELECT p.phu_huynh_id, t.ho_ten, t.email, phs.moi_quan_he 
                FROM phu_huynh_hoc_sinh phs
                JOIN phu_huynh p ON phs.phu_huynh_id = p.phu_huynh_id
                JOIN tai_khoan t ON p.tai_khoan_id = t.tai_khoan_id
                WHERE phs.hoc_sinh_id = ?
            `, [hs.hoc_sinh_id]);

                return {
                    ...hs,
                    duong_dan_anh: hinhAnh.map(img => img.duong_dan_anh),
                    phu_huynh: phuHuynh
                };
            }));

            return result;
        }
        catch (error) {
            console.log(error);
            return [];
        }
        finally {
            conn.release();
        }
    }
    static async themNhieuHocSinh(danhSachHocSinh) {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            let danhSachLoi = []
            for (const [index, hocSinh] of danhSachHocSinh.entries()) {
                const dong = index + 2; // Dòng trong Excel (bắt đầu từ 2 do có header)
                // Kiểm tra trùng lặp
                const [trungLapCheck] = await conn.execute(`SELECT 1 FROM hoc_sinh
                    WHERE ho_ten = ? AND ngay_sinh = ?`, [hocSinh.ho_ten, hocSinh.ngay_sinh]);
                if (trungLapCheck.length > 0) {
                    danhSachLoi.push({ dong, loi: `Học sinh ${hocSinh.ho_ten} với ngày sinh ${hocSinh.ngay_sinh} đã tồn tại` });
                    continue;
                }
                // Chuẩn bị dữ liệu (Khớp với các cột trong excel)
                const {
                    ho_ten,
                    ngay_sinh,
                    gioi_tinh,
                    dia_chi,
                    loai_hoc_sinh,
                    anh1,
                    anh2,
                    anh3,
                    phu_huynh_id_1,
                    moi_quan_he_1,
                    phu_huynh_id_2,
                    moi_quan_he_2
                } = hocSinh
                // 1. Kiểm tra đủ thông tin
                if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi || !loai_hoc_sinh || !anh1 || !anh2 || !anh3 || !phu_huynh_id_1 || !moi_quan_he_1) {
                    danhSachLoi.push({ dong, loi: `Vui lòng điền đàn đủ thông tin bắt buộc` });
                    continue;
                }
                // 2. Kiểm tra đủ 3 ảnh
                if (!anh1 || !anh2 || !anh3) {
                    danhSachLoi.push({ dong, loi: `Phải có đủ 3 ảnh` });
                    continue;
                }
                // 3. Kiểm tra ít nhất 1 mối quan hệ với phụ huynh
                const phuHuynhIds = [phu_huynh_id_1].concat(phu_huynh_id_2 || []);
                const moiQuanHes = [moi_quan_he_1].concat(moi_quan_he_2 || []); // Nối mảng hoặc chuỗi
                if (phuHuynhIds.filter(id => id).length < 1) {
                    danhSachLoi.push({ dong, loi: `Phải có ít nhất 1 mối quan hệ với phụ huynh` });
                    continue;
                }
                // 4. Kiểm tra ngày sinh
                const today = new Date();
                const ngaySinh = new Date(ngay_sinh);
                if (ngaySinh > today) {
                    danhSachLoi.push({ dong, loi: `Ngày sinh không hợp lý` });
                    continue;
                }
                // 5. Kiểm tra giới tính hợp lệ
                if (!['Nam', 'Nữ'].includes(gioi_tinh)) {
                    danhSachLoi.push({ dong, loi: `Giới tính chỉ có Nam hoặc Nữ` });
                    continue;
                }
                // 6. Kiểm tra loại học sinh hợp lệ
                if (!['Bán trú', 'Không bán trú'].includes(loai_hoc_sinh)) {
                    danhSachLoi.push({ dong, loi: `Loại học sinh chỉ có Bán trú hoặc Không bán trú` });
                    continue;
                }
                // 7. Thêm học sinh
                const [result] = await conn.execute(`
                    INSERT INTO hoc_sinh (ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh)
                    VALUES (?, ?, ?, ?, ?)`, [ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh]);
                const hocSinhId = result.insertId;
                // 8. Xử lý ảnh
                const duongDanAnh = [anh1, anh2, anh3];
                const duongDanMoi = await diChuyenVaDoiTenAnh(hocSinhId, ho_ten, duongDanAnh);
                for (const duongDan of duongDanMoi) {
                    if (duongDan) {
                        await conn.execute(`
                            INSERT INTO hinh_anh_hoc_sinh (hoc_sinh_id, duong_dan_anh)
                            VALUES (?, ?)
                            `, [hocSinhId, duongDan]);
                    }
                }
                // 9. Thêm mối quan hệ với phụ huynh
                for (let i = 0; i < phuHuynhIds.length; i++) {
                    if (phuHuynhIds[i]) {
                        await conn.execute(`
                            INSERT INTO phu_huynh_hoc_sinh (hoc_sinh_id, phu_huynh_id, moi_quan_he)
                            VALUES (?, ?, ?)
                            `, [hocSinhId, phuHuynhIds[i], moiQuanHes[i]]);
                    }
                }
            }
            if (danhSachLoi.length > 0) {
                await conn.rollback();
                return { success: false, message: 'Đã xảy ra lỗi khi thêm học sinh', messageType: 'error', danhSachLoi };
            }
            await conn.commit();
            return { success: true, message: 'Thêm học sinh thành công', messageType: 'success' };
        }
        catch (error) {
            if (conn) await conn.rollback();
            console.log(error);
            return {
                success: false,
                message: 'Thêm hàng loạt học sinh thất bại',
                messageType: 'error',
                errorDetails: {
                    dong: parseInt(error.message.match(/dòng \d+/)?.[0]?.replace('dòng ', '') || 0),
                    loi: error.message
                }
            };
        } finally {
            if (conn) conn.release();
        }
    }
    static async xuatFileExcel(){
        const conn = await pool.getConnection();
        try{
            const [rows] = await conn.query(`SELECT * FROM hoc_sinh WHERE daXoa=0`);
            return rows;
        }
        catch(error){
            console.log(error);
            return [];
        }
        finally{
            if(conn) conn.release();
        }
    }
}
async function diChuyenVaDoiTenAnh(hocSinhId, hoTen, anhDuongDan) {
    const duongDanMoi = [];
    const hoTenMoi = hoTen.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
        .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Chuyển đ -> d
        .replace(/\s+/g, '_') // Bỏ khoảng trắng
        .replace(/[^a-zA-Z0-9_-]/g, ''); // Loại ký tự đặc biệt
    const destinationDir = path.join(__dirname, '../public/images/temp'); // Thư mục chứa ảnh
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }
    for (let i = 0; i < anhDuongDan.length; i++) {
        if (anhDuongDan[i] && fs.existsSync(anhDuongDan[i])) {
            const ext = path.extname(anhDuongDan[i]);
            const newFileName = `${hocSinhId}_${hoTenMoi}_${i + 1}${ext}`
            const newPath = path.join(destinationDir, newFileName);
            fs.copyFileSync(anhDuongDan[i], newPath);
            duongDanMoi.push(`images/temp/${newFileName}`); // Tên duong_dan_anh
        }
    }
    return duongDanMoi;
}
module.exports = HocSinhModel;