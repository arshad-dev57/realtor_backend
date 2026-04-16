const router = require('express').Router();
const AuthController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');  // ✅ ADD THIS LINE

// ==================== PUBLIC ROUTES ====================
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/reset-password', AuthController.resetPassword);
router.post('/select-role', AuthController.selectRole);
router.put('/complete-buyer/:userId', AuthController.completeBuyerProfile);
router.put('/complete-realtor/:userId', AuthController.completeRealtorProfile);
router.get('/status/:userId', AuthController.getUserStatus);

// ==================== PROTECTED ROUTES (Need Auth Token) ====================
router.get('/profile', protect, AuthController.getProfile);        // ✅ ADD protect
router.put('/profile', protect, AuthController.updateProfile);     // ✅ ADD protect
router.put('/change-password', protect, AuthController.changePassword); // ✅ ADD if exists

module.exports = router;