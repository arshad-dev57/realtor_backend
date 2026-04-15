const User = require('../models/user.model');
const OTP = require('../models/otp.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class AuthController {

    // STEP 1: Forgot Password - Send OTP to email
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }
            
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'No account found with this email'
                });
            }
            
            await OTP.deleteMany({ email, purpose: 'password_reset' });
            
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            const otp = new OTP({
                email: email,
                otp: otpCode,
                purpose: 'password_reset'
            });
            await otp.save();
            
            console.log(`=========================================`);
            console.log(`🔐 PASSWORD RESET OTP for ${email}`);
            console.log(`📧 OTP CODE: ${otpCode}`);
            console.log(`⏰ Valid for 10 minutes`);
            console.log(`=========================================`);
            
            res.status(200).json({
                success: true,
                message: 'OTP sent to your email address',
                data: {
                    email: email,
                    otp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
                    expiresIn: '10 minutes'
                }
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP. Please try again.'
            });
        }
    }

    // STEP 2: Verify OTP (FIXED)
    async verifyOTP(req, res) {
        try {
            const { email, otp } = req.body;
            
            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and OTP are required'
                });
            }
            
            // Find valid OTP
            const otpRecord = await OTP.findOne({
                email: email,
                otp: otp,
                purpose: 'password_reset',
                isUsed: false,
                expiresAt: { $gt: new Date() }
            });
            
            if (!otpRecord) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired OTP'
                });
            }
            
            // Mark OTP as used
            otpRecord.isUsed = true;
            await otpRecord.save();
            
            // Generate temporary reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            
            console.log('=========================================');
            console.log('VERIFY OTP - Generating Reset Token');
            console.log('Email:', email);
            console.log('Reset Token:', resetToken);
            console.log('=========================================');
            
            // ✅ FIX: Update user with reset token
            const user = await User.findOneAndUpdate(
                { email: email },
                { 
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000)
                },
                { new: true }
            );
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            console.log('✅ User updated with reset token');
            console.log('Stored Token:', user.resetPasswordToken);
            console.log('Stored Expiry:', user.resetPasswordExpires);
            
            res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
                data: {
                    resetToken: resetToken,
                    email: email
                }
            });
        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // STEP 3: Reset Password (FIXED)
    async resetPassword(req, res) {
        try {
            const { email, resetToken, newPassword, confirmPassword } = req.body;
            
            console.log('=========================================');
            console.log('RESET PASSWORD REQUEST');
            console.log('Email:', email);
            console.log('Reset Token:', resetToken);
            console.log('=========================================');
            
            if (!email || !resetToken || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }
            
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match'
                });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters'
                });
            }
            
            // Find user with valid reset token
            const user = await User.findOne({
                email: email,
                resetPasswordToken: resetToken,
                resetPasswordExpires: { $gt: new Date() }
            });
            
            console.log('User found:', user ? 'YES' : 'NO');
            if (user) {
                console.log('User Email:', user.email);
                console.log('Stored Token:', user.resetPasswordToken);
                console.log('Stored Expiry:', user.resetPasswordExpires);
                console.log('Current Time:', new Date());
            }
            
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }
            
            // Update password
            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            console.log('✅ Password reset successful for:', email);
            
            // Delete all OTPs for this email
            await OTP.deleteMany({ email, purpose: 'password_reset' });
            
            res.status(200).json({
                success: true,
                message: 'Password reset successfully. Please login with your new password.'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }




    // STEP 1: Initial Signup
    async signup(req, res) {
        try {
            const { name, email, phone, password } = req.body;
            
            if (!name || !email || !phone || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, phone and password are required'
                });
            }
            
            const existingUser = await User.findOne({ 
                $or: [{ email }, { phone }] 
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email or phone'
                });
            }
            
            const user = new User({
                name,
                email,
                phone,
                password,
                role: null,
                isProfileComplete: false
            });
            
            await user.save();
            
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email,
                    name: user.name
                },
                process.env.JWT_SECRET || 'your_secret_key_here',
                { expiresIn: '7d' }
            );
            
            res.status(201).json({
                success: true,
                message: 'Signup successful. Please select your role',
                token: token,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isProfileComplete: user.isProfileComplete,
                    nextStep: 'select_role'
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // STEP 2: Select Role
    async selectRole(req, res) {
        try {
            const { userId, role } = req.body;
            
            if (!userId || !role) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and role are required'
                });
            }
            
            if (!['buyer', 'realtor'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be buyer or realtor'
                });
            }
            
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            user.role = role;
            await user.save();
            
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                process.env.JWT_SECRET || 'your_secret_key_here',
                { expiresIn: '7d' }
            );
            
            res.status(200).json({
                success: true,
                message: `Role selected as ${role}`,
                token: token,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isProfileComplete: user.isProfileComplete,
                    nextStep: 'complete_profile',
                    requiredFields: role === 'realtor' 
                        ? ['agencyName', 'licenseNumber', 'yearsOfExperience', 'serviceCountry', 'serviceCity']
                        : ['preferences']
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // STEP 3a: Complete Buyer Profile
    async completeBuyerProfile(req, res) {
        try {
            const { userId } = req.params;
            const { profilePhoto, preferences } = req.body;
            
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            if (user.role !== 'buyer') {
                return res.status(400).json({
                    success: false,
                    message: 'User is not a buyer'
                });
            }
            
            if (profilePhoto) user.profilePhoto = profilePhoto;
            if (preferences) user.preferences = preferences;
            user.isProfileComplete = true;
            
            await user.save();
            
            res.status(200).json({
                success: true,
                message: 'Buyer profile completed successfully',
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isProfileComplete: user.isProfileComplete
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // STEP 3b: Complete Realtor Profile
    async completeRealtorProfile(req, res) {
        try {
            const { userId } = req.params;
            const {
                profilePhoto,
                agencyName,
                licenseNumber,
                yearsOfExperience,
                bio,
                serviceCountry,
                serviceCity
            } = req.body;
            
            if (!agencyName || !licenseNumber || !yearsOfExperience || !serviceCountry || !serviceCity) {
                return res.status(400).json({
                    success: false,
                    message: 'All realtor fields are required'
                });
            }
            
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            if (user.role !== 'realtor') {
                return res.status(400).json({
                    success: false,
                    message: 'User is not a realtor'
                });
            }
            
            const existingLicense = await User.findOne({
                licenseNumber,
                _id: { $ne: userId }
            });
            
            if (existingLicense) {
                return res.status(400).json({
                    success: false,
                    message: 'License number already registered'
                });
            }
            
            if (profilePhoto) user.profilePhoto = profilePhoto;
            user.agencyName = agencyName;
            user.licenseNumber = licenseNumber;
            user.yearsOfExperience = yearsOfExperience;
            user.bio = bio || '';
            user.serviceCountry = serviceCountry;
            user.serviceCity = serviceCity;
            user.isProfileComplete = true;
            
            await user.save();
            
            res.status(200).json({
                success: true,
                message: 'Realtor profile completed successfully',
                data: user.toJSON()
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Login
    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }
            
            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                process.env.JWT_SECRET || 'your_secret_key',
                { expiresIn: '7d' }
            );
            
            res.status(200).json({
                success: true,
                message: 'Login successful',
                token: token,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isProfileComplete: user.isProfileComplete
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get user status
    async getUserStatus(req, res) {
        try {
            const { userId } = req.params;
            
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            let step = 1;
            let nextStep = null;
            
            if (user.role === null) {
                step = 1;
                nextStep = 'select_role';
            } else if (!user.isProfileComplete) {
                step = 2;
                nextStep = 'complete_profile';
            } else {
                step = 3;
                nextStep = 'dashboard';
            }
            
            res.status(200).json({
                success: true,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isProfileComplete: user.isProfileComplete,
                    currentStep: step,
                    nextStep: nextStep
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new AuthController();