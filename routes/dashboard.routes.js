const router = require('express').Router();
const DashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Dashboard stats (UPDATED - includes all stats)
router.get('/stats', DashboardController.getDashboardStats);

// Tour leads (from website/app inquiries)
router.get('/tour-leads', DashboardController.getAllTourLeads);
router.put('/tour-leads/:leadId/status', DashboardController.updateTourLeadStatus);

// ✅ NEW: Assigned leads (from admin)
router.get('/assigned-leads', DashboardController.getAllAssignedLeads);
router.get('/assigned-leads/:leadId', DashboardController.getAssignedLeadDetails);
router.put('/assigned-leads/:leadId/stage', DashboardController.updateAssignedLeadStage);

// ✅ NEW: Lead requests (made by realtor)
router.get('/lead-requests', DashboardController.getAllLeadRequests);

module.exports = router;