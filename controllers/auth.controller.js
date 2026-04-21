const User = require('../models/user.model');
const { sendToUser } = require("../services/onesignal");
const OTP = require('../models/otp.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class AuthController {

    // ==================== ADMIN SPECIFIC FUNCTIONS ====================
    
    async adminRegister(req, res) {
        try {
            const { name, email, phone, password, secretKey } = req.body;
            
            const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'elitecrm_admin_2024';
            
            if (secretKey !== ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid secret key'
                });
            }
            
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
                role: 'admin',
                isProfileComplete: true,
                isSubscribed: true
            });
            
            await user.save();
            
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email,
                    name: user.name,
                    role: 'admin'
                },
                process.env.JWT_SECRET || 'your_secret_key_here',
                { expiresIn: '7d' }
            );
            
            res.status(201).json({
                success: true,
                message: 'Admin registered successfully',
                token: token,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: 'admin',
                    isProfileComplete: true,
                    isAdmin: true
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }
            
            const user = await User.findOne({ email, role: 'admin' }).select('+password');
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
            }
            
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
            }
            
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email,
                    name: user.name,
                    role: 'admin'
                },
                process.env.JWT_SECRET || 'your_secret_key',
                { expiresIn: '7d' }
            );
            
            res.status(200).json({
                success: true,
                message: 'Admin login successful',
                token: token,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: 'admin',
                    isProfileComplete: true,
                    isAdmin: true
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // ==================== FORGOT PASSWORD ====================
    
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

    async verifyOTP(req, res) {
        try {
            const { email, otp } = req.body;
            
            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and OTP are required'
                });
            }
            
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
            
            otpRecord.isUsed = true;
            await otpRecord.save();
            
            const resetToken = crypto.randomBytes(32).toString('hex');
            
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

    async resetPassword(req, res) {
        try {
            const { email, resetToken, newPassword, confirmPassword } = req.body;
            
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
            
            const user = await User.findOne({
                email: email,
                resetPasswordToken: resetToken,
                resetPasswordExpires: { $gt: new Date() }
            });
            
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }
            
            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
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

    // ==================== USER SIGNUP (Buyer/Realtor) ====================
    
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
    
    async selectRole(req, res) {
        try {
            console.log('=== SELECT ROLE API CALLED ===');
            console.log('Request Body:', req.body);
            
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
            
            const responseData = {
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
                        ? ['agencyName', 'licenseNumber', 'yearsOfExperience', 'serviceCountry', 'serviceCity', 'country', 'city']
                        : ['preferences', 'country', 'city']
                }
            };
            
            res.status(200).json(responseData);
            
        } catch (error) {
            console.error('=== ERROR IN SELECT ROLE ===');
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async completeBuyerProfile(req, res) {
        try {
            const { userId } = req.params;
            const { profilePhoto, preferences, country, city } = req.body;
            
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
            if (country) user.country = country;
            if (city) user.city = city;
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
                    isProfileComplete: user.isProfileComplete,
                    country: user.country,
                    city: user.city,
                    preferences: user.preferences
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
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
                serviceCity,
                country,
                city
            } = req.body;
            
            if (!agencyName || !licenseNumber || !yearsOfExperience || !serviceCountry || !serviceCity || !country || !city) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required: agencyName, licenseNumber, yearsOfExperience, serviceCountry, serviceCity, country, city'
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
            user.country = country;
            user.city = city;
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

    // ==================== USER LOGIN ====================
    
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const user = await User.findOne({
                email,
                role: { $ne: 'admin' }
            }).select('+password');

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

            let requiresPayment = false;

            if (user.role !== 'admin') {
                requiresPayment =
                    !user.isSubscribed &&
                    user.paymentStatus !== 'completed';
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

            try {
                await sendToUser({
                    mongoUserId: user._id.toString(),
                    title: "Login Successful",
                    message: `Welcome back ${user.name} 🎉`,
                    data: {
                        type: "login_success",
                        screen: "home"
                    }
                });
                console.log("✅ Login notification sent");
            } catch (pushErr) {
                console.log("❌ Push send failed:", pushErr.message);
            }

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                token: token,
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isProfileComplete: user.isProfileComplete,
                    requiresPayment: requiresPayment,
                    isSubscribed: user.isSubscribed,
                    isAdmin: false,
                    country: user.country,
                    city: user.city
                }
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== USER PROFILE FUNCTIONS ====================
    
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
                    nextStep: nextStep,
                    country: user.country,
                    city: user.city
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const profileData = {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isProfileComplete: user.isProfileComplete,
                profilePhoto: user.profilePhoto || null,
                country: user.country || null,
                city: user.city || null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
            
            if (user.role === 'buyer') {
                profileData.preferences = user.preferences || {};
            }
            
            if (user.role === 'realtor') {
                profileData.agencyName = user.agencyName || null;
                profileData.licenseNumber = user.licenseNumber || null;
                profileData.yearsOfExperience = user.yearsOfExperience || null;
                profileData.bio = user.bio || null;
                profileData.serviceCountry = user.serviceCountry || null;
                profileData.serviceCity = user.serviceCity || null;
            }
            
            res.status(200).json({
                success: true,
                data: profileData
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const updates = req.body;
            
            const allowedUpdates = [
                'name', 'phone', 'profilePhoto', 'bio', 'country', 'city',
                'preferences', 'agencyName', 'serviceCountry', 'serviceCity'
            ];
            
            const updateData = {};
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    updateData[key] = updates[key];
                }
            }
            
            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: user.toJSON()
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword, confirmPassword } = req.body;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }
            
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New passwords do not match'
                });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters'
                });
            }
            
            const user = await User.findById(userId).select('+password');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const isPasswordValid = await user.comparePassword(currentPassword);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            
            user.password = newPassword;
            await user.save();
            
            res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new AuthController();