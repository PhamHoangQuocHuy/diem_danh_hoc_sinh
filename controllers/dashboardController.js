const DashboardModel = require('../models/dashboardModel');
class dashboardController {
    static async laythongTinDashboard(req, res) {
        try {
            const ten_vai_tro = req.taiKhoan.ten_vai_tro === 'Admin' ? 'Admin' : 'User';
            const layout = ten_vai_tro === 'Admin' ? 'admin_index' : 'user_index';
            const thongTin = await DashboardModel.layThongTinDashboard();
            const taiKhoan = req.taiKhoan;
            res.status(200).render(layout, {
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