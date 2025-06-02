const pool = require('../config/connect_database');
const bcrypt = require('bcrypt');
const saltRounds = 10;

class TaiKhoan {
    static async kiemTraEmailTonTai(email) {
        const sql = `SELECT * FROM tai_khoan WHERE email = ?`;
        const [rows] = await pool.query(sql, [email]);
        return rows.length > 0;
    }

    static async kiemTraSoDienThoaiTonTai(sdt) {
        const sql = `SELECT * FROM tai_khoan WHERE sdt = ?`;
        const [rows] = await pool.query(sql, [sdt]);
        return rows.length > 0;
    }

    static async kiemTraSoCMNDTonTai(so_cmnd) {
        const sql = `SELECT * FROM tai_khoan WHERE so_cmnd = ?`;
        const [rows] = await pool.query(sql, [so_cmnd]);
        return rows.length > 0;
    }

    static async themTaiKhoan(data) {
        const {
            ho_ten,
            ngaysinh,
            gioi_tinh,
            so_cmnd,
            dia_chi,
            sdt,
            email,
            mat_khau,
            ten_vai_tro,
            bang_cap // { loai_bang_cap }
        } = data;

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(mat_khau, saltRounds);

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Thêm tài khoản
            const [tkResult] = await connection.query(
                `INSERT INTO tai_khoan SET ?`,
                {
                    ho_ten,
                    ngaysinh,
                    gioi_tinh,
                    so_cmnd,
                    dia_chi,
                    sdt,
                    email,
                    mat_khau: hashedPassword,
                    ten_vai_tro
                }
            );
            const tai_khoan_id = tkResult.insertId;

            // 2. Xử lý theo vai trò
            let giao_vien_id = null;
            let phu_huynh_id = null;

            if (ten_vai_tro === 'Giáo viên') {
                const [gvResult] = await connection.query(
                    `INSERT INTO giao_vien SET ?`,
                    { tai_khoan_id }
                );
                giao_vien_id = gvResult.insertId;

                // Thêm bằng cấp nếu có
                if (bang_cap && bang_cap.loai_bang_cap) {
                    await connection.query(
                        `INSERT INTO bang_cap SET ?`,
                        {
                            loai_bang_cap: bang_cap.loai_bang_cap,
                            giao_vien_id
                        }
                    );
                }
            } else if (ten_vai_tro === 'Phụ huynh') {
                const [phResult] = await connection.query(
                    `INSERT INTO phu_huynh SET ?`,
                    { tai_khoan_id }
                );
                phu_huynh_id = phResult.insertId;
            }

            await connection.commit();
            return { tai_khoan_id, giao_vien_id, phu_huynh_id };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Lấy thông tin tài khoản theo ID
    static async layTaiKhoanTheoId(tai_khoan_id) {
        const sql = `
            SELECT 
                tk.tai_khoan_id,
                tk.ho_ten,
                tk.ngaysinh,
                tk.gioi_tinh,
                tk.so_cmnd,
                tk.dia_chi,
                tk.sdt,
                tk.email,
                tk.ten_vai_tro,
                tk.ngay_tao,
                gv.giao_vien_id,
                ph.phu_huynh_id,
                bc.bang_cap_id,
                bc.loai_bang_cap
            FROM 
                tai_khoan tk
            LEFT JOIN 
                giao_vien gv ON tk.tai_khoan_id = gv.tai_khoan_id
            LEFT JOIN 
                phu_huynh ph ON tk.tai_khoan_id = ph.tai_khoan_id
            LEFT JOIN
                bang_cap bc ON gv.giao_vien_id = bc.giao_vien_id
            WHERE 
                tk.tai_khoan_id = ?
        `;
        const [rows] = await pool.query(sql, [tai_khoan_id]);

        if (!rows.length) return null;

        // Tổ chức dữ liệu
        const result = {
            ...rows[0],
            bang_cap: rows[0].loai_bang_cap ? {
                bang_cap_id: rows[0].bang_cap_id,
                loai_bang_cap: rows[0].loai_bang_cap,
                giao_vien_id: rows[0].giao_vien_id
            } : null
        };
        // Loại bỏ các trường thừa
        delete result.loai_bang_cap;
        return result;
    }

    // Lấy toàn bộ danh sách tài khoản
    static async layDanhSachTaiKhoan() {
        const sql = `
        SELECT 
            tk.tai_khoan_id,
            tk.ho_ten,
            tk.ngaysinh,
            tk.gioi_tinh,
            tk.so_cmnd,
            tk.dia_chi,
            tk.sdt,
            tk.email,
            tk.ten_vai_tro,
            tk.ngay_tao,
            gv.giao_vien_id,
            ph.phu_huynh_id,
            bc.loai_bang_cap
        FROM 
            tai_khoan tk
        LEFT JOIN 
            giao_vien gv ON tk.tai_khoan_id = gv.tai_khoan_id
        LEFT JOIN 
            phu_huynh ph ON tk.tai_khoan_id = ph.tai_khoan_id
        LEFT JOIN
            bang_cap bc ON gv.giao_vien_id = bc.giao_vien_id
        `;
        const [rows] = await pool.query(sql);

        // Nhóm dữ liệu để xử lý trường hợp 1 tài khoản có nhiều bằng cấp
        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.tai_khoan_id]) {
                acc[row.tai_khoan_id] = {
                    ...row,
                    bang_cap: []
                };

                // Thêm bằng cấp nếu có
                if (row.loai_bang_cap) {
                    acc[row.tai_khoan_id].bang_cap.push({
                        bang_cap_id: row.bang_cap_id,
                        loai_bang_cap: row.loai_bang_cap,
                        giao_vien_id: row.giao_vien_id
                    });
                }
            } else {
                // Xử lý trường hợp có nhiều bằng cấp
                if (row.loai_bang_cap && !acc[row.tai_khoan_id].bang_cap.some(bc => bc.bang_cap_id === row.bang_cap_id)) {
                    acc[row.tai_khoan_id].bang_cap.push({
                        bang_cap_id: row.bang_cap_id,
                        loai_bang_cap: row.loai_bang_cap,
                        giao_vien_id: row.giao_vien_id
                    });
                }
            }

            return acc;
        }, {});

        // Chuyển đổi object thành mảng và xóa các trường thừa
        const result = Object.values(grouped).map(item => {
            const formatted = {
                ...item,
                bang_cap: item.ten_vai_tro === 'Giáo viên' ? item.bang_cap : null
            };

            delete formatted.loai_bang_cap;

            return formatted;
        });

        return result;
    }

    // Lấy danh sách tài khoản với vai trò là giáo viên
    static async layDanhSachTaiKhoanGiaoVien() {
        const sql = `
            SELECT 
                tk.tai_khoan_id,
                tk.ho_ten,
                tk.ngaysinh,
                tk.gioi_tinh,
                tk.so_cmnd,
                tk.dia_chi,
                tk.sdt,
                tk.email,
                tk.ten_vai_tro,
                tk.ngay_tao,
                gv.giao_vien_id,
                bc.loai_bang_cap
            FROM 
                tai_khoan tk
            JOIN 
                giao_vien gv ON tk.tai_khoan_id = gv.tai_khoan_id
            LEFT JOIN
                bang_cap bc ON gv.giao_vien_id = bc.giao_vien_id
            WHERE 
                tk.ten_vai_tro = 'Giáo viên'
        `;
        const [rows] = await pool.query(sql);

        return rows.map(row => ({
            tai_khoan_id: row.tai_khoan_id,
            ho_ten: row.ho_ten,
            ngaysinh: row.ngaysinh,
            gioi_tinh: row.gioi_tinh,
            so_cmnd: row.so_cmnd,
            dia_chi: row.dia_chi,
            sdt: row.sdt,
            email: row.email,
            ten_vai_tro: row.ten_vai_tro,
            ngay_tao: row.ngay_tao,
            giao_vien_id: row.giao_vien_id,
            bang_cap: row.loai_bang_cap ? {
                loai_bang_cap: row.loai_bang_cap
            } : null
        }));
    }

    // Lấy danh sách tài khoản với vai trò là phụ huynh
    static async layDanhSachTaiKhoanPhuHuynh() {
        const sql = `
            SELECT 
                tk.tai_khoan_id,
                tk.ho_ten,
                tk.ngaysinh,
                tk.gioi_tinh,
                tk.so_cmnd,
                tk.dia_chi,
                tk.sdt,
                tk.email,
                tk.ten_vai_tro,
                tk.ngay_tao,
                ph.phu_huynh_id
            FROM 
                tai_khoan tk
            JOIN 
                phu_huynh ph ON tk.tai_khoan_id = ph.tai_khoan_id
            WHERE 
                tk.ten_vai_tro = 'Phụ huynh'
        `;
        const [rows] = await pool.query(sql);

        return rows.map(row => ({
            tai_khoan_id: row.tai_khoan_id,
            ho_ten: row.ho_ten,
            ngaysinh: row.ngaysinh,
            gioi_tinh: row.gioi_tinh,
            so_cmnd: row.so_cmnd,
            dia_chi: row.dia_chi,
            sdt: row.sdt,
            email: row.email,
            ten_vai_tro: row.ten_vai_tro,
            ngay_tao: row.ngay_tao,
            phu_huynh_id: row.phu_huynh_id
        }));
    }

    // Đăng nhập
    static async dangNhap(email, mat_khau) {
        const sql = `
        SELECT * FROM tai_khoan WHERE email = ?`;
        const [rows] = await pool.query(sql, [email]);
        if (rows.length === 0) {
            return null; // Không tìm thấy tài khoản
        }
        const taiKhoan = rows[0];
        // So sánh mật khẩu
        const match = await bcrypt.compare(mat_khau, taiKhoan.mat_khau);
        if (!match) {
            return null; // Mật khẩu không đúng
        }
        return taiKhoan;
    }
    // Lấy thông tin hiển thị trên dashboard
    static async thongTinDashboard() {
        try {
            // Sử dụng Promise.all để chạy song song các truy vấn
            const [giaoVien, hocSinh, phuHuynh] = await Promise.all([
                pool.query("SELECT COUNT(*) as count FROM giao_vien"),
                pool.query("SELECT COUNT(*) as count FROM hoc_sinh"),
                pool.query("SELECT COUNT(*) as count FROM phu_huynh")
            ]);

            return {
                soLuongGiaoVien: giaoVien[0][0].count,
                soLuongHocSinh: hocSinh[0][0].count,
                soLuongPhuHuynh: phuHuynh[0][0].count
            };
        } catch (error) {
            console.error("Lỗi khi lấy thống kê dashboard:", error);
            throw error;
        }
    }
}
module.exports = TaiKhoan;