const router = require('express').Router();
const PaymentController = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth.middleware');

// ==================== PUBLIC/PROTECTED ROUTES ====================

// Create payment (after successful in-app purchase)
router.post('/', protect, PaymentController.createPayment);

// Get user's own payments
router.get('/my-payments', protect, PaymentController.getUserPayments);

// Check subscription status
router.get('/subscription/status', protect, PaymentController.checkSubscription);

// ==================== ADMIN ONLY ROUTES ====================
const adminMiddleware = require('../middlewares/admin.middleware');

// Get all payments (admin)
router.get('/', protect, adminMiddleware, PaymentController.getAllPayments);

// Get sales stats (admin)
router.get('/stats', protect, adminMiddleware, PaymentController.getSalesStats);

// Get payment by ID (admin)
router.get('/:paymentId', protect, adminMiddleware, PaymentController.getPaymentById);

// Update payment status (admin)
router.put('/:paymentId/status', protect, adminMiddleware, PaymentController.updatePaymentStatus);

module.exports = router;