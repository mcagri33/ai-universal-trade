/**
 * Configuration Management System
 * Handles runtime configuration via MySQL database
 */

const db = require('../database/models');
const logger = require('./logger');

class ConfigManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  /**
   * Get configuration value
   * @param {number} userId - User ID
   * @param {string} key - Configuration key
   * @param {string} defaultValue - Default value if not found
   * @returns {Promise<string>}
   */
  async get(userId, key, defaultValue = null) {
    try {
      // Check cache first
      const cacheKey = `${userId}_${key}`;
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Get from database
      const value = await db.getUserSetting(userId, key);
      const result = value !== null ? value : defaultValue;
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error('Error getting configuration:', error);
      return defaultValue;
    }
  }

  /**
   * Set configuration value
   * @param {number} userId - User ID
   * @param {string} key - Configuration key
   * @param {string} value - Configuration value
   * @returns {Promise<void>}
   */
  async set(userId, key, value) {
    try {
      await db.setUserSetting(userId, key, value);
      
      // Update cache
      const cacheKey = `${userId}_${key}`;
      this.setCache(cacheKey, value);
      
      logger.info(`Configuration updated: ${key} = ${value}`, { userId, key, value });
    } catch (error) {
      logger.error('Error setting configuration:', error);
      throw error;
    }
  }

  /**
   * Get all configuration for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>}
   */
  async getAll(userId) {
    try {
      return await db.getAllUserSettings(userId);
    } catch (error) {
      logger.error('Error getting all configuration:', error);
      return {};
    }
  }

  /**
   * Get configuration as specific type
   * @param {number} userId - User ID
   * @param {string} key - Configuration key
   * @param {string} type - Type to convert to (string, number, boolean)
   * @param {any} defaultValue - Default value
   * @returns {Promise<any>}
   */
  async getTyped(userId, key, type = 'string', defaultValue = null) {
    const value = await this.get(userId, key, defaultValue);
    
    switch (type) {
      case 'number':
        return parseFloat(value) || defaultValue;
      case 'boolean':
        return value === 'true' || value === true;
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Validate configuration value
   * @param {string} key - Configuration key
   * @param {string} value - Configuration value
   * @returns {boolean}
   */
  validate(key, value) {
    const validators = {
      strategy: (val) => ['ema_rsi', 'macd_cross', 'rsi_only'].includes(val),
      trade_mode: (val) => ['long', 'short', 'both'].includes(val),
      max_daily_loss: (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      trade_amount: (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      stop_loss: (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 10,
      take_profit: (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 50,
      symbol: (val) => /^[A-Z]{3,10}\/[A-Z]{3,10}$/.test(val),
      paper_trading: (val) => ['true', 'false'].includes(val),
      ai_enabled: (val) => ['true', 'false'].includes(val),
      notifications: (val) => ['true', 'false'].includes(val)
    };

    const validator = validators[key];
    return validator ? validator(value) : true;
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {string|null}
   */
  getFromCache(key) {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheTimeout) {
      this.cache.clear();
      this.lastCacheUpdate = now;
      return null;
    }
    
    return this.cache.get(key) || null;
  }

  /**
   * Set cache
   * @param {string} key - Cache key
   * @param {string} value - Cache value
   */
  setCache(key, value) {
    this.cache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Get default configuration
   * @returns {Object}
   */
  getDefaults() {
    return {
      strategy: 'ema_rsi',
      trade_mode: 'long',
      max_daily_loss: '100',
      trade_amount: '20',
      stop_loss: '2',
      take_profit: '3',
      symbol: 'BTC/USDT',
      paper_trading: 'false',
      ai_enabled: 'true',
      notifications: 'true'
    };
  }

  /**
   * Reset user configuration to defaults
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async resetToDefaults(userId) {
    try {
      const defaults = this.getDefaults();
      
      for (const [key, value] of Object.entries(defaults)) {
        await this.set(userId, key, value);
      }
      
      logger.info('Configuration reset to defaults', { userId });
    } catch (error) {
      logger.error('Error resetting configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration summary for display
   * @param {number} userId - User ID
   * @returns {Promise<string>}
   */
  async getSummary(userId) {
    try {
      const config = await this.getAll(userId);
      const defaults = this.getDefaults();
      
      let summary = '📊 **Current Configuration:**\n\n';
      
      for (const [key, defaultValue] of Object.entries(defaults)) {
        const value = config[key] || defaultValue;
        const displayKey = key.replace(/_/g, ' ').toUpperCase();
        summary += `• **${displayKey}**: ${value}\n`;
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting configuration summary:', error);
      return '❌ Error loading configuration';
    }
  }
}

module.exports = new ConfigManager();
