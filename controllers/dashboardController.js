const DashboardModel = require('../models/dashboardModel');
class dashboardController {
    static async laythongTinDashboard(req, res) {
        try {
            const thongTin = await DashboardModel.layThongTinDashboard();
            const taiKhoan = req.taiKhoan;
            res.status(200).render('admin_index', {
                page: 'pages/dashboard',
                thongTin,
                taiKhoan
            });
        } catch (error) {
            res.status(500).send('Lỗi khi lấy dữ liệu dashboard');
        }
    }
}
module.exports = dashboardController;