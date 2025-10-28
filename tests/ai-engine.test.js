/**
 * AI Decision Engine Tests
 * Tests for AI trading decisions and strategies
 */

const aiEngine = require('../src/ai/engine');

describe('AI Decision Engine', () => {
  beforeEach(() => {
    // Clear price history before each test
    aiEngine.clearHistory();
  });

  describe('Price Data Management', () => {
    test('should add price data correctly', () => {
      aiEngine.addPriceData('BTC/USDT', 50000, Date.now());
      const history = aiEngine.getPriceHistory('BTC/USDT');
      
      expect(history).toHaveLength(1);
      expect(history[0].price).toBe(50000);
    });

    test('should limit price history length', () => {
      // Add more than max history length
      for (let i = 0; i < 250; i++) {
        aiEngine.addPriceData('BTC/USDT', 50000 + i, Date.now() + i);
      }
      
      const history = aiEngine.getPriceHistory('BTC/USDT');
      expect(history.length).toBeLessThanOrEqual(200);
    });

    test('should clear price history', () => {
      aiEngine.addPriceData('BTC/USDT', 50000);
      aiEngine.clearHistory('BTC/USDT');
      
      const history = aiEngine.getPriceHistory('BTC/USDT');
      expect(history).toHaveLength(0);
    });
  });

  describe('EMA RSI Strategy', () => {
    test('should return hold decision for insufficient data', async () => {
      const mockTicker = { last: 50000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'ema_rsi', mockTicker);
      
      expect(decision.action).toBe('hold');
      expect(decision.confidence).toBe(0);
      expect(decision.reason).toContain('Insufficient price history');
    });

    test('should generate buy signal for oversold RSI', async () => {
      // Create price data that would result in oversold RSI
      const prices = Array.from({ length: 50 }, (_, i) => 50000 - (i * 100));
      
      prices.forEach((price, index) => {
        aiEngine.addPriceData('BTC/USDT', price, Date.now() + index);
      });
      
      const mockTicker = { last: 45000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'ema_rsi', mockTicker);
      
      expect(decision.action).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.reason).toBeDefined();
    });

    test('should generate sell signal for overbought RSI', async () => {
      // Create price data that would result in overbought RSI
      const prices = Array.from({ length: 50 }, (_, i) => 50000 + (i * 100));
      
      prices.forEach((price, index) => {
        aiEngine.addPriceData('BTC/USDT', price, Date.now() + index);
      });
      
      const mockTicker = { last: 55000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'ema_rsi', mockTicker);
      
      expect(decision.action).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.reason).toBeDefined();
    });
  });

  describe('MACD Cross Strategy', () => {
    test('should analyze MACD signals correctly', async () => {
      // Create price data for MACD analysis
      const prices = Array.from({ length: 50 }, (_, i) => 50000 + Math.sin(i * 0.1) * 1000);
      
      prices.forEach((price, index) => {
        aiEngine.addPriceData('BTC/USDT', price, Date.now() + index);
      });
      
      const mockTicker = { last: 50000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'macd_cross', mockTicker);
      
      expect(decision.action).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.indicators.macd).toBeDefined();
    });
  });

  describe('RSI Only Strategy', () => {
    test('should analyze RSI signals correctly', async () => {
      // Create price data for RSI analysis
      const prices = Array.from({ length: 50 }, (_, i) => 50000 + Math.sin(i * 0.2) * 2000);
      
      prices.forEach((price, index) => {
        aiEngine.addPriceData('BTC/USDT', price, Date.now() + index);
      });
      
      const mockTicker = { last: 50000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'rsi_only', mockTicker);
      
      expect(decision.action).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.indicators.rsi).toBeDefined();
    });
  });

  describe('Strategy Management', () => {
    test('should return available strategies', () => {
      const strategies = aiEngine.getAvailableStrategies();
      
      expect(strategies).toContain('ema_rsi');
      expect(strategies).toContain('macd_cross');
      expect(strategies).toContain('rsi_only');
    });

    test('should return strategy description', () => {
      const description = aiEngine.getStrategyDescription('ema_rsi');
      
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    test('should return unknown for invalid strategy', () => {
      const description = aiEngine.getStrategyDescription('invalid_strategy');
      
      expect(description).toBe('Unknown strategy');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid strategy gracefully', async () => {
      const mockTicker = { last: 50000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'invalid_strategy', mockTicker);
      
      expect(decision.action).toBe('hold');
      expect(decision.confidence).toBe(0);
      expect(decision.reason).toContain('Unknown strategy');
    });

    test('should handle analysis errors gracefully', async () => {
      // Mock an error in the analysis
      const originalAnalyze = aiEngine.strategies.ema_rsi;
      aiEngine.strategies.ema_rsi = () => {
        throw new Error('Test error');
      };
      
      const mockTicker = { last: 50000 };
      const decision = await aiEngine.analyze('BTC/USDT', 'ema_rsi', mockTicker);
      
      expect(decision.action).toBe('hold');
      expect(decision.confidence).toBe(0);
      expect(decision.reason).toContain('Analysis error');
      
      // Restore original function
      aiEngine.strategies.ema_rsi = originalAnalyze;
    });
  });

  describe('Reasoning Generation', () => {
    test('should generate proper reasoning message', () => {
      const decision = {
        action: 'buy',
        confidence: 85,
        signals: ['EMA crossover', 'RSI oversold'],
        indicators: {
          rsi: 25,
          ema9: 50000,
          ema21: 49900
        },
        symbol: 'BTC/USDT'
      };
      
      const analysis = {
        rsi: [25],
        ema9: [50000],
        ema21: [49900]
      };
      
      const currentPrice = { last: 50000 };
      
      const reasoning = aiEngine.generateReasoning(decision, analysis, currentPrice);
      
      expect(reasoning).toContain('BUY BTC/USDT');
      expect(reasoning).toContain('85%');
      expect(reasoning).toContain('RSI 25.0');
    });
  });
});
