const mongoose = require('mongoose');

const leadRequestSchema = new mongoose.Schema({
    // Realtor Info
    realtorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    realtorName: {
        type: String,
        required: true
    },
    realtorEmail: {
        type: String,
        required: true
    },
    realtorPhone: {
        type: String,
        required: true
    },
    
    // Request Details (from Flutter app)
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    area: {
        type: String,
        required: true
    },
    propertyType: {
        type: String,
        enum: ['sale', 'rent'],
        required: true
    },
    propertyCategory: {
        type: String,
        enum: ['house', 'apartment', 'villa', 'plot', 'commercial'],
        required: true
    },
    priceRange: {
        type: String,
        default: null
    },
    additionalNote: {
        type: String,
        default: null
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminRejectionReason: {
        type: String,
        default: null
    },
    
    // Admin who reviewed
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    
    // Leads assigned after approval
    assignedLeads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    }],
    
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LeadRequest', leadRequestSchema);