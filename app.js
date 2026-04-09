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

        // ✅ Root route (NEW)
        this.app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: '🚀 Server is running successfully',
                api: '/api/v1',
                health: '/health'
            });
        });

        // ✅ Health check
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                environment: env.NODE_ENV
            });
        });

        // ✅ Ping route (optional)
        this.app.get('/ping', (req, res) => {
            res.send('pong');
        });

        // ✅ API routes
        this.app.use('/api/v1/auth', require('./routes/auth.routes'));

        // ❌ 404 handler
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

            // ✅ Fix production URL
            const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT}`;

            logger.info(`
################################################
🚀 Server listening on port: ${env.PORT}
🌍 Environment: ${env.NODE_ENV}
📝 API: ${baseUrl}/api/v1
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