const express = require('express');
const router = express.Router();
const quenMatKhauController = require('../controllers/quenMatKhauController');
const AuthMiddleware = require('../middlewares/authMiddleware');

router.post('/gui-yeu-cau', quenMatKhauController.guiEmail);
router.get('/dat-lai-mat-khau', quenMatKhauController.hienThiDatLaiMatKhau);
router.post('/dat-lai-mat-khau', quenMatKhauController.datLaiMatKhau);
module.exports = router;