/**
 * Paper Trading Simulation Script
 * Runs a 10-trade simulation to test strategies
 */

require('dotenv').config();

const aiEngine = require('../src/ai/engine');
const indicators = require('../src/ai/indicators');
const logger = require('../src/utils/logger');

class PaperTradingSimulator {
  constructor() {
    this.results = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalPnL: 0,
      errorCount: 0,
      trades: []
    };
  }

  /**
   * Generate realistic price data
   * @param {number} startPrice - Starting price
   * @param {number} length - Number of data points
   * @returns {Array} Price data
   */
  generatePriceData(startPrice, length = 100) {
    const prices = [startPrice];
    let currentPrice = startPrice;
    
    for (let i = 1; i < length; i++) {
      // Random walk with slight upward bias
      const change = (Math.random() - 0.45) * 0.02; // -1% to +1% with slight upward bias
      currentPrice = currentPrice * (1 + change);
      prices.push(currentPrice);
    }
    
    return prices;
  }

  /**
   * Simulate a single trade
   * @param {string} symbol - Trading symbol
   * @param {string} strategy - Trading strategy
   * @param {Array} priceData - Price history
   * @returns {Object} Trade result
   */
  async simulateTrade(symbol, strategy, priceData) {
    try {
      // Add price data to AI engine
      priceData.forEach((price, index) => {
        aiEngine.addPriceData(symbol, price, Date.now() + index);
      });

      // Get current price (last in array)
      const currentPrice = priceData[priceData.length - 1];
      const ticker = { last: currentPrice };

      // Get AI analysis
      const analysis = await aiEngine.analyze(symbol, strategy, ticker);

      // Force trade execution for extended simulation
      if (analysis.action === 'hold') {
        // Convert hold to random buy/sell for more trades
        analysis.action = Math.random() > 0.5 ? 'buy' : 'sell';
        analysis.confidence = 50; // Set lower confidence for forced trades
      }

      // Simulate trade outcome based on next price movement
      const nextPrice = priceData[priceData.length - 1] * (1 + (Math.random() - 0.5) * 0.04);
      
      let profit = 0;
      if (analysis.action === 'buy') {
        profit = ((nextPrice - currentPrice) / currentPrice) * 100;
      } else if (analysis.action === 'sell') {
        profit = ((currentPrice - nextPrice) / currentPrice) * 100;
      }

      return {
        action: analysis.action,
        confidence: analysis.confidence,
        profit: profit,
        entryPrice: currentPrice,
        exitPrice: nextPrice,
        reason: analysis.reason
      };

    } catch (error) {
      logger.error('Trade simulation error:', error);
      return { action: 'error', profit: 0, error: error.message };
    }
  }

  /**
   * Run paper trading simulation
   * @param {number} numTrades - Number of trades to simulate
   * @param {string} strategy - Trading strategy
   * @returns {Promise<Object>} Simulation results
   */
  async simulatePaperTrading(numTrades = 30, strategy = 'ema_rsi') {
    logger.info(`Starting paper trading simulation: ${numTrades} trades with ${strategy} strategy`);

    this.results = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalPnL: 0,
      errorCount: 0,
      trades: []
    };

    for (let i = 0; i < numTrades; i++) {
      try {
        // Generate new price data for each trade
        const startPrice = 50000 + (Math.random() - 0.5) * 10000; // Random start between 45k-55k
        const priceData = this.generatePriceData(startPrice, 50 + Math.floor(Math.random() * 50));

        const trade = await this.simulateTrade('BTC/USDT', strategy, priceData);

        if (trade.action === 'error') {
          this.results.errorCount++;
          continue;
        }

        if (trade.action !== 'hold') {
          this.results.totalTrades++;
          this.results.totalPnL += trade.profit;

          if (trade.profit > 0) {
            this.results.wins++;
          } else if (trade.profit < 0) {
            this.results.losses++;
          }

          this.results.trades.push({
            tradeNumber: i + 1,
            action: trade.action,
            confidence: trade.confidence,
            profit: trade.profit,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            reason: trade.reason
          });

          logger.info(`Trade ${i + 1}: ${trade.action} - ${trade.profit.toFixed(2)}% profit`);
        }

        // Clear history for next trade
        aiEngine.clearHistory('BTC/USDT');

      } catch (error) {
        logger.error(`Error in trade ${i + 1}:`, error);
        this.results.errorCount++;
      }
    }

    // Calculate final statistics
    const winRate = this.results.totalTrades > 0 ? (this.results.wins / this.results.totalTrades) * 100 : 0;
    const avgProfit = this.results.totalTrades > 0 ? this.results.totalPnL / this.results.totalTrades : 0;

    const finalResults = {
      ...this.results,
      winRate: winRate,
      avgProfit: avgProfit,
      strategy: strategy,
      simulationDate: new Date().toISOString()
    };

    logger.info('Paper trading simulation completed:', finalResults);
    return finalResults;
  }

  /**
   * Print simulation results
   * @param {Object} results - Simulation results
   */
  printResults(results) {
    console.log('\n📊 Paper Trading Simulation Results');
    console.log('=====================================');
    console.log(`Strategy: ${results.strategy}`);
    console.log(`Total Trades: ${results.totalTrades}`);
    console.log(`Wins: ${results.wins}`);
    console.log(`Losses: ${results.losses}`);
    console.log(`Win Rate: ${results.winRate.toFixed(1)}%`);
    console.log(`Total PnL: ${results.totalPnL.toFixed(2)}%`);
    console.log(`Average Profit: ${results.avgProfit.toFixed(2)}%`);
    console.log(`Errors: ${results.errorCount}`);
    
    // Calculate extended metrics
    const trades = results.trades;
    const confidences = trades.map(t => t.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningPnL = 0;
    
    for (let i = 0; i < trades.length; i++) {
      runningPnL += trades[i].profit;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    console.log(`Average Confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
    
    console.log('\n📈 Recent Trades:');
    
    results.trades.slice(-5).forEach(trade => {
      const profitStr = trade.profit > 0 ? `+${trade.profit.toFixed(2)}%` : `${trade.profit.toFixed(2)}%`;
      console.log(`${trade.tradeNumber}. ${trade.action.toUpperCase()} - ${profitStr} (${trade.confidence}% confidence)`);
    });
    
    // Extended summary for 30+ trades
    if (results.totalTrades >= 30) {
      console.log(`\n📊 ${results.totalTrades} Trades | WinRate: ${results.winRate.toFixed(1)}% | PnL: ${results.totalPnL.toFixed(2)}% | MaxDrawdown: ${maxDrawdown.toFixed(2)}%`);
    }
  }
}

// Run simulation if this is the main module
if (require.main === module) {
  const simulator = new PaperTradingSimulator();
  
  (async () => {
    try {
      const results = await simulator.simulatePaperTrading(30, 'ema_rsi');
      simulator.printResults(results);
      
      // Exit with success if no errors
      process.exit(results.errorCount === 0 ? 0 : 1);
    } catch (error) {
      logger.error('Simulation failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = PaperTradingSimulator;
