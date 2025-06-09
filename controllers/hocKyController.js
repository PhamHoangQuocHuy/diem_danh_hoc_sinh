const hocKyModel = require('../models/hocKyModel');
const TruongHocModel = require('../models/truongHocModel');
class HocKyController {
    static async hienThiHocKy(req, res) {
        try {
            const danhSachHocKy = await hocKyModel.hienthiHocKy();
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy,
                danhSachTruongHoc,
                message: req.query.message || '',
                messageType: req.query.messageType || ''
            });
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy: [],
                danhSachTruongHoc: [],
                message: 'Có lỗi khi lấy danh sách học kỳ',
                messageType: 'error'
            });
        }
    }
    static async themHocKy(req, res) {
        const {
            ten_hoc_ky,
            truong_hoc_id,
            nam_hoc,
            ngay_bat_dau,
            ngay_ket_thuc
        } = req.body
        const result = await hocKyModel.themMoiHocKy({ ten_hoc_ky, truong_hoc_id, nam_hoc, ngay_bat_dau, ngay_ket_thuc });
        if (result.success) {
            return res.redirect(`/hoc-ky?message=Thêm học kỳ thành công&messageType=success`);
        } else {
            //console.log(result.message);
            const danhSachHocKy = await hocKyModel.hienthiHocKy();
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy,
                danhSachTruongHoc,
                message: result.message,
                messageType: 'error'
            });
        }
    }
    static async xoaHocKy(req, res) {
        try {
            const { id } = req.params;
            const result = await hocKyModel.xoaThongTinHocKy(id);
            if (result.success) {
                const danhSachHocKy = await hocKyModel.hienthiHocKy();
                const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
                return res.render('admin_index', {
                    page: 'pages/quanLyHocKy',
                    danhSachHocKy,
                    danhSachTruongHoc,
                    message: 'Xóa học kỳ thành công',
                    messageType: 'success',
                });
            }
            else {
                const danhSachHocKy = await hocKyModel.hienthiHocKy();
                const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
                return res.render('admin_index', {
                    page: 'pages/quanLyHocKy',
                    danhSachHocKy,
                    danhSachTruongHoc,
                    message: 'Xóa học kỳ thất bại',
                    messageType: 'error',
                });
            }
        }
        catch (error) {
            console.log(error);
            const danhSachHocKy = await hocKyModel.hienthiHocKy();
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy,
                danhSachTruongHoc,
                message: 'Có lỗi khi xóa học kỳ',
                messageType: 'error',
            });
        }

    }
    static async suaHocKy(req, res) {
        try {
            const { id, ten_hoc_ky, truong_hoc_id, nam_hoc, ngay_bat_dau, ngay_ket_thuc } = req.body;
            //console.log('Dữ liệu sửa học kỳ:', { id, ten_hoc_ky, truong_hoc_id, nam_hoc, ngay_bat_dau, ngay_ket_thuc });
            const result = await hocKyModel.suaThongTinHocKy(id, { ten_hoc_ky, truong_hoc_id, nam_hoc, ngay_bat_dau, ngay_ket_thuc });
            //console.log('Kết quả sửa học kỳ:', result);
            if (result.success) {
                return res.redirect(`/hoc-ky?message=Sửa học kỳ thành công&messageType=success`);
            } else {
                return res.redirect(`/hoc-ky?message=Sửa học kỳ thất bại&messageType=error`);
            }
        } catch (error) {
            console.error(error);
            const danhSachHocKy = await hocKyModel.hienthiHocKy();
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy,
                danhSachTruongHoc,
                message: 'Có lỗi khi cập nhật học kỳ',
                messageType: 'error',
            });
        }
    }
    static async timHocKy(req, res) {
        const { tim_kiem } = req.query;
        if (!tim_kiem || tim_kiem.trim() === '') {
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy: [],
                danhSachTruongHoc: [],
                message: 'Bạn phải nhập từ khóa tìm kiếm',
                messageType: 'error'
            });
        }
        try {
            const danhSachHocKy = await hocKyModel.timHocKyTheoNamHoc(tim_kiem);
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            if(danhSachHocKy.length === 0) {
                return res.render('admin_index', {
                    page: 'pages/quanLyHocKy',
                    danhSachHocKy,
                    danhSachTruongHoc,
                    message: `Không tìm thấy kết quả: ${tim_kiem}`,
                    messageType: 'error'
                });
            }
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy,
                danhSachTruongHoc,
                message: `Kết quả tìm kiếm: ${tim_kiem}`,
                messageType: 'success'
            });
        }
        catch (error) {
            console.log('Lỗi khi tìm học kỳ: ', error);
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy: [],
                danhSachTruongHoc: [],
                message: `Không tìm thấy kêt quả phù hợp: ${tim_kiem}`,
                messageType: 'error'
            });
        }
    }
    static async locHocKy(req,res){
        try {
            const ten_hoc_ky  = req.query.ten_hoc_ky || '';
            const danhSachHocKy = await hocKyModel.locTheoHocKy(ten_hoc_ky);
            const danhSachTruongHoc = await TruongHocModel.hienthiTruongHoc();
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy: danhSachHocKy || [],
                danhSachTruongHoc: danhSachTruongHoc || [],
                message: '',
                messageType: '',
            });
        } catch (error) {
            console.error(error);
            return res.render('admin_index', {
                page: 'pages/quanLyHocKy',
                danhSachHocKy: [],
                danhSachTruongHoc: [],
                message: 'Có lỗi khi lọc học kỳ',
                messageType: 'error',
            });
        }
    }
}
module.exports = HocKyController;