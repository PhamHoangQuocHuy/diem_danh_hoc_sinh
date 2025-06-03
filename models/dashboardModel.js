const pool = require('../config/connect_database');
class DashboardModel {
    static async layThongTinDashboard() {
        try {
            const [soLuongGiaoVien]= await pool.query(`SELECT COUNT(*) AS soLuong FROM giao_vien`);
            const [soLuongHocSinh] = await pool.query(`SELECT COUNT(*) AS soLuong FROM hoc_sinh`);
            const [soLuongPhuHuynh] = await pool.query(`SELECT COUNT(*) AS soLuong FROM phu_huynh`);
            return {
                soLuongGiaoVien: soLuongGiaoVien[0].soLuong || 0, 
                soLuongHocSinh: soLuongHocSinh[0].soLuong || 0, 
                soLuongPhuHuynh: soLuongPhuHuynh[0].soLuong || 0, 
            };
        } catch (error) {
            console.error('Lỗi khi lấy thông tin dashboard:', error);
            throw error; // Ném lỗi để xử lý ở nơi gọi
        }
    }
}
module.exports = DashboardModel;