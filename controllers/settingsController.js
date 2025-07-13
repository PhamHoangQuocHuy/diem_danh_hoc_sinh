const pool = require('../config/connect_database');
const SettingsModel = require('../models/settingsModel');
const { toAlias } = require('../config/multerTaiKhoan');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const path = require('path');
const fs = require('fs');

class SettingsController {
    static async hienThiCaiDat(req, res) {
        try {
            const taiKhoanId = req.params.id;
            const taiKhoan = await SettingsModel.layTaiKhoanTheoId(taiKhoanId);
            if (!taiKhoan) {
                return res.status(404).send('Tài khoản không tồn tại');
            }
            return res.render('admin_index', {
                taiKhoan,
                message: null,
                messageType: null
            });
        } catch (error) {
            console.error('Lỗi hiển thị cài đặt:', error);
            return res.status(500).send('Lỗi server');
        }
    }

    static async capNhatCaiDatCaNhan(req, res) {
        const layout = req.taiKhoan.ten_vai_tro === 'Admin' ? 'admin_index' : 'user_index';
        const taiKhoanId = req.params.id;
        const { sdt, dia_chi, mat_khau_cu, mat_khau_moi, mat_khau_xac_nhan } = req.body;
        const anhDaiDienFile = req.file;
        let conn, tempFilePath = null;

        const renderError = (message, taiKhoan, type = 'error') => {
            return res.render(layout, { taiKhoan, message, messageType: type });
        };

        try {
            conn = await pool.getConnection();

            // Lấy tài khoản hiện tại
            const [taiKhoanRows] = await conn.query('SELECT * FROM tai_khoan WHERE tai_khoan_id = ?', [taiKhoanId]);
            if (taiKhoanRows.length === 0) return res.status(404).json({ message: 'Tài khoản không tồn tại' });
            const taiKhoan = taiKhoanRows[0];
            const oldAvatar = taiKhoan.anh_dai_dien || 'default_avatar.jpg';
            const updateData = {};

            // Validate SDT
            if (sdt) {
                if (!sdt.trim()) return renderError('Số điện thoại không được rỗng', taiKhoan);
                const [exist] = await conn.query('SELECT * FROM tai_khoan WHERE sdt = ? AND tai_khoan_id != ?', [sdt, taiKhoanId]);
                if (exist.length > 0) return renderError('Số điện thoại đã tồn tại', taiKhoan);
                updateData.sdt = sdt;
            } else updateData.sdt = taiKhoan.sdt;

            // Validate Địa chỉ
            if (dia_chi) {
                if (!dia_chi.trim()) return renderError('Địa chỉ không được rỗng', taiKhoan);
                updateData.dia_chi = dia_chi;
            } else updateData.dia_chi = taiKhoan.dia_chi;

            // Xử lý ảnh đại diện
            if (anhDaiDienFile) {
                tempFilePath = path.join(__dirname, '../images', anhDaiDienFile.filename);
                const extension = path.extname(anhDaiDienFile.originalname).toLowerCase();
                const cleanName = toAlias(taiKhoan.ho_ten);

                let newAvatar = oldAvatar;
                if (oldAvatar === 'default_avatar.jpg') {
                    newAvatar = `${taiKhoanId}_${cleanName}${extension}`;
                } else {
                    const oldPath = path.join(__dirname, '../images', oldAvatar);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }

                const finalPath = path.join(__dirname, '../images', newAvatar);
                fs.renameSync(tempFilePath, finalPath);
                updateData.anh_dai_dien = newAvatar;
            }

            // Đổi mật khẩu nếu có
            if (mat_khau_cu || mat_khau_moi || mat_khau_xac_nhan) {
                if (!mat_khau_cu || !mat_khau_moi || !mat_khau_xac_nhan)
                    return renderError('Phải điền mật khẩu cũ, mới và xác nhận', taiKhoan);
                if (mat_khau_moi !== mat_khau_xac_nhan)
                    return renderError('Mật khẩu không trùng khớp', taiKhoan);

                const isMatch = await bcrypt.compare(mat_khau_cu, taiKhoan.mat_khau);
                if (!isMatch) return renderError('Mật khẩu cũ không đúng', taiKhoan);

                updateData.mat_khau = await bcrypt.hash(mat_khau_moi, saltRounds);
            }

            if (Object.keys(updateData).length > 0) {
                await conn.query('UPDATE tai_khoan SET ? WHERE tai_khoan_id = ?', [updateData, taiKhoanId]);
                return res.render(layout, {
                    taiKhoan: { ...taiKhoan, ...updateData },
                    message: 'Cập nhật thành công!',
                    messageType: 'success'
                });
            } else {
                return res.render(layout, {
                    taiKhoan,
                    message: 'Không có thay đổi nào được cập nhật',
                    messageType: 'info'
                });
            }
        } catch (error) {
            console.error('Lỗi cập nhật cài đặt:', error);
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            return res.status(500).send('Lỗi cập nhật thông tin');
        } finally {
            if (conn) conn.release();
        }
    }

}

module.exports = SettingsController;