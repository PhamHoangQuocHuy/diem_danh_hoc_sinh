const express = require('express');
const router = express.Router();
const BaoCaoController = require('../controllers/baoCaoController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, BaoCaoController.hienThiBaoCao);


module.exports = router;