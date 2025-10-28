# Universal AI Trader - Installation Guide

## Prerequisites

- Node.js 16.0.0 or higher
- MySQL 8.0 or higher
- Telegram Bot Token
- Exchange API credentials (Binance, Kraken, or Bybit)

## Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd universal-ai-trader
npm install
```

### 2. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE universal_ai_trader;
CREATE USER 'trader'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON universal_ai_trader.* TO 'trader'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Initialize database schema
npm run db:init
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:
```env
# Exchange API Credentials
EXCHANGE_API_KEY=your_api_key_here
EXCHANGE_API_SECRET=your_api_secret_here

# Telegram Bot Configuration
TG_BOT_TOKEN=your_telegram_bot_token_here
TG_ADMIN_ID=your_telegram_user_id_here

# Database Configuration
DB_HOST=localhost
DB_USER=trader
DB_PASS=strongpassword
DB_NAME=universal_ai_trader
```

### 4. Test Installation
```bash
# Run tests
npm test

# Run paper trading simulation
npm run simulate
```

### 5. Start Trading Bot
```bash
# Development mode
npm run dev

# Production mode with PM2
npm run pm2:start
```

## Detailed Setup

### Exchange API Setup

#### Binance
1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create new API key
3. Enable "Enable Spot & Margin Trading"
4. Add your server IP to whitelist
5. Copy API Key and Secret to `.env`

#### Kraken
1. Go to [Kraken API Management](https://www.kraken.com/u/security/api)
2. Create new API key
3. Enable "Query Funds" and "Create & Modify Orders"
4. Copy API Key and Secret to `.env`

#### Bybit
1. Go to [Bybit API Management](https://www.bybit.com/app/user/api-management)
2. Create new API key
3. Enable "Trade" permissions
4. Copy API Key and Secret to `.env`

### Telegram Bot Setup

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Choose a name and username for your bot
4. Copy the bot token to `.env`
5. Get your Telegram user ID:
   - Message [@userinfobot](https://t.me/userinfobot)
   - Copy your user ID to `TG_ADMIN_ID` in `.env`

### Database Configuration

The bot uses MySQL for storing:
- User configurations
- Trade history
- Settings

Default database settings:
- Host: localhost
- Port: 3306
- Database: universal_ai_trader
- User: trader
- Password: strongpassword

### Trading Configuration

Default trading settings:
- Strategy: ema_rsi (EMA + RSI)
- Trade Mode: long (only buy signals)
- Trade Amount: $20 per trade
- Stop Loss: 2%
- Take Profit: 3%
- Max Daily Loss: $100
- Symbol: BTC/USDT

## Commands Reference

### Telegram Commands
- `/start` - Show system status
- `/pause` - Stop trading
- `/resume` - Resume trading
- `/stats` - Show trading statistics
- `/config` - Show current configuration
- `/set <key> <value>` - Change setting
- `/exchange <name>` - Switch exchange
- `/health` - System health check
- `/ai` - Get AI analysis
- `/export` - Download trade history

### NPM Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run simulate` - Run paper trading simulation
- `npm run db:init` - Initialize database
- `npm run pm2:start` - Start with PM2
- `npm run pm2:stop` - Stop PM2 process
- `npm run pm2:restart` - Restart PM2 process

## Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection
mysql -u trader -p universal_ai_trader
```

#### Telegram Bot Not Responding
1. Check bot token in `.env`
2. Verify bot is not blocked
3. Check admin user ID

#### Exchange API Errors
1. Verify API credentials
2. Check API permissions
3. Verify IP whitelist (if required)
4. Check API rate limits

#### Trading Not Starting
1. Check if trading is paused: `/resume`
2. Verify exchange connection: `/health`
3. Check daily loss limit
4. Verify sufficient balance

### Logs and Monitoring

#### View Logs
```bash
# PM2 logs
npm run pm2:logs

# Application logs
tail -f logs/combined.log

# Trading logs
tail -f logs/trading.log

# Error logs
tail -f logs/error.log
```

#### Health Monitoring
- Use `/health` command in Telegram
- Check PM2 status: `pm2 status`
- Monitor system resources: `htop`

### Performance Optimization

#### Server Requirements
- CPU: 2+ cores
- RAM: 2GB+ recommended
- Storage: 10GB+ for logs
- Network: Stable internet connection

#### Optimization Tips
1. Use SSD storage for database
2. Enable MySQL query cache
3. Monitor memory usage
4. Set up log rotation
5. Use PM2 cluster mode for high availability

## Security Best Practices

### API Security
1. Use strong API keys
2. Enable IP whitelisting
3. Rotate keys regularly
4. Monitor API usage

### Database Security
1. Use strong passwords
2. Limit database user permissions
3. Enable SSL connections
4. Regular backups

### Application Security
1. Keep dependencies updated
2. Use environment variables for secrets
3. Enable firewall
4. Monitor access logs

## Support

For support and questions:
1. Check the logs for error messages
2. Review this documentation
3. Test with paper trading mode first
4. Contact support with detailed error information

## License

This project is licensed under the MIT License. See LICENSE file for details.
