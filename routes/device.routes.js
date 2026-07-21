const router = require('express').Router();
const DeviceController = require('../controllers/device.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Register device
router.post('/register', DeviceController.registerDevice);

// Get user devices
router.get('/', DeviceController.getUserDevices);

// Remove specific device
router.delete('/:deviceId', DeviceController.removeDevice);

// Remove all other devices
router.delete('/others/remove', DeviceController.removeOtherDevices);

module.exports = router;