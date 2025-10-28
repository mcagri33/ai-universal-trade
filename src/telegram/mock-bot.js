/**
 * Mock Telegram Bot for Testing
 * Simulates Telegram bot functionality without real API calls
 */

const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class MockTelegramBot {
  constructor() {
    this.isInitialized = false;
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    this.logFile = path.join(__dirname, '../../logs/telegram.log');
    this.commands = {};
    this.adminId = process.env.TG_ADMIN_ID || '123456789';
  }

  /**
   * Initialize mock bot
   */
  async initialize() {
    try {
      logger.info('Mock Telegram bot initialized for testing');
      this.isInitialized = true;
      
      // Ensure logs directory exists
      const logsDir = path.dirname(this.logFile);
      await fs.mkdir(logsDir, { recursive: true });
      
      // Log initialization
      await this.logMessage('🤖 Mock Telegram Bot initialized');
      
      // Process notification queue
      this.processNotificationQueue();
      
    } catch (error) {
      logger.error('Failed to initialize mock Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Register command handlers
   */
  registerCommands() {
    const commands = require('./commands');
    
    // Mock command handlers
    this.commands = {
      '/start': commands.handleStart.bind(commands),
      '/pause': commands.handlePause.bind(commands),
      '/resume': commands.handleResume.bind(commands),
      '/stats': commands.handleStats.bind(commands),
      '/config': commands.handleConfig.bind(commands),
      '/set': commands.handleSet.bind(commands),
      '/exchange': commands.handleExchange.bind(commands),
      '/restart': commands.handleRestart.bind(commands),
      '/health': commands.handleHealth.bind(commands),
      '/ai': commands.handleAI.bind(commands),
      '/logs': commands.handleLogs.bind(commands),
      '/export': commands.handleExport.bind(commands)
    };
    
    logger.info('Mock Telegram commands registered');
  }

  /**
   * Simulate command execution
   */
  async executeCommand(command, userId = this.adminId) {
    try {
      const commandHandler = this.commands[command];
      if (!commandHandler) {
        await this.logMessage(`❌ Unknown command: ${command}`);
        return;
      }

      // Create mock context
      const mockCtx = {
        from: { id: userId, username: 'test_user' },
        reply: async (message) => {
          await this.logMessage(`📤 Reply to ${command}: ${message}`);
          return { message_id: Date.now() };
        },
        message: {
          text: command,
          from: { id: userId, username: 'test_user' }
        },
        // Add additional context properties that commands might need
        state: {},
        session: {},
        update: {
          message: {
            text: command,
            from: { id: userId, username: 'test_user' }
          }
        }
      };

      await commandHandler(mockCtx);
      
    } catch (error) {
      logger.error(`Error executing command ${command}:`, error);
      await this.logMessage(`❌ Error executing ${command}: ${error.message}`);
    }
  }

  /**
   * Send notification message
   */
  async sendNotification(message, userId = this.adminId) {
    try {
      await this.logMessage(`📢 Notification: ${message}`);
      return { message_id: Date.now() };
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(message, userId = this.adminId) {
    try {
      await this.logMessage(`📤 Message to ${userId}: ${message}`);
      return { message_id: Date.now() };
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  }

  /**
   * Log message to telegram.log file
   */
  async logMessage(message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      
      await fs.appendFile(this.logFile, logEntry);
      logger.info(`Telegram: ${message}`);
      
    } catch (error) {
      logger.error('Failed to log Telegram message:', error);
    }
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      await this.sendNotification(notification.message, notification.userId);
      
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Add notification to queue
   */
  addNotification(message, userId = this.adminId) {
    this.notificationQueue.push({ message, userId });
    this.processNotificationQueue();
  }

  /**
   * Send health check notification
   */
  async sendHealthCheck() {
    const uptime = process.uptime();
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    
    const healthMessage = `🏥 **Health Check**\n` +
      `⏰ Uptime: ${uptimeStr}\n` +
      `📊 Status: Running\n` +
      `🔄 Mode: Paper Trading\n` +
      `📈 Exchange: Mock Exchange\n` +
      `💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
    
    await this.sendNotification(healthMessage);
  }

  /**
   * Send trade notification
   */
  async sendTradeNotification(tradeData) {
    const { action, symbol, amount, price, profit, reason } = tradeData;
    
    const emoji = action === 'buy' ? '🟢' : '🔴';
    const profitStr = profit >= 0 ? `+${profit.toFixed(2)}%` : `${profit.toFixed(2)}%`;
    
    const tradeMessage = `${emoji} **${action.toUpperCase()} Trade Executed**\n` +
      `📊 Symbol: ${symbol}\n` +
      `💰 Amount: ${amount}\n` +
      `💵 Price: $${price.toFixed(2)}\n` +
      `📈 P&L: ${profitStr}\n` +
      `🤖 AI Reasoning: ${reason}`;
    
    await this.sendNotification(tradeMessage);
  }

  /**
   * Send AI reasoning message
   */
  async sendAIReasoning(reasoning) {
    const aiMessage = `🧠 **AI Analysis**\n${reasoning}`;
    await this.sendNotification(aiMessage);
  }

  /**
   * Stop bot
   */
  async stop() {
    this.isInitialized = false;
    await this.logMessage('🛑 Mock Telegram Bot stopped');
    logger.info('Mock Telegram bot stopped');
  }
}

module.exports = MockTelegramBot;
