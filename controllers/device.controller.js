const Device = require('../models/device.model');
const TokenBlacklist = require('../models/tokenBlacklist.model');
const User = require('../models/user.model');

class DeviceController {
    
    async registerDevice(req, res) {
        try {
            const userId = req.user.userId;
            const { deviceId, deviceName, deviceType, os, browser, ipAddress, userAgent } = req.body;
            
            if (!deviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Device ID is required'
                });
            }
            
            let device = await Device.findOne({ userId, deviceId });
            
            if (device) {
                device.lastActive = new Date();
                device.ipAddress = ipAddress;
                device.userAgent = userAgent;
                await device.save();
            } else {
                device = new Device({
                    userId,
                    deviceId,
                    deviceName: deviceName || 'Unknown Device',
                    deviceType: deviceType || 'desktop',
                    os: os || 'Unknown',
                    browser: browser || 'Unknown',
                    ipAddress: ipAddress || '',
                    userAgent: userAgent || '',
                    isActive: true,
                    lastActive: new Date(),
                    loginTime: new Date()
                });
                await device.save();
            }
            
            res.status(200).json({
                success: true,
                message: 'Device registered successfully',
                data: device
            });
        } catch (error) {
            console.error('Error registering device:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async getUserDevices(req, res) {
        try {
            const userId = req.user.userId;
            const currentDeviceId = req.headers['x-device-id'];
            
            const devices = await Device.find({ userId }).sort({ lastActive: -1 });
            
            const formattedDevices = devices.map(device => ({
                id: device._id,
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                deviceType: device.deviceType,
                os: device.os,
                browser: device.browser,
                ipAddress: device.ipAddress,
                isActive: device.isActive,
                isCurrent: device.deviceId === currentDeviceId,
                lastActive: device.lastActive,
                loginTime: device.loginTime,
                location: device.location || 'Unknown'
            }));
            
            res.status(200).json({
                success: true,
                data: formattedDevices
            });
        } catch (error) {
            console.error('Error getting devices:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async removeDevice(req, res) {
        try {
            const userId = req.user.userId;
            const { deviceId } = req.params;
            
            // Find the device to be removed
            const device = await Device.findOne({ userId, deviceId });
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }
            
            // Get current device ID from header
            const currentDeviceId = req.headers['x-device-id'];
            const isCurrentDevice = deviceId === currentDeviceId;
            
            // Get the token from request
            const token = req.headers.authorization?.split(' ')[1];
            
            // Blacklist the token for this device
            if (token) {
                await TokenBlacklist.create({
                    token,
                    userId,
                    deviceId,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
                console.log(`✅ Token blacklisted for device: ${deviceId}`);
            }
            
            // Delete the device
            await Device.findOneAndDelete({ userId, deviceId });
            
            res.status(200).json({
                success: true,
                message: isCurrentDevice ? 'Logged out from this device' : 'Device removed successfully',
                data: { isCurrentDevice }
            });
        } catch (error) {
            console.error('Error removing device:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async removeOtherDevices(req, res) {
        try {
            const userId = req.user.userId;
            const currentDeviceId = req.headers['x-device-id'];
            const currentToken = req.headers.authorization?.split(' ')[1];
            
            // Get all other devices
            const otherDevices = await Device.find({ 
                userId, 
                deviceId: { $ne: currentDeviceId } 
            });
            
            // Blacklist current token? No, we're keeping current device
            
            // Delete all other devices
            const result = await Device.deleteMany({ 
                userId, 
                deviceId: { $ne: currentDeviceId } 
            });
            
            console.log(`🗑️ Removed ${result.deletedCount} other devices for user: ${userId}`);
            
            res.status(200).json({
                success: true,
                message: `Removed ${result.deletedCount} other devices successfully`
            });
        } catch (error) {
            console.error('Error removing other devices:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new DeviceController();