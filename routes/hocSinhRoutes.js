const express = require('express');
const router = express.Router();
const HocSinhController = require('../controllers/hocSinhController');
const AuthMiddleware = require('../middlewares/authMiddleWare');
const uploadHocSinh = require('../config/multerHocSinh');


router.get('/', AuthMiddleware.kiemTraToken, HocSinhController.hienThiHocSinh);
router.post('/them', AuthMiddleware.kiemTraToken, uploadHocSinh ,HocSinhController.themHocSinh);

module.exports = router;