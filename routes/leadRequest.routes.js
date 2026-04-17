const router = require('express').Router();
const LeadRequestController = require('../controllers/leadRequest.controller');
const { protect } = require('../middlewares/auth.middleware');

// ==================== REALTOR ROUTES ====================
router.post('/', protect, LeadRequestController.createRequest);
router.get('/my-requests', protect, LeadRequestController.getMyRequests);

// ==================== ADMIN ROUTES ====================
router.get('/', protect, LeadRequestController.getAllRequests);
router.get('/pending/count', protect, LeadRequestController.getPendingCount);
router.get('/:id', protect, LeadRequestController.getRequestById);
router.put('/:id/approve', protect, LeadRequestController.approveRequest);
router.put('/:id/reject', protect, LeadRequestController.rejectRequest);
router.delete('/:id', protect, LeadRequestController.deleteRequest);

module.exports = router;