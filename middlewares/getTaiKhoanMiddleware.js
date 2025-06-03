const jwt = require('jsonwebtoken');
const pool = require('../config/connect_database');

module.exports = async function getTaiKhoan(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        res.locals.taiKhoan = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const [users] = await pool.query('SELECT ho_ten, email, ten_vai_tro FROM tai_khoan WHERE tai_khoan_id = ?', [decoded.id]);
        if (users.length > 0) {
            res.locals.taiKhoan = users[0];
        } else {
            res.locals.taiKhoan = null;
        }
    } catch (err) {
        console.error('JWT decode error:', err);
        res.locals.taiKhoan = null;
    }

    next();
};
