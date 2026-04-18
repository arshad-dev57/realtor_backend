const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');

const env = require('./config/env');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

class App {
    constructor() {
        this.app = express();

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
        this.initializeKeepAlive();
    }

    initializeMiddlewares() {
        this.app.use(helmet());

        this.app.use(cors({
            origin: '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        this.app.use(compression());

        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({
            extended: true,
            limit: '10mb'
        }));

        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path} from ${req.ip}`);
            next();
        });
    }

    initializeRoutes() {
        this.app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: '🚀 Server is running successfully',
                api: '/api/v1',
                health: '/health'
            });
        });

        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                environment: env.NODE_ENV
            });
        });

        // Routes
        this.app.use('/api/v1/auth', require('./routes/auth.routes'));
        this.app.use('/api/v1/property', require('./routes/property.routes'));
        this.app.use('/api/v1/contact', require('./routes/email.routes'));
        this.app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));
        this.app.use('/api/v1/tours', require('./routes/tour.routes'));
        this.app.use('/api/v1/users', require('./routes/user.routes'));
        this.app.use('/api/v1/leads', require('./routes/lead.routes'));
        this.app.use('/api/v1/lead-requests', require('./routes/leadRequest.routes'));
      this.app.use('/api/v1/notification', require('./routes/notification.routes'));

        // 404 handler
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

    initializeKeepAlive() {
        const baseURL =
            process.env.RENDER_EXTERNAL_URL ||
            `http://localhost:${env.PORT}`;

        setInterval(async () => {
            try {
                const response = await axios.get(`${baseURL}/health`);

                logger.info(
                    `KeepAlive Ping Success: ${response.status} - ${new Date().toISOString()}`
                );
            } catch (error) {
                logger.error(
                    `KeepAlive Ping Failed: ${error.message}`
                );
            }
        }, 10 * 60 * 1000); // every 10 minutes
    }

    listen() {
        const server = this.app.listen(env.PORT, '0.0.0.0', () => {
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();

            let localIp = 'localhost';

            for (const interfaceName in networkInterfaces) {
                for (const iface of networkInterfaces[interfaceName]) {
                    if (
                        iface.family === 'IPv4' &&
                        !iface.internal
                    ) {
                        localIp = iface.address;
                        break;
                    }
                }
            }

            console.log(`
╔══════════════════════════════════════════════════════════╗
║  🚀 SERVER STARTED SUCCESSFULLY                         ║
╠══════════════════════════════════════════════════════════╣
║  📍 Local:    http://localhost:${env.PORT}
║  🌐 Network:  http://${localIp}:${env.PORT}
║  📝 API:      http://${localIp}:${env.PORT}/api/v1
║  🧪 Health:   http://${localIp}:${env.PORT}/health
║  🚗 Tours:    http://${localIp}:${env.PORT}/api/v1/tours
╠══════════════════════════════════════════════════════════╣
║  💡 Tour Endpoints:                                     ║
║  POST   /api/v1/tours/schedule - Schedule a tour       ║
║  GET    /api/v1/tours/my-tours  - Get my tours         ║
║  GET    /api/v1/tours/:id       - Get tour by ID       ║
║  PUT    /api/v1/tours/:id/cancel - Cancel tour         ║
╚══════════════════════════════════════════════════════════╝
            `);
        });

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