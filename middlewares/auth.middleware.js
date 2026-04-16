// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    try {
        let token;
        
        // Bearer token extract karo
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token'
            });
        }
        
        // Token verify karo
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_here');
        
        // ✅ FIX: Handle both possible property names
        // Token mein 'userId' ya 'id' ya 'user' ho sakta hai
        req.user = {
            userId: decoded.userId || decoded.id || decoded.user?._id || decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role
        };
        
        console.log('🔐 Auth - User ID:', req.user.userId);
        console.log('🔐 Auth - User Email:', req.user.email);
        
        next();
    } catch (error) {
        console.error('❌ Auth Error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

module.exports = { protect };