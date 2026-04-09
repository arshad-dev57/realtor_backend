const router = require('express').Router();
const AuthController = require('../controllers/auth.controller');
const validate = require('../middlewares/validation.middleware');
const { registerValidation } = require('../validations/auth.validation');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
    '/register',
    authLimiter,
    validate(registerValidation),
    AuthController.register
);

module.exports = router;