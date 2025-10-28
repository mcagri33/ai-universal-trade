/**
 * Trading Core Engine
 * Handles trade execution, risk management, and position tracking
 */

const exchangeFactory = require('../exchanges/factory');
const aiEngine = require('../ai/engine');
const config = require('../config/settings');
const db = require('../database/models');
const telegramBot = require('../telegram/bot');
const logger = require('../utils/logger');

class TradingCore {
  constructor() {
    this.isRunning = false;
    this.tradingLoop = null;
    this.openPositions = new Map();
    this.dailyPnL = new Map();
    this.lastTradeTime = new Map();
    this.tradeCooldown = 30000; // 30 seconds between trades
  }

  /**
   * Start trading loop
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async startTrading(userId) {
    try {
      if (this.isRunning) {
        logger.trade('Trading already running');
        return;
      }

      this.isRunning = true;
      this.tradingLoop = setInterval(async () => {
        await this.executeTradingCycle(userId);
      }, 60000); // Run every minute

      logger.trade('Trading loop started', { userId });
    } catch (error) {
      logger.error('Error starting trading:', error);
      throw error;
    }
  }

  /**
   * Stop trading loop
   * @returns {Promise<void>}
   */
  async stopTrading() {
    try {
      if (this.tradingLoop) {
        clearInterval(this.tradingLoop);
        this.tradingLoop = null;
      }
      
      this.isRunning = false;
      logger.trade('Trading loop stopped');
    } catch (error) {
      logger.error('Error stopping trading:', error);
      throw error;
    }
  }

  /**
   * Execute single trading cycle
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async executeTradingCycle(userId) {
    try {
      // Check if trading is active for this user
      const telegramCommands = require('../telegram/commands');
      if (!telegramCommands.isTradingActive(userId)) {
        return;
      }

      // Get user settings
      const settings = await config.getAll(userId);
      
      // Check cooldown
      if (this.isInCooldown(userId)) {
        return;
      }

      // Check daily loss limit
      if (await this.isDailyLossLimitReached(userId)) {
        await telegramBot.sendNotification('⚠️ Daily loss limit reached. Trading paused.');
        telegramCommands.setTradingActive(userId, false);
        return;
      }

      // Get exchange adapter
      const exchange = exchangeFactory.getAdapter(settings.exchange || 'binance');
      if (!exchange) {
        logger.error('Exchange adapter not found', { exchange: settings.exchange });
        return;
      }

      const symbol = settings.symbol || 'BTC/USDT';
      const strategy = settings.strategy || 'ema_rsi';
      const tradeMode = settings.trade_mode || 'long';
      const paperTrading = settings.paper_trading === 'true';

      // Get current price
      const ticker = await exchange.getTicker(symbol);
      
      // Add price to AI engine
      aiEngine.addPriceData(symbol, ticker.last);
      
      // Get AI analysis
      const analysis = await aiEngine.analyze(symbol, strategy, ticker);
      
      // Check if we should trade
      if (analysis.action === 'hold' || analysis.confidence < 60) {
        return;
      }

      // Check trade mode compatibility
      if (tradeMode === 'long' && analysis.action === 'sell') {
        return;
      }
      if (tradeMode === 'short' && analysis.action === 'buy') {
        return;
      }

      // Execute trade
      await this.executeTrade(userId, exchange, symbol, analysis, settings, paperTrading);
      
    } catch (error) {
      logger.error('Trading cycle error:', error);
      await telegramBot.sendErrorNotification('Trading cycle error', { error: error.message });
    }
  }

  /**
   * Execute a trade
   * @param {number} userId - User ID
   * @param {Object} exchange - Exchange adapter
   * @param {string} symbol - Trading symbol
   * @param {Object} analysis - AI analysis
   * @param {Object} settings - User settings
   * @param {boolean} paperTrading - Paper trading mode
   * @returns {Promise<void>}
   */
  async executeTrade(userId, exchange, symbol, analysis, settings, paperTrading) {
    try {
      const tradeAmount = parseFloat(settings.trade_amount || '20');
      const currentPrice = analysis.indicators.price;
      
      let orderResult = null;
      
      if (paperTrading) {
        // Paper trading - simulate order
        orderResult = {
          id: `paper_${Date.now()}`,
          symbol,
          side: analysis.action,
          amount: tradeAmount,
          price: currentPrice,
          status: 'filled',
          timestamp: Date.now()
        };
        
        logger.trade('Paper trade executed', orderResult);
      } else {
        // Real trading
        orderResult = await exchange.placeOrder(
          analysis.action,
          symbol,
          tradeAmount,
          null, // Market order
          'market'
        );
        
        logger.trade('Real trade executed', orderResult);
      }

      // Save trade to database
      const tradeId = await db.createTrade({
        userId,
        symbol,
        side: analysis.action,
        entryPrice: currentPrice,
        amount: tradeAmount,
        confidence: analysis.confidence,
        reason: analysis.reason
      });

      // Track position
      this.openPositions.set(tradeId, {
        id: tradeId,
        userId,
        symbol,
        side: analysis.action,
        entryPrice: currentPrice,
        amount: tradeAmount,
        stopLoss: this.calculateStopLoss(currentPrice, analysis.action, settings),
        takeProfit: this.calculateTakeProfit(currentPrice, analysis.action, settings),
        createdAt: Date.now()
      });

      // Send notification
      await telegramBot.sendTradeNotification({
        symbol,
        side: analysis.action,
        amount: tradeAmount,
        price: currentPrice,
        confidence: analysis.confidence,
        reason: analysis.reason
      });

      // Update cooldown
      this.lastTradeTime.set(userId, Date.now());

    } catch (error) {
      logger.error('Trade execution error:', error);
      await telegramBot.sendErrorNotification('Trade execution failed', { 
        symbol, 
        action: analysis.action,
        error: error.message 
      });
    }
  }

  /**
   * Check and close positions
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async checkAndClosePositions(userId) {
    try {
      const settings = await config.getAll(userId);
      const exchange = exchangeFactory.getAdapter(settings.exchange || 'binance');
      
      if (!exchange) {
        return;
      }

      const symbol = settings.symbol || 'BTC/USDT';
      const ticker = await exchange.getTicker(symbol);
      const currentPrice = ticker.last;

      // Check all open positions for this user
      for (const [tradeId, position] of this.openPositions) {
        if (position.userId !== userId) {
          continue;
        }

        const shouldClose = this.shouldClosePosition(position, currentPrice);
        
        if (shouldClose.close) {
          await this.closePosition(tradeId, position, currentPrice, shouldClose.reason, exchange);
        }
      }
    } catch (error) {
      logger.error('Error checking positions:', error);
    }
  }

  /**
   * Check if position should be closed
   * @param {Object} position - Position data
   * @param {number} currentPrice - Current price
   * @returns {Object} Close decision
   */
  shouldClosePosition(position, currentPrice) {
    const { side, entryPrice, stopLoss, takeProfit } = position;
    
    if (side === 'buy') {
      // Long position
      if (currentPrice <= stopLoss) {
        return { close: true, reason: 'Stop loss triggered' };
      }
      if (currentPrice >= takeProfit) {
        return { close: true, reason: 'Take profit triggered' };
      }
    } else {
      // Short position
      if (currentPrice >= stopLoss) {
        return { close: true, reason: 'Stop loss triggered' };
      }
      if (currentPrice <= takeProfit) {
        return { close: true, reason: 'Take profit triggered' };
      }
    }

    return { close: false };
  }

  /**
   * Close a position
   * @param {number} tradeId - Trade ID
   * @param {Object} position - Position data
   * @param {number} currentPrice - Current price
   * @param {string} reason - Close reason
   * @param {Object} exchange - Exchange adapter
   * @returns {Promise<void>}
   */
  async closePosition(tradeId, position, currentPrice, reason, exchange) {
    try {
      const { userId, symbol, side, amount, entryPrice } = position;
      
      // Execute close order
      const closeOrder = await exchange.placeOrder(
        side === 'buy' ? 'sell' : 'buy',
        symbol,
        amount,
        null,
        'market'
      );

      // Calculate profit/loss
      const profit = this.calculateProfit(entryPrice, currentPrice, side, amount);
      
      // Update trade in database
      await db.updateTrade(tradeId, {
        exit_price: currentPrice,
        profit: profit,
        status: 'closed',
        closed_at: new Date()
      });

      // Update daily PnL
      this.updateDailyPnL(userId, profit);

      // Remove from open positions
      this.openPositions.delete(tradeId);

      // Send notification
      await telegramBot.sendTradeClosureNotification({
        symbol,
        profit,
        side: side === 'buy' ? 'sell' : 'buy',
        reason
      });

      logger.trade('Position closed', {
        tradeId,
        symbol,
        profit,
        reason
      });

    } catch (error) {
      logger.error('Error closing position:', error);
    }
  }

  /**
   * Calculate stop loss price
   * @param {number} entryPrice - Entry price
   * @param {string} side - Trade side
   * @param {Object} settings - User settings
   * @returns {number} Stop loss price
   */
  calculateStopLoss(entryPrice, side, settings) {
    const stopLossPercent = parseFloat(settings.stop_loss || '2') / 100;
    
    if (side === 'buy') {
      return entryPrice * (1 - stopLossPercent);
    } else {
      return entryPrice * (1 + stopLossPercent);
    }
  }

  /**
   * Calculate take profit price
   * @param {number} entryPrice - Entry price
   * @param {string} side - Trade side
   * @param {Object} settings - User settings
   * @returns {number} Take profit price
   */
  calculateTakeProfit(entryPrice, side, settings) {
    const takeProfitPercent = parseFloat(settings.take_profit || '3') / 100;
    
    if (side === 'buy') {
      return entryPrice * (1 + takeProfitPercent);
    } else {
      return entryPrice * (1 - takeProfitPercent);
    }
  }

  /**
   * Calculate profit/loss percentage
   * @param {number} entryPrice - Entry price
   * @param {number} exitPrice - Exit price
   * @param {string} side - Trade side
   * @param {number} amount - Trade amount
   * @returns {number} Profit percentage
   */
  calculateProfit(entryPrice, exitPrice, side, amount) {
    if (side === 'buy') {
      return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
  }

  /**
   * Update daily PnL
   * @param {number} userId - User ID
   * @param {number} profit - Profit amount
   */
  updateDailyPnL(userId, profit) {
    const today = new Date().toDateString();
    const currentPnL = this.dailyPnL.get(`${userId}_${today}`) || 0;
    this.dailyPnL.set(`${userId}_${today}`, currentPnL + profit);
  }

  /**
   * Check if user is in cooldown
   * @param {number} userId - User ID
   * @returns {boolean}
   */
  isInCooldown(userId) {
    const lastTrade = this.lastTradeTime.get(userId);
    if (!lastTrade) {
      return false;
    }
    
    return (Date.now() - lastTrade) < this.tradeCooldown;
  }

  /**
   * Check if daily loss limit is reached
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async isDailyLossLimitReached(userId) {
    try {
      const settings = await config.getAll(userId);
      const maxDailyLoss = parseFloat(settings.max_daily_loss || '100');
      
      const today = new Date().toDateString();
      const dailyPnL = this.dailyPnL.get(`${userId}_${today}`) || 0;
      
      return dailyPnL <= -maxDailyLoss;
    } catch (error) {
      logger.error('Error checking daily loss limit:', error);
      return false;
    }
  }

  /**
   * Get open positions for user
   * @param {number} userId - User ID
   * @returns {Array} Open positions
   */
  getOpenPositions(userId) {
    const positions = [];
    
    for (const [tradeId, position] of this.openPositions) {
      if (position.userId === userId) {
        positions.push({ tradeId, ...position });
      }
    }
    
    return positions;
  }

  /**
   * Get trading status
   * @returns {Object} Trading status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      openPositions: this.openPositions.size,
      dailyPnL: Object.fromEntries(this.dailyPnL)
    };
  }

  /**
   * Force close all positions
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async forceCloseAllPositions(userId) {
    try {
      const settings = await config.getAll(userId);
      const exchange = exchangeFactory.getAdapter(settings.exchange || 'binance');
      
      if (!exchange) {
        return;
      }

      const symbol = settings.symbol || 'BTC/USDT';
      const ticker = await exchange.getTicker(symbol);
      const currentPrice = ticker.last;

      // Close all positions for this user
      for (const [tradeId, position] of this.openPositions) {
        if (position.userId === userId) {
          await this.closePosition(tradeId, position, currentPrice, 'Force close', exchange);
        }
      }

      logger.trade('All positions force closed', { userId });
    } catch (error) {
      logger.error('Error force closing positions:', error);
    }
  }
}

module.exports = new TradingCore();
