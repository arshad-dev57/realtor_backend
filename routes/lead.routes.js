const router = require('express').Router();
const LeadController = require('../controllers/lead.controller');
const { protect } = require('../middlewares/auth.middleware');

// ==================== PROTECTED ROUTES ====================
router.post('/', protect, LeadController.createLead);
router.get('/', protect, LeadController.getAllLeads);
router.get('/my-leads', protect, LeadController.getLeadsByRealtor);
router.get('/stats', protect, LeadController.getLeadStats);
router.get('/:id', protect, LeadController.getLeadById);
router.put('/:id', protect, LeadController.updateLead);
router.put('/:id/assign', protect, LeadController.assignLeadToRealtor);
router.put('/:id/stage', protect, LeadController.updateLeadStage);
router.delete('/:id', protect, LeadController.deleteLead);

module.exports = router;