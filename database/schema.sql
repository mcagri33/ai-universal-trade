# Database Schema SQL

-- Create database
CREATE DATABASE IF NOT EXISTS universal_ai_trader;
USE universal_ai_trader;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,
  exchange VARCHAR(20) NOT NULL DEFAULT 'binance',
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  setting_key VARCHAR(50) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_setting (user_id, setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side ENUM('buy', 'sell') NOT NULL,
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  amount DECIMAL(20,8) NOT NULL,
  profit DECIMAL(20,8) DEFAULT 0,
  confidence DECIMAL(5,2),
  reason TEXT,
  status ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_symbol (user_id, symbol),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_exchange ON users(exchange);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at);

-- Insert default admin user (replace with your Telegram ID)
INSERT IGNORE INTO users (telegram_id, exchange, is_active) VALUES (123456789, 'binance', TRUE);

-- Insert default settings for admin user
INSERT IGNORE INTO user_settings (user_id, setting_key, setting_value) VALUES
(1, 'strategy', 'ema_rsi'),
(1, 'trade_mode', 'long'),
(1, 'max_daily_loss', '100'),
(1, 'trade_amount', '20'),
(1, 'stop_loss', '2'),
(1, 'take_profit', '3'),
(1, 'symbol', 'BTC/USDT'),
(1, 'paper_trading', 'false'),
(1, 'ai_enabled', 'true'),
(1, 'notifications', 'true');
