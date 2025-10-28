/**
 * Exchange Factory Tests
 * Tests for exchange adapter creation and management
 */

const exchangeFactory = require('../src/exchanges/factory');
const BinanceAdapter = require('../src/exchanges/binance');
const KrakenAdapter = require('../src/exchanges/kraken');
const BybitAdapter = require('../src/exchanges/bybit');

// Mock the exchange adapters
jest.mock('../src/exchanges/binance');
jest.mock('../src/exchanges/kraken');
jest.mock('../src/exchanges/bybit');

describe('Exchange Factory', () => {
  beforeEach(() => {
    // Clear all adapters before each test
    exchangeFactory.clearAll();
    jest.clearAllMocks();
  });

  describe('Adapter Creation', () => {
    test('should create Binance adapter', () => {
      const mockAdapter = { getName: () => 'binance' };
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      const adapter = exchangeFactory.createAdapter('binance', 'key', 'secret');
      
      expect(BinanceAdapter).toHaveBeenCalledWith('key', 'secret', false);
      expect(adapter).toBe(mockAdapter);
    });

    test('should create Kraken adapter', () => {
      const mockAdapter = { getName: () => 'kraken' };
      KrakenAdapter.mockImplementation(() => mockAdapter);
      
      const adapter = exchangeFactory.createAdapter('kraken', 'key', 'secret');
      
      expect(KrakenAdapter).toHaveBeenCalledWith('key', 'secret', false);
      expect(adapter).toBe(mockAdapter);
    });

    test('should create Bybit adapter', () => {
      const mockAdapter = { getName: () => 'bybit' };
      BybitAdapter.mockImplementation(() => mockAdapter);
      
      const adapter = exchangeFactory.createAdapter('bybit', 'key', 'secret');
      
      expect(BybitAdapter).toHaveBeenCalledWith('key', 'secret', false);
      expect(adapter).toBe(mockAdapter);
    });

    test('should create sandbox adapter', () => {
      const mockAdapter = { getName: () => 'binance' };
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      const adapter = exchangeFactory.createAdapter('binance', 'key', 'secret', true);
      
      expect(BinanceAdapter).toHaveBeenCalledWith('key', 'secret', true);
      expect(adapter).toBe(mockAdapter);
    });

    test('should throw error for unsupported exchange', () => {
      expect(() => {
        exchangeFactory.createAdapter('unsupported', 'key', 'secret');
      }).toThrow('Unsupported exchange: unsupported');
    });

    test('should return cached adapter', () => {
      const mockAdapter = { getName: () => 'binance' };
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      const adapter1 = exchangeFactory.createAdapter('binance', 'key', 'secret');
      const adapter2 = exchangeFactory.createAdapter('binance', 'key', 'secret');
      
      expect(adapter1).toBe(adapter2);
      expect(BinanceAdapter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Adapter Management', () => {
    test('should get adapter', () => {
      const mockAdapter = { getName: () => 'binance' };
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      exchangeFactory.createAdapter('binance', 'key', 'secret');
      const adapter = exchangeFactory.getAdapter('binance');
      
      expect(adapter).toBe(mockAdapter);
    });

    test('should return null for non-existent adapter', () => {
      const adapter = exchangeFactory.getAdapter('nonexistent');
      expect(adapter).toBeNull();
    });

    test('should remove adapter', () => {
      const mockAdapter = { 
        getName: () => 'binance',
        close: jest.fn()
      };
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      exchangeFactory.createAdapter('binance', 'key', 'secret');
      exchangeFactory.removeAdapter('binance');
      
      const adapter = exchangeFactory.getAdapter('binance');
      expect(adapter).toBeNull();
      expect(mockAdapter.close).toHaveBeenCalled();
    });

    test('should clear all adapters', () => {
      const mockAdapter1 = { 
        getName: () => 'binance',
        close: jest.fn()
      };
      const mockAdapter2 = { 
        getName: () => 'kraken',
        close: jest.fn()
      };
      
      BinanceAdapter.mockImplementation(() => mockAdapter1);
      KrakenAdapter.mockImplementation(() => mockAdapter2);
      
      exchangeFactory.createAdapter('binance', 'key', 'secret');
      exchangeFactory.createAdapter('kraken', 'key', 'secret');
      
      exchangeFactory.clearAll();
      
      expect(mockAdapter1.close).toHaveBeenCalled();
      expect(mockAdapter2.close).toHaveBeenCalled();
      expect(exchangeFactory.getAdapter('binance')).toBeNull();
      expect(exchangeFactory.getAdapter('kraken')).toBeNull();
    });
  });

  describe('Exchange Information', () => {
    test('should return supported exchanges', () => {
      const exchanges = exchangeFactory.getSupportedExchanges();
      
      expect(exchanges).toContain('binance');
      expect(exchanges).toContain('kraken');
      expect(exchanges).toContain('bybit');
    });

    test('should check if exchange is supported', () => {
      expect(exchangeFactory.isSupported('binance')).toBe(true);
      expect(exchangeFactory.isSupported('kraken')).toBe(true);
      expect(exchangeFactory.isSupported('bybit')).toBe(true);
      expect(exchangeFactory.isSupported('unsupported')).toBe(false);
    });

    test('should return exchange info', () => {
      const binanceInfo = exchangeFactory.getExchangeInfo('binance');
      
      expect(binanceInfo).toBeDefined();
      expect(binanceInfo.name).toBe('Binance');
      expect(binanceInfo.website).toBeDefined();
      expect(binanceInfo.supportedPairs).toBeDefined();
      expect(binanceInfo.features).toBeDefined();
      expect(binanceInfo.fees).toBeDefined();
    });

    test('should return null for unknown exchange', () => {
      const info = exchangeFactory.getExchangeInfo('unknown');
      expect(info).toBeNull();
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      const mockAdapter = {
        initialize: jest.fn().mockResolvedValue(),
        getBalance: jest.fn().mockResolvedValue({ BTC: { total: 1 } }),
        isHealthy: jest.fn().mockResolvedValue(true)
      };
      
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      const result = await exchangeFactory.testConnection('binance', 'key', 'secret');
      
      expect(result.success).toBe(true);
      expect(result.exchange).toBe('binance');
      expect(result.balance).toBe(1);
      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    test('should handle connection test failure', async () => {
      const mockAdapter = {
        initialize: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };
      
      BinanceAdapter.mockImplementation(() => mockAdapter);
      
      const result = await exchangeFactory.testConnection('binance', 'key', 'secret');
      
      expect(result.success).toBe(false);
      expect(result.exchange).toBe('binance');
      expect(result.error).toBe('Connection failed');
      expect(result.message).toBe('Connection failed');
    });
  });

  describe('Adapter Status', () => {
    test('should return all adapters', () => {
      const mockAdapter1 = { 
        getName: () => 'binance',
        getInfo: () => ({ name: 'binance', connected: true })
      };
      const mockAdapter2 = { 
        getName: () => 'kraken',
        getInfo: () => ({ name: 'kraken', connected: true })
      };
      
      BinanceAdapter.mockImplementation(() => mockAdapter1);
      KrakenAdapter.mockImplementation(() => mockAdapter2);
      
      exchangeFactory.createAdapter('binance', 'key', 'secret');
      exchangeFactory.createAdapter('kraken', 'key', 'secret');
      
      const adapters = exchangeFactory.getAllAdapters();
      
      expect(adapters).toHaveLength(2);
      expect(adapters[0].name).toBe('binance');
      expect(adapters[1].name).toBe('kraken');
    });
  });
});
