const express = require('express');
const router = express.Router();
const thucHienDiemDanhController = require('../controllers/thucHienDiemDanhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, thucHienDiemDanhController.hienThiDiemDanh);


module.exports = router;