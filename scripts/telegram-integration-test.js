/**
 * Telegram Integration Test Script
 * Tests Telegram bot functionality in paper mode
 */

require('dotenv').config();

const MockTelegramBot = require('../src/telegram/mock-bot');
const aiEngine = require('../src/ai/engine');
const config = require('../src/config/settings');
const logger = require('../src/utils/logger');

class TelegramIntegrationTest {
  constructor() {
    this.bot = new MockTelegramBot();
    this.testResults = {
      healthNotifications: [],
      aiReasoning: [],
      tradeSummaries: [],
      commandTests: {},
      errors: []
    };
  }

  /**
   * Run complete Telegram integration test
   */
  async runTest() {
    try {
      logger.info('🚀 Starting Telegram Integration Test');
      
      // Initialize bot
      await this.bot.initialize();
      this.bot.registerCommands();
      
      // Test 1: Manual Commands
      await this.testManualCommands();
      
      // Test 2: Health Notifications
      await this.testHealthNotifications();
      
      // Test 3: AI Reasoning Messages
      await this.testAIReasoning();
      
      // Test 4: Trade Summary Messages
      await this.testTradeSummaries();
      
      // Print test results
      this.printTestResults();
      
    } catch (error) {
      logger.error('Telegram integration test failed:', error);
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test manual commands
   */
  async testManualCommands() {
    logger.info('📋 Testing manual commands...');
    
    const commands = ['/health', '/ai', '/stats', '/config'];
    
    for (const command of commands) {
      try {
        logger.info(`Testing command: ${command}`);
        await this.bot.executeCommand(command);
        
        this.testResults.commandTests[command] = {
          status: 'success',
          timestamp: new Date().toISOString()
        };
        
        // Wait between commands
        await this.delay(1000);
        
      } catch (error) {
        logger.error(`Command ${command} failed:`, error);
        this.testResults.commandTests[command] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Test health notifications
   */
  async testHealthNotifications() {
    logger.info('🏥 Testing health notifications...');
    
    try {
      // Send initial health check
      await this.bot.sendHealthCheck();
      
      this.testResults.healthNotifications.push({
        type: 'initial',
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      // Simulate periodic health checks (every 30 minutes)
      logger.info('Simulating 30-minute health check interval...');
      await this.delay(2000); // Short delay for demo
      
      await this.bot.sendHealthCheck();
      
      this.testResults.healthNotifications.push({
        type: 'periodic',
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Health notification test failed:', error);
      this.testResults.healthNotifications.push({
        type: 'error',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test AI reasoning messages
   */
  async testAIReasoning() {
    logger.info('🧠 Testing AI reasoning messages...');
    
    try {
      // Generate sample price data
      const symbol = 'BTC/USDT';
      const prices = Array.from({ length: 50 }, (_, i) => 50000 + (Math.random() - 0.5) * 1000);
      
      // Add price data to AI engine
      prices.forEach((price, index) => {
        aiEngine.addPriceData(symbol, price, Date.now() + index * 60000);
      });
      
      // Get AI analysis
      const ticker = { last: prices[prices.length - 1] };
      const analysis = await aiEngine.analyze(symbol, 'ema_rsi', ticker);
      
      // Send AI reasoning
      const reasoning = aiEngine.generateReasoning(analysis, analysis, ticker.last);
      await this.bot.sendAIReasoning(reasoning);
      
      this.testResults.aiReasoning.push({
        symbol: symbol,
        action: analysis.action,
        confidence: analysis.confidence,
        reasoning: reasoning,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('AI reasoning test failed:', error);
      this.testResults.aiReasoning.push({
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test trade summary messages
   */
  async testTradeSummaries() {
    logger.info('📊 Testing trade summary messages...');
    
    try {
      // Simulate multiple trades
      const trades = [
        {
          action: 'buy',
          symbol: 'BTC/USDT',
          amount: 0.001,
          price: 50000,
          profit: 1.25,
          reason: '🤖 AI suggests **BUY BTC/USDT** — Uptrend continuation, RSI in neutral zone, RSI 58.1 (neutral), EMA trend upward. Confidence: 70%'
        },
        {
          action: 'sell',
          symbol: 'BTC/USDT',
          amount: 0.001,
          price: 51000,
          profit: -0.75,
          reason: '🤖 AI suggests **SELL BTC/USDT** — Downtrend continuation, RSI in neutral zone, RSI 43.4 (neutral), EMA trend downward. Confidence: 70%'
        },
        {
          action: 'buy',
          symbol: 'BTC/USDT',
          amount: 0.001,
          price: 49500,
          profit: 2.1,
          reason: '🤖 AI suggests **BUY BTC/USDT** — Uptrend continuation, RSI in neutral zone, RSI 55.8 (neutral), EMA trend upward. Confidence: 70%'
        }
      ];
      
      for (const trade of trades) {
        await this.bot.sendTradeNotification(trade);
        
        this.testResults.tradeSummaries.push({
          ...trade,
          status: 'success',
          timestamp: new Date().toISOString()
        });
        
        // Wait between trades
        await this.delay(1500);
      }
      
    } catch (error) {
      logger.error('Trade summary test failed:', error);
      this.testResults.tradeSummaries.push({
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Print test results
   */
  printTestResults() {
    console.log('\n📊 Telegram Integration Test Results');
    console.log('=====================================');
    
    // Command Tests
    console.log('\n📋 Manual Commands:');
    Object.entries(this.testResults.commandTests).forEach(([command, result]) => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`  ${status} ${command} - ${result.status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    // Health Notifications
    console.log('\n🏥 Health Notifications:');
    this.testResults.healthNotifications.forEach((notification, index) => {
      const status = notification.status === 'success' ? '✅' : '❌';
      console.log(`  ${status} ${notification.type} - ${notification.status}`);
    });
    
    // AI Reasoning
    console.log('\n🧠 AI Reasoning Messages:');
    this.testResults.aiReasoning.forEach((reasoning, index) => {
      const status = reasoning.status === 'success' ? '✅' : '❌';
      console.log(`  ${status} ${reasoning.symbol || 'Unknown'} - ${reasoning.action || 'Error'}`);
    });
    
    // Trade Summaries
    console.log('\n📊 Trade Summary Messages:');
    this.testResults.tradeSummaries.forEach((trade, index) => {
      const status = trade.status === 'success' ? '✅' : '❌';
      console.log(`  ${status} ${trade.action?.toUpperCase() || 'Error'} ${trade.symbol || 'Unknown'} - ${trade.profit || 'N/A'}%`);
    });
    
    // Errors
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Summary
    const totalTests = Object.keys(this.testResults.commandTests).length + 
                     this.testResults.healthNotifications.length +
                     this.testResults.aiReasoning.length +
                     this.testResults.tradeSummaries.length;
    
    const successfulTests = Object.values(this.testResults.commandTests).filter(t => t.status === 'success').length +
                           this.testResults.healthNotifications.filter(t => t.status === 'success').length +
                           this.testResults.aiReasoning.filter(t => t.status === 'success').length +
                           this.testResults.tradeSummaries.filter(t => t.status === 'success').length;
    
    console.log(`\n📈 Test Summary: ${successfulTests}/${totalTests} tests passed`);
    console.log(`📁 Logs saved to: logs/telegram.log`);
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run test if this is the main module
if (require.main === module) {
  const test = new TelegramIntegrationTest();
  test.runTest().catch(console.error);
}

module.exports = TelegramIntegrationTest;
