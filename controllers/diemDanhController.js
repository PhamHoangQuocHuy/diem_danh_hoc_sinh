const diemDanhModel = require('../models/diemDanhModel');
class DiemDanhController {
    static hienThiDiemDanh(req, res) {
        if (req.taiKhoan.ten_vai_tro === 'Admin') {
            try {
                const currentDate = new Date();
                const year = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();
                const month = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
                const daysInMonth = new Date(year, month, 0).getDate();
                return res.render('admin_index', {
                    page: 'pages/quanLyDiemDanh',
                    daysInMonth,
                    currentMonth: month,
                    currentYear: year,
                    message: req.query.message || '',
                    messageType: req.query.messageType || ''
                });
            }
            catch (err) {
                console.log(err);
                return res.render('admin_index', {
                    page: 'pages/quanLyDiemDanh',
                    daysInMonth: 0,
                    currentMonth: month,
                    currentYear: year,
                    message: req.query.message || '',
                    messageType: req.query.messageType || ''
                });
            }
        } else {
            try {
                const currentDate = new Date();
                const year = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();
                const month = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
                const daysInMonth = new Date(year, month, 0).getDate();
                return res.render('user_index', {
                    page: 'pages/quanLyDiemDanh',
                    daysInMonth,
                    currentMonth: month,
                    currentYear: year,
                    message: req.query.message || '',
                    messageType: req.query.messageType || ''
                });
            }
            catch (err) {
                console.log(err);
                return res.render('user_index', {
                    page: 'pages/quanLyDiemDanh',
                    daysInMonth: 0,
                    currentMonth: month,
                    currentYear: year,
                    message: req.query.message || '',
                    messageType: req.query.messageType || ''
                });
            }

        }
    }
}
module.exports = DiemDanhController;