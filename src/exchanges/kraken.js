/**
 * Kraken Exchange Adapter
 * Implements Kraken-specific trading functionality
 */

const ccxt = require('ccxt');
const BaseExchangeAdapter = require('./base');
const logger = require('../utils/logger');

class KrakenAdapter extends BaseExchangeAdapter {
  constructor(apiKey, apiSecret, sandbox = false) {
    super(apiKey, apiSecret, sandbox);
    this.exchangeName = 'kraken';
  }

  /**
   * Initialize Kraken exchange connection
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.exchange = new ccxt.kraken({
        apiKey: this.apiKey,
        secret: this.apiSecret,
        sandbox: this.sandbox,
        enableRateLimit: true,
        options: {
          adjustForTimeDifference: true
        }
      });

      // Test connection
      await this.exchange.loadMarkets();
      this.isConnected = true;
      
      logger.exchange('Kraken adapter initialized successfully', {
        sandbox: this.sandbox,
        markets: Object.keys(this.exchange.markets).length
      });
    } catch (error) {
      logger.error('Failed to initialize Kraken adapter:', error);
      throw error;
    }
  }

  /**
   * Place order with Kraken-specific parameters
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
      
      logger.trade(`Kraken order placed: ${side} ${roundedAmount} ${symbol}`, {
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
        exchange: 'kraken'
      };
    } catch (error) {
      logger.error(`Kraken order error: ${side} ${amount} ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get account balance with USD equivalent
   * @returns {Promise<Object>}
   */
  async getBalance() {
    try {
      await this.ensureConnected();
      const balance = await this.exchange.fetchBalance();
      
      // Calculate USD equivalent for non-USD balances
      const processedBalance = {};
      let totalUSD = 0;
      
      for (const [currency, amount] of Object.entries(balance)) {
        if (typeof amount === 'object' && amount.total > 0) {
          processedBalance[currency] = amount;
          
          if (currency !== 'USD') {
            try {
              const ticker = await this.getTicker(`${currency}/USD`);
              const usdValue = amount.total * ticker.last;
              processedBalance[currency].usdValue = usdValue;
              totalUSD += usdValue;
            } catch (error) {
              // Skip if USD pair doesn't exist
              processedBalance[currency].usdValue = 0;
            }
          } else {
            totalUSD += amount.total;
          }
        }
      }
      
      processedBalance.totalUSD = totalUSD;
      
      logger.exchange(`Kraken balance: ${Object.keys(processedBalance).length} currencies, ${totalUSD.toFixed(2)} USD total`);
      return processedBalance;
    } catch (error) {
      logger.error('Error getting Kraken balance:', error);
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
      
      logger.exchange(`Kraken ticker for ${symbol}: ${ticker.last}`);
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
        exchange: 'kraken'
      };
    } catch (error) {
      logger.error(`Error getting Kraken ticker for ${symbol}:`, error);
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
        return market.active && (market.quote === 'USD' || market.quote === 'EUR');
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
        exchange: 'kraken'
      };
    } catch (error) {
      logger.error('Error getting Kraken status:', error);
      return { status: 'error', exchange: 'kraken' };
    }
  }
}

module.exports = KrakenAdapter;
