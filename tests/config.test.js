/**
 * Configuration Manager Tests
 * Tests for configuration management system
 */

const config = require('../src/config/settings');

// Mock database models
jest.mock('../src/database/models', () => ({
  getUserSetting: jest.fn(),
  setUserSetting: jest.fn(),
  getAllUserSettings: jest.fn()
}));

const db = require('../src/database/models');

describe('Configuration Manager', () => {
  beforeEach(() => {
    config.clearCache();
    jest.clearAllMocks();
  });

  describe('Configuration Retrieval', () => {
    test('should get configuration value', async () => {
      db.getUserSetting.mockResolvedValue('ema_rsi');
      
      const value = await config.get(1, 'strategy', 'default');
      
      expect(value).toBe('ema_rsi');
      expect(db.getUserSetting).toHaveBeenCalledWith(1, 'strategy');
    });

    test('should return default value when not found', async () => {
      db.getUserSetting.mockResolvedValue(null);
      
      const value = await config.get(1, 'strategy', 'default');
      
      expect(value).toBe('default');
    });

    test('should cache configuration values', async () => {
      db.getUserSetting.mockResolvedValue('ema_rsi');
      
      await config.get(1, 'strategy');
      await config.get(1, 'strategy');
      
      expect(db.getUserSetting).toHaveBeenCalledTimes(1);
    });

    test('should get all configuration', async () => {
      const mockSettings = {
        strategy: 'ema_rsi',
        trade_mode: 'long',
        trade_amount: '20'
      };
      
      db.getAllUserSettings.mockResolvedValue(mockSettings);
      
      const settings = await config.getAll(1);
      
      expect(settings).toEqual(mockSettings);
      expect(db.getAllUserSettings).toHaveBeenCalledWith(1);
    });
  });

  describe('Configuration Setting', () => {
    test('should set configuration value', async () => {
      db.setUserSetting.mockResolvedValue();
      
      await config.set(1, 'strategy', 'macd_cross');
      
      expect(db.setUserSetting).toHaveBeenCalledWith(1, 'strategy', 'macd_cross');
    });

    test('should update cache when setting value', async () => {
      db.setUserSetting.mockResolvedValue();
      
      await config.set(1, 'strategy', 'macd_cross');
      
      // Should use cached value
      db.getUserSetting.mockResolvedValue('ema_rsi');
      const value = await config.get(1, 'strategy');
      
      expect(value).toBe('macd_cross');
      expect(db.getUserSetting).not.toHaveBeenCalled();
    });
  });

  describe('Typed Configuration', () => {
    test('should return string value', async () => {
      db.getUserSetting.mockResolvedValue('ema_rsi');
      
      const value = await config.getTyped(1, 'strategy', 'string', 'default');
      
      expect(value).toBe('ema_rsi');
    });

    test('should return number value', async () => {
      db.getUserSetting.mockResolvedValue('20');
      
      const value = await config.getTyped(1, 'trade_amount', 'number', 10);
      
      expect(value).toBe(20);
    });

    test('should return boolean value', async () => {
      db.getUserSetting.mockResolvedValue('true');
      
      const value = await config.getTyped(1, 'paper_trading', 'boolean', false);
      
      expect(value).toBe(true);
    });

    test('should return default for invalid number', async () => {
      db.getUserSetting.mockResolvedValue('invalid');
      
      const value = await config.getTyped(1, 'trade_amount', 'number', 10);
      
      expect(value).toBe(10);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate strategy', () => {
      expect(config.validate('strategy', 'ema_rsi')).toBe(true);
      expect(config.validate('strategy', 'macd_cross')).toBe(true);
      expect(config.validate('strategy', 'rsi_only')).toBe(true);
      expect(config.validate('strategy', 'invalid')).toBe(false);
    });

    test('should validate trade mode', () => {
      expect(config.validate('trade_mode', 'long')).toBe(true);
      expect(config.validate('trade_mode', 'short')).toBe(true);
      expect(config.validate('trade_mode', 'both')).toBe(true);
      expect(config.validate('trade_mode', 'invalid')).toBe(false);
    });

    test('should validate numeric values', () => {
      expect(config.validate('max_daily_loss', '100')).toBe(true);
      expect(config.validate('max_daily_loss', '0')).toBe(false);
      expect(config.validate('max_daily_loss', '-10')).toBe(false);
      expect(config.validate('max_daily_loss', 'invalid')).toBe(false);
    });

    test('should validate percentage values', () => {
      expect(config.validate('stop_loss', '2')).toBe(true);
      expect(config.validate('stop_loss', '10')).toBe(true);
      expect(config.validate('stop_loss', '11')).toBe(false);
      expect(config.validate('stop_loss', '0')).toBe(false);
    });

    test('should validate symbol format', () => {
      expect(config.validate('symbol', 'BTC/USDT')).toBe(true);
      expect(config.validate('symbol', 'ETH/USD')).toBe(true);
      expect(config.validate('symbol', 'INVALID')).toBe(false);
      expect(config.validate('symbol', 'BTCUSDT')).toBe(false);
    });

    test('should validate boolean values', () => {
      expect(config.validate('paper_trading', 'true')).toBe(true);
      expect(config.validate('paper_trading', 'false')).toBe(true);
      expect(config.validate('paper_trading', 'invalid')).toBe(false);
    });

    test('should return true for unknown keys', () => {
      expect(config.validate('unknown_key', 'any_value')).toBe(true);
    });
  });

  describe('Default Configuration', () => {
    test('should return default configuration', () => {
      const defaults = config.getDefaults();
      
      expect(defaults).toBeDefined();
      expect(defaults.strategy).toBe('ema_rsi');
      expect(defaults.trade_mode).toBe('long');
      expect(defaults.max_daily_loss).toBe('100');
      expect(defaults.trade_amount).toBe('20');
      expect(defaults.stop_loss).toBe('2');
      expect(defaults.take_profit).toBe('3');
      expect(defaults.symbol).toBe('BTC/USDT');
      expect(defaults.paper_trading).toBe('false');
      expect(defaults.ai_enabled).toBe('true');
      expect(defaults.notifications).toBe('true');
    });
  });

  describe('Configuration Reset', () => {
    test('should reset to defaults', async () => {
      db.setUserSetting.mockResolvedValue();
      
      await config.resetToDefaults(1);
      
      const defaults = config.getDefaults();
      expect(db.setUserSetting).toHaveBeenCalledTimes(Object.keys(defaults).length);
      
      Object.entries(defaults).forEach(([key, value]) => {
        expect(db.setUserSetting).toHaveBeenCalledWith(1, key, value);
      });
    });
  });

  describe('Configuration Summary', () => {
    test('should generate configuration summary', async () => {
      const mockSettings = {
        strategy: 'ema_rsi',
        trade_mode: 'long',
        max_daily_loss: '100',
        trade_amount: '20'
      };
      
      db.getAllUserSettings.mockResolvedValue(mockSettings);
      
      const summary = await config.getSummary(1);
      
      expect(summary).toContain('Current Configuration');
      expect(summary).toContain('STRATEGY: ema_rsi');
      expect(summary).toContain('TRADE MODE: long');
      expect(summary).toContain('MAX DAILY LOSS: 100');
      expect(summary).toContain('TRADE AMOUNT: 20');
    });

    test('should handle error in summary generation', async () => {
      db.getAllUserSettings.mockRejectedValue(new Error('Database error'));
      
      const summary = await config.getSummary(1);
      
      expect(summary).toBe('❌ Error loading configuration');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      config.setCache('test_key', 'test_value');
      expect(config.getFromCache('test_key')).toBe('test_value');
      
      config.clearCache();
      expect(config.getFromCache('test_key')).toBeNull();
    });

    test('should expire cache after timeout', () => {
      config.setCache('test_key', 'test_value');
      
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6 * 60 * 1000); // 6 minutes later
      
      expect(config.getFromCache('test_key')).toBeNull();
      
      Date.now = originalNow;
    });
  });
});
