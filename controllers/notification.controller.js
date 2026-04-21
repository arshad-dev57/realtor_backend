// backend/controllers/notification.controller.js

const Notification = require('../models/notification.model');
const { sendToUser } = require("../services/onesignal");
const { sendEmail } = require('../services/email.service');
const User = require('../models/user.model');

class NotificationController {
    
    // Get all notifications for logged-in user
    async getNotifications(req, res) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            
            let query = { userId: userId };
            if (unreadOnly === 'true') {
                query.isRead = false;
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await Notification.countDocuments(query);
            const unreadCount = await Notification.countDocuments({ userId: userId, isRead: false });
            
            res.status(200).json({
                success: true,
                data: {
                    notifications,
                    unreadCount,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
// Add these methods to notification.controller.js

// Send notification for lead stage update
async sendLeadStageUpdateNotification(realtorId, leadData) {
    try {
        const realtor = await User.findById(realtorId);
        if (!realtor) return;
        
        await sendToUser({
            mongoUserId: realtorId,
            title: "🔄 Lead Stage Updated",
            message: `Lead "${leadData.name}" stage changed from ${leadData.oldStage} to ${leadData.newStage}`,
            data: {
                type: "lead_stage_updated",
                screen: "leads",
                leadId: leadData._id,
                leadName: leadData.name
            }
        });
        
        const notification = new Notification({
            userId: realtorId,
            title: "🔄 Lead Stage Updated",
            message: `Lead "${leadData.name}" stage changed to ${leadData.newStage}`,
            type: "lead_stage_updated"
        });
        await notification.save();
        
        console.log(`✅ Lead stage update notification sent to realtor: ${realtor.email}`);
    } catch (error) {
        console.error('Failed to send lead stage update notification:', error.message);
    }
}

// Send notification for lead status update
async sendLeadStatusUpdateNotification(realtorId, leadData) {
    try {
        const realtor = await User.findById(realtorId);
        if (!realtor) return;
        
        await sendToUser({
            mongoUserId: realtorId,
            title: "📊 Lead Status Updated",
            message: `Lead "${leadData.name}" status changed from ${leadData.oldStatus} to ${leadData.newStatus}`,
            data: {
                type: "lead_status_updated",
                screen: "leads",
                leadId: leadData._id,
                leadName: leadData.name
            }
        });
        
        const notification = new Notification({
            userId: realtorId,
            title: "📊 Lead Status Updated",
            message: `Lead "${leadData.name}" status changed to ${leadData.newStatus}`,
            type: "lead_status_updated"
        });
        await notification.save();
        
        console.log(`✅ Lead status update notification sent to realtor: ${realtor.email}`);
    } catch (error) {
        console.error('Failed to send lead status update notification:', error.message);
    }
}

// Send notification for lead removed from realtor
async sendLeadRemovedNotification(realtorId, leadData) {
    try {
        const realtor = await User.findById(realtorId);
        if (!realtor) return;
        
        await sendToUser({
            mongoUserId: realtorId,
            title: "⚠️ Lead Removed",
            message: `Lead "${leadData.name}" has been removed from your assignments`,
            data: {
                type: "lead_removed",
                screen: "leads",
                leadId: leadData._id,
                leadName: leadData.name
            }
        });
        
        const notification = new Notification({
            userId: realtorId,
            title: "⚠️ Lead Removed",
            message: `Lead "${leadData.name}" has been removed from your assignments`,
            type: "lead_removed"
        });
        await notification.save();
        
        console.log(`✅ Lead removed notification sent to realtor: ${realtor.email}`);
    } catch (error) {
        console.error('Failed to send lead removed notification:', error.message);
    }
}

// Send notification for lead deleted
async sendLeadDeletedNotification(realtorId, leadData) {
    try {
        const realtor = await User.findById(realtorId);
        if (!realtor) return;
        
        await sendToUser({
            mongoUserId: realtorId,
            title: "🗑️ Lead Deleted",
            message: `Lead "${leadData.name}" has been deleted from the system`,
            data: {
                type: "lead_deleted",
                screen: "leads"
            }
        });
        
        const notification = new Notification({
            userId: realtorId,
            title: "🗑️ Lead Deleted",
            message: `Lead "${leadData.name}" has been deleted`,
            type: "lead_deleted"
        });
        await notification.save();
        
        console.log(`✅ Lead deleted notification sent to realtor: ${realtor.email}`);
    } catch (error) {
        console.error('Failed to send lead deleted notification:', error.message);
    }
}


    // Get unread count only
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.userId;
            const unreadCount = await Notification.countDocuments({ userId: userId, isRead: false });
            
            res.status(200).json({
                success: true,
                data: { unreadCount }
            });
        } catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Mark notification as read
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user.userId;
            
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, userId: userId },
                { isRead: true },
                { new: true }
            );
            
            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Mark all notifications as read
    async markAllAsRead(req, res) {
        try {
            const userId = req.user.userId;
            
            const result = await Notification.updateMany(
                { userId: userId, isRead: false },
                { isRead: true }
            );
            
            res.status(200).json({
                success: true,
                message: `${result.modifiedCount} notifications marked as read`
            });
        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Delete notification
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user.userId;
            
            const notification = await Notification.findOneAndDelete({ _id: notificationId, userId: userId });
            
            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Send test notification
    async sendTestNotification(req, res) {
        try {
            const userId = req.user.userId;
            const { title, message } = req.body;
            
            await sendToUser({
                mongoUserId: userId,
                title: title || "Test Notification",
                message: message || "This is a test notification",
                data: { type: "test", screen: "dashboard" }
            });
            
            res.status(200).json({
                success: true,
                message: 'Test notification sent'
            });
        } catch (error) {
            console.error('Send test notification error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    
    // Send notification to realtor about new lead
    async sendLeadAssignedNotification(realtorId, leadData) {
        try {
            const realtor = await User.findById(realtorId);
            if (!realtor) return;
            
            await sendToUser({
                mongoUserId: realtorId,
                title: "📋 New Lead Assigned",
                message: `You have been assigned a new lead: ${leadData.name}`,
                data: {
                    type: "lead_assigned",
                    screen: "leads",
                    leadId: leadData._id?.toString(),
                    leadName: leadData.name
                }
            });
            
            const notification = new Notification({
                userId: realtorId,
                title: "📋 New Lead Assigned",
                message: `You have been assigned a new lead: ${leadData.name}`,
                type: "lead_assigned",
                data: { leadId: leadData._id?.toString(), leadName: leadData.name }
            });
            await notification.save();
            
            await sendEmail({
                to: realtor.email,
                subject: "📋 New Lead Assigned",
                body: `<h2>New Lead Assigned</h2><p>Dear ${realtor.name},</p><p>A new lead has been assigned to you.</p><p><strong>Name:</strong> ${leadData.name}</p><p><strong>Email:</strong> ${leadData.email}</p>`,
                fromEmail: process.env.EMAIL_USER,
                fromName: "Elite CRM System"
            });
            
            console.log(`✅ Lead assigned notification sent to realtor: ${realtor.email}`);
        } catch (error) {
            console.error('❌ Failed to send lead assigned notification:', error.message);
        }
    }
    
    // Send notification to realtor about lead request approval
    async sendLeadRequestApprovedNotification(realtorId, leadRequestData) {
        try {
            const realtor = await User.findById(realtorId);
            if (!realtor) return;
            
            await sendToUser({
                mongoUserId: realtorId,
                title: "✅ Lead Request Approved",
                message: `Your request for leads has been approved.`,
                data: { type: "lead_approved", screen: "leads" }
            });
            
            const notification = new Notification({
                userId: realtorId,
                title: "✅ Lead Request Approved",
                message: `Your request for leads has been approved.`,
                type: "lead_approved"
            });
            await notification.save();
            
            await sendEmail({
                to: realtor.email,
                subject: "✅ Lead Request Approved",
                body: `<h2>Lead Request Approved</h2><p>Dear ${realtor.name},</p><p>Your request for leads has been approved.</p>`,
                fromEmail: process.env.EMAIL_USER,
                fromName: "Elite CRM System"
            });
            
            console.log(`✅ Lead request approval notification sent to realtor: ${realtor.email}`);
        } catch (error) {
            console.error('❌ Failed to send lead request approval notification:', error.message);
        }
    }
    
    // Send notification to realtor about lead request rejection
    async sendLeadRequestRejectedNotification(realtorId, rejectionReason) {
        try {
            const realtor = await User.findById(realtorId);
            if (!realtor) return;
            
            await sendToUser({
                mongoUserId: realtorId,
                title: "❌ Lead Request Rejected",
                message: `Your lead request has been rejected. Reason: ${rejectionReason}`,
                data: { type: "lead_rejected", screen: "lead-requests" }
            });
            
            const notification = new Notification({
                userId: realtorId,
                title: "❌ Lead Request Rejected",
                message: `Your lead request has been rejected. Reason: ${rejectionReason}`,
                type: "lead_rejected"
            });
            await notification.save();
            
            await sendEmail({
                to: realtor.email,
                subject: "❌ Lead Request Rejected",
                body: `<h2>Lead Request Rejected</h2><p>Dear ${realtor.name},</p><p>Your request for leads has been rejected.</p><p><strong>Reason:</strong> ${rejectionReason}</p>`,
                fromEmail: process.env.EMAIL_USER,
                fromName: "Elite CRM System"
            });
            
            console.log(`✅ Lead request rejection notification sent to realtor: ${realtor.email}`);
        } catch (error) {
            console.error('❌ Failed to send lead request rejection notification:', error.message);
        }
    }
    
    // Send notification to admin about new lead request
    async sendNewLeadRequestNotificationToAdmin(leadRequestData) {
        try {
            const admins = await User.find({ role: 'admin' });
            
            for (const admin of admins) {
                await sendToUser({
                    mongoUserId: admin._id.toString(),
                    title: "📋 New Lead Request",
                    message: `${leadRequestData.realtorName} has requested leads`,
                    data: { type: "lead_request", screen: "lead-requests" }
                });
                
                const notification = new Notification({
                    userId: admin._id,
                    title: "📋 New Lead Request",
                    message: `${leadRequestData.realtorName} has requested leads`,
                    type: "lead_request",
                    data: { realtorName: leadRequestData.realtorName }
                });
                await notification.save();
                
                await sendEmail({
                    to: admin.email,
                    subject: "📋 New Lead Request",
                    body: `<h2>New Lead Request</h2><p>Dear Admin,</p><p><strong>${leadRequestData.realtorName}</strong> has requested leads.</p>`,
                    fromEmail: process.env.EMAIL_USER,
                    fromName: "Elite CRM System"
                });
            }
            
            console.log(`✅ New lead request notification sent to admins`);
        } catch (error) {
            console.error('❌ Failed to send lead request notification to admin:', error.message);
        }
    }
}

module.exports = new NotificationController();