class ApiResponse {
    constructor(statusCode, data, message = 'Success') {
        this.statusCode = statusCode;
        this.success = statusCode >= 200 && statusCode < 400;
        this.message = message;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }

    static success(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
    }

    static error(res, error, statusCode = 500) {
        const response = {
            success: false,
            message: error.message || 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        };
        return res.status(statusCode).json(response);
    }
}

module.exports = ApiResponse;