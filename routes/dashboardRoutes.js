const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const AuthMiddleware = require('../middlewares/authMiddleWare');

router.get('/', AuthMiddleware.kiemTraToken, dashboardController.laythongTinDashboard);


module.exports = router;