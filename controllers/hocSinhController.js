const HocSinhModel = require('../models/hocSinhModel');
class HocSinhController {
    static async hienThiHocSinh(req, res) {
        try {
            const danhSachHocSinh = await HocSinhModel.layDanhSachHocSinh();
            const danhSachPhuHuynh = await HocSinhModel.layDanhSachPhuHuynh();
            const danhSachLopHoc_HocKy = await HocSinhModel.layDanhSachLopHoc_HocKy();
            return res.render('admin_index', {
                page: 'pages/quanLyHocSinh',
                danhSachHocSinh,
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
        try {
            const {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                moi_quan_he = []
            } = req.body
            let phu_huynh_ids = req.body.phu_huynh_ids || [];
            let lop_hoc_ids = req.body.lop_hoc_ids || [];

            if (!Array.isArray(phu_huynh_ids)) phu_huynh_ids = [phu_huynh_ids];
            if (!Array.isArray(lop_hoc_ids)) lop_hoc_ids = [lop_hoc_ids];
            if (!Array.isArray(moi_quan_he)) moi_quan_he = [moi_quan_he];
            // Xử lý upload ảnh
            let duong_dan_anh = [];
            if (req.files && req.files.length > 0) {
                duong_dan_anh = req.files.map(file => file.path.join('images',file.filename).replace(/\\/g, '/'));
            }
            // Chuẩn bị dữ liệu
            const data = {
                ho_ten,
                ngay_sinh,
                gioi_tinh,
                dia_chi,
                loai_hoc_sinh,
                phu_huynh_ids,
                lop_hoc_ids,
                moi_quan_he,
                duong_dan_anh
            };
            const result = await HocSinhModel.themThongTinHocSinh(data);
            if(result.success){
                return res.redirect('/hoc-sinh?message=Thêm học sinh thành công&messageType=success');
            }else{
                return res.redirect(`/hoc-sinh?message=${result.message}&messageType=${result.messageType}`);
            }
        }
        catch (error) {
            console.error(error);
            return res.redirect(`/hoc-sinh?message=Đã xảy ra lỗi khi thêm học sinh&messageType=error`);
        }
    }
}
module.exports = HocSinhController;