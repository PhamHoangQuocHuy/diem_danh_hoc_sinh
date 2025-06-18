const PhuHuynhModel = require('../models/phuHuynhModel');
class phuHuynhController {
    static async hienThiPhuHuynh(req, res) {
        try {
            const danhSachPhuHuynh = await PhuHuynhModel.layDanhSachPhuHuynh();
            return res.render('admin_index', {
                page: 'pages/quanLyPhuHuynh',
                danhSachPhuHuynh,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            })
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyPhuHuynh',
                danhSachPhuHuynh: [],
                message: 'Đã xảy ra lỗi khi lấy danh sách phụ huynh',
                messageType: 'error'
            })
        }
    }
    static async chiTietPhuHuynh(req, res) {
        try {
            const { id } = req.params;
            const result = await PhuHuynhModel.thongTinChiTietPhuHuynh(id);
            //console.log(result);
            if (!result.success) {
                return res.render('admin_index', {
                    page: 'pages/quanLyHocSinh',
                    danhSachHocSinh: [],
                    danhSachPhuHuynh: [],
                    message: result.message,
                    messageType: result.messageType
                });

            }
            // const danhSachPhuHuynh = await PhuHuynhModel.layDanhSachPhuHuynh();
            return res.status(200).json(result);
        }
        catch (error) {
            console.log(error);
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi tìm học sinh&messageType=error`);
        }

    }
}
module.exports = phuHuynhController;