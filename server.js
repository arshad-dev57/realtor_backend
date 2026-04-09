const App = require('./app');
const connectDB = require('./config/db');  // Change: Direct function import
const logger = require('./utils/logger');

class Server {
    async start() {
        try {
            // Connect to database
            await connectDB();  // Change: Direct function call
            
            // Start express app
            const app = new App();
            app.listen();
            
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const server = new Server();
server.start();