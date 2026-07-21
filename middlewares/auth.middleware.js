const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist.model');
const Device = require('../models/device.model');

const protect = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token'
            });
        }
        
        // Check if token is blacklisted
        const isBlacklisted = await TokenBlacklist.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: 'Token has been revoked. Please login again.',
                code: 'TOKEN_REVOKED'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_here');
        
        // Extract device ID from token
        const tokenDeviceId = decoded.deviceId;
        const requestDeviceId = req.headers['x-device-id'];
        
        // Skip device check for certain routes
        const skipDeviceCheck = [
            '/api/v1/devices/register',
            '/api/v1/devices/others/remove',
            '/api/v1/auth/logout'
        ];
        
        const shouldSkipDeviceCheck = skipDeviceCheck.some(route => req.originalUrl.includes(route));
        
        if (!shouldSkipDeviceCheck && tokenDeviceId) {
            // Check if device exists in database and is active
            const device = await Device.findOne({ 
                userId: decoded.userId, 
                deviceId: tokenDeviceId 
            });
            
            if (!device) {
                // Device not found - blacklist the token
                await TokenBlacklist.create({
                    token,
                    userId: decoded.userId,
                    deviceId: tokenDeviceId,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
                
                return res.status(401).json({
                    success: false,
                    message: 'Device not found. This device has been logged out. Please login again.',
                    code: 'DEVICE_NOT_FOUND'
                });
            }
            
            // Check if device ID from token matches request device ID (optional, for extra security)
            if (requestDeviceId && tokenDeviceId !== requestDeviceId) {
                console.log(`⚠️ Device ID mismatch - Token: ${tokenDeviceId}, Request: ${requestDeviceId}`);
                // Don't block, just log - but you can also block if needed
            }
            
            // Update last active
            device.lastActive = new Date();
            await device.save();
        }
        
        req.user = {
            userId: decoded.userId || decoded.id || decoded.user?._id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            deviceId: decoded.deviceId  // ← ADD DEVICE ID TO REQ.USER
        };
        req.token = token;
        
        console.log('🔐 Auth - User ID:', req.user.userId);
        console.log('🔐 Auth - Device ID:', req.user.deviceId);
        
        next();
    } catch (error) {
        console.error('❌ Auth Error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

module.exports = { protect };