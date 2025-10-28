/**
 * Health Check Scheduler
 * Manages periodic health checks and notifications
 */

const schedule = require('node-schedule');
const telegramBot = require('../telegram/bot');
const exchangeFactory = require('../exchanges/factory');
const db = require('../database/connection');
const config = require('../config/settings');
const logger = require('../utils/logger');

class HealthScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize scheduler
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Health check every 30 minutes
      this.scheduleHealthCheck();
      
      // Daily summary at 23:59
      this.scheduleDailySummary();
      
      // Weekly cleanup at Sunday 00:00
      this.scheduleWeeklyCleanup();
      
      this.isInitialized = true;
      logger.info('Health scheduler initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule health check job
   */
  scheduleHealthCheck() {
    const job = schedule.scheduleJob('*/30 * * * *', async () => {
      await this.performHealthCheck();
    });
    
    this.jobs.set('healthCheck', job);
    logger.info('Health check scheduled every 30 minutes');
  }

  /**
   * Schedule daily summary job
   */
  scheduleDailySummary() {
    const job = schedule.scheduleJob('59 23 * * *', async () => {
      await this.performDailySummary();
    });
    
    this.jobs.set('dailySummary', job);
    logger.info('Daily summary scheduled at 23:59');
  }

  /**
   * Schedule weekly cleanup job
   */
  scheduleWeeklyCleanup() {
    const job = schedule.scheduleJob('0 0 * * 0', async () => {
      await this.performWeeklyCleanup();
    });
    
    this.jobs.set('weeklyCleanup', job);
    logger.info('Weekly cleanup scheduled on Sundays at 00:00');
  }

  /**
   * Perform health check
   * @returns {Promise<void>}
   */
  async performHealthCheck() {
    try {
      logger.health('Performing health check...');

      const healthData = {
        uptime: this.formatUptime(process.uptime()),
        exchange: 'Unknown',
        latency: 'N/A',
        dbStatus: db.isHealthy() ? 'Connected' : 'Disconnected',
        tradingActive: false
      };

      // Check exchange health
      try {
        const exchanges = exchangeFactory.getAllAdapters();
        if (exchanges.length > 0) {
          const exchange = exchanges[0];
          const startTime = Date.now();
          const isHealthy = await exchange.info.isHealthy();
          healthData.latency = `${Date.now() - startTime}ms`;
          healthData.exchange = exchange.name;
          healthData.tradingActive = isHealthy;
        }
      } catch (error) {
        logger.error('Exchange health check failed:', error);
        healthData.exchange = 'Error';
        healthData.latency = 'Error';
      }

      // Send health notification
      await telegramBot.sendHealthNotification(healthData);

      logger.health('Health check completed', healthData);
    } catch (error) {
      logger.error('Health check error:', error);
      await telegramBot.sendErrorNotification('Health check failed', { error: error.message });
    }
  }

  /**
   * Perform daily summary
   * @returns {Promise<void>}
   */
  async performDailySummary() {
    try {
      logger.info('Performing daily summary...');

      // Get admin user
      const adminId = process.env.TG_ADMIN_ID;
      if (!adminId) {
        return;
      }

      const user = await db.getUserByTelegramId(parseInt(adminId));
      if (!user) {
        return;
      }

      // Get daily PnL
      const dailyPnL = await db.getDailyPnL(user.id);
      
      const summaryData = {
        totalTrades: dailyPnL.totalTrades,
        winCount: dailyPnL.winCount,
        lossCount: dailyPnL.totalTrades - dailyPnL.winCount,
        totalPnL: dailyPnL.totalPnL,
        winRate: dailyPnL.winRate
      };

      // Send daily summary
      await telegramBot.sendDailySummary(summaryData);

      logger.info('Daily summary completed', summaryData);
    } catch (error) {
      logger.error('Daily summary error:', error);
    }
  }

  /**
   * Perform weekly cleanup
   * @returns {Promise<void>}
   */
  async performWeeklyCleanup() {
    try {
      logger.info('Performing weekly cleanup...');

      // Clear old price history (keep last 1000 entries per symbol)
      const aiEngine = require('../ai/engine');
      aiEngine.clearHistory();

      // Clear old logs (this would typically involve log rotation)
      logger.info('Weekly cleanup completed');
    } catch (error) {
      logger.error('Weekly cleanup error:', error);
    }
  }

  /**
   * Format uptime in human readable format
   * @param {number} uptime - Uptime in seconds
   * @returns {string} Formatted uptime
   */
  formatUptime(uptime) {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Stop scheduler
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      for (const [name, job] of this.jobs) {
        job.cancel();
        logger.info(`Scheduled job stopped: ${name}`);
      }
      
      this.jobs.clear();
      this.isInitialized = false;
      logger.info('Scheduler stopped');
    } catch (error) {
      logger.error('Error stopping scheduler:', error);
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeJobs: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    };
  }

  /**
   * Manually trigger health check
   * @returns {Promise<void>}
   */
  async triggerHealthCheck() {
    await this.performHealthCheck();
  }

  /**
   * Manually trigger daily summary
   * @returns {Promise<void>}
   */
  async triggerDailySummary() {
    await this.performDailySummary();
  }
}

module.exports = new HealthScheduler();
