const express = require('express');
const router = express.Router();
const hocSinhController = require('../controllers/hocSinhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/quan-ly-hoc-sinh', AuthMiddleware.kiemTraToken, hocSinhController.hienThiHocSinh);

module.exports = router;