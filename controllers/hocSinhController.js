const pool = require('../config/connect_database');
const path = require('path');
const fs = require('fs');
const HocSinhModel = require('../models/hocSinhModel');
class HocSinhController {
    static async hienThiHocSinh(req, res) {
        try {
            const danhSachHocSinh = await HocSinhModel.layDanhSachHocSinh();
            const danhSachPhuHuynh = await HocSinhModel.layDanhSachPhuHuynh();
            req.files = []; // Lưu để Multer sử dụng
            return res.render('admin_index', {
                page: 'pages/quanLyHocSinh',
                danhSachHocSinh,
                danhSachPhuHuynh,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyHocSinh',
                danhSachHocSinh: [],
                danhSachPhuHuynh: [],
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
                moi_quan_he
            } = req.body;

            const phu_huynh_ids_arr = Array.isArray(phu_huynh_ids) ? phu_huynh_ids : phu_huynh_ids ? [phu_huynh_ids] : [];
            const moi_quan_he_arr = Array.isArray(moi_quan_he) ? moi_quan_he : moi_quan_he ? [moi_quan_he] : [];

            if (!Array.isArray(req.files) || req.files.length !== 3) {
                const message = `Phải tải lên đúng 3 ảnh học sinh! (Hiện có: ${req.files?.length || 0})`;
                filesToDelete.push(...(req.files || []));
                filesToDelete.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
                return res.redirect(`/hoc-sinh?message=${message}&messageType=error`);
            }

            // Tạo học sinh
            const result = await HocSinhModel.themThongTinHocSinh({
                ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh,
                phu_huynh_ids: phu_huynh_ids_arr,
                moi_quan_he: moi_quan_he_arr
            });

            if (!result.success) {
                return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
            }

            const hoc_sinh_id = result.hoc_sinh_id;
            // Định dạng lưu vào tên hình ảnh
            const safeHoTen = ho_ten
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
                .replace(/đ/g, 'd').replace(/Đ/g, 'D')           // đ → d
                .replace(/[^a-zA-Z0-9]/g, '');                   // bỏ hết ký tự đặc biệt, giữ chữ + số


            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const ext = path.extname(file.originalname).toLowerCase(); // lấy đúng đuôi file gốc (.jpg/.png)
                const newFileName = `${hoc_sinh_id}_${safeHoTen}_${i + 1}${ext}`;
                const newPath = path.join(path.dirname(file.path), newFileName);

                try {
                    fs.renameSync(file.path, newPath);
                } catch (e) {
                    console.error(`Lỗi đổi tên ảnh: ${e.message}`);
                    continue;
                }

                // Đường dẫn lưu trong DB
                const dbPath = path.relative(path.join(__dirname, '..', 'public'), newPath).replace(/\\/g, '/');
                await pool.execute(`
                    INSERT INTO hinh_anh_hoc_sinh (hoc_sinh_id, duong_dan_anh)
                    VALUES (?, ?)
                `, [hoc_sinh_id, dbPath]);
            }


            return res.redirect(`/hoc-sinh?message=Thêm học sinh thành công!&messageType=success`);
        } catch (err) {
            console.error(err);
            filesToDelete.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi thêm học sinh&messageType=error`);
        }
    }
    static async xoaHocSinh(req, res) {
        const hocSinhId = req.params.id;
        try {
            const result = await HocSinhModel.xoaThongTinHocSinh(hocSinhId);
            if (result.success) {
                return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
            } else {
                return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
            }
        } catch (error) {
            console.error(error);
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi xóa học sinh&messageType=error`);
        }
    }
    static async suaHocSinh(req, res) {
        const hocSinhId = req.params.id;
        const filesToDelete = [];
        try {
            const {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids,
                moi_quan_he
            } = req.body;

            const phu_huynh_ids_arr = Array.isArray(phu_huynh_ids) ? phu_huynh_ids : phu_huynh_ids ? [phu_huynh_ids] : [];
            const moi_quan_he_arr = Array.isArray(moi_quan_he) ? moi_quan_he : moi_quan_he ? [moi_quan_he] : [];

            // Xử lý ảnh
            let duong_dan_anh = [];
            if (req.files && req.files.length > 0) {
                if (req.files.length !== 3) {
                    filesToDelete.push(...req.files);
                    filesToDelete.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
                    return res.redirect(`/hoc-sinh?message=Phải tải lên đúng 3 ảnh học sinh!&messageType=error`);
                }
                const safeHoTen = ho_ten
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                    .replace(/[^a-zA-Z0-9]/g, '');
                duong_dan_anh = req.files.map((file, i) => {
                    const ext = path.extname(file.originalname).toLowerCase();
                    const newFileName = `${hocSinhId}_${safeHoTen}_${i + 1}${ext}`;
                    const newPath = path.join(path.dirname(file.path), newFileName);
                    fs.renameSync(file.path, newPath);
                    return path.relative(path.join(__dirname, '..', 'public'), newPath).replace(/\\/g, '/');
                });
            }

            const removed_images = req.body.removed_images ? req.body.removed_images.split(',') : [];

            // Xóa ảnh cũ trên hệ thống file nếu có
            if (removed_images.length > 0) {
                for (const imgPath of removed_images) {
                    const fullPath = path.join(__dirname, '..', 'public', imgPath);
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                }
            }

            // Cập nhật thông tin học sinh
            const result = await HocSinhModel.suaThongTinHocSinh(hocSinhId, {
                ho_ten, ngay_sinh, gioi_tinh, dia_chi, loai_hoc_sinh,
                phu_huynh_ids: phu_huynh_ids_arr,
                moi_quan_he: moi_quan_he_arr,
                duong_dan_anh,
                removed_images
            });

            if (!result.success) {
                return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
            }

            return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
        } catch (err) {
            console.error(err);
            filesToDelete.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi cập nhật học sinh&messageType=error`);
        }
    }
    static async timKiemHocSinh(req, res) {
        try {
            const tim_kiem = req.query.tim_kiem;
            if (!tim_kiem || tim_kiem.trim() === '') {
                return res.redirect('/hoc-sinh?message=Vui lọc nhập tên học sinh&messageType=error');
            }
            const result = await HocSinhModel.timThongTinHocSinh(tim_kiem);
            const danhSachHocSinh = await HocSinhModel.layDanhSachHocSinh();
            const danhSachPhuHuynh = await HocSinhModel.layDanhSachPhuHuynh();
            if (result.length > 0) {
                res.render('admin_index', {
                    page: 'pages/quanLyHocSinh',
                    danhSachHocSinh,
                    danhSachPhuHuynh,
                    message: `Đã tìm học sinh với tên: ${tim_kiem}`,
                    messageType: 'success'
                });
            } else {
                res.render('admin_index', {
                    page: 'pages/quanLyHocSinh',
                    danhSachHocSinh: [],
                    danhSachPhuHuynh: [],
                    message: `Không tìm thấy học sinh với tên: ${tim_kiem}`,
                    messageType: 'error'
                });
            }
        }
        catch (error) {
            console.log(error);
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi tìm học sinh&messageType=error`);
        }
    }
    static async chiTietHocSinh(req, res) {
        try {
            const { id } = req.params;
            const result = await HocSinhModel.thongTinChiTietHocSinh(id);
            if (!result.success) {
                return res.render('admin_index', {
                    page: 'pages/quanLyHocSinh',
                    danhSachHocSinh: [],
                    danhSachPhuHuynh: [],
                    message: result.message,
                    messageType: result.messageType
                });

            }
            const danhSachPhuHuynh = await HocSinhModel.layDanhSachPhuHuynh();
            return res.status(200).json(result);
        }
        catch (error) {
            console.log(error);
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi tìm học sinh&messageType=error`);
        }
    }
}
module.exports = HocSinhController;