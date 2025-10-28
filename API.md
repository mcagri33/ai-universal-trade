# Universal AI Trader - API Documentation

## Overview

The Universal AI Trader provides a comprehensive API for managing trading operations, configurations, and monitoring system health.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All API endpoints require authentication via Telegram user ID in the request headers:

```
X-User-ID: 123456789
```

## Endpoints

### System Health

#### GET /health
Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "database": {
    "connected": true,
    "latency": "5ms"
  },
  "exchange": {
    "name": "binance",
    "connected": true,
    "latency": "120ms"
  },
  "trading": {
    "active": true,
    "openPositions": 2
  }
}
```

### Configuration Management

#### GET /config
Get user configuration.

**Response:**
```json
{
  "strategy": "ema_rsi",
  "trade_mode": "long",
  "max_daily_loss": "100",
  "trade_amount": "20",
  "stop_loss": "2",
  "take_profit": "3",
  "symbol": "BTC/USDT",
  "paper_trading": "false",
  "ai_enabled": "true",
  "notifications": "true"
}
```

#### PUT /config
Update user configuration.

**Request Body:**
```json
{
  "strategy": "macd_cross",
  "trade_amount": "50"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully"
}
```

### Trading Operations

#### GET /trades
Get user trade history.

**Query Parameters:**
- `limit` (optional): Number of trades to return (default: 50)
- `status` (optional): Filter by status (open, closed, cancelled)

**Response:**
```json
{
  "trades": [
    {
      "id": 1,
      "symbol": "BTC/USDT",
      "side": "buy",
      "entry_price": 50000,
      "exit_price": 51500,
      "amount": 0.001,
      "profit": 3.0,
      "confidence": 85.5,
      "reason": "EMA crossover with RSI oversold",
      "status": "closed",
      "created_at": "2024-01-15T10:30:00Z",
      "closed_at": "2024-01-15T11:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

#### GET /trades/:id
Get specific trade details.

**Response:**
```json
{
  "id": 1,
  "symbol": "BTC/USDT",
  "side": "buy",
  "entry_price": 50000,
  "exit_price": 51500,
  "amount": 0.001,
  "profit": 3.0,
  "confidence": 85.5,
  "reason": "EMA crossover with RSI oversold",
  "status": "closed",
  "created_at": "2024-01-15T10:30:00Z",
  "closed_at": "2024-01-15T11:00:00Z"
}
```

#### GET /positions
Get open positions.

**Response:**
```json
{
  "positions": [
    {
      "id": 2,
      "symbol": "BTC/USDT",
      "side": "buy",
      "entry_price": 52000,
      "amount": 0.001,
      "stop_loss": 50960,
      "take_profit": 53560,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Trading Control

#### POST /trading/start
Start trading for user.

**Response:**
```json
{
  "success": true,
  "message": "Trading started successfully"
}
```

#### POST /trading/stop
Stop trading for user.

**Response:**
```json
{
  "success": true,
  "message": "Trading stopped successfully"
}
```

#### POST /trading/pause
Pause trading for user.

**Response:**
```json
{
  "success": true,
  "message": "Trading paused"
}
```

#### POST /trading/resume
Resume trading for user.

**Response:**
```json
{
  "success": true,
  "message": "Trading resumed"
}
```

### AI Analysis

#### GET /ai/analysis
Get AI analysis for current market conditions.

**Query Parameters:**
- `symbol` (optional): Trading symbol (default: BTC/USDT)
- `strategy` (optional): Analysis strategy (default: ema_rsi)

**Response:**
```json
{
  "symbol": "BTC/USDT",
  "strategy": "ema_rsi",
  "action": "buy",
  "confidence": 82.5,
  "reason": "EMA crossover with RSI oversold",
  "indicators": {
    "ema9": 50000,
    "ema21": 49900,
    "ema50": 49800,
    "rsi": 28.5,
    "price": 50000
  },
  "timestamp": "2024-01-15T12:30:00Z"
}
```

#### GET /ai/strategies
Get available AI strategies.

**Response:**
```json
{
  "strategies": [
    {
      "name": "ema_rsi",
      "description": "Combines Exponential Moving Averages with RSI",
      "parameters": ["ema9", "ema21", "ema50", "rsi"]
    },
    {
      "name": "macd_cross",
      "description": "Uses MACD crossover signals",
      "parameters": ["macd", "signal", "histogram"]
    },
    {
      "name": "rsi_only",
      "description": "Simple RSI-based strategy",
      "parameters": ["rsi"]
    }
  ]
}
```

### Exchange Management

#### GET /exchanges
Get available exchanges.

**Response:**
```json
{
  "exchanges": [
    {
      "name": "binance",
      "displayName": "Binance",
      "website": "https://binance.com",
      "supported": true,
      "features": ["spot", "futures", "margin"]
    },
    {
      "name": "kraken",
      "displayName": "Kraken",
      "website": "https://kraken.com",
      "supported": true,
      "features": ["spot", "futures"]
    },
    {
      "name": "bybit",
      "displayName": "Bybit",
      "website": "https://bybit.com",
      "supported": true,
      "features": ["spot", "futures", "options"]
    }
  ]
}
```

#### POST /exchanges/test
Test exchange connection.

**Request Body:**
```json
{
  "exchange": "binance",
  "api_key": "your_api_key",
  "api_secret": "your_api_secret"
}
```

**Response:**
```json
{
  "success": true,
  "exchange": "binance",
  "balance": 1,
  "healthy": true,
  "message": "Connection successful"
}
```

### Statistics

#### GET /stats
Get trading statistics.

**Query Parameters:**
- `period` (optional): Time period (day, week, month, all)

**Response:**
```json
{
  "period": "day",
  "totalTrades": 12,
  "winCount": 8,
  "lossCount": 4,
  "winRate": 66.7,
  "totalPnL": 15.5,
  "avgProfit": 1.29,
  "maxDrawdown": -5.2,
  "sharpeRatio": 1.8,
  "trades": [
    {
      "date": "2024-01-15",
      "trades": 12,
      "wins": 8,
      "losses": 4,
      "pnl": 15.5
    }
  ]
}
```

#### GET /stats/export
Export trading data.

**Query Parameters:**
- `format` (optional): Export format (csv, json)
- `limit` (optional): Number of records (default: 1000)

**Response:**
- CSV file download or JSON data

### Notifications

#### GET /notifications
Get notification settings.

**Response:**
```json
{
  "enabled": true,
  "tradeAlerts": true,
  "healthChecks": true,
  "dailySummary": true,
  "errorAlerts": true
}
```

#### PUT /notifications
Update notification settings.

**Request Body:**
```json
{
  "enabled": true,
  "tradeAlerts": true,
  "healthChecks": false,
  "dailySummary": true,
  "errorAlerts": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification settings updated"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": true,
  "code": "INVALID_REQUEST",
  "message": "Invalid request parameters",
  "details": {
    "field": "symbol",
    "reason": "Invalid symbol format"
  }
}
```

### Error Codes

- `INVALID_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `EXCHANGE_ERROR`: Exchange API error
- `DATABASE_ERROR`: Database operation failed
- `TRADING_DISABLED`: Trading is currently disabled
- `INSUFFICIENT_BALANCE`: Insufficient account balance
- `RATE_LIMIT`: API rate limit exceeded

## Rate Limiting

API requests are rate limited to prevent abuse:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## WebSocket API

### Connection
```
ws://localhost:3000/ws
```

### Authentication
Send authentication message after connection:
```json
{
  "type": "auth",
  "userId": 123456789
}
```

### Message Types

#### Trade Updates
```json
{
  "type": "trade",
  "data": {
    "id": 1,
    "symbol": "BTC/USDT",
    "side": "buy",
    "amount": 0.001,
    "price": 50000,
    "status": "filled"
  }
}
```

#### Price Updates
```json
{
  "type": "price",
  "data": {
    "symbol": "BTC/USDT",
    "price": 50000,
    "timestamp": "2024-01-15T12:30:00Z"
  }
}
```

#### System Status
```json
{
  "type": "status",
  "data": {
    "trading": true,
    "exchange": "binance",
    "uptime": 3600
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'X-User-ID': '123456789'
  }
});

// Get configuration
const config = await api.get('/config');

// Update configuration
await api.put('/config', {
  strategy: 'macd_cross',
  trade_amount: '50'
});

// Get trades
const trades = await api.get('/trades?limit=10');
```

### Python
```python
import requests

headers = {'X-User-ID': '123456789'}
base_url = 'http://localhost:3000/api'

# Get configuration
response = requests.get(f'{base_url}/config', headers=headers)
config = response.json()

# Update configuration
requests.put(f'{base_url}/config', 
             json={'strategy': 'macd_cross'}, 
             headers=headers)
```

### cURL Examples
```bash
# Get health status
curl -H "X-User-ID: 123456789" \
     http://localhost:3000/api/health

# Get trades
curl -H "X-User-ID: 123456789" \
     http://localhost:3000/api/trades

# Update configuration
curl -X PUT \
     -H "X-User-ID: 123456789" \
     -H "Content-Type: application/json" \
     -d '{"strategy": "macd_cross"}' \
     http://localhost:3000/api/config
```
