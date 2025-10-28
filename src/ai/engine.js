/**
 * AI Decision Engine
 * Analyzes market data and makes trading decisions with confidence scoring
 */

const indicators = require('./indicators');
const logger = require('../utils/logger');

class AIDecisionEngine {
  constructor() {
    this.strategies = {
      ema_rsi: this.emaRsiStrategy.bind(this),
      macd_cross: this.macdCrossStrategy.bind(this),
      rsi_only: this.rsiOnlyStrategy.bind(this)
    };
    
    this.priceHistory = new Map();
    this.maxHistoryLength = 200;
  }

  /**
   * Add price data to history
   * @param {string} symbol - Trading symbol
   * @param {number} price - Price value
   * @param {number} timestamp - Timestamp
   */
  addPriceData(symbol, price, timestamp = Date.now()) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol);
    history.push({ price, timestamp });

    // Keep only recent data
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Get price history for symbol
   * @param {string} symbol - Trading symbol
   * @returns {Array} Price history
   */
  getPriceHistory(symbol) {
    return this.priceHistory.get(symbol) || [];
  }

  /**
   * Analyze market and make trading decision
   * @param {string} symbol - Trading symbol
   * @param {string} strategy - Trading strategy
   * @param {Object} currentPrice - Current price data
   * @returns {Promise<Object>} Trading decision
   */
  async analyze(symbol, strategy = 'ema_rsi', currentPrice) {
    try {
      const history = this.getPriceHistory(symbol);
      
      if (history.length < 50) {
        return {
          action: 'hold',
          confidence: 0,
          reason: 'Insufficient price history for analysis',
          indicators: {}
        };
      }

      // Extract prices for analysis
      const prices = history.map(item => item.price);
      
      // Calculate technical indicators
      const analysis = indicators.analyze(prices);
      
      // Get strategy function
      const strategyFn = this.strategies[strategy];
      if (!strategyFn) {
        throw new Error(`Unknown strategy: ${strategy}`);
      }

      // Execute strategy
      const decision = strategyFn(analysis, currentPrice);
      
      // Add AI reasoning
      decision.reason = this.generateReasoning(decision, analysis, currentPrice);
      decision.timestamp = Date.now();
      decision.symbol = symbol;
      decision.strategy = strategy;

      logger.ai(`AI analysis completed for ${symbol}`, {
        action: decision.action,
        confidence: decision.confidence,
        strategy
      });

      return decision;
    } catch (error) {
      logger.error('AI analysis error:', error);
      return {
        action: 'hold',
        confidence: 0,
        reason: `Analysis error: ${error.message}`,
        indicators: {},
        timestamp: Date.now(),
        symbol,
        strategy
      };
    }
  }

  /**
   * EMA + RSI Strategy
   * @param {Object} analysis - Technical analysis data
   * @param {Object} currentPrice - Current price data
   * @returns {Object} Trading decision
   */
  emaRsiStrategy(analysis, currentPrice) {
    const { ema9, ema21, ema50, rsi } = analysis;
    const currentPriceValue = currentPrice.last;
    
    if (!ema9.length || !ema21.length || !ema50.length || !rsi.length) {
      return { action: 'hold', confidence: 0, indicators: analysis };
    }

    const latestEma9 = ema9[ema9.length - 1];
    const latestEma21 = ema21[ema21.length - 1];
    const latestEma50 = ema50[ema50.length - 1];
    const latestRsi = rsi[rsi.length - 1];
    
    const prevEma9 = ema9[ema9.length - 2] || latestEma9;
    const prevEma21 = ema21[ema21.length - 2] || latestEma21;
    
    let action = 'hold';
    let confidence = 0;
    let signals = [];

    // EMA Trend Analysis
    const emaTrendUp = latestEma9 > latestEma21 && latestEma21 > latestEma50;
    const emaTrendDown = latestEma9 < latestEma21 && latestEma21 < latestEma50;
    const emaCrossUp = latestEma9 > latestEma21 && prevEma9 <= prevEma21;
    const emaCrossDown = latestEma9 < latestEma21 && prevEma9 >= prevEma21;

    // RSI Analysis
    const rsiOversold = latestRsi < 30;
    const rsiOverbought = latestRsi > 70;
    const rsiNeutral = latestRsi >= 40 && latestRsi <= 60;

    // Price vs EMA Analysis
    const priceAboveEma9 = currentPriceValue > latestEma9;
    const priceAboveEma21 = currentPriceValue > latestEma21;
    const priceAboveEma50 = currentPriceValue > latestEma50;

    // Buy Signals
    if (emaTrendUp && emaCrossUp && rsiOversold && priceAboveEma9) {
      action = 'buy';
      confidence = 85;
      signals.push('Strong uptrend with EMA crossover');
      signals.push('RSI oversold condition');
      signals.push('Price above short-term EMA');
    } else if (emaTrendUp && rsiNeutral && priceAboveEma21) {
      action = 'buy';
      confidence = 70;
      signals.push('Uptrend continuation');
      signals.push('RSI in neutral zone');
    } else if (emaCrossUp && rsiOversold) {
      action = 'buy';
      confidence = 60;
      signals.push('EMA crossover');
      signals.push('RSI oversold');
    }

    // Sell Signals
    if (emaTrendDown && emaCrossDown && rsiOverbought && !priceAboveEma9) {
      action = 'sell';
      confidence = 85;
      signals.push('Strong downtrend with EMA crossover');
      signals.push('RSI overbought condition');
      signals.push('Price below short-term EMA');
    } else if (emaTrendDown && rsiNeutral && !priceAboveEma21) {
      action = 'sell';
      confidence = 70;
      signals.push('Downtrend continuation');
      signals.push('RSI in neutral zone');
    } else if (emaCrossDown && rsiOverbought) {
      action = 'sell';
      confidence = 60;
      signals.push('EMA crossover');
      signals.push('RSI overbought');
    }

    // Adjust confidence based on signal strength
    if (signals.length > 2) {
      confidence = Math.min(confidence + 10, 95);
    }

    return {
      action,
      confidence,
      signals,
      indicators: {
        ema9: latestEma9,
        ema21: latestEma21,
        ema50: latestEma50,
        rsi: latestRsi,
        price: currentPriceValue
      }
    };
  }

  /**
   * MACD Cross Strategy
   * @param {Object} analysis - Technical analysis data
   * @param {Object} currentPrice - Current price data
   * @returns {Object} Trading decision
   */
  macdCrossStrategy(analysis, currentPrice) {
    const { macd } = analysis;
    
    if (!macd.macd.length || !macd.signal.length) {
      return { action: 'hold', confidence: 0, indicators: analysis };
    }

    const latestMacd = macd.macd[macd.macd.length - 1];
    const latestSignal = macd.signal[macd.signal.length - 1];
    const latestHistogram = macd.histogram[macd.histogram.length - 1];
    
    const prevMacd = macd.macd[macd.macd.length - 2] || latestMacd;
    const prevSignal = macd.signal[macd.signal.length - 2] || latestSignal;

    let action = 'hold';
    let confidence = 0;
    let signals = [];

    // MACD Cross Analysis
    const macdCrossUp = latestMacd > latestSignal && prevMacd <= prevSignal;
    const macdCrossDown = latestMacd < latestSignal && prevMacd >= prevSignal;
    const macdAboveZero = latestMacd > 0;
    const macdBelowZero = latestMacd < 0;
    const histogramIncreasing = latestHistogram > 0;

    // Buy Signals
    if (macdCrossUp && macdAboveZero && histogramIncreasing) {
      action = 'buy';
      confidence = 80;
      signals.push('MACD bullish crossover above zero');
      signals.push('Histogram increasing');
    } else if (macdCrossUp && histogramIncreasing) {
      action = 'buy';
      confidence = 65;
      signals.push('MACD bullish crossover');
      signals.push('Histogram increasing');
    }

    // Sell Signals
    if (macdCrossDown && macdBelowZero && !histogramIncreasing) {
      action = 'sell';
      confidence = 80;
      signals.push('MACD bearish crossover below zero');
      signals.push('Histogram decreasing');
    } else if (macdCrossDown && !histogramIncreasing) {
      action = 'sell';
      confidence = 65;
      signals.push('MACD bearish crossover');
      signals.push('Histogram decreasing');
    }

    return {
      action,
      confidence,
      signals,
      indicators: {
        macd: latestMacd,
        signal: latestSignal,
        histogram: latestHistogram
      }
    };
  }

  /**
   * RSI Only Strategy
   * @param {Object} analysis - Technical analysis data
   * @param {Object} currentPrice - Current price data
   * @returns {Object} Trading decision
   */
  rsiOnlyStrategy(analysis, currentPrice) {
    const { rsi } = analysis;
    
    if (!rsi.length) {
      return { action: 'hold', confidence: 0, indicators: analysis };
    }

    const latestRsi = rsi[rsi.length - 1];
    const prevRsi = rsi[rsi.length - 2] || latestRsi;

    let action = 'hold';
    let confidence = 0;
    let signals = [];

    // RSI Divergence Analysis
    const rsiOversold = latestRsi < 30;
    const rsiOverbought = latestRsi > 70;
    const rsiRising = latestRsi > prevRsi;
    const rsiFalling = latestRsi < prevRsi;

    // Buy Signals
    if (rsiOversold && rsiRising) {
      action = 'buy';
      confidence = 75;
      signals.push('RSI oversold and rising');
    } else if (rsiOversold) {
      action = 'buy';
      confidence = 60;
      signals.push('RSI oversold');
    }

    // Sell Signals
    if (rsiOverbought && rsiFalling) {
      action = 'sell';
      confidence = 75;
      signals.push('RSI overbought and falling');
    } else if (rsiOverbought) {
      action = 'sell';
      confidence = 60;
      signals.push('RSI overbought');
    }

    return {
      action,
      confidence,
      signals,
      indicators: {
        rsi: latestRsi,
        rsiChange: latestRsi - prevRsi
      }
    };
  }

  /**
   * Generate AI reasoning message
   * @param {Object} decision - Trading decision
   * @param {Object} analysis - Technical analysis
   * @param {Object} currentPrice - Current price
   * @returns {string} Reasoning message
   */
  generateReasoning(decision, analysis, currentPrice) {
    const { action, confidence, signals, indicators } = decision;
    const symbol = decision.symbol || 'BTC/USDT';
    
    let reasoning = `🤖 AI suggests **${action.toUpperCase()} ${symbol}**`;
    
    if (signals && signals.length > 0) {
      reasoning += ` — ${signals.join(', ')}`;
    }
    
    if (indicators.rsi !== undefined) {
      const rsiStatus = indicators.rsi < 30 ? 'oversold' : 
                       indicators.rsi > 70 ? 'overbought' : 'neutral';
      reasoning += `, RSI ${indicators.rsi.toFixed(1)} (${rsiStatus})`;
    }
    
    if (indicators.ema9 && indicators.ema21) {
      const emaTrend = indicators.ema9 > indicators.ema21 ? 'upward' : 'downward';
      reasoning += `, EMA trend ${emaTrend}`;
    }
    
    reasoning += `. Confidence: ${confidence}%`;
    
    return reasoning;
  }

  /**
   * Get available strategies
   * @returns {Array} Available strategy names
   */
  getAvailableStrategies() {
    return Object.keys(this.strategies);
  }

  /**
   * Clear price history
   * @param {string} symbol - Trading symbol (optional)
   */
  clearHistory(symbol = null) {
    if (symbol) {
      this.priceHistory.delete(symbol);
    } else {
      this.priceHistory.clear();
    }
    
    logger.ai('Price history cleared', { symbol });
  }

  /**
   * Get strategy description
   * @param {string} strategy - Strategy name
   * @returns {string} Strategy description
   */
  getStrategyDescription(strategy) {
    const descriptions = {
      ema_rsi: 'Combines Exponential Moving Averages (9, 21, 50) with RSI for trend and momentum analysis',
      macd_cross: 'Uses MACD crossover signals with histogram analysis for momentum trading',
      rsi_only: 'Simple RSI-based strategy focusing on overbought/oversold conditions'
    };
    
    return descriptions[strategy] || 'Unknown strategy';
  }
}

module.exports = new AIDecisionEngine();
