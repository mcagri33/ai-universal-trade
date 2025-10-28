# Universal AI Trader

A professional, modular, and testable trading bot system designed for cryptocurrency trading across multiple exchanges with AI-powered decision making and Telegram management.

## 🚀 Features

- **Multi-Exchange Support**: Kraken, Binance, Bybit with modular adapters
- **AI Decision Engine**: EMA + RSI + MACD technical analysis with confidence scoring
- **Telegram Management**: Complete bot control via Telegram commands
- **Risk Management**: Stop-loss, take-profit, and daily loss limits
- **Paper Trading**: Safe simulation mode for testing strategies
- **Real-time Notifications**: Trade alerts, health checks, and daily summaries
- **Dynamic Configuration**: Runtime settings via MySQL database
- **Professional Logging**: Winston-based logging with rotation
- **PM2 Ready**: Production-ready process management
- **85%+ Test Coverage**: Comprehensive Jest testing suite

## 📦 Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd universal-ai-trader
   npm install
   ```

2. **Setup MySQL Database**
   ```sql
   CREATE DATABASE universal_ai_trader;
   CREATE USER 'trader'@'localhost' IDENTIFIED BY 'strongpassword';
   GRANT ALL PRIVILEGES ON universal_ai_trader.* TO 'trader'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Initialize Database**
   ```bash
   npm run db:init
   ```

5. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

**📖 For detailed installation instructions, see [INSTALLATION.md](INSTALLATION.md)**

## 🧪 Demo Simulation

You can safely test the bot in paper mode:

```bash
npm run test:paper
```

**Example output:**
```
📊 30 Trades | WinRate: 26.7% | PnL: -12.07% | MaxDrawdown: 16.29%
🤖 AI: RSI neutral, EMA crossing up, Confidence: 70%
```

**Extended Demo Output:**
```
📊 Paper Trading Simulation Results
=====================================
Strategy: ema_rsi
Total Trades: 30
Wins: 8
Losses: 22
Win Rate: 26.7%
Total PnL: -12.07%
Average Profit: -0.40%
Errors: 0
Average Confidence: 54.7%
Max Drawdown: 16.29%

📈 Recent Trades:
26. BUY - -0.62% (50% confidence)
27. BUY - -0.86% (50% confidence)
28. BUY - -1.84% (50% confidence)
29. SELL - +0.36% (50% confidence)
30. SELL - -0.67% (50% confidence)
```

## ⚙️ Quick Start

**Environment Variables (.env):**
```env
# Exchange API Credentials
EXCHANGE_API_KEY=your_api_key
EXCHANGE_API_SECRET=your_secret

# Telegram Bot
TG_BOT_TOKEN=your_telegram_token
TG_ADMIN_ID=your_telegram_user_id

# Database
DB_HOST=localhost
DB_USER=trader
DB_PASS=strongpassword
DB_NAME=universal_ai_trader

# System Configuration
NODE_ENV=production
LOG_LEVEL=info
PAPER_MODE=false
```

**Note:** All trading settings (exchange, symbol, amounts, limits) are managed dynamically via MySQL database and Telegram `/set` commands. No need to restart the bot for configuration changes.

**🔒 Security:** API keys and secrets are never logged. Winston logger automatically filters sensitive data.

**📖 For detailed setup instructions, see [INSTALLATION.md](INSTALLATION.md)**

## 🎮 Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Show system status and balance |
| `/pause` | Stop trading loop |
| `/resume` | Resume trading |
| `/stats` | Display last 10 trades (PnL, winrate) |
| `/config` | Show current configuration |
| `/set key value` | Change config dynamically |
| `/exchange binance` | Switch exchange |
| `/restart` | PM2 restart command trigger |
| `/health` | Show bot uptime, API latency, DB status |
| `/ai` | Explain next trade reasoning |
| `/logs` | Recent log summary |
| `/export` | Download last 50 trades as CSV |

## 🚀 Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode (PM2)
```bash
npm run pm2:start
```

### View Logs
```bash
npm run pm2:logs
```

## 🧪 Testing

Run the complete test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

### Paper Trading Simulation
Test the AI strategies with simulated trading:
```bash
npm run simulate
```

**Example Output:**
```
📊 Paper Trading Simulation Results
=====================================
Strategy: ema_rsi
Total Trades: 10
Wins: 7
Losses: 3
Win Rate: 70.0%
Total PnL: +12.5%
Average Profit: +1.25%
Errors: 0

📈 Recent Trades:
6. BUY - +2.1% (85% confidence)
7. SELL - -1.2% (72% confidence)
8. BUY - +3.4% (91% confidence)
9. BUY - +1.8% (78% confidence)
10. SELL - +2.3% (83% confidence)
```

### Database Initialization
Initialize the database schema:
```bash
npm run db:init
```

**Example Output:**
```
[INFO] Initializing database...
[INFO] Database connection established successfully
[INFO] Database schema initialized successfully
[INFO] Database initialization completed successfully
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  setting_key VARCHAR(50) NOT NULL,
  setting_value TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Trades Table
```sql
CREATE TABLE trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side ENUM('buy', 'sell') NOT NULL,
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  profit DECIMAL(20,8),
  confidence DECIMAL(5,2),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔧 Configuration

All runtime settings are stored in MySQL and can be modified via Telegram commands:

- `strategy`: Trading strategy (ema_rsi, macd_cross, etc.)
- `trade_mode`: long, short, or both
- `max_daily_loss`: Maximum daily loss limit
- `trade_amount`: Amount per trade
- `stop_loss`: Stop loss percentage
- `take_profit`: Take profit percentage

## 📈 AI Decision Engine

The AI engine analyzes multiple technical indicators:

- **EMA (Exponential Moving Average)**: Trend direction
- **RSI (Relative Strength Index)**: Overbought/oversold conditions
- **MACD**: Momentum and trend changes

Each trade includes AI reasoning with confidence percentage.

## 🛡️ Risk Management

- **Stop Loss**: Automatic loss cutting
- **Take Profit**: Profit target execution
- **Daily Loss Limit**: Prevents excessive losses
- **Position Sizing**: Configurable trade amounts
- **Paper Trading**: Safe testing mode

## 📱 Notifications

The bot sends automatic notifications for:
- ✅ Health checks (every 30 minutes)
- 💰 New trade executions
- 💵 Trade closures
- ⚠️ Error warnings
- 📈 Daily summaries

## 🏗️ Architecture

```
src/
├── core/
│   ├── trader.js          # Main trading loop
│   └── scheduler.js       # Health check scheduler
├── exchanges/
│   ├── base.js           # Base exchange adapter
│   ├── binance.js        # Binance implementation
│   ├── kraken.js         # Kraken implementation
│   └── bybit.js          # Bybit implementation
├── ai/
│   ├── engine.js         # AI decision engine
│   └── indicators.js     # Technical indicators
├── telegram/
│   ├── bot.js            # Telegram bot setup
│   └── commands.js       # Command handlers
├── database/
│   ├── connection.js     # MySQL connection
│   └── models.js         # Database models
├── config/
│   └── settings.js       # Configuration management
└── utils/
    ├── logger.js         # Winston logging
    └── helpers.js        # Utility functions
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## ⚠️ Disclaimer

This software is for educational purposes only. Trading cryptocurrencies involves substantial risk of loss. The authors are not responsible for any financial losses incurred through the use of this software.

## 📞 Support

For support and questions, please open an issue on GitHub or contact the development team.
