/**
 * Paper Trading Simulation Tests
 * Tests for paper trading functionality
 */

const tradingCore = require('../src/core/trader');
const exchangeFactory = require('../src/exchanges/factory');
const config = require('../src/config/settings');
const db = require('../src/database/models');

// Mock dependencies
jest.mock('../src/exchanges/factory');
jest.mock('../src/config/settings');
jest.mock('../src/database/models');
jest.mock('../src/telegram/bot');

describe('Paper Trading Simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tradingCore.openPositions.clear();
    tradingCore.dailyPnL.clear();
    tradingCore.lastTradeTime.clear();
  });

  describe('Paper Trading Execution', () => {
    test('should simulate paper trade execution', async () => {
      const mockExchange = {
        getTicker: jest.fn().mockResolvedValue({ last: 50000 }),
        placeOrder: jest.fn().mockResolvedValue({
          id: 'real_order_123',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.001,
          price: 50000,
          status: 'filled'
        })
      };

      exchangeFactory.getAdapter.mockReturnValue(mockExchange);
      config.getAll.mockResolvedValue({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        strategy: 'ema_rsi',
        trade_mode: 'long',
        trade_amount: '0.001',
        paper_trading: 'true',
        stop_loss: '2',
        take_profit: '3'
      });

      db.createTrade.mockResolvedValue(1);

      // Mock AI analysis
      const mockAnalysis = {
        action: 'buy',
        confidence: 85,
        reason: 'Test buy signal',
        indicators: { price: 50000 }
      };

      // Mock the AI engine
      const aiEngine = require('../src/ai/engine');
      jest.spyOn(aiEngine, 'analyze').mockResolvedValue(mockAnalysis);
      jest.spyOn(aiEngine, 'addPriceData').mockImplementation();

      // Execute paper trade
      await tradingCore.executeTrade(1, mockExchange, 'BTC/USDT', mockAnalysis, {
        trade_amount: '0.001',
        paper_trading: 'true'
      }, true);

      // Verify paper trade was created
      expect(db.createTrade).toHaveBeenCalledWith({
        userId: 1,
        symbol: 'BTC/USDT',
        side: 'buy',
        entryPrice: 50000,
        amount: 0.001,
        confidence: 85,
        reason: 'Test buy signal'
      });

      // Verify position was tracked
      expect(tradingCore.openPositions.size).toBe(1);
      const position = tradingCore.openPositions.get(1);
      expect(position.symbol).toBe('BTC/USDT');
      expect(position.side).toBe('buy');
      expect(position.entryPrice).toBe(50000);
    });

    test('should calculate stop loss correctly for long position', () => {
      const entryPrice = 50000;
      const side = 'buy';
      const settings = { stop_loss: '2' };

      const stopLoss = tradingCore.calculateStopLoss(entryPrice, side, settings);
      
      expect(stopLoss).toBe(49000); // 50000 * (1 - 0.02)
    });

    test('should calculate stop loss correctly for short position', () => {
      const entryPrice = 50000;
      const side = 'sell';
      const settings = { stop_loss: '2' };

      const stopLoss = tradingCore.calculateStopLoss(entryPrice, side, settings);
      
      expect(stopLoss).toBe(51000); // 50000 * (1 + 0.02)
    });

    test('should calculate take profit correctly for long position', () => {
      const entryPrice = 50000;
      const side = 'buy';
      const settings = { take_profit: '3' };

      const takeProfit = tradingCore.calculateTakeProfit(entryPrice, side, settings);
      
      expect(takeProfit).toBe(51500); // 50000 * (1 + 0.03)
    });

    test('should calculate take profit correctly for short position', () => {
      const entryPrice = 50000;
      const side = 'sell';
      const settings = { take_profit: '3' };

      const takeProfit = tradingCore.calculateTakeProfit(entryPrice, side, settings);
      
      expect(takeProfit).toBe(48500); // 50000 * (1 - 0.03)
    });
  });

  describe('Position Management', () => {
    test('should close position when stop loss triggered', async () => {
      const mockExchange = {
        placeOrder: jest.fn().mockResolvedValue({
          id: 'close_order_123',
          symbol: 'BTC/USDT',
          side: 'sell',
          amount: 0.001,
          price: 49000,
          status: 'filled'
        })
      };

      db.updateTrade.mockResolvedValue();

      // Create a long position
      const position = {
        id: 1,
        userId: 1,
        symbol: 'BTC/USDT',
        side: 'buy',
        entryPrice: 50000,
        amount: 0.001,
        stopLoss: 49000,
        takeProfit: 51500,
        createdAt: Date.now()
      };

      tradingCore.openPositions.set(1, position);

      // Check if position should be closed (price hit stop loss)
      const shouldClose = tradingCore.shouldClosePosition(position, 49000);
      
      expect(shouldClose.close).toBe(true);
      expect(shouldClose.reason).toBe('Stop loss triggered');

      // Close the position
      await tradingCore.closePosition(1, position, 49000, 'Stop loss triggered', mockExchange);

      expect(db.updateTrade).toHaveBeenCalledWith(1, {
        exit_price: 49000,
        profit: -2, // -2% loss
        status: 'closed',
        closed_at: expect.any(Date)
      });

      expect(tradingCore.openPositions.has(1)).toBe(false);
    });

    test('should close position when take profit triggered', async () => {
      const mockExchange = {
        placeOrder: jest.fn().mockResolvedValue({
          id: 'close_order_123',
          symbol: 'BTC/USDT',
          side: 'sell',
          amount: 0.001,
          price: 51500,
          status: 'filled'
        })
      };

      db.updateTrade.mockResolvedValue();

      // Create a long position
      const position = {
        id: 1,
        userId: 1,
        symbol: 'BTC/USDT',
        side: 'buy',
        entryPrice: 50000,
        amount: 0.001,
        stopLoss: 49000,
        takeProfit: 51500,
        createdAt: Date.now()
      };

      tradingCore.openPositions.set(1, position);

      // Check if position should be closed (price hit take profit)
      const shouldClose = tradingCore.shouldClosePosition(position, 51500);
      
      expect(shouldClose.close).toBe(true);
      expect(shouldClose.reason).toBe('Take profit triggered');

      // Close the position
      await tradingCore.closePosition(1, position, 51500, 'Take profit triggered', mockExchange);

      expect(db.updateTrade).toHaveBeenCalledWith(1, {
        exit_price: 51500,
        profit: 3, // +3% profit
        status: 'closed',
        closed_at: expect.any(Date)
      });

      expect(tradingCore.openPositions.has(1)).toBe(false);
    });

    test('should not close position when price is within range', () => {
      const position = {
        id: 1,
        userId: 1,
        symbol: 'BTC/USDT',
        side: 'buy',
        entryPrice: 50000,
        amount: 0.001,
        stopLoss: 49000,
        takeProfit: 51500,
        createdAt: Date.now()
      };

      // Price is between stop loss and take profit
      const shouldClose = tradingCore.shouldClosePosition(position, 50000);
      
      expect(shouldClose.close).toBe(false);
    });
  });

  describe('Profit Calculation', () => {
    test('should calculate profit for long position', () => {
      const entryPrice = 50000;
      const exitPrice = 51500;
      const side = 'buy';
      const amount = 0.001;

      const profit = tradingCore.calculateProfit(entryPrice, exitPrice, side, amount);
      
      expect(profit).toBe(3); // 3% profit
    });

    test('should calculate loss for long position', () => {
      const entryPrice = 50000;
      const exitPrice = 49000;
      const side = 'buy';
      const amount = 0.001;

      const profit = tradingCore.calculateProfit(entryPrice, exitPrice, side, amount);
      
      expect(profit).toBe(-2); // -2% loss
    });

    test('should calculate profit for short position', () => {
      const entryPrice = 50000;
      const exitPrice = 48500;
      const side = 'sell';
      const amount = 0.001;

      const profit = tradingCore.calculateProfit(entryPrice, exitPrice, side, amount);
      
      expect(profit).toBe(3); // 3% profit
    });

    test('should calculate loss for short position', () => {
      const entryPrice = 50000;
      const exitPrice = 51000;
      const side = 'sell';
      const amount = 0.001;

      const profit = tradingCore.calculateProfit(entryPrice, exitPrice, side, amount);
      
      expect(profit).toBe(-2); // -2% loss
    });
  });

  describe('Daily PnL Tracking', () => {
    test('should track daily PnL', () => {
      const userId = 1;
      const profit = 5;

      tradingCore.updateDailyPnL(userId, profit);

      const today = new Date().toDateString();
      const dailyPnL = tradingCore.dailyPnL.get(`${userId}_${today}`);
      
      expect(dailyPnL).toBe(5);
    });

    test('should accumulate daily PnL', () => {
      const userId = 1;
      const today = new Date().toDateString();

      tradingCore.updateDailyPnL(userId, 5);
      tradingCore.updateDailyPnL(userId, 3);
      tradingCore.updateDailyPnL(userId, -2);

      const dailyPnL = tradingCore.dailyPnL.get(`${userId}_${today}`);
      
      expect(dailyPnL).toBe(6); // 5 + 3 - 2
    });

    test('should check daily loss limit', async () => {
      const userId = 1;
      const today = new Date().toDateString();

      // Set daily PnL to exceed loss limit
      tradingCore.dailyPnL.set(`${userId}_${today}`, -150);

      config.getAll.mockResolvedValue({ max_daily_loss: '100' });

      const isLimitReached = await tradingCore.isDailyLossLimitReached(userId);
      
      expect(isLimitReached).toBe(true);
    });
  });

  describe('Cooldown Management', () => {
    test('should check cooldown period', () => {
      const userId = 1;
      const now = Date.now();

      // Set last trade time
      tradingCore.lastTradeTime.set(userId, now);

      // Should be in cooldown immediately
      expect(tradingCore.isInCooldown(userId)).toBe(true);

      // Mock time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => now + 35000); // 35 seconds later

      expect(tradingCore.isInCooldown(userId)).toBe(false);

      Date.now = originalNow;
    });

    test('should not be in cooldown for new user', () => {
      const userId = 999; // New user

      expect(tradingCore.isInCooldown(userId)).toBe(false);
    });
  });

  describe('Position Retrieval', () => {
    test('should get open positions for user', () => {
      const userId = 1;
      const position1 = {
        id: 1,
        userId: 1,
        symbol: 'BTC/USDT',
        side: 'buy',
        entryPrice: 50000,
        amount: 0.001
      };
      const position2 = {
        id: 2,
        userId: 2, // Different user
        symbol: 'ETH/USDT',
        side: 'sell',
        entryPrice: 3000,
        amount: 0.1
      };

      tradingCore.openPositions.set(1, position1);
      tradingCore.openPositions.set(2, position2);

      const userPositions = tradingCore.getOpenPositions(userId);
      
      expect(userPositions).toHaveLength(1);
      expect(userPositions[0].symbol).toBe('BTC/USDT');
    });
  });

  describe('Trading Status', () => {
    test('should return trading status', () => {
      tradingCore.isRunning = true;
      tradingCore.openPositions.set(1, {});
      tradingCore.dailyPnL.set('1_2024-01-01', 10);

      const status = tradingCore.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.openPositions).toBe(1);
      expect(status.dailyPnL).toBeDefined();
    });
  });
});
