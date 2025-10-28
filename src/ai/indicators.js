/**
 * Technical Indicators Module
 * Implements EMA, RSI, MACD and other technical analysis indicators
 */

const logger = require('../utils/logger');

class TechnicalIndicators {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Calculate Simple Moving Average (SMA)
   * @param {Array} prices - Array of prices
   * @param {number} period - Period for SMA calculation
   * @returns {Array} SMA values
   */
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return [];
    }

    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }

    return sma;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {Array} prices - Array of prices
   * @param {number} period - Period for EMA calculation
   * @returns {Array} EMA values
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return [];
    }

    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA value is SMA
    const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(firstSMA);

    // Calculate subsequent EMA values
    for (let i = period; i < prices.length; i++) {
      const emaValue = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(emaValue);
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * @param {Array} prices - Array of prices
   * @param {number} period - Period for RSI calculation (default: 14)
   * @returns {Array} RSI values
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return [];
    }

    const gains = [];
    const losses = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const rsi = [];
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Calculate first RSI
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    // Calculate subsequent RSI values using Wilder's smoothing
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {Array} prices - Array of prices
   * @param {number} fastPeriod - Fast EMA period (default: 12)
   * @param {number} slowPeriod - Slow EMA period (default: 26)
   * @param {number} signalPeriod - Signal line period (default: 9)
   * @returns {Object} MACD values
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) {
      return { macd: [], signal: [], histogram: [] };
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    // Calculate MACD line
    const macd = [];
    const minLength = Math.min(fastEMA.length, slowEMA.length);
    
    for (let i = 0; i < minLength; i++) {
      const fastIndex = fastEMA.length - minLength + i;
      const slowIndex = slowEMA.length - minLength + i;
      macd.push(fastEMA[fastIndex] - slowEMA[slowIndex]);
    }

    // Calculate signal line (EMA of MACD)
    const signal = this.calculateEMA(macd, signalPeriod);

    // Calculate histogram
    const histogram = [];
    const signalLength = signal.length;
    
    for (let i = 0; i < signalLength; i++) {
      const macdIndex = macd.length - signalLength + i;
      histogram.push(macd[macdIndex] - signal[i]);
    }

    return {
      macd: macd.slice(-signalLength),
      signal: signal,
      histogram: histogram
    };
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array} prices - Array of prices
   * @param {number} period - Period for calculation (default: 20)
   * @param {number} stdDev - Standard deviation multiplier (default: 2)
   * @returns {Object} Bollinger Bands values
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return { upper: [], middle: [], lower: [] };
    }

    const sma = this.calculateSMA(prices, period);
    const upper = [];
    const lower = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      
      // Calculate standard deviation
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);

      upper.push(mean + (stdDev * standardDeviation));
      lower.push(mean - (stdDev * standardDeviation));
    }

    return {
      upper: upper,
      middle: sma,
      lower: lower
    };
  }

  /**
   * Calculate Stochastic Oscillator
   * @param {Array} high - Array of high prices
   * @param {Array} low - Array of low prices
   * @param {Array} close - Array of closing prices
   * @param {number} kPeriod - %K period (default: 14)
   * @param {number} dPeriod - %D period (default: 3)
   * @returns {Object} Stochastic values
   */
  calculateStochastic(high, low, close, kPeriod = 14, dPeriod = 3) {
    if (high.length < kPeriod || low.length < kPeriod || close.length < kPeriod) {
      return { k: [], d: [] };
    }

    const k = [];
    
    for (let i = kPeriod - 1; i < close.length; i++) {
      const highSlice = high.slice(i - kPeriod + 1, i + 1);
      const lowSlice = low.slice(i - kPeriod + 1, i + 1);
      
      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);
      
      const kValue = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(kValue);
    }

    // Calculate %D (SMA of %K)
    const d = this.calculateSMA(k, dPeriod);

    return { k: k, d: d };
  }

  /**
   * Get cached indicator or calculate new
   * @param {string} key - Cache key
   * @param {Function} calculator - Calculation function
   * @returns {any} Indicator value
   */
  getCachedIndicator(key, calculator) {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.value;
    }

    const value = calculator();
    this.cache.set(key, { value, timestamp: now });
    
    return value;
  }

  /**
   * Clear indicator cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Analyze price data and return all indicators
   * @param {Array} prices - Array of prices
   * @param {Object} options - Calculation options
   * @returns {Object} All calculated indicators
   */
  analyze(prices, options = {}) {
    const {
      emaPeriods = [9, 21, 50],
      rsiPeriod = 14,
      macdFast = 12,
      macdSlow = 26,
      macdSignal = 9,
      bbPeriod = 20,
      bbStdDev = 2
    } = options;

    const analysis = {};

    // Calculate EMAs
    emaPeriods.forEach(period => {
      analysis[`ema${period}`] = this.calculateEMA(prices, period);
    });

    // Calculate RSI
    analysis.rsi = this.calculateRSI(prices, rsiPeriod);

    // Calculate MACD
    analysis.macd = this.calculateMACD(prices, macdFast, macdSlow, macdSignal);

    // Calculate Bollinger Bands
    analysis.bollingerBands = this.calculateBollingerBands(prices, bbPeriod, bbStdDev);

    // Calculate SMA for trend analysis
    analysis.sma50 = this.calculateSMA(prices, 50);
    analysis.sma200 = this.calculateSMA(prices, 200);

    return analysis;
  }
}

module.exports = new TechnicalIndicators();
