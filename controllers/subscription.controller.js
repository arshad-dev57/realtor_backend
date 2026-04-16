// backend/controllers/subscription.controller.js
const User = require('../models/user.model');

// backend/controllers/subscription.controller.js - One-time payment

class SubscriptionController {
    
    async createSubscription(req, res) {
        try {
            const userId = req.user.userId;
            const { paymentMethod, transactionId } = req.body;
            
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // ✅ Check if already paid
            if (user.isSubscribed) {
                return res.status(400).json({
                    success: false,
                    message: 'User has already paid the one-time fee'
                });
            }
            
            // ✅ One-time payment - no expiry date
            user.isSubscribed = true;
            user.subscriptionId = `PAY_${Date.now()}_${userId.slice(-6)}`;
            user.subscriptionDate = new Date();
            user.paymentStatus = 'completed';
            user.paymentAmount = 100;
            user.paymentMethod = paymentMethod || 'manual';
            user.transactionId = transactionId || `TXN_${Date.now()}`;
            // No expiry date for one-time payment
            
            await user.save();
            
            console.log(`✅ One-time payment successful for user: ${user.email}`);
            
            res.status(200).json({
                success: true,
                message: 'Payment successful! Lifetime access granted.',
                data: {
                    isSubscribed: user.isSubscribed,
                    paymentStatus: user.paymentStatus
                }
            });
        } catch (error) {
            console.error('Create payment error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    async checkSubscription (req, res, next)  {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // ✅ Buyers don't need subscription
        if (user.role === 'buyer') {
            return next();
        }
        
        // ✅ Only realtors need subscription check
        if (user.role === 'realtor') {
            const hasPaid = user.isSubscribed === true;
            
            if (!hasPaid) {
                return res.status(403).json({
                    success: false,
                    message: 'Subscription required. Please pay $100 to list properties.',
                    requiresPayment: true
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('❌ Subscription Check Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
 
    // Create subscription (simulate payment)
    async createSubscription(req, res) {
        try {
            const userId = req.user.userId;
            const { paymentMethod, transactionId } = req.body;
            
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Check if already subscribed
            if (user.isSubscribed) {
                return res.status(400).json({
                    success: false,
                    message: 'User already has an active subscription'
                });
            }
            
            // Calculate expiry date (1 year from now for $100)
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            // Update user subscription
            user.isSubscribed = true;
            user.subscriptionId = `SUB_${Date.now()}_${userId.slice(-6)}`;
            user.subscriptionDate = new Date();
            user.subscriptionExpiryDate = expiryDate;
            user.paymentStatus = 'completed';
            user.paymentAmount = 100;
            user.paymentMethod = paymentMethod || 'manual';
            user.transactionId = transactionId || `TXN_${Date.now()}`;
            
            await user.save();
            
            console.log(`✅ Subscription activated for user: ${user.email}`);
            
            res.status(200).json({
                success: true,
                message: 'Subscription activated successfully! You now have full access.',
                data: {
                    isSubscribed: user.isSubscribed,
                    subscriptionExpiryDate: user.subscriptionExpiryDate,
                    paymentStatus: user.paymentStatus
                }
            });
        } catch (error) {
            console.error('Create subscription error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Get subscription details
    async getSubscriptionDetails(req, res) {
        try {
            const userId = req.user.userId;
            
            const user = await User.findById(userId).select('isSubscribed subscriptionId subscriptionDate subscriptionExpiryDate paymentStatus paymentAmount paymentMethod');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const daysRemaining = user.subscriptionExpiryDate 
                ? Math.ceil((new Date(user.subscriptionExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                : 0;
            
            res.status(200).json({
                success: true,
                data: {
                    isSubscribed: user.isSubscribed,
                    subscriptionId: user.subscriptionId,
                    subscriptionDate: user.subscriptionDate,
                    subscriptionExpiryDate: user.subscriptionExpiryDate,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    paymentStatus: user.paymentStatus,
                    paymentAmount: user.paymentAmount,
                    paymentMethod: user.paymentMethod
                }
            });
        } catch (error) {
            console.error('Get subscription details error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new SubscriptionController();