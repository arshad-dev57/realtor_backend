const UserRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class AuthService {
    async register(userData) {
        const { name, email, password } = userData;

        // Check if user exists
        const userExists = await UserRepository.exists(email);
        if (userExists) {
            throw new ApiError(409, 'User already exists with this email');
        }

        // Create user
        const user = await UserRepository.create({
            name,
            email,
            password
        });

        logger.info(`New user registered: ${email}`);
        
        return user;
    }

    async getUserByEmail(email) {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        return user;
    }
}

module.exports = new AuthService();