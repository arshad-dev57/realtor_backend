const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Step 1 - Basic Info
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    
    // Step 2 - Role
    role: {
        type: String,
        enum: ['buyer', 'realtor', null],
        default: null
    },
    
    // Step 3 - Profile Complete Flag
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    
    // Common Profile Fields
    profilePhoto: {
        type: String,
        default: null
    },
    // In models/user.model.js - Add these fields
resetPasswordToken: {
    type: String,
    default: null,
    index: true
},
resetPasswordExpires: {
    type: Date,
    default: null
},


    // Realtor Specific Fields
    agencyName: String,
    licenseNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    yearsOfExperience: Number,
    bio: String,
    serviceCountry: String,
    serviceCity: String,
    
    // Buyer Specific Fields
    preferences: {
        type: Object,
        default: {}
    }
    
}, {
    timestamps: true
});

// Hash password
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return ;
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
    }
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.__v;
    return user;
};

module.exports = mongoose.model('User', userSchema);