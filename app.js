const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./config/env');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

class App {
    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    initializeMiddlewares() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS
        this.app.use(cors({
            origin: env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
            credentials: true
        }));
        
        // Compression
        this.app.use(compression());
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`);
            next();
        });
    }

    initializeRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                environment: env.NODE_ENV
            });
        });

        // API routes
        this.app.use('/api/v1/auth', require('./routes/auth.routes'));

        // 404 handler - FIXED: removed '*'
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: `Route ${req.originalUrl} not found`
            });
        });
    }

    initializeErrorHandling() {
        this.app.use(errorHandler);
    }

    listen() {
        const server = this.app.listen(env.PORT, () => {
            logger.info(`
                ################################################
                🚀 Server listening on port: ${env.PORT}
                🌍 Environment: ${env.NODE_ENV}
                📝 API: http://localhost:${env.PORT}/api/v1
                ################################################
            `);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });
    }
}

module.exports = App;