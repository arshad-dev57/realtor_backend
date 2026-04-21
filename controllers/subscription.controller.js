// backend/controllers/subscription.controller.js
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const Notification = require('../models/notification.model');
const { sendToUser } = require("../services/onesignal");
const { sendEmail } = require('../services/email.service');

class SubscriptionController {
    
    // ==================== CREATE PAYMENT (One-time) ====================
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
            
            if (user.isSubscribed) {
                return res.status(400).json({
                    success: false,
                    message: 'User has already paid the one-time fee'
                });
            }
            
            const txnId = transactionId || `TXN_${Date.now()}_${userId.slice(-6)}`;
            const payMethod = paymentMethod || 'manual';
            
            const payment = new Payment({
                userId: userId,
                userName: user.name,
                userEmail: user.email,
                amount: 100,
                status: 'completed',
                paymentMethod: payMethod,
                transactionId: txnId,
                planName: 'Pro Plan',
                planDuration: 'lifetime',
                createdAt: new Date()
            });
            
            await payment.save();
            console.log(`✅ Payment record created: ${payment._id}`);
            
            user.isSubscribed = true;
            user.subscriptionId = `PAY_${Date.now()}_${userId.slice(-6)}`;
            user.subscriptionDate = new Date();
            user.paymentStatus = 'completed';
            user.paymentAmount = 100;
            user.paymentMethod = payMethod;
            user.transactionId = txnId;
            
            await user.save();
            
            console.log(`✅ Payment successful for user: ${user.email}`);
            
            // ========== SEND NOTIFICATION AND EMAIL ==========
            try {
                const adminUser = await User.findOne({ role: 'admin' });
                
                // 1. Notification to Admin (OneSignal)
                if (adminUser) {
                    await sendToUser({
                        mongoUserId: adminUser._id.toString(),
                        title: "💰 Payment Received!",
                        message: `${user.name} (${user.email}) has successfully paid $100 for subscription.`,
                        data: {
                            type: "payment_success",
                            screen: "sales",
                            userId: user._id.toString(),
                            userName: user.name,
                            userEmail: user.email,
                            amount: 100,
                            transactionId: txnId,
                            paymentMethod: payMethod
                        }
                    });
                    console.log(`✅ Payment notification sent to admin`);
                }
                
                // 2. Email to Admin
                if (adminUser) {
                    const adminEmailBody = `
                        <h2>💰 Payment Received</h2>
                        <p><strong>User:</strong> ${user.name}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Amount:</strong> $100</p>
                        <p><strong>Transaction ID:</strong> ${txnId}</p>
                        <p><strong>Payment Method:</strong> ${payMethod}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Plan:</strong> Lifetime Pro Plan</p>
                    `;
                    
                    await sendEmail({
                        to: adminUser.email,
                        subject: "💰 New Payment Received - Subscription Purchase",
                        body: adminEmailBody,
                        fromEmail: process.env.EMAIL_USER,
                        fromName: "Elite CRM System"
                    });
                    console.log(`✅ Payment email sent to admin: ${adminUser.email}`);
                }
                
                // 3. Notification to User (OneSignal)
                await sendToUser({
                    mongoUserId: user._id.toString(),
                    title: "✅ Payment Successful!",
                    message: `Thank you ${user.name}! Your payment of $100 has been received. You now have lifetime access.`,
                    data: {
                        type: "payment_confirmation",
                        screen: "dashboard",
                        amount: 100,
                        transactionId: txnId
                    }
                });
                console.log(`✅ Payment confirmation notification sent to user: ${user.email}`);
                
                // 4. Email to User
                const userEmailBody = `
                    <h2>✅ Payment Successful - Lifetime Access Granted</h2>
                    <p>Dear ${user.name},</p>
                    <p>Your payment of <strong>$100</strong> has been successfully received.</p>
                    <p><strong>Transaction ID:</strong> ${txnId}</p>
                    <p><strong>Payment Method:</strong> ${payMethod}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    <p>You now have <strong>Lifetime Access</strong> to all features:</p>
                    <ul>
                        <li>✓ List unlimited properties</li>
                        <li>✓ Access to buyer leads</li>
                        <li>✓ Priority support</li>
                        <li>✓ Advanced analytics</li>
                    </ul>
                    <p>You can now start listing your properties and accessing leads.</p>
                    <br>
                    <p>Best regards,<br>Elite CRM Team</p>
                `;
                
                await sendEmail({
                    to: user.email,
                    subject: "✅ Payment Successful - Lifetime Access Granted",
                    body: userEmailBody,
                    fromEmail: process.env.EMAIL_USER,
                    fromName: "Elite CRM System"
                });
                console.log(`✅ Payment confirmation email sent to user: ${user.email}`);
                
            } catch (notificationError) {
                console.error('❌ Failed to send notification/email:', notificationError.message);
            }
            // ================================================================
            
            res.status(200).json({
                success: true,
                message: 'Payment successful! Lifetime access granted.',
                data: {
                    isSubscribed: user.isSubscribed,
                    paymentStatus: user.paymentStatus,
                    payment: {
                        _id: payment._id,
                        amount: payment.amount,
                        transactionId: payment.transactionId
                    }
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
    
    // ==================== CHECK SUBSCRIPTION ====================
    async checkSubscription(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            if (user.role === 'buyer') {
                return next();
            }
            
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
    }
    
    // ==================== GET PAYMENT DETAILS ====================
    async getSubscriptionDetails(req, res) {
        try {
            const userId = req.user.userId;
            
            const user = await User.findById(userId).select('isSubscribed subscriptionId subscriptionDate paymentStatus paymentAmount paymentMethod transactionId');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const payment = await Payment.findOne({ userId: userId, status: 'completed' }).sort({ createdAt: -1 });
            
            res.status(200).json({
                success: true,
                data: {
                    isSubscribed: user.isSubscribed || false,
                    subscriptionId: user.subscriptionId,
                    subscriptionDate: user.subscriptionDate,
                    paymentStatus: user.paymentStatus || 'pending',
                    paymentAmount: user.paymentAmount || 100,
                    paymentMethod: user.paymentMethod,
                    transactionId: user.transactionId,
                    payment: payment ? {
                        _id: payment._id,
                        amount: payment.amount,
                        status: payment.status,
                        createdAt: payment.createdAt
                    } : null
                }
            });
        } catch (error) {
            console.error('Get payment details error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new SubscriptionController();