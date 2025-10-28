/**
 * Exchange Factory
 * Creates and manages exchange adapter instances
 */

const BinanceAdapter = require('./binance');
const KrakenAdapter = require('./kraken');
const BybitAdapter = require('./bybit');
const logger = require('../utils/logger');

class ExchangeFactory {
  constructor() {
    this.adapters = new Map();
    this.supportedExchanges = ['binance', 'kraken', 'bybit'];
  }

  /**
   * Create exchange adapter
   * @param {string} exchangeName - Exchange name
   * @param {string} apiKey - API key
   * @param {string} apiSecret - API secret
   * @param {boolean} sandbox - Sandbox mode
   * @returns {Object} Exchange adapter instance
   */
  createAdapter(exchangeName, apiKey, apiSecret, sandbox = false) {
    const key = `${exchangeName}_${sandbox ? 'sandbox' : 'live'}`;
    
    // Return cached adapter if exists
    if (this.adapters.has(key)) {
      return this.adapters.get(key);
    }

    let adapter;
    
    switch (exchangeName.toLowerCase()) {
      case 'binance':
        adapter = new BinanceAdapter(apiKey, apiSecret, sandbox);
        break;
      case 'kraken':
        adapter = new KrakenAdapter(apiKey, apiSecret, sandbox);
        break;
      case 'bybit':
        adapter = new BybitAdapter(apiKey, apiSecret, sandbox);
        break;
      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`);
    }

    // Cache the adapter
    this.adapters.set(key, adapter);
    
    logger.info(`Exchange adapter created: ${exchangeName}`, { sandbox });
    return adapter;
  }

  /**
   * Get exchange adapter
   * @param {string} exchangeName - Exchange name
   * @param {boolean} sandbox - Sandbox mode
   * @returns {Object|null} Exchange adapter instance
   */
  getAdapter(exchangeName, sandbox = false) {
    const key = `${exchangeName}_${sandbox ? 'sandbox' : 'live'}`;
    return this.adapters.get(key) || null;
  }

  /**
   * Remove exchange adapter
   * @param {string} exchangeName - Exchange name
   * @param {boolean} sandbox - Sandbox mode
   */
  removeAdapter(exchangeName, sandbox = false) {
    const key = `${exchangeName}_${sandbox ? 'sandbox' : 'live'}`;
    const adapter = this.adapters.get(key);
    
    if (adapter) {
      adapter.close && adapter.close();
      this.adapters.delete(key);
      logger.info(`Exchange adapter removed: ${exchangeName}`, { sandbox });
    }
  }

  /**
   * Get all cached adapters
   * @returns {Array} Array of adapter info
   */
  getAllAdapters() {
    const adapters = [];
    
    for (const [key, adapter] of this.adapters) {
      adapters.push({
        key,
        name: adapter.getName(),
        info: adapter.getInfo()
      });
    }
    
    return adapters;
  }

  /**
   * Clear all adapters
   */
  clearAll() {
    for (const [key, adapter] of this.adapters) {
      adapter.close && adapter.close();
    }
    
    this.adapters.clear();
    logger.info('All exchange adapters cleared');
  }

  /**
   * Get supported exchanges
   * @returns {Array} Array of supported exchange names
   */
  getSupportedExchanges() {
    return [...this.supportedExchanges];
  }

  /**
   * Check if exchange is supported
   * @param {string} exchangeName - Exchange name
   * @returns {boolean}
   */
  isSupported(exchangeName) {
    return this.supportedExchanges.includes(exchangeName.toLowerCase());
  }

  /**
   * Get exchange info
   * @param {string} exchangeName - Exchange name
   * @returns {Object} Exchange information
   */
  getExchangeInfo(exchangeName) {
    const info = {
      binance: {
        name: 'Binance',
        website: 'https://binance.com',
        apiDocs: 'https://binance-docs.github.io/apidocs/spot/en/',
        supportedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
        features: ['spot', 'futures', 'margin'],
        fees: { maker: 0.001, taker: 0.001 }
      },
      kraken: {
        name: 'Kraken',
        website: 'https://kraken.com',
        apiDocs: 'https://www.kraken.com/features/api',
        supportedPairs: ['BTC/USD', 'ETH/USD', 'XRP/USD'],
        features: ['spot', 'futures'],
        fees: { maker: 0.0016, taker: 0.0026 }
      },
      bybit: {
        name: 'Bybit',
        website: 'https://bybit.com',
        apiDocs: 'https://bybit-exchange.github.io/docs/',
        supportedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
        features: ['spot', 'futures', 'options'],
        fees: { maker: 0.001, taker: 0.001 }
      }
    };

    return info[exchangeName.toLowerCase()] || null;
  }

  /**
   * Test exchange connection
   * @param {string} exchangeName - Exchange name
   * @param {string} apiKey - API key
   * @param {string} apiSecret - API secret
   * @param {boolean} sandbox - Sandbox mode
   * @returns {Promise<Object>} Test result
   */
  async testConnection(exchangeName, apiKey, apiSecret, sandbox = false) {
    try {
      const adapter = this.createAdapter(exchangeName, apiKey, apiSecret, sandbox);
      await adapter.initialize();
      
      // Test basic functionality
      const balance = await adapter.getBalance();
      const isHealthy = await adapter.isHealthy();
      
      return {
        success: true,
        exchange: exchangeName,
        balance: Object.keys(balance).length,
        healthy: isHealthy,
        message: 'Connection successful'
      };
    } catch (error) {
      logger.error(`Exchange connection test failed for ${exchangeName}:`, error);
      return {
        success: false,
        exchange: exchangeName,
        error: error.message,
        message: 'Connection failed'
      };
    }
  }
}

module.exports = new ExchangeFactory();
