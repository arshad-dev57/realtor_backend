const Payment = require('../models/payment.model');
const User = require('../models/user.model');

class PaymentController {
    
    // ==================== CREATE PAYMENT (After In-App Purchase) ====================
    async createPayment(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const {
                amount,
                paymentMethod,
                transactionId,
                planName,
                planDuration,
                receiptUrl,
                notes
            } = req.body;
            
            // Create payment record
            const payment = new Payment({
                userId: userId,
                userName: user.name,
                userEmail: user.email,
                amount: amount || 100,
                status: 'completed',
                paymentMethod: paymentMethod || 'in_app_purchase',
                transactionId: transactionId || `TXN_${Date.now()}_${userId.slice(-6)}`,
                planName: planName || 'Pro Plan',
                planDuration: planDuration || 'monthly',
                receiptUrl: receiptUrl || null,
                notes: notes || null
            });
            
            await payment.save();
            
            // Update user subscription status
            user.isSubscribed = true;
            user.paymentStatus = 'completed';
            user.paymentAmount = amount || 100;
            user.paymentMethod = paymentMethod || 'in_app_purchase';
            user.transactionId = transactionId || payment.transactionId;
            user.subscriptionDate = new Date();
            
            // Set expiry date (30 days from now for monthly)
            const expiryDate = new Date();
            if (planDuration === 'monthly') {
                expiryDate.setDate(expiryDate.getDate() + 30);
            } else {
                expiryDate.setDate(expiryDate.getDate() + 365);
            }
            user.subscriptionExpiryDate = expiryDate;
            
            await user.save();
            
            console.log(`✅ Payment created for user: ${user.email}, Amount: $${payment.amount}`);
            
            res.status(201).json({
                success: true,
                message: 'Payment recorded successfully',
                data: {
                    payment: {
                        _id: payment._id,
                        amount: payment.amount,
                        status: payment.status,
                        transactionId: payment.transactionId,
                        createdAt: payment.createdAt
                    },
                    subscription: {
                        isSubscribed: user.isSubscribed,
                        expiryDate: user.subscriptionExpiryDate
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
    
    // ==================== GET ALL PAYMENTS (Admin) ====================
    async getAllPayments(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                userId,
                startDate,
                endDate
            } = req.query;
            
            let query = {};
            
            if (status && status !== 'all') {
                query.status = status;
            }
            
            if (userId) {
                query.userId = userId;
            }
            
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) {
                    query.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    query.createdAt.$lte = new Date(endDate);
                }
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const payments = await Payment.find(query)
                .populate('userId', 'name email phone role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await Payment.countDocuments(query);
            
            // Calculate stats
            const totalRevenue = await Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            
            const completedCount = await Payment.countDocuments({ status: 'completed' });
            const pendingCount = await Payment.countDocuments({ status: 'pending' });
            const failedCount = await Payment.countDocuments({ status: 'failed' });
            const refundedCount = await Payment.countDocuments({ status: 'refunded' });
            
            res.status(200).json({
                success: true,
                data: {
                    payments,
                    stats: {
                        totalRevenue: totalRevenue[0]?.total || 0,
                        totalPayments: total,
                        completedPayments: completedCount,
                        pendingPayments: pendingCount,
                        failedPayments: failedCount,
                        refundedPayments: refundedCount
                    },
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get all payments error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET SALES STATS (Admin) ====================
    async getSalesStats(req, res) {
        try {
            // Total revenue
            const totalRevenueResult = await Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalRevenue = totalRevenueResult[0]?.total || 0;
            
            // Payment counts by status
            const completedCount = await Payment.countDocuments({ status: 'completed' });
            const pendingCount = await Payment.countDocuments({ status: 'pending' });
            const failedCount = await Payment.countDocuments({ status: 'failed' });
            const refundedCount = await Payment.countDocuments({ status: 'refunded' });
            const totalPayments = await Payment.countDocuments({});
            
            // Monthly revenue (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            
            const monthlyRevenue = await Payment.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: sixMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        revenue: { $sum: '$amount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
                month: monthNames[item._id.month - 1],
                revenue: item.revenue
            }));
            
            // Top paying users
            const topUsers = await Payment.aggregate([
                { $match: { status: 'completed' } },
                {
                    $group: {
                        _id: '$userId',
                        totalPaid: { $sum: '$amount' },
                        userName: { $first: '$userName' },
                        userEmail: { $first: '$userEmail' }
                    }
                },
                { $sort: { totalPaid: -1 } },
                { $limit: 5 }
            ]);
            
            const formattedTopUsers = topUsers.map(user => ({
                userId: user._id,
                name: user.userName,
                email: user.userEmail,
                totalPaid: user.totalPaid
            }));
            
            res.status(200).json({
                success: true,
                data: {
                    totalRevenue,
                    totalPayments,
                    completedPayments: completedCount,
                    pendingPayments: pendingCount,
                    failedPayments: failedCount,
                    refundedPayments: refundedCount,
                    monthlyRevenue: formattedMonthlyRevenue,
                    topUsers: formattedTopUsers
                }
            });
        } catch (error) {
            console.error('Get sales stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET USER PAYMENTS ====================
    async getUserPayments(req, res) {
        try {
            const userId = req.user.userId;
            
            const payments = await Payment.find({ userId })
                .sort({ createdAt: -1 });
            
            const stats = {
                totalSpent: payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0),
                totalPayments: payments.length,
                activeSubscription: payments.some(p => p.status === 'completed')
            };
            
            res.status(200).json({
                success: true,
                data: {
                    payments,
                    stats
                }
            });
        } catch (error) {
            console.error('Get user payments error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== UPDATE PAYMENT STATUS ====================
    async updatePaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const { status } = req.body;
            
            const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }
            
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }
            
            payment.status = status;
            await payment.save();
            
            // If payment is refunded, update user subscription
            if (status === 'refunded') {
                const user = await User.findById(payment.userId);
                if (user) {
                    user.isSubscribed = false;
                    user.paymentStatus = 'refunded';
                    await user.save();
                }
            }
            
            res.status(200).json({
                success: true,
                message: `Payment status updated to ${status}`,
                data: payment
            });
        } catch (error) {
            console.error('Update payment status error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET PAYMENT BY ID ====================
    async getPaymentById(req, res) {
        try {
            const { paymentId } = req.params;
            
            const payment = await Payment.findById(paymentId).populate('userId', 'name email phone');
            
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: payment
            });
        } catch (error) {
            console.error('Get payment by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== CHECK SUBSCRIPTION STATUS ====================
    async checkSubscription(req, res) {
        try {
            const userId = req.user.userId;
            
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const isExpired = user.subscriptionExpiryDate && new Date() > new Date(user.subscriptionExpiryDate);
            
            res.status(200).json({
                success: true,
                data: {
                    isSubscribed: user.isSubscribed && !isExpired,
                    subscriptionExpiryDate: user.subscriptionExpiryDate,
                    isExpired: isExpired,
                    paymentStatus: user.paymentStatus
                }
            });
        } catch (error) {
            console.error('Check subscription error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new PaymentController();