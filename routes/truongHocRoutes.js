const express = require('express');
const router = express.Router();
const truongHocController = require('../controllers/truongHocController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/quan-ly-truong-hoc', AuthMiddleware.kiemTraToken, truongHocController.hienThiTruongHoc);

module.exports = router;