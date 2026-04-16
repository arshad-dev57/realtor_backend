const router = require('express').Router();
const DashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Get dashboard stats
router.get('/stats', DashboardController.getDashboardStats);

// Get all leads
router.get('/leads', DashboardController.getAllLeads);

// Update lead status
router.put('/leads/:leadId/status', DashboardController.updateLeadStatus);

module.exports = router;