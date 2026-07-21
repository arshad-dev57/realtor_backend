const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('../config/env');

const logDir = path.resolve(__dirname, '../logs');
fs.mkdirSync(logDir, { recursive: true });

const transports = [
    new winston.transports.Console({
        format: env.NODE_ENV === 'development'
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
            : winston.format.json()
    })
];

// Keep local log files for development and local runs.
if (env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        })
    );

    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    );
}

const logger = winston.createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports
});

module.exports = logger;