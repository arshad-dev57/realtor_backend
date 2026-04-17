const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    // Basic Info
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    
    // Property Requirements
    propertyType: {
        type: String,
        enum: ['House', 'Condo', 'Townhome', 'Apartment', 'Villa', 'Commercial', 'Land'],
        default: 'House'
    },
    budget: {
        type: String,
        required: true
    },
    budgetMin: {
        type: Number,
        default: 0
    },
    budgetMax: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        required: true
    },
    
    // Lead Details
    source: {
        type: String,
        enum: ['Referral', 'Website', 'Social Media', 'Cold Outreach', 'Events', 'Direct'],
        default: 'Website'
    },
    status: {
        type: String,
        enum: ['Hot', 'Warm', 'Cold'],
        default: 'Warm'
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium'
    },
    stage: {
        type: String,
        enum: ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
        default: 'Prospecting'
    },
    score: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
    },
    
    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedToName: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Additional Info
    notes: {
        type: String,
        default: ''
    },
    lastContact: {
        type: Date,
        default: Date.now
    },
    nextFollowUp: {
        type: Date,
        default: null
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Calculate score based on status, priority, and stage
leadSchema.methods.calculateScore = function() {
    let score = 50;
    
    // Status based score
    if (this.status === 'Hot') score += 30;
    else if (this.status === 'Warm') score += 15;
    else if (this.status === 'Cold') score -= 10;
    
    // Priority based score
    if (this.priority === 'High') score += 20;
    else if (this.priority === 'Medium') score += 10;
    else if (this.priority === 'Low') score -= 5;
    
    // Stage based score
    if (this.stage === 'Negotiation') score += 25;
    else if (this.stage === 'Proposal') score += 15;
    else if (this.stage === 'Qualified') score += 10;
    else if (this.stage === 'Closed Won') score += 40;
    else if (this.stage === 'Closed Lost') score = 0;
    
    this.score = Math.min(100, Math.max(0, score));
    return this.score;
};

module.exports = mongoose.model('Lead', leadSchema);