// routes/user.routes.js

const router = require('express').Router();
const UserController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// ==================== REALTOR ROUTES ====================
router.get('/realtors', protect, adminMiddleware, UserController.getAllRealtors);
router.get('/realtors/:id', protect, adminMiddleware, UserController.getRealtorById);
router.put('/realtors/:id', protect, adminMiddleware, UserController.updateRealtorStatus);

// ==================== BUYER ROUTES ====================
router.get('/buyers', protect, adminMiddleware, UserController.getAllBuyers);

// ==================== ALL USERS ====================
router.get('/all', protect, adminMiddleware, UserController.getAllUsers);
router.get('/:id', protect, adminMiddleware, UserController.getUserById);
router.delete('/:id', protect, adminMiddleware, UserController.deleteUser);

module.exports = router;