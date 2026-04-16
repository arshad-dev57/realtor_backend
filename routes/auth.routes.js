const router = require('express').Router();
const AuthController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// ==================== ADMIN ROUTES (No role selection needed) ====================
router.post('/admin/register', AuthController.adminRegister);
router.post('/admin/login', AuthController.adminLogin);

// ==================== USER ROUTES (Buyer/Realtor) ====================
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/reset-password', AuthController.resetPassword);
router.post('/select-role', AuthController.selectRole);
router.put('/complete-buyer/:userId', AuthController.completeBuyerProfile);
router.put('/complete-realtor/:userId', AuthController.completeRealtorProfile);
router.get('/status/:userId', AuthController.getUserStatus);

// ==================== PROTECTED ROUTES ====================
router.get('/profile', protect, AuthController.getProfile);
router.put('/profile', protect, AuthController.updateProfile);
router.put('/change-password', protect, AuthController.changePassword);

module.exports = router;