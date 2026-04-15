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
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

module.exports = { protect };