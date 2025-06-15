const pool = require('../config/connect_database');
const TaiKhoanModel = require('../models/taiKhoanModel');
const { toAlias } = require('../config/multerTaiKhoan');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { guiMailTaiKhoan } = require('../config/mailConfig')

class TaiKhoanController {
    static async hienThiDanhSachTaiKhoan(req, res) {
        let conn;
        try {
            // Phân trang
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const offset = (page - 1) * limit;
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan(limit, offset);
            const totalTaiKhoan = await TaiKhoanModel.demTongTaiKhoan();
            const totalPages = Math.ceil(totalTaiKhoan / limit);


            conn = await pool.getConnection();
            for (let taiKhoan of danhSachTaiKhoan) {
                if (taiKhoan.ten_vai_tro === 'Giáo viên') {
                    // Lấy giao_vien_id từ bảng giao_vien theo tai_khoan_id
                    const [giaoVienRows] = await conn.query('SELECT giao_vien_id FROM giao_vien WHERE tai_khoan_id = ?', [taiKhoan.tai_khoan_id]);
                    if (giaoVienRows.length > 0) {
                        const giaoVienId = giaoVienRows[0].giao_vien_id;
                        const [bangCaps] = await conn.query('SELECT loai_bang_cap FROM bang_cap WHERE giao_vien_id = ?', [giaoVienId]);
                        taiKhoan.loai_bang_cap = bangCaps.map(bc => bc.loai_bang_cap);
                    } else {
                        taiKhoan.loai_bang_cap = [];
                    }
                } else {
                    taiKhoan.loai_bang_cap = [];
                }
            }
            return res.status(200).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan,
                currentPage: page,
                totalPages,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            return res.status(500).render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan: [],
                message: 'Đã xảy ra lỗi khi lấy thông tin.',
                messageType: 'error'
            });
        } finally {
            if (conn)
                conn.release();
        }
    }
    static async themTaiKhoan(req, res) {
        let tempFilePath = null;
        try {
            const {
                ho_ten,
                ngaysinh,
                gioi_tinh,
                so_cmnd,
                dia_chi,
                email,
                sdt,
                mat_khau,
                ten_vai_tro,
                loai_bang_cap,
            } = req.body;

            if (req.file) {
                tempFilePath = path.join(__dirname, '../images', req.file.filename);
            }
            // Kiểm tra email, sdt, so_cmnd
            if (await TaiKhoanModel.kiemTraEmail(email)) {
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Email đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (await TaiKhoanModel.kiemTraSoDienThoai(sdt)) {
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số điện thoại đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (await TaiKhoanModel.kiemTraSoCMND(so_cmnd)) {
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số CMND đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            // Bắt buộc nhập ít nhất 1 loại bằng cấp nếu là giáo viên
            let loaiBangCapArray = [];
            if (ten_vai_tro === 'Giáo viên') {
                if (!loai_bang_cap || (Array.isArray(loai_bang_cap) && loai_bang_cap.length === 0) || (typeof loai_bang_cap === 'string' && loai_bang_cap.trim() === '')) {
                    if (tempFilePath && fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
                    return res.render('admin_index', {
                        page: 'pages/quanLyTaiKhoan',
                        message: 'Giáo viên phải có ít nhất một bằng cấp',
                        danhSachTaiKhoan,
                        messageType: 'error',
                        formData: req.body,
                    });
                }

                loaiBangCapArray = Array.isArray(loai_bang_cap) ? loai_bang_cap : [loai_bang_cap];
            }

            const result = await TaiKhoanModel.themTaiKhoan({
                ho_ten,
                ngaysinh,
                gioi_tinh,
                so_cmnd,
                dia_chi,
                email,
                sdt,
                mat_khau,
                ten_vai_tro,
                loai_bang_cap: loaiBangCapArray,
                anh_dai_dien: 'default_avatar.jpg'
            });
            //console.log('Kết quả thêm tài khoản:', result);
            if (!result.success) {
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                return res.redirect(`/tai-khoan?message=Thêm tài khoản thất bại&messageType=error`);
            }
            if (!result.insertId) {
                throw new Error('Không lấy được insertId sau khi thêm tài khoản');
            }
            // Gửi mail
            //console.log('Đang gửi mail tới:', email);
            await guiMailTaiKhoan({
                to: email,
                name: ho_ten,
                email: email,
                password: mat_khau,
            })

            // Xử lý ảnh đại diện sau khi có ID tài khoản
            let finalImageName = 'default_avatar.jpg';
            if (req.file) {
                try {
                    const taiKhoanId = result.insertId;
                    const extension = path.extname(req.file.originalname).toLowerCase();
                    // Tạo tên file mới theo format: taiKhoanId_hoTen.jpg
                    const cleanName = toAlias(ho_ten);
                    finalImageName = `${taiKhoanId}_${cleanName}${extension}`;
                    // Đường dẫn file cuối cùng
                    const finalPath = path.join(__dirname, '../images', finalImageName);
                    // Di chuyển và đổi tên file từ tạm sang tên cuối cùng
                    fs.renameSync(tempFilePath, finalPath);
                    // Cập nhật tên ảnh trong database
                    await TaiKhoanModel.capNhatAnhDaiDien(taiKhoanId, finalImageName);
                    //console.log(`Ảnh đã được lưu: ${finalImageName}`);
                } catch (imageError) {
                    console.error('Lỗi xử lý ảnh:', imageError);
                    // Xóa file tạm nếu có lỗi
                    if (tempFilePath && fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    // Vẫn giữ tài khoản nhưng dùng ảnh mặc định
                    //console.log('Sử dụng ảnh mặc định do lỗi xử lý ảnh upload');
                }
            }
            return res.redirect(`/tai-khoan?message=Thêm tài khoản thành công&messageType=success`);

        } catch (error) {
            console.error('Lỗi thêm tài khoản:', error);

            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (unlinkError) {
                    console.error('Lỗi xóa file tạm:', unlinkError);
                }
            }
            return res.redirect(`/tai-khoan?message=Thêm tài khoản thất bại&messageType=error`);
        }
    }
    static async xoaTaiKhoan(req, res) {
        const taiKhoanId = req.params.id;
        try {
            const result = await TaiKhoanModel.xoaTaiKhoan(taiKhoanId);
            if (!result.success) {
                return res.redirect(`/tai-khoan?message=${result.message}&messageType=${result.messageType}`);
            }
            return res.redirect('/tai-khoan?message=Xóa tài khoản thành công&messageType=success');

        } catch (error) {
            console.error(error);
            res.redirect(`/tai-khoan?message=Xóa tài khoản thất bại&messageType=error`);
        }
    }
    static async suaTaiKhoan(req, res) {
        const id = req.params.id;
        const taiKhoan = {
            ...req.body,
            loai_bang_cap: Array.isArray(req.body.loai_bang_cap)
                ? req.body.loai_bang_cap
                : (req.body.loai_bang_cap ? [req.body.loai_bang_cap] : []),
        };
        let tempFilePath = null;

        try {
            const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan();
            // Kiểm tra email, sdt, so_cmnd trùng lặp trong DB
            if (danhSachTaiKhoan.some(tk => tk.email === taiKhoan.email && tk.tai_khoan_id != id)) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Email đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (danhSachTaiKhoan.some(tk => tk.sdt === taiKhoan.sdt && tk.tai_khoan_id != id)) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số điện thoại đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            if (danhSachTaiKhoan.some(tk => tk.so_cmnd === taiKhoan.so_cmnd && tk.tai_khoan_id != id)) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Số CMND đã thuộc 1 tài khoản khác',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }
            // Kiểm tra loại bằng cấp nếu là giáo viên
            if (taiKhoan.ten_vai_tro === 'Giáo viên' && taiKhoan.loai_bang_cap.length === 0) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    message: 'Giáo viên phải có ít nhất một bằng cấp',
                    danhSachTaiKhoan,
                    messageType: 'error',
                    formData: req.body,
                });
            }

            let oldAvatar = req.body.current_anh_dai_dien || 'default_avatar.jpg';
            let anhDaiDien = oldAvatar;
            if (req.file) {
                tempFilePath = path.join(__dirname, '../images', req.file.filename);
                const extension = path.extname(req.file.originalname).toLowerCase();
                const cleanName = toAlias(taiKhoan.ho_ten);
                if (oldAvatar === 'default_avatar.jpg') {
                    anhDaiDien = `${id}_${cleanName}${extension}`;
                    const finalPath = path.join(__dirname, '../images', anhDaiDien);
                    fs.renameSync(tempFilePath, finalPath);
                } else {
                    // Overwrite the old custom avatar file
                    const oldImagePath = path.join(__dirname, '../images', oldAvatar);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                    fs.renameSync(tempFilePath, oldImagePath);
                    anhDaiDien = oldAvatar;
                }
            }

            // Thêm anhDaiDien vào taiKhoan để cập nhật
            taiKhoan.anh_dai_dien = anhDaiDien;
            await TaiKhoanModel.suaTaiKhoan(id, taiKhoan);

            res.redirect('/tai-khoan?message=Cập nhật thành công&messageType=success');
        } catch (error) {
            console.error(error);
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath); // Xóa file tạm nếu có lỗi
            }
            res.redirect(`/tai-khoan?message=Cập nhật thất bại&messageType=error`);
        }
    }
    static async timTaiKhoan(req, res) {
        const { tim_kiem } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const offset = (page - 1) * limit;
        const totalTaiKhoan = await TaiKhoanModel.demTongTaiKhoan();
        const totalPages = Math.ceil(totalTaiKhoan / limit);
        try {
            if (!tim_kiem || tim_kiem.trim() === '') {
                const danhSachTaiKhoan = await TaiKhoanModel.hienThiTaiKhoan(limit, offset);
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan,
                    currentPage: page,
                    totalPages,
                    message: 'Vui lòng nhập tên để tìm kiếm.',
                    messageType: 'error',
                });
            }
            const danhSachTaiKhoan = await TaiKhoanModel.timTaiKhoanTheoTen(tim_kiem);
            if (danhSachTaiKhoan.length > 0) {
                return res.render('admin_index', {
                    page: 'pages/quanLyTaiKhoan',
                    danhSachTaiKhoan: danhSachTaiKhoan.slice(offset, offset + limit),// Cắt danh sách theo trang hiện tại
                    currentPage: page,
                    totalPages,
                    message: `Đã tìm thấy tài khoản với "${tim_kiem}"`,
                    messageType: 'success',
                });
            }
            return res.render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan: danhSachTaiKhoan.slice(offset, offset + limit),
                currentPage: page,
                totalPages,
                message: `Không tìm thấy tài khoản với "${tim_kiem}"`,
                messageType: 'error',
            });
        }
        catch (error) {
            res.render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan: [],
                currentPage: page,
                totalPages,
                message: "Đã xảy ra lỗi",
                messageType: 'error',
            });
        }
    }
    static async chiTietTaiKhoan(req, res) {
        const { id } = req.params;
        try {
            const taiKhoan = await TaiKhoanModel.layTaiKhoanTheoId(id);
            if (!taiKhoan) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }
            const anhDaiDien = taiKhoan.anh_dai_dien || 'default_avatar.jpg';
            taiKhoan.anh_dai_dien = `/images/${anhDaiDien}`;
            res.json(taiKhoan);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
    static async locTheoVaiTro(req, res) {
        try {
            // Phân trang
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const offset = (page - 1) * limit;
            const totalTaiKhoan = await TaiKhoanModel.demTongTaiKhoan();
            const totalPages = Math.ceil(totalTaiKhoan / limit);
            const ten_vai_tro = req.query.ten_vai_tro || '';
            const dsTaiKhoan = await TaiKhoanModel.layTaiKhoanTheoVaiTro(ten_vai_tro);
            return res.render('admin_index', {
                page: 'pages/quanLyTaiKhoan',
                danhSachTaiKhoan: dsTaiKhoan.slice(offset, offset + limit), // Cắt danh sách theo trang hiện tại
                message: '',
                messageType: 'info',
                currentPage: page,
                totalPages
            })
        }
        catch (error) {
            console.error();
            res.status(500).send('Lỗi');
        }
    }
    static async themHangLoat(req, res) {
        try {
            const filePath = req.file.path;
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const danhSachTaiKhoan = [];
            const danhSachLoi = [];

            const validRoles = ['Admin', 'Giáo viên', 'Phụ huynh', 'Hiệu trưởng'];
            const validGenders = ['Nam', 'Nữ'];

            for (let index = 0; index < data.length; index++) {
                const row = data[index];
                const {
                    ho_ten,
                    ngaysinh,
                    gioi_tinh,
                    so_cmnd,
                    dia_chi,
                    email,
                    sdt,
                    mat_khau,
                    ten_vai_tro,
                    loai_bang_cap,
                } = row;

                // Xử lý định dạng ngày sinh
                let ngaySinhFormatted = '';
                if (typeof ngaysinh === 'number') {
                    const dateObj = new Date(Math.round((ngaysinh - 25569) * 86400 * 1000));
                    ngaySinhFormatted = dateObj.toISOString().split('T')[0];
                } else if (typeof ngaysinh === 'string') {
                    ngaySinhFormatted = new Date(ngaysinh).toISOString().split('T')[0];
                }

                // Kiểm tra dữ liệu thiếu
                if (!ho_ten || !ngaySinhFormatted || !gioi_tinh || !so_cmnd || !dia_chi || !email || !sdt || !mat_khau || !ten_vai_tro) {
                    danhSachLoi.push({ email: email || 'Không xác định', loi: 'Thiếu dữ liệu', dong: index + 2 });
                    continue;
                }

                // Kiểm tra định dạng
                if (!validGenders.includes(gioi_tinh)) {
                    danhSachLoi.push({ email, loi: 'Giới tính không hợp lệ (chỉ Nam hoặc Nữ)', dong: index + 2 });
                    continue;
                }
                if (!validRoles.includes(ten_vai_tro)) {
                    danhSachLoi.push({ email, loi: 'Vai trò không hợp lệ', dong: index + 2 });
                    continue;
                }
                if (!/^079\d{9}$/.test(so_cmnd)) {
                    danhSachLoi.push({ email, loi: 'Số CMND phải bắt đầu bằng 079 và có 12 chữ số', dong: index + 2 });
                    continue;
                }
                if (!/^0\d{9}$/.test(sdt)) {
                    danhSachLoi.push({ email, loi: 'Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số', dong: index + 2 });
                    continue;
                }
                if (ten_vai_tro === 'Giáo viên' && (!loai_bang_cap || loai_bang_cap.trim() === '')) {
                    danhSachLoi.push({ email, loi: 'Giáo viên phải có ít nhất một bằng cấp', dong: index + 2 });
                    continue;
                }

                // Kiểm tra trùng lặp
                if (await TaiKhoanModel.kiemTraEmail(email)) {
                    danhSachLoi.push({ email, loi: 'Email đã tồn tại', dong: index + 2 });
                    continue;
                }
                if (await TaiKhoanModel.kiemTraSoCMND(so_cmnd)) {
                    danhSachLoi.push({ email, loi: 'CMND đã tồn tại', dong: index + 2 });
                    continue;
                }
                if (await TaiKhoanModel.kiemTraSoDienThoai(sdt)) {
                    danhSachLoi.push({ email, loi: 'Số điện thoại đã tồn tại', dong: index + 2 });
                    continue;
                }

                // Chuẩn bị tài khoản
                const taiKhoan = {
                    ho_ten,
                    ngaysinh: ngaySinhFormatted,
                    gioi_tinh,
                    so_cmnd,
                    dia_chi,
                    email,
                    sdt,
                    mat_khau,
                    ten_vai_tro,
                    loai_bang_cap: ten_vai_tro === 'Giáo viên' && loai_bang_cap ? loai_bang_cap.split(',').map(bc => bc.trim()) : [],
                };

                danhSachTaiKhoan.push(taiKhoan);
            }

            // Nếu có lỗi, không gọi themHangLoat
            if (danhSachLoi.length > 0) {
                return res.status(400).json({
                    message: `Có ${danhSachLoi.length} lỗi trong file Excel`,
                    soLuongThanhCong: 0,
                    soLuongLoi: danhSachLoi.length,
                    danhSachLoi,
                });
            }

            // Thêm tài khoản và gửi email
            const result = await TaiKhoanModel.themHangLoat(danhSachTaiKhoan);
            if (result.success) {
                for (const tk of danhSachTaiKhoan) {
                    await guiMailTaiKhoan({
                        to: tk.email,
                        name: tk.ho_ten,
                        email: tk.email,
                        password: tk.mat_khau,
                    });
                }
                return res.status(200).json({
                    message: `Đã thêm ${danhSachTaiKhoan.length} tài khoản thành công`,
                    soLuongThanhCong: danhSachTaiKhoan.length,
                    soLuongLoi: 0,
                    danhSachLoi: [],
                });
            } else {
                return res.status(500).json({
                    message: result.message,
                    soLuongThanhCong: 0,
                    soLuongLoi: result.errorDetails ? 1 : 0,
                    danhSachLoi: result.errorDetails ? [result.errorDetails] : [],
                });
            }
        } catch (error) {
            console.error('Lỗi khi thêm hàng loạt:', error);
            return res.status(500).json({
                message: 'Lỗi hệ thống khi thêm tài khoản hàng loạt',
                error: error.message,
                soLuongThanhCong: 0,
                soLuongLoi: 1,
                danhSachLoi: [{ email: 'Không xác định', loi: error.message, dong: 0 }],
            });
        }
    }
}
module.exports = TaiKhoanController;