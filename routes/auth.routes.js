const router = require('express').Router();
const AuthController = require('../controllers/auth.controller');
router.post('/signup', AuthController.signup);
router.post('/select-role', AuthController.selectRole);
router.put('/complete-buyer/:userId', AuthController.completeBuyerProfile);
router.put('/complete-realtor/:userId', AuthController.completeRealtorProfile);
router.get('/status/:userId', AuthController.getUserStatus);
router.post('/login', AuthController.login);

router.post('/forgot-password', AuthController.forgotPassword);  // Send OT

router.post('/verify-otp', AuthController.verifyOTP);           // Verify OTP
router.post('/reset-password', AuthController.resetPassword);   // Reset password

module.exports = router;