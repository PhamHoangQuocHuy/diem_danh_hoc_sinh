const quenMatKhauModel = require('../models/quenMatKhauModel');
const { guiEmailQuenMatKhau } = require('../config/mailConfig');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
class QuenMatKhauController {
    static async guiEmail(req, res) {
        const { email } = req.body;
        try {
            const taiKhoan = await quenMatKhauModel.layThongTinTaiKhoan(email);
            if (!taiKhoan) {
                return res.redirect('/quen-mat-khau?message=Email không tồn tại&messageType=error')
            }
            // Tạo JWT token (hết hạn sau 1 giờ)
            const token = jwt.sign(
                { email: taiKhoan.email },
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: '1h' }
            );
            const resetLink = `http://localhost:3001/dat-lai-mat-khau?token=${token}`;
            await guiEmailQuenMatKhau({
                to: email,
                name: taiKhoan.hoTen,
                link: resetLink
            });
            return res.redirect('/quen-mat-khau?message=Liên kết đã được gửi&messageType=success');
        }
        catch (error) {
            console.log(error);
            return res.redirect('/quen-mat-khau?message=Lỗi server&messageType=error');
        }
    }
    static async hienThiDatLaiMatKhau(req, res) {
        const { token } = req.query;
        try {
            res.render('auth/datLaiMatKhau', {
                token,
                message: req.query.message,
                messageType: req.query.messageType
            });
        }
        catch (error) {
            console.log(error);
            return res.redirect('/quen-mat-khau?message=Lỗi server&messageType=error');
        }
    }
    static async datLaiMatKhau(req, res) {
        const { token, mat_khau_moi, nhap_lai_mat_khau } = req.body;

        if (mat_khau_moi !== nhap_lai_mat_khau) {
            return res.redirect(`/dat-lai-mat-khau?token=${token}&message=Mật khẩu không khớp&messageType=error`);
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const email = decoded.email;

            const taiKhoan = await quenMatKhauModel.layThongTinTaiKhoan(email);
            if (!taiKhoan) {
                return res.redirect('/quen-mat-khau?message=Tài khoản không tồn tại&messageType=error');
            }

            const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
            await quenMatKhauModel.capNhatMatKhau(email, hashedPassword);

            return res.redirect('/?message=Đổi mật khẩu thành công&messageType=success');
        } catch (error) {
            console.error(error);
            return res.redirect('/quen-mat-khau?message=Liên kết không hợp lệ hoặc đã hết hạn&messageType=error');
        }

    }
}
module.exports = QuenMatKhauController