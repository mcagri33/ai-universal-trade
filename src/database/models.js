/**
 * Database Models and Schema
 * Defines all database tables and provides model methods
 */

const db = require('./connection');
const logger = require('../utils/logger');

class DatabaseModels {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize database schema
   * Creates all required tables if they don't exist
   * @returns {Promise<void>}
   */
  async initializeSchema() {
    try {
      await this.createUsersTable();
      await this.createUserSettingsTable();
      await this.createTradesTable();
      await this.insertDefaultSettings();
      
      this.initialized = true;
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Create users table
   * @returns {Promise<void>}
   */
  async createUsersTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        telegram_id BIGINT UNIQUE NOT NULL,
        exchange VARCHAR(20) NOT NULL DEFAULT 'binance',
        api_key VARCHAR(255),
        api_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await db.query(query);
  }

  /**
   * Create user_settings table
   * @returns {Promise<void>}
   */
  async createUserSettingsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        setting_key VARCHAR(50) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_setting (user_id, setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await db.query(query);
  }

  /**
   * Create trades table
   * @returns {Promise<void>}
   */
  async createTradesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS trades (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        side ENUM('buy', 'sell') NOT NULL,
        entry_price DECIMAL(20,8),
        exit_price DECIMAL(20,8),
        amount DECIMAL(20,8) NOT NULL,
        profit DECIMAL(20,8) DEFAULT 0,
        confidence DECIMAL(5,2),
        reason TEXT,
        status ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_symbol (user_id, symbol),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await db.query(query);
  }

  /**
   * Insert default settings for a user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async insertDefaultSettings(userId) {
    const defaultSettings = [
      { key: 'strategy', value: 'ema_rsi' },
      { key: 'trade_mode', value: 'long' },
      { key: 'max_daily_loss', value: '100' },
      { key: 'trade_amount', value: '20' },
      { key: 'stop_loss', value: '2' },
      { key: 'take_profit', value: '3' },
      { key: 'symbol', value: 'BTC/USDT' },
      { key: 'paper_trading', value: 'false' },
      { key: 'ai_enabled', value: 'true' },
      { key: 'notifications', value: 'true' }
    ];

    for (const setting of defaultSettings) {
      await this.setUserSetting(userId, setting.key, setting.value);
    }
  }

  /**
   * Create or update user
   * @param {number} telegramId - Telegram user ID
   * @param {string} exchange - Exchange name
   * @param {string} apiKey - API key
   * @param {string} apiSecret - API secret
   * @returns {Promise<number>} User ID
   */
  async createOrUpdateUser(telegramId, exchange = 'binance', apiKey = null, apiSecret = null) {
    try {
      // Check if user exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE telegram_id = ?',
        [telegramId]
      );

      if (existingUser.length > 0) {
        // Update existing user
        await db.query(
          'UPDATE users SET exchange = ?, api_key = ?, api_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
          [exchange, apiKey, apiSecret, telegramId]
        );
        return existingUser[0].id;
      } else {
        // Create new user
        const result = await db.query(
          'INSERT INTO users (telegram_id, exchange, api_key, api_secret) VALUES (?, ?, ?, ?)',
          [telegramId, exchange, apiKey, apiSecret]
        );
        
        // Insert default settings
        await this.insertDefaultSettings(result.insertId);
        
        return result.insertId;
      }
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      throw error;
    }
  }

  /**
   * Get user by Telegram ID
   * @param {number} telegramId - Telegram user ID
   * @returns {Promise<Object|null>}
   */
  async getUserByTelegramId(telegramId) {
    try {
      const users = await db.query(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramId]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Set user setting
   * @param {number} userId - User ID
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<void>}
   */
  async setUserSetting(userId, key, value) {
    try {
      await db.query(
        'INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP',
        [userId, key, value]
      );
    } catch (error) {
      logger.error('Error setting user setting:', error);
      throw error;
    }
  }

  /**
   * Get user setting
   * @param {number} userId - User ID
   * @param {string} key - Setting key
   * @returns {Promise<string|null>}
   */
  async getUserSetting(userId, key) {
    try {
      const settings = await db.query(
        'SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?',
        [userId, key]
      );
      return settings.length > 0 ? settings[0].setting_value : null;
    } catch (error) {
      logger.error('Error getting user setting:', error);
      throw error;
    }
  }

  /**
   * Get all user settings
   * @param {number} userId - User ID
   * @returns {Promise<Object>}
   */
  async getAllUserSettings(userId) {
    try {
      const settings = await db.query(
        'SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?',
        [userId]
      );
      
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      
      return settingsObj;
    } catch (error) {
      logger.error('Error getting all user settings:', error);
      throw error;
    }
  }

  /**
   * Create new trade
   * @param {Object} tradeData - Trade data
   * @returns {Promise<number>} Trade ID
   */
  async createTrade(tradeData) {
    try {
      const result = await db.query(
        'INSERT INTO trades (user_id, symbol, side, entry_price, amount, confidence, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          tradeData.userId,
          tradeData.symbol,
          tradeData.side,
          tradeData.entryPrice,
          tradeData.amount,
          tradeData.confidence,
          tradeData.reason
        ]
      );
      return result.insertId;
    } catch (error) {
      logger.error('Error creating trade:', error);
      throw error;
    }
  }

  /**
   * Update trade
   * @param {number} tradeId - Trade ID
   * @param {Object} updateData - Update data
   * @returns {Promise<void>}
   */
  async updateTrade(tradeId, updateData) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updateData).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      });
      
      values.push(tradeId);
      
      await db.query(
        `UPDATE trades SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      logger.error('Error updating trade:', error);
      throw error;
    }
  }

  /**
   * Get user trades
   * @param {number} userId - User ID
   * @param {number} limit - Limit results
   * @returns {Promise<Array>}
   */
  async getUserTrades(userId, limit = 50) {
    try {
      const trades = await db.query(
        'SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
      );
      return trades;
    } catch (error) {
      logger.error('Error getting user trades:', error);
      throw error;
    }
  }

  /**
   * Get open trades
   * @param {number} userId - User ID
   * @returns {Promise<Array>}
   */
  async getOpenTrades(userId) {
    try {
      const trades = await db.query(
        'SELECT * FROM trades WHERE user_id = ? AND status = "open" ORDER BY created_at DESC',
        [userId]
      );
      return trades;
    } catch (error) {
      logger.error('Error getting open trades:', error);
      throw error;
    }
  }

  /**
   * Get daily PnL
   * @param {number} userId - User ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  async getDailyPnL(userId, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const result = await db.query(
        'SELECT COUNT(*) as total_trades, SUM(profit) as total_pnl, AVG(profit) as avg_pnl FROM trades WHERE user_id = ? AND DATE(created_at) = ? AND status = "closed"',
        [userId, targetDate]
      );
      
      const wins = await db.query(
        'SELECT COUNT(*) as win_count FROM trades WHERE user_id = ? AND DATE(created_at) = ? AND status = "closed" AND profit > 0',
        [userId, targetDate]
      );
      
      return {
        totalTrades: result[0].total_trades || 0,
        totalPnL: result[0].total_pnl || 0,
        avgPnL: result[0].avg_pnl || 0,
        winCount: wins[0].win_count || 0,
        winRate: result[0].total_trades > 0 ? (wins[0].win_count / result[0].total_trades) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting daily PnL:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseModels();
