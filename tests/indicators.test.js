/**
 * Technical Indicators Tests
 * Tests for EMA, RSI, MACD calculations
 */

const indicators = require('../src/ai/indicators');

describe('Technical Indicators', () => {
  const mockPrices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113, 115, 117, 116, 118, 120];

  describe('SMA Calculation', () => {
    test('should calculate SMA correctly', () => {
      const sma = indicators.calculateSMA(mockPrices, 5);
      
      expect(sma).toBeDefined();
      expect(sma.length).toBe(mockPrices.length - 4);
      expect(sma[0]).toBeCloseTo(102.2, 1);
    });

    test('should return empty array for insufficient data', () => {
      const sma = indicators.calculateSMA([1, 2], 5);
      expect(sma).toEqual([]);
    });
  });

  describe('EMA Calculation', () => {
    test('should calculate EMA correctly', () => {
      const ema = indicators.calculateEMA(mockPrices, 5);
      
      expect(ema).toBeDefined();
      expect(ema.length).toBe(mockPrices.length - 4);
      expect(ema[0]).toBeCloseTo(102.2, 1);
    });

    test('should return empty array for insufficient data', () => {
      const ema = indicators.calculateEMA([1, 2], 5);
      expect(ema).toEqual([]);
    });
  });

  describe('RSI Calculation', () => {
    test('should calculate RSI correctly', () => {
      const rsi = indicators.calculateRSI(mockPrices, 14);
      
      expect(rsi).toBeDefined();
      expect(rsi.length).toBeGreaterThan(0);
      expect(rsi[0]).toBeGreaterThanOrEqual(0);
      expect(rsi[0]).toBeLessThanOrEqual(100);
    });

    test('should return empty array for insufficient data', () => {
      const rsi = indicators.calculateRSI([1, 2], 14);
      expect(rsi).toEqual([]);
    });
  });

  describe('MACD Calculation', () => {
    test('should calculate MACD correctly', () => {
      const macd = indicators.calculateMACD(mockPrices, 12, 26, 9);
      
      expect(macd).toBeDefined();
      expect(macd.macd).toBeDefined();
      expect(macd.signal).toBeDefined();
      expect(macd.histogram).toBeDefined();
      expect(macd.macd.length).toBeGreaterThan(0);
    });

    test('should return empty arrays for insufficient data', () => {
      const macd = indicators.calculateMACD([1, 2], 12, 26, 9);
      expect(macd.macd).toEqual([]);
      expect(macd.signal).toEqual([]);
      expect(macd.histogram).toEqual([]);
    });
  });

  describe('Bollinger Bands Calculation', () => {
    test('should calculate Bollinger Bands correctly', () => {
      const bb = indicators.calculateBollingerBands(mockPrices, 20, 2);
      
      expect(bb).toBeDefined();
      expect(bb.upper).toBeDefined();
      expect(bb.middle).toBeDefined();
      expect(bb.lower).toBeDefined();
      expect(bb.upper.length).toBeGreaterThan(0);
    });

    test('should return empty arrays for insufficient data', () => {
      const bb = indicators.calculateBollingerBands([1, 2], 20, 2);
      expect(bb.upper).toEqual([]);
      expect(bb.middle).toEqual([]);
      expect(bb.lower).toEqual([]);
    });
  });

  describe('Stochastic Calculation', () => {
    test('should calculate Stochastic correctly', () => {
      const high = mockPrices.map(p => p + 1);
      const low = mockPrices.map(p => p - 1);
      const close = mockPrices;
      
      const stoch = indicators.calculateStochastic(high, low, close, 14, 3);
      
      expect(stoch).toBeDefined();
      expect(stoch.k).toBeDefined();
      expect(stoch.d).toBeDefined();
      expect(stoch.k.length).toBeGreaterThan(0);
    });

    test('should return empty arrays for insufficient data', () => {
      const stoch = indicators.calculateStochastic([1], [1], [1], 14, 3);
      expect(stoch.k).toEqual([]);
      expect(stoch.d).toEqual([]);
    });
  });

  describe('Complete Analysis', () => {
    test('should perform complete analysis', () => {
      const analysis = indicators.analyze(mockPrices);
      
      expect(analysis).toBeDefined();
      expect(analysis.ema9).toBeDefined();
      expect(analysis.ema21).toBeDefined();
      expect(analysis.ema50).toBeDefined();
      expect(analysis.rsi).toBeDefined();
      expect(analysis.macd).toBeDefined();
      expect(analysis.bollingerBands).toBeDefined();
      expect(analysis.sma50).toBeDefined();
      expect(analysis.sma200).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      indicators.clearCache();
      // Cache should be empty after clearing
      expect(indicators.cache.size).toBe(0);
    });
  });
});
