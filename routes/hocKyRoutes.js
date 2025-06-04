const express = require('express');
const router = express.Router();
const hocKyController = require('../controllers/hocKyController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/quan-ly-hoc-ky', AuthMiddleware.kiemTraToken, hocKyController.hienThiHocKy);

module.exports = router;