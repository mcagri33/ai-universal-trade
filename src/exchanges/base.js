/**
 * Base Exchange Adapter
 * Abstract base class for all exchange implementations
 */

const ccxt = require('ccxt');
const logger = require('../utils/logger');

class BaseExchangeAdapter {
  constructor(apiKey, apiSecret, sandbox = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.sandbox = sandbox;
    this.exchange = null;
    this.isConnected = false;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  /**
   * Initialize exchange connection
   * Must be implemented by subclasses
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Get account balance
   * @returns {Promise<Object>}
   */
  async getBalance() {
    try {
      await this.ensureConnected();
      const balance = await this.exchange.fetchBalance();
      
      // Filter out zero balances
      const filteredBalance = {};
      for (const [currency, amount] of Object.entries(balance)) {
        if (typeof amount === 'object' && amount.total > 0) {
          filteredBalance[currency] = amount;
        }
      }
      
      logger.exchange(`Balance retrieved: ${Object.keys(filteredBalance).length} currencies`);
      return filteredBalance;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Get ticker for symbol
   * @param {string} symbol - Trading symbol (e.g., 'BTC/USDT')
   * @returns {Promise<Object>}
   */
  async getTicker(symbol) {
    try {
      await this.ensureConnected();
      const ticker = await this.exchange.fetchTicker(symbol);
      
      logger.exchange(`Ticker retrieved for ${symbol}: ${ticker.last}`);
      return {
        symbol: ticker.symbol,
        last: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        high: ticker.high,
        low: ticker.low,
        volume: ticker.baseVolume,
        timestamp: ticker.timestamp
      };
    } catch (error) {
      logger.error(`Error getting ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Place order
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
      
      const orderParams = {
        symbol,
        type,
        side,
        amount,
        ...(price && { price })
      };
      
      const order = await this.exchange.createOrder(...Object.values(orderParams));
      
      logger.trade(`Order placed: ${side} ${amount} ${symbol} @ ${price || 'market'}`, {
        orderId: order.id,
        symbol,
        side,
        amount,
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
        timestamp: order.timestamp
      };
    } catch (error) {
      logger.error(`Error placing order: ${side} ${amount} ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all orders for symbol
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Array>}
   */
  async cancelAll(symbol) {
    try {
      await this.ensureConnected();
      const orders = await this.exchange.cancelAllOrders(symbol);
      
      logger.trade(`Cancelled all orders for ${symbol}`, { count: orders.length });
      return orders;
    } catch (error) {
      logger.error(`Error cancelling orders for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get open orders
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Array>}
   */
  async getOpenOrders(symbol) {
    try {
      await this.ensureConnected();
      const orders = await this.exchange.fetchOpenOrders(symbol);
      
      logger.exchange(`Retrieved ${orders.length} open orders for ${symbol}`);
      return orders;
    } catch (error) {
      logger.error(`Error getting open orders for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Object>}
   */
  async getOrder(orderId, symbol) {
    try {
      await this.ensureConnected();
      const order = await this.exchange.fetchOrder(orderId, symbol);
      
      logger.exchange(`Retrieved order ${orderId} for ${symbol}`);
      return order;
    } catch (error) {
      logger.error(`Error getting order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel order by ID
   * @param {string} orderId - Order ID
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Object>}
   */
  async cancelOrder(orderId, symbol) {
    try {
      await this.ensureConnected();
      const order = await this.exchange.cancelOrder(orderId, symbol);
      
      logger.trade(`Order cancelled: ${orderId}`, { symbol });
      return order;
    } catch (error) {
      logger.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get trading fees
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Object>}
   */
  async getTradingFees(symbol) {
    try {
      await this.ensureConnected();
      const fees = await this.exchange.fetchTradingFees([symbol]);
      
      return fees[symbol] || { maker: 0.001, taker: 0.001 };
    } catch (error) {
      logger.error(`Error getting trading fees for ${symbol}:`, error);
      return { maker: 0.001, taker: 0.001 }; // Default fees
    }
  }

  /**
   * Get market info
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Object>}
   */
  async getMarketInfo(symbol) {
    try {
      await this.ensureConnected();
      const markets = await this.exchange.loadMarkets();
      const market = markets[symbol];
      
      if (!market) {
        throw new Error(`Market ${symbol} not found`);
      }
      
      return {
        symbol: market.symbol,
        base: market.base,
        quote: market.quote,
        active: market.active,
        precision: market.precision,
        limits: market.limits
      };
    } catch (error) {
      logger.error(`Error getting market info for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Check if exchange is healthy
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    try {
      const now = Date.now();
      if (now - this.lastHealthCheck < this.healthCheckInterval) {
        return this.isConnected;
      }
      
      await this.exchange.fetchStatus();
      this.isConnected = true;
      this.lastHealthCheck = now;
      
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('Exchange health check failed:', error);
      return false;
    }
  }

  /**
   * Ensure exchange is connected
   * @returns {Promise<void>}
   */
  async ensureConnected() {
    if (!this.exchange) {
      await this.initialize();
    }
    
    if (!await this.isHealthy()) {
      throw new Error('Exchange is not healthy');
    }
  }

  /**
   * Get exchange name
   * @returns {string}
   */
  getName() {
    return this.exchange ? this.exchange.id : 'unknown';
  }

  /**
   * Get exchange info
   * @returns {Object}
   */
  getInfo() {
    return {
      name: this.getName(),
      connected: this.isConnected,
      sandbox: this.sandbox,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}

module.exports = BaseExchangeAdapter;
