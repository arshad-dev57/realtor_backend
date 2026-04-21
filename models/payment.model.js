// models/payment.model.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        default: 100
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'google_pay', 'apple_pay', 'in_app_purchase', 'manual'], // ✅ Added 'manual'
        default: null
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    planName: {
        type: String,
        default: 'Pro Plan'
    },
    planDuration: {
        type: String,
        enum: ['monthly', 'yearly', 'lifetime'],
        default: 'lifetime'
    },
    receiptUrl: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

paymentSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Payment', paymentSchema);