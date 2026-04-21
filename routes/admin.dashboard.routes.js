const router = require('express').Router();
const DashboardController = require('../controllers/admin.dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Admin dashboard stats (protected + admin only)
router.get('/admin/stats', protect, adminMiddleware, DashboardController.getAdminDashboardStats);

module.exports = router;