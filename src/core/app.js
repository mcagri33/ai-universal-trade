/**
 * Main Trading Application
 * Initializes and runs the complete trading system
 */

require('dotenv').config();

const db = require('../database/connection');
const dbModels = require('../database/models');
const telegramBot = require('../telegram/bot');
const telegramCommands = require('../telegram/commands');
const tradingCore = require('./trader');
const scheduler = require('./scheduler');
const logger = require('../utils/logger');

class TradingApplication {
  constructor() {
    this.isInitialized = false;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the trading application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('Initializing Universal AI Trader...');

      // Initialize database
      await db.initialize();
      await dbModels.initializeSchema();
      logger.info('Database initialized');

      // Initialize Telegram bot
      await telegramBot.initialize();
      logger.info('Telegram bot initialized');

      // Initialize scheduler
      await scheduler.initialize();
      logger.info('Scheduler initialized');

      this.isInitialized = true;
      logger.info('Universal AI Trader initialized successfully');

      // Send startup notification
      await telegramBot.sendNotification('🚀 **Universal AI Trader Started**\n\nSystem is now online and ready for trading.');

    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Start trading for a user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async startTrading(userId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Application not initialized');
      }

      // Set trading active
      telegramCommands.setTradingActive(userId, true);

      // Start trading core
      await tradingCore.startTrading(userId);

      logger.info('Trading started for user', { userId });
    } catch (error) {
      logger.error('Error starting trading:', error);
      throw error;
    }
  }

  /**
   * Stop trading
   * @returns {Promise<void>}
   */
  async stopTrading() {
    try {
      // Stop trading core
      await tradingCore.stopTrading();

      // Set all users to inactive
      telegramCommands.setTradingActive(telegramCommands.adminId, false);

      logger.info('Trading stopped');
    } catch (error) {
      logger.error('Error stopping trading:', error);
      throw error;
    }
  }

  /**
   * Get application status
   * @returns {Object} Application status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      database: db.isHealthy(),
      telegram: telegramBot.isReady(),
      trading: tradingCore.getStatus(),
      uptime: process.uptime()
    };
  }

  /**
   * Graceful shutdown
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;
      logger.info('Starting graceful shutdown...');

      // Stop trading
      await this.stopTrading();

      // Stop scheduler
      await scheduler.stop();

      // Stop Telegram bot
      await telegramBot.stop();

      // Close database connection
      await db.close();

      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Create application instance
const app = new TradingApplication();

// Handle process signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await app.shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception:', error);
  await app.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  await app.shutdown();
  process.exit(1);
});

// Export for testing
module.exports = app;

// Start application if this is the main module
if (require.main === module) {
  (async () => {
    try {
      await app.initialize();
      
      // Start trading for admin user
      const adminId = process.env.TG_ADMIN_ID;
      if (adminId) {
        await app.startTrading(parseInt(adminId));
      }
      
      logger.info('Application started successfully');
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  })();
}
