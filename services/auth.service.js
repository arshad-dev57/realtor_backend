const UserRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class AuthService {
    async signup(userData) {
        const { name, email, password, phone, role } = userData;
        
        // Check if user exists
        const existingUser = await UserRepository.findByEmailOrPhone(email, phone);
        if (existingUser) {
            throw new ApiError(400, 'User already exists with this email or phone');
        }
        
        // Create user
        const user = await UserRepository.create({
            name,
            email,
            password,
            phone,
            role,
            isProfileComplete: false
        });
        
        logger.info(`New user signed up: ${email} as ${role}`);
        return user;
    }
    
    async completeBuyerProfile(userId, profileData) {
        const { profilePhoto, preferences } = profileData;
        
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        
        if (user.role !== 'buyer') {
            throw new ApiError(400, 'User is not a buyer');
        }
        
        const updatedUser = await UserRepository.update(userId, {
            profilePhoto: profilePhoto || user.profilePhoto,
            preferences: preferences || {},
            isProfileComplete: true
        });
        
        logger.info(`Buyer profile completed: ${user.email}`);
        return updatedUser;
    }
    
    async completeRealtorProfile(userId, profileData) {
        const {
            profilePhoto,
            agencyName,
            licenseNumber,
            yearsOfExperience,
            bio,
            serviceCountry,
            serviceCity
        } = profileData;
        
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        
        if (user.role !== 'realtor') {
            throw new ApiError(400, 'User is not a realtor');
        }
        
        // Check if license exists
        const existingLicense = await UserRepository.findByLicenseNumber(licenseNumber, userId);
        if (existingLicense) {
            throw new ApiError(400, 'License number already registered');
        }
        
        const updatedUser = await UserRepository.update(userId, {
            profilePhoto: profilePhoto || user.profilePhoto,
            agencyName,
            licenseNumber,
            yearsOfExperience,
            bio: bio || '',
            serviceCountry,
            serviceCity,
            isProfileComplete: true
        });
        
        logger.info(`Realtor profile completed: ${user.email}`);
        return updatedUser;
    }
    
    async login(email, password) {
        const user = await UserRepository.findByEmailWithPassword(email);
        if (!user) {
            throw new ApiError(401, 'Invalid credentials');
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new ApiError(401, 'Invalid credentials');
        }
        
        return user;
    }
    
    async getProfile(userId) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        return user;
    }
}

module.exports = new AuthService();