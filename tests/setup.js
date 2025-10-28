/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';
process.env.DB_NAME = 'test_db';
process.env.TG_BOT_TOKEN = 'test_token';
process.env.TG_ADMIN_ID = '123456789';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('telegraf');
jest.mock('mysql2/promise');
jest.mock('ccxt');
jest.mock('node-schedule');

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
