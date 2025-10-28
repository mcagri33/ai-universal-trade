/**
 * Winston Logger Configuration
 * Professional logging with rotation and multiple transports
 */

const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'universal-ai-trader' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    }),
    
    // Trading specific log
    new winston.transports.File({
      filename: path.join(logsDir, 'trading.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: logFormat
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ]
});

// Add trading-specific logging methods
logger.trade = (message, meta = {}) => {
  logger.info(`[TRADE] ${message}`, { ...meta, category: 'trading' });
};

logger.ai = (message, meta = {}) => {
  logger.info(`[AI] ${message}`, { ...meta, category: 'ai' });
};

logger.telegram = (message, meta = {}) => {
  logger.info(`[TELEGRAM] ${message}`, { ...meta, category: 'telegram' });
};

logger.exchange = (message, meta = {}) => {
  logger.info(`[EXCHANGE] ${message}`, { ...meta, category: 'exchange' });
};

logger.health = (message, meta = {}) => {
  logger.info(`[HEALTH] ${message}`, { ...meta, category: 'health' });
};

// Export logger instance
module.exports = logger;
