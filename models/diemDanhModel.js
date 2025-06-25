const pool = require('../config/connect_database');
const path = require('path');
const fs = require('fs');

class diemDanhModel {
    static async layDanhSachLopHoc() {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`SELECT lh.*, hk.ten_hoc_ky, hk.ngay_bat_dau AS hoc_ky_bat_dau, hk.ngay_ket_thuc AS hoc_ky_ket_thuc,
                nh.ten_nam_hoc, nh.nam_hoc_id
                FROM lop_hoc lh
                JOIN hoc_ky hk ON lh.hoc_ky_id = hk.hoc_ky_id
                JOIN nam_hoc nh ON hk.nam_hoc_id = nh.nam_hoc_id
                WHERE lh.daXoa = 0`);
            return rows;
        } catch (err) {
            console.log(err);
            return [];
        } finally {
            conn.release();
        }
    }
    static async layDanhSachHocSinhTheoLop(lop_hoc_id) {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(`
            SELECT hs.hoc_sinh_id, hs.ho_ten, hs.ngay_sinh
            FROM hoc_sinh_lop_hoc hslh
            JOIN hoc_sinh hs ON hs.hoc_sinh_id = hslh.hoc_sinh_id
            WHERE hslh.lop_hoc_id = ? AND hs.daXoa = 0
            ORDER BY hs.ho_ten
        `, [lop_hoc_id]);
            return rows;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            conn.release();
        }
    }

    static async layThongKeDiemDanh(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            // Tạo khoảng ngày đầu và cuối tháng
            const startDate = ngay_diem_danh + '-01';
            const endDate = new Date(ngay_diem_danh + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // ngày cuối tháng

            const [rows] = await conn.query(`
            SELECT dd.*, hs.ho_ten, hs.ngay_sinh
            FROM diem_danh dd
            JOIN hoc_sinh hs ON dd.hoc_sinh_id = hs.hoc_sinh_id
            WHERE dd.lop_hoc_id = ?
            AND dd.ngay_diem_danh BETWEEN ? AND ?
            ORDER BY hs.ho_ten, dd.ngay_diem_danh
        `, [lop_hoc_id, startDate, endDate.toISOString().slice(0, 10)]);

            return rows;
        } catch (err) {
            console.log(err);
            return [];
        } finally {
            conn.release();
        }
    }
    static async layTongCoMat(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            // Tạo khoảng ngày đầu và cuối tháng
            const startDate = ngay_diem_danh + '-01';
            const endDate = new Date(ngay_diem_danh + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // ngày cuối tháng

            const [rows] = await conn.query(`
            SELECT COUNT(*) AS so_luong
            FROM diem_danh dd
            JOIN hoc_sinh hs ON dd.hoc_sinh_id = hs.hoc_sinh_id
            WHERE dd.lop_hoc_id = ? AND dd.trang_thai = 'Có mặt'
            AND dd.ngay_diem_danh BETWEEN ? AND ?
            ORDER BY hs.ho_ten, dd.ngay_diem_danh
        `, [lop_hoc_id, startDate, endDate.toISOString().slice(0, 10)]);

            return rows[0].so_luong;

        }
        catch (err) {
            console.log(err);
            return [];
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async layTongVang(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            // Tạo khoảng ngày đầu và cuối tháng
            const startDate = ngay_diem_danh + '-01';
            const endDate = new Date(ngay_diem_danh + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // ngày cuối tháng

            const [rows] = await conn.query(`
            SELECT COUNT(*) AS so_luong
            FROM diem_danh dd
            JOIN hoc_sinh hs ON dd.hoc_sinh_id = hs.hoc_sinh_id
            WHERE dd.lop_hoc_id = ? AND dd.trang_thai = 'Vắng'
            AND dd.ngay_diem_danh BETWEEN ? AND ?
            ORDER BY hs.ho_ten, dd.ngay_diem_danh
        `, [lop_hoc_id, startDate, endDate.toISOString().slice(0, 10)]);

            return rows[0].so_luong;

        }
        catch (err) {
            console.log(err);
            return [];
        }
        finally {
            if (conn) conn.release();
        }
    }
    static async tongHocSang(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            const startDate = ngay_diem_danh + '-01';
            const endDate = new Date(ngay_diem_danh + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);

            const [rows] = await conn.query(`
            SELECT COUNT(*) AS so_luong
            FROM diem_danh
            WHERE lop_hoc_id = ? AND trang_thai = 'Học sáng'
            AND ngay_diem_danh BETWEEN ? AND ?
        `, [lop_hoc_id, startDate, endDate.toISOString().slice(0, 10)]);

            return rows[0].so_luong;
        } catch (err) {
            console.log(err);
            return 0;
        } finally {
            conn.release();
        }
    }

    static async tongHocChieu(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            const startDate = ngay_diem_danh + '-01';
            const endDate = new Date(ngay_diem_danh + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);

            const [rows] = await conn.query(`
            SELECT COUNT(*) AS so_luong
            FROM diem_danh
            WHERE lop_hoc_id = ? AND trang_thai = 'Học chiều'
            AND ngay_diem_danh BETWEEN ? AND ?
        `, [lop_hoc_id, startDate, endDate.toISOString().slice(0, 10)]);

            return rows[0].so_luong;
        } catch (err) {
            console.log(err);
            return 0;
        } finally {
            conn.release();
        }
    }
    static async xuatThongTinExcelTheoThang(lop_hoc_id, ngay_diem_danh) {
        const conn = await pool.getConnection();
        try {
            const [year, month] = ngay_diem_danh.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const startDate = `${ngay_diem_danh}-01`;
            const endDate = `${ngay_diem_danh}-${daysInMonth}`;

            // Danh sách học sinh
            const [hocSinhRows] = await conn.query(`
            SELECT hs.hoc_sinh_id, hs.ho_ten, hs.ngay_sinh
            FROM hoc_sinh_lop_hoc hslh
            JOIN hoc_sinh hs ON hs.hoc_sinh_id = hslh.hoc_sinh_id
            WHERE hslh.lop_hoc_id = ? AND hs.daXoa = 0
            ORDER BY hs.ho_ten
        `, [lop_hoc_id]);

            // Dữ liệu điểm danh trong tháng
            const [diemDanhRows] = await conn.query(`
            SELECT *
            FROM diem_danh
            WHERE lop_hoc_id = ?
            AND ngay_diem_danh BETWEEN ? AND ?
        `, [lop_hoc_id, startDate, endDate]);

            return { hocSinhRows, diemDanhRows, daysInMonth };
        } catch (error) {
            console.log(error);
            return { hocSinhRows: [], diemDanhRows: [], daysInMonth: 0 };
        } finally {
            conn.release();
        }
    }
    
}

module.exports = diemDanhModel;