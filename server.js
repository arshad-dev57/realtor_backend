const App = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

let cachedExpressApp = null;

async function createApp() {
    if (!cachedExpressApp) {
        await connectDB();
        const appInstance = new App();
        cachedExpressApp = appInstance.app;
    }

    return cachedExpressApp;
}

async function startLocalServer() {
    try {
        const expressApp = await createApp();
        const port = process.env.PORT || 5000;

        expressApp.listen(port, '0.0.0.0', () => {
            logger.info(`Local server listening on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });

    startLocalServer();
}

module.exports = async function handler(req, res) {
    try {
        const expressApp = await createApp();
        return expressApp(req, res);
    } catch (error) {
        logger.error('Serverless handler failed:', error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
};