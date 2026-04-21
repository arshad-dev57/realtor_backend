// backend/models/notification.model.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
    type: String,
    enum: [
        'payment_success', 'payment_confirmation',
        'lead_assigned', 'lead_approved', 'lead_rejected', 'lead_request',
        'lead_stage_updated', 'lead_status_updated', 'lead_removed', 'lead_deleted',
        'tour_request', 'tour_confirmation', 'tour_accepted', 'tour_rejected', 
        'tour_cancelled', 'tour_rescheduled', 'new_property_alert', 
        'login_success', 'other'
    ],
    required: true
},
    data: {
        type: Object,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);