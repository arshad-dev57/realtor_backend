const Device = require('../models/device.model');

const checkDeviceExists = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const deviceId = req.headers['x-device-id'];
        
        // Skip device check for certain routes
        const skipRoutes = [
            '/api/v1/devices/register',
            '/api/v1/devices/others/remove',
            '/api/v1/auth/logout',
            '/api/v1/auth/change-password'
        ];
        
        if (skipRoutes.some(route => req.originalUrl.includes(route))) {
            return next();
        }
        
        if (!deviceId) {
            return res.status(401).json({
                success: false,
                message: 'Device ID missing. Please login again.',
                code: 'DEVICE_ID_MISSING'
            });
        }
        
        // Check if device exists in database
        const device = await Device.findOne({ userId, deviceId });
        
        if (!device) {
            return res.status(401).json({
                success: false,
                message: 'Device not found. This device has been logged out from all sessions. Please login again.',
                code: 'DEVICE_NOT_FOUND'
            });
        }
        
        // Update last active timestamp
        device.lastActive = new Date();
        await device.save();
        
        next();
    } catch (error) {
        console.error('Device check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Device verification failed'
        });
    }
};

module.exports = { checkDeviceExists };