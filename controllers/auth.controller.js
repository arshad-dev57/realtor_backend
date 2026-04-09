const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

class AuthController {
    register = asyncHandler(async (req, res) => {
        const userData = req.body;
        
        const user = await AuthService.register(userData);
        
        logger.info(`User registered successfully: ${user.email}`);
        
        ApiResponse.success(res, user, 'User registered successfully', 201);
    });
}

module.exports = new AuthController();