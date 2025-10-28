/**
 * Bybit Exchange Adapter
 * Implements Bybit-specific trading functionality
 */

const ccxt = require('ccxt');
const BaseExchangeAdapter = require('./base');
const logger = require('../utils/logger');

class BybitAdapter extends BaseExchangeAdapter {
  constructor(apiKey, apiSecret, sandbox = false) {
    super(apiKey, apiSecret, sandbox);
    this.exchangeName = 'bybit';
  }

  /**
   * Initialize Bybit exchange connection
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.exchange = new ccxt.bybit({
        apiKey: this.apiKey,
        secret: this.apiSecret,
        sandbox: this.sandbox,
        enableRateLimit: true,
        options: {
          defaultType: 'spot', // Use spot trading by default
          adjustForTimeDifference: true
        }
      });

      // Test connection
      await this.exchange.loadMarkets();
      this.isConnected = true;
      
      logger.exchange('Bybit adapter initialized successfully', {
        sandbox: this.sandbox,
        markets: Object.keys(this.exchange.markets).length
      });
    } catch (error) {
      logger.error('Failed to initialize Bybit adapter:', error);
      throw error;
    }
  }

  /**
   * Place order with Bybit-specific parameters
   * @param {string} side - 'buy' or 'sell'
   * @param {string} symbol - Trading symbol
   * @param {number} amount - Order amount
   * @param {number} price - Order price (optional for market orders)
   * @param {string} type - Order type ('market' or 'limit')
   * @returns {Promise<Object>}
   */
  async placeOrder(side, symbol, amount, price = null, type = 'market') {
    try {
      await this.ensureConnected();
      
      // Get market info for precision
      const market = await this.getMarketInfo(symbol);
      const precision = market.precision.amount;
      
      // Round amount to market precision
      const roundedAmount = parseFloat(amount.toFixed(precision));
      
      const orderParams = {
        symbol,
        type,
        side,
        amount: roundedAmount,
        ...(price && { price: parseFloat(price.toFixed(market.precision.price)) })
      };
      
      const order = await this.exchange.createOrder(...Object.values(orderParams));
      
      logger.trade(`Bybit order placed: ${side} ${roundedAmount} ${symbol}`, {
        orderId: order.id,
        symbol,
        side,
        amount: roundedAmount,
        price,
        type
      });
      
      return {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        price: order.price,
        status: order.status,
        timestamp: order.timestamp,
        exchange: 'bybit'
      };
    } catch (error) {
      logger.error(`Bybit order error: ${side} ${amount} ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get account balance with USDT equivalent
   * @returns {Promise<Object>}
   */
  async getBalance() {
    try {
      await this.ensureConnected();
      const balance = await this.exchange.fetchBalance();
      
      // Calculate USDT equivalent for non-USDT balances
      const processedBalance = {};
      let totalUSDT = 0;
      
      for (const [currency, amount] of Object.entries(balance)) {
        if (typeof amount === 'object' && amount.total > 0) {
          processedBalance[currency] = amount;
          
          if (currency !== 'USDT') {
            try {
              const ticker = await this.getTicker(`${currency}/USDT`);
              const usdtValue = amount.total * ticker.last;
              processedBalance[currency].usdtValue = usdtValue;
              totalUSDT += usdtValue;
            } catch (error) {
              // Skip if USDT pair doesn't exist
              processedBalance[currency].usdtValue = 0;
            }
          } else {
            totalUSDT += amount.total;
          }
        }
      }
      
      processedBalance.totalUSDT = totalUSDT;
      
      logger.exchange(`Bybit balance: ${Object.keys(processedBalance).length} currencies, ${totalUSDT.toFixed(2)} USDT total`);
      return processedBalance;
    } catch (error) {
      logger.error('Error getting Bybit balance:', error);
      throw error;
    }
  }

  /**
   * Get 24h ticker statistics
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Object>}
   */
  async getTicker(symbol) {
    try {
      await this.ensureConnected();
      const ticker = await this.exchange.fetchTicker(symbol);
      
      logger.exchange(`Bybit ticker for ${symbol}: ${ticker.last}`);
      return {
        symbol: ticker.symbol,
        last: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        high: ticker.high,
        low: ticker.low,
        volume: ticker.baseVolume,
        quoteVolume: ticker.quoteVolume,
        change: ticker.change,
        percentage: ticker.percentage,
        timestamp: ticker.timestamp,
        exchange: 'bybit'
      };
    } catch (error) {
      logger.error(`Error getting Bybit ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get supported symbols
   * @returns {Promise<Array>}
   */
  async getSupportedSymbols() {
    try {
      await this.ensureConnected();
      const markets = await this.exchange.loadMarkets();
      
      return Object.keys(markets).filter(symbol => {
        const market = markets[symbol];
        return market.active && market.spot && market.quote === 'USDT';
      });
    } catch (error) {
      logger.error('Error getting supported symbols:', error);
      return [];
    }
  }

  /**
   * Get exchange status
   * @returns {Promise<Object>}
   */
  async getStatus() {
    try {
      await this.ensureConnected();
      const status = await this.exchange.fetchStatus();
      
      return {
        status: status.status,
        updated: status.updated,
        eta: status.eta,
        exchange: 'bybit'
      };
    } catch (error) {
      logger.error('Error getting Bybit status:', error);
      return { status: 'error', exchange: 'bybit' };
    }
  }
}

module.exports = BybitAdapter;
