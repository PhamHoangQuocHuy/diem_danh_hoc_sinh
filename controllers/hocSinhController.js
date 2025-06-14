const pool  = require('../config/connect_database');
const path = require('path');
const fs = require('fs');
const HocSinhModel = require('../models/hocSinhModel');
class HocSinhController {
    static async hienThiHocSinh(req, res) {
        try {
            //const danhSachHocSinh = await HocSinhModel.layDanhSachHocSinh();
            const danhSachPhuHuynh = await HocSinhModel.layDanhSachPhuHuynh();
            const danhSachLopHoc_HocKy = await HocSinhModel.layDanhSachLopHoc_HocKy();
            const danhSachHocSinhKemLop = await HocSinhModel.layDanhSachHocSinhKemLop();
            req.danhSachLopHoc_HocKy = danhSachLopHoc_HocKy; // Lưu để Multer sử dụng
            return res.render('admin_index', {
                page: 'pages/quanLyHocSinh',
                danhSachHocSinh: danhSachHocSinhKemLop.length > 0 ? danhSachHocSinhKemLop : danhSachHocSinh,
                danhSachPhuHuynh,
                danhSachLopHoc_HocKy,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyHocSinh',
                danhSachHocSinh: [],
                danhSachPhuHuynh: [],
                danhSachLopHoc_HocKy: [],
                message: 'Có lỗi khi lấy danh sách học sinh',
                messageType: 'error'
            })
        }
    }
    static async themHocSinh(req, res) {
        const filesToDelete = [];
        try {
            const {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids,
                lop_hoc_ids,
                moi_quan_he
            } = req.body
            // console.log('----------BoDy Request----------');
            // console.log(req.body)
            // console.log('----------Files Request----------');
            // console.log(req.files);
            // Chuẩn hóa mảng
            let phu_huynh_ids_arr = Array.isArray(phu_huynh_ids) ? phu_huynh_ids : phu_huynh_ids ? [phu_huynh_ids] : [];
            let lop_hoc_ids_arr = Array.isArray(lop_hoc_ids) ? lop_hoc_ids : lop_hoc_ids ? [lop_hoc_ids] : [];
            let moi_quan_he_arr = Array.isArray(moi_quan_he) ? moi_quan_he : moi_quan_he ? [moi_quan_he] : [];
            // Debug và kiểm tra đúng 3 ảnh
            const danhSachAnh = Array.isArray(req.files) ? req.files : [];
            // console.log('Received files:', danhSachAnh.map(f => ({ name: f.originalname, path: f.path, size: f.size })));
            // console.log('Kiểu req.files:', typeof req.files);
            // console.log('Nội dung req.files:', req.files);
            if (!Array.isArray(req.files) || req.files.length !== 3) {
                let errorMessage = 'Phải tải lên đúng 3 ảnh học sinh!';
                if (req.files && req.files.length > 0) {
                    errorMessage += ` Chỉ nhận được ${req.files.length} ảnh. Vui lòng kiểm tra định dạng (.jpg, .jpeg, .png) và kích thước (< 5MB).`;
                    filesToDelete.push(...(Array.isArray(req.files) ? req.files : []));
                    filesToDelete.forEach(file => {
                        try {
                            if (file && file.path) fs.unlinkSync(file.path);
                        } catch (e) {
                            console.error('Error deleting file:', e);
                        }
                    });


                }
                return res.redirect(`/hoc-sinh?message=Lỗi khi thêm ảnh&messageType=error`);
            }
            // Chuẩn bị dữ liệu
            const data = {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids: phu_huynh_ids_arr,
                lop_hoc_ids: lop_hoc_ids_arr,
                moi_quan_he: moi_quan_he_arr
            };
            const result = await HocSinhModel.themThongTinHocSinh(data);
            let conn;
            if (result.success) {
                const { hoc_sinh_id, nam_hoc, ho_ten } = result;
                // Đổi tên file ảnh
                const newImagePaths = [];
                const safeHoTen = ho_ten.replace(/[^a-zA-Z0-9]/g, '_');
                conn = await pool.getConnection();
                try {
                    await conn.beginTransaction();
                    for (let i = 0; i < danhSachAnh.length; i++) {
                        const oldPath = danhSachAnh[i].path;
                        const ext = path.extname(danhSachAnh[i].originalname).toLowerCase();
                        const newFileName = `${hoc_sinh_id}_${safeHoTen}_${i + 1}${ext}`;
                        const newPath = path.join(__dirname, '..', 'public', 'images', nam_hoc, newFileName);

                        filesToDelete.push({ path: newPath }); // đảm bảo nếu lỗi còn xóa được

                        fs.mkdirSync(path.dirname(newPath), { recursive: true });
                        try {
                            fs.renameSync(oldPath, newPath);
                            console.log(`Renamed file to: ${newPath}`);
                        } catch (e) {
                            console.error(`Error renaming file: ${e.message}`);
                            throw e;
                        }

                        const dbPath = path.join('images', nam_hoc, newFileName).replace(/\\/g, '/');
                        newImagePaths.push(dbPath);

                        await conn.execute(`
                            INSERT INTO hinh_anh_hoc_sinh (hoc_sinh_id, duong_dan_anh)
                            VALUES (?, ?)
                        `, [hoc_sinh_id, dbPath]);
                    }

                    await conn.commit();
                }
                catch (error) {
                    if (conn) await conn.rollback();
                    console.error('Lỗi khi đổi tên ảnh:', error);
                    // Xóa các file ảnh đã tải lên
                    newImagePaths.forEach(filePath => {
                        try {
                            fs.unlinkSync(path.join(__dirname, '..', 'public', filePath));
                        } catch (e) { }
                    });
                    return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi lưu ảnh học sinh&messageType=error`);
                }
                finally {
                    if (conn) conn.release();
                }
                return res.redirect(`/hoc-sinh?message=Thêm học sinh thành công!&messageType=success`);
            } else {
                // Xóa các file ảnh đã tải lên nếu có lỗi
                if (req.files) {
                    filesToDelete.forEach(file => {
                        try {
                            fs.unlinkSync(file.path);
                        } catch (e) {
                            console.error('Error deleting file:', e);
                        }
                    });

                }
                return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
            }

        }
        catch (error) {
            console.error(error);
            // Xóa các file ảnh đã tải lên nếu có lỗi
            if (req.files) {
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (e) {
                        console.error('Error deleting file:', e);
                    }
                });

            }
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi thêm học sinh&messageType=error`);
        }
    }
}
module.exports = HocSinhController;