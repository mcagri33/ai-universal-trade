# Universal AI Trader Pro - Installation Instructions

## 🚀 Quick Installation Guide

### Prerequisites
- Node.js 16+ installed
- MySQL 5.7+ server running
- Telegram Bot Token (from @BotFather)
- Exchange API credentials (Binance/Kraken/Bybit)

### Step 1: Download and Install
```bash
# Extract the downloaded ZIP file
cd universal-ai-trader-pro

# Install dependencies
npm install
```

### Step 2: Database Setup
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database and user
CREATE DATABASE universal_ai_trader;
CREATE USER 'trader'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON universal_ai_trader.* TO 'trader'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

**Required .env settings:**
```env
# Exchange API Credentials
EXCHANGE_API_KEY=your_api_key_here
EXCHANGE_API_SECRET=your_api_secret_here

# Telegram Bot
TG_BOT_TOKEN=your_telegram_bot_token
TG_ADMIN_ID=your_telegram_user_id

# Database
DB_HOST=localhost
DB_USER=trader
DB_PASS=your_strong_password
DB_NAME=universal_ai_trader

# System
NODE_ENV=production
LOG_LEVEL=info
PAPER_MODE=false
```

### Step 4: Initialize Database
```bash
npm run db:init
```

### Step 5: Test Installation
```bash
# Test paper trading simulation
npm run test:paper

# Run test suite
npm test
```

### Step 6: Start Production
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor logs
pm2 logs universal-ai-trader

# Check status
pm2 status
```

## 🎮 Telegram Bot Setup

### 1. Create Bot
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token to `.env` file

### 2. Get Your User ID
1. Message [@userinfobot](https://t.me/userinfobot)
2. Copy your user ID to `TG_ADMIN_ID` in `.env`

### 3. Test Bot Commands
Send these commands to your bot:
- `/start` - Initialize bot
- `/health` - Check system status
- `/config` - View current settings
- `/ai` - Get AI analysis

## 🏦 Exchange API Setup

### Binance
1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create API key with "Enable Spot & Margin Trading" permission
3. Add IP restrictions for security
4. Copy API key and secret to `.env`

### Kraken
1. Go to [Kraken API Settings](https://www.kraken.com/features/api)
2. Create API key with "Query Funds" and "Create & Modify Orders" permissions
3. Copy API key and secret to `.env`

### Bybit
1. Go to [Bybit API Management](https://www.bybit.com/app/user/api-management)
2. Create API key with "Read" and "Trade" permissions
3. Copy API key and secret to `.env`

## 🧪 Testing & Demo

### Paper Trading Simulation
```bash
npm run test:paper
```

**Expected Output:**
```
📊 30 Trades | WinRate: 26.7% | PnL: -12.07% | MaxDrawdown: 16.29%
🤖 AI: RSI neutral, EMA crossing up, Confidence: 70%
```

### Telegram Integration Test
```bash
npm run test:telegram
```

## ⚙️ Configuration

### Dynamic Settings via Telegram
All trading settings can be changed via Telegram commands:

```
/set strategy ema_rsi
/set trade_amount 50
/set max_daily_loss 200
/set exchange binance
/set symbol BTC/USDT
```

### Available Strategies
- `ema_rsi` - EMA + RSI combination
- `macd_cross` - MACD crossover signals
- `rsi_only` - RSI overbought/oversold

### Risk Management
- Stop Loss: Automatic loss protection
- Take Profit: Secure profit taking
- Daily Limits: Maximum daily loss protection
- Position Sizing: Configurable trade amounts

## 🔧 Troubleshooting

### Common Issues

**Database Connection Error:**
- Check MySQL server is running
- Verify database credentials in `.env`
- Ensure user has proper permissions

**Telegram Bot Not Responding:**
- Verify bot token is correct
- Check admin ID is properly set
- Ensure bot is not blocked

**Exchange API Errors:**
- Verify API keys are correct
- Check API permissions
- Ensure IP restrictions allow your server

**PM2 Issues:**
- Check PM2 is installed: `npm install -g pm2`
- View logs: `pm2 logs universal-ai-trader`
- Restart: `pm2 restart universal-ai-trader`

### Log Files
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Telegram logs: `logs/telegram.log`
- Paper trading: `logs/paper-simulation.log`

## 📞 Support

### Documentation
- README.md - Complete setup guide
- API.md - Technical documentation
- INSTALLATION.md - Detailed installation

### Testing
- Jest test suite included
- Paper trading simulation
- Telegram integration tests

### Security
- API keys never logged
- Secure database connections
- Environment-based configuration

## 🎯 Next Steps

1. **Test with Paper Trading**: Start with `PAPER_MODE=true`
2. **Configure Settings**: Use Telegram `/set` commands
3. **Monitor Performance**: Check logs and Telegram notifications
4. **Scale Up**: Increase trade amounts gradually
5. **Optimize**: Adjust strategies based on performance

## ⚠️ Important Notes

- **Start with Paper Trading**: Always test strategies first
- **Monitor Closely**: Watch logs and Telegram notifications
- **Set Limits**: Use stop-loss and daily limits
- **Backup Data**: Regular database backups recommended
- **Update Regularly**: Keep dependencies updated

---

**Ready to start automated trading? Your Universal AI Trader Pro is now configured and ready to use!**

For additional support, refer to the documentation files included in the package.
