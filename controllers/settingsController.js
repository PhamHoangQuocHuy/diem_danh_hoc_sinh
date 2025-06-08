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
            res.render('admin_index', {
                taiKhoan,
                message: null,
                messageType: null
            });
        } catch (error) {
            console.error('Lỗi hiển thị cài đặt:', error);
            res.status(500).send('Lỗi server');
        }
    }

    static async capNhatCaiDatCaNhan(req, res) {
        let conn;
        let tempFilePath = null;
        try {
            const taiKhoanId = req.params.id;
            const { sdt, dia_chi, mat_khau_cu, mat_khau_moi, mat_khau_xac_nhan } = req.body;
            const anhDaiDienFile = req.file;
            conn = await pool.getConnection();
            const [taiKhoanRows] = await conn.query('SELECT * FROM tai_khoan WHERE tai_khoan_id = ?', [taiKhoanId]);
            if (taiKhoanRows.length === 0) {
                return res.status(404).json({ message: 'Tài khoản không tồn tại' });
            }
            const taiKhoan = taiKhoanRows[0];
            const oldAvatar = taiKhoan.anh_dai_dien || 'default_avatar.jpg';
            const updateData = {};

            if (sdt) {
                if (!sdt.trim()) {
                    return res.render('admin_index', {
                        taiKhoan,
                        message: 'Số điện thoại không được rỗng',
                        messageType: 'error'
                    });
                }
                const [existingRows] = await conn.query('SELECT * FROM tai_khoan WHERE sdt = ? AND tai_khoan_id != ?', [sdt, taiKhoanId]);
                if (existingRows.length > 0) {
                    return res.render('admin_index', {
                        taiKhoan,
                        message: 'Số điện thoại đã tồn tại',
                        messageType: 'error'
                    });
                }
                updateData.sdt = sdt;
            } else {
                updateData.sdt = taiKhoan.sdt;
            }

            if (dia_chi) {
                if (!dia_chi.trim()) {
                    return res.render('admin_index', {
                        taiKhoan,
                        message: 'Địa chỉ không được rỗng',
                        messageType: 'error'
                    });
                }
                updateData.dia_chi = dia_chi;
            } else {
                updateData.dia_chi = taiKhoan.dia_chi;
            }

            let newAvatar = oldAvatar;
            if (anhDaiDienFile) {
                tempFilePath = path.join(__dirname, '../images', anhDaiDienFile.filename);
                const extension = path.extname(anhDaiDienFile.originalname).toLowerCase();
                const cleanName = toAlias(taiKhoan.ho_ten);
                if (oldAvatar === 'default_avatar.jpg') {
                    newAvatar = `${taiKhoanId}_${cleanName}${extension}`;
                } else {
                    const oldImagePath = path.join(__dirname, '../images', oldAvatar);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                    newAvatar = oldAvatar;
                }
                const finalPath = path.join(__dirname, '../images', newAvatar);
                fs.renameSync(tempFilePath, finalPath);
                updateData.anh_dai_dien = newAvatar;
            }

            if (mat_khau_cu || mat_khau_moi || mat_khau_xac_nhan) {
                if (!mat_khau_cu || !mat_khau_moi || !mat_khau_xac_nhan) {
                    return res.render('admin_index', {
                        taiKhoan,
                        message: 'Phải điền mật khẩu cũ, mật khẩu mới và mật khẩu xác nhận',
                        messageType: 'error'
                    });
                }
                if (mat_khau_moi !== mat_khau_xac_nhan) {
                    return res.render('admin_index', {
                        taiKhoan,
                        message: 'Mật khẩu không trùng khớp',
                        messageType: 'error'
                    });
                }
                const isMatch = await bcrypt.compare(mat_khau_cu, taiKhoan.mat_khau);
                if (!isMatch) {
                    return res.render('admin_index', {
                        taiKhoan,
                        message: 'Mật khẩu cũ không đúng',
                        messageType: 'error'
                    });
                }

                const hashedPassword = await bcrypt.hash(mat_khau_moi, saltRounds);
                updateData.mat_khau = hashedPassword;

            }

            if (Object.keys(updateData).length > 0) {
                await conn.query('UPDATE tai_khoan SET ? WHERE tai_khoan_id = ?', [updateData, taiKhoanId]);
                return res.render('admin_index', {
                    taiKhoan: { ...taiKhoan, ...updateData }, // cập nhật dữ liệu mới để view dùng
                    message: 'Cập nhật thành công!',
                    messageType: 'success'
                });

            } else {
                return res.render('admin_index', {
                    taiKhoan,
                    message: 'Không có thay đổi nào được cập nhật',
                    messageType: 'info'
                });
            }
        } catch (error) {
            console.error('Lỗi cập nhật cài đặt:', error);
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            res.status(500).send('Lỗi cập nhật thông tin');
        } finally {
            if (conn && typeof conn.release === 'function') conn.release();
        }
    }
}

module.exports = SettingsController;