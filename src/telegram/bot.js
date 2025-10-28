/**
 * Telegram Bot Setup and Management
 * Handles bot initialization, command registration, and notifications
 */

const { Telegraf } = require('telegraf');
const commands = require('./commands');
const logger = require('../utils/logger');

class TelegramBot {
  constructor() {
    this.bot = null;
    this.isInitialized = false;
    this.notificationQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Initialize Telegram bot
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      const token = process.env.TG_BOT_TOKEN;
      
      if (!token) {
        throw new Error('Telegram bot token not provided');
      }

      this.bot = new Telegraf(token);
      
      // Register all commands
      this.registerCommands();
      
      // Register error handler
      this.bot.catch((err, ctx) => {
        logger.error('Telegram bot error:', err);
        ctx.reply('❌ An error occurred. Please try again.');
      });

      // Start bot
      await this.bot.launch();
      this.isInitialized = true;
      
      logger.telegram('Telegram bot initialized successfully');
      
      // Process notification queue
      this.processNotificationQueue();
      
    } catch (error) {
      logger.error('Failed to initialize Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Register all bot commands
   */
  registerCommands() {
    // Basic commands
    this.bot.start(commands.handleStart.bind(commands));
    this.bot.help(commands.handleHelp.bind(commands));
    
    // Trading control commands
    this.bot.command('pause', commands.handlePause.bind(commands));
    this.bot.command('resume', commands.handleResume.bind(commands));
    this.bot.command('stats', commands.handleStats.bind(commands));
    
    // Configuration commands
    this.bot.command('config', commands.handleConfig.bind(commands));
    this.bot.command('set', commands.handleSet.bind(commands));
    this.bot.command('exchange', commands.handleExchange.bind(commands));
    
    // System commands
    this.bot.command('health', commands.handleHealth.bind(commands));
    this.bot.command('restart', commands.handleRestart.bind(commands));
    this.bot.command('logs', commands.handleLogs.bind(commands));
    
    // AI and analysis commands
    this.bot.command('ai', commands.handleAI.bind(commands));
    
    // Data export commands
    this.bot.command('export', commands.handleExport.bind(commands));
    
    logger.telegram('All commands registered successfully');
  }

  /**
   * Send notification to admin
   * @param {string} message - Notification message
   * @param {Object} options - Notification options
   * @returns {Promise<void>}
   */
  async sendNotification(message, options = {}) {
    try {
      const adminId = process.env.TG_ADMIN_ID;
      
      if (!adminId || !this.isInitialized) {
        // Queue notification for later
        this.notificationQueue.push({ message, options, timestamp: Date.now() });
        return;
      }

      const { parse_mode = 'Markdown', ...otherOptions } = options;
      
      await this.bot.telegram.sendMessage(adminId, message, {
        parse_mode,
        ...otherOptions
      });
      
      logger.telegram('Notification sent successfully');
    } catch (error) {
      logger.error('Failed to send notification:', error);
      
      // Queue notification for retry
      this.notificationQueue.push({ message, options, timestamp: Date.now() });
    }
  }

  /**
   * Send trade notification
   * @param {Object} tradeData - Trade data
   * @returns {Promise<void>}
   */
  async sendTradeNotification(tradeData) {
    const { symbol, side, amount, price, confidence, reason } = tradeData;
    
    const emoji = side === 'buy' ? '🟦' : '🟩';
    const action = side === 'buy' ? 'BUY' : 'SELL';
    
    const message = `${emoji} **${action} ${amount} ${symbol}** @ ${price}
🤖 AI confidence: ${confidence}%
📝 Reason: ${reason}`;

    await this.sendNotification(message);
  }

  /**
   * Send trade closure notification
   * @param {Object} tradeData - Trade data
   * @returns {Promise<void>}
   */
  async sendTradeClosureNotification(tradeData) {
    const { symbol, profit, side } = tradeData;
    
    const emoji = profit > 0 ? '🟩' : '🔴';
    const profitText = profit > 0 ? `+${profit.toFixed(2)}% profit` : `${profit.toFixed(2)}% loss`;
    
    const message = `${emoji} **${side.toUpperCase()} ${symbol}** closed with ${profitText}`;

    await this.sendNotification(message);
  }

  /**
   * Send health check notification
   * @param {Object} healthData - Health data
   * @returns {Promise<void>}
   */
  async sendHealthNotification(healthData) {
    const { 
      uptime, 
      exchange, 
      latency, 
      dbStatus, 
      tradingActive 
    } = healthData;
    
    const status = tradingActive ? '🟢 Active' : '🔴 Paused';
    
    const message = `🟢 **Bot Health Check**
⏱️ Uptime: ${uptime}
🏦 Exchange: ${exchange}
📡 Latency: ${latency}ms
💾 Database: ${dbStatus}
🔄 Trading: ${status}`;

    await this.sendNotification(message);
  }

  /**
   * Send error notification
   * @param {string} error - Error message
   * @param {Object} context - Error context
   * @returns {Promise<void>}
   */
  async sendErrorNotification(error, context = {}) {
    const message = `⚠️ **Error Alert**
${error}

Context: ${JSON.stringify(context, null, 2)}`;

    await this.sendNotification(message);
  }

  /**
   * Send daily summary notification
   * @param {Object} summaryData - Summary data
   * @returns {Promise<void>}
   */
  async sendDailySummary(summaryData) {
    const { 
      totalTrades, 
      winCount, 
      lossCount, 
      totalPnL, 
      winRate 
    } = summaryData;
    
    const message = `📊 **Daily Trading Summary**
📈 Total Trades: ${totalTrades}
✅ Wins: ${winCount}
❌ Losses: ${lossCount}
📊 Win Rate: ${winRate.toFixed(1)}%
💰 Total PnL: ${totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)}%`;

    await this.sendNotification(message);
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        
        // Skip old notifications (older than 1 hour)
        if (Date.now() - notification.timestamp > 3600000) {
          continue;
        }
        
        await this.sendNotification(notification.message, notification.options);
        
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error('Error processing notification queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Send message to specific user
   * @param {number} userId - User ID
   * @param {string} message - Message text
   * @param {Object} options - Message options
   * @returns {Promise<void>}
   */
  async sendMessage(userId, message, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Bot not initialized');
      }

      await this.bot.telegram.sendMessage(userId, message, options);
      logger.telegram(`Message sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send message to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get bot info
   * @returns {Promise<Object>}
   */
  async getBotInfo() {
    try {
      if (!this.isInitialized) {
        return null;
      }

      return await this.bot.telegram.getMe();
    } catch (error) {
      logger.error('Failed to get bot info:', error);
      return null;
    }
  }

  /**
   * Stop bot gracefully
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      if (this.bot && this.isInitialized) {
        await this.bot.stop();
        this.isInitialized = false;
        logger.telegram('Telegram bot stopped');
      }
    } catch (error) {
      logger.error('Error stopping Telegram bot:', error);
    }
  }

  /**
   * Check if bot is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.bot !== null;
  }

  /**
   * Get notification queue status
   * @returns {Object}
   */
  getQueueStatus() {
    return {
      queueLength: this.notificationQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

module.exports = new TelegramBot();
