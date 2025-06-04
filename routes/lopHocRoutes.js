const express = require('express');
const router = express.Router();
const lopHocController = require('../controllers/lopHocController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/quan-ly-lop-hoc', AuthMiddleware.kiemTraToken, lopHocController.hienThiLopHoc);

module.exports = router;