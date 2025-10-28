# Docker Configuration

## Dockerfile
```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S trader -u 1001

# Change ownership
RUN chown -R trader:nodejs /app
USER trader

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
```

## docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=trader
      - DB_PASS=strongpassword
      - DB_NAME=universal_ai_trader
    depends_on:
      - mysql
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=universal_ai_trader
      - MYSQL_USER=trader
      - MYSQL_PASSWORD=strongpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

volumes:
  mysql_data:
```

## Docker Commands

### Build and run with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Manual Docker commands
```bash
# Build image
docker build -t universal-ai-trader .

# Run container
docker run -d \
  --name ai-trader \
  -p 3000:3000 \
  -e DB_HOST=your_db_host \
  -e DB_USER=trader \
  -e DB_PASS=your_password \
  -e TG_BOT_TOKEN=your_token \
  universal-ai-trader

# View logs
docker logs -f ai-trader

# Stop container
docker stop ai-trader
docker rm ai-trader
```

## Environment Variables for Docker

Create a `.env` file in your project root:
```env
# Database
DB_HOST=mysql
DB_USER=trader
DB_PASS=strongpassword
DB_NAME=universal_ai_trader

# Telegram
TG_BOT_TOKEN=your_telegram_bot_token
TG_ADMIN_ID=your_telegram_user_id

# Exchange API
EXCHANGE_API_KEY=your_exchange_api_key
EXCHANGE_API_SECRET=your_exchange_api_secret

# Trading
DEFAULT_EXCHANGE=binance
DEFAULT_SYMBOL=BTC/USDT
DEFAULT_TRADE_AMOUNT=20
MAX_DAILY_LOSS=100
PAPER_TRADING=false
```

## Production Deployment

### Using Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml ai-trader

# Scale service
docker service scale ai-trader_app=2

# Remove stack
docker stack rm ai-trader
```

### Using Kubernetes
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: universal-ai-trader
spec:
  replicas: 2
  selector:
    matchLabels:
      app: universal-ai-trader
  template:
    metadata:
      labels:
        app: universal-ai-trader
    spec:
      containers:
      - name: app
        image: universal-ai-trader:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          value: "mysql-service"
        - name: TG_BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: telegram-secret
              key: bot-token
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Health Checks

The Docker container includes health checks to monitor the application status:

```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{.State.Health}}' container_name
```

## Monitoring

### Log Management
```bash
# View application logs
docker logs -f universal-ai-trader

# View logs with timestamps
docker logs -f -t universal-ai-trader

# Export logs
docker logs universal-ai-trader > app.log
```

### Resource Monitoring
```bash
# Monitor resource usage
docker stats universal-ai-trader

# Monitor specific metrics
docker exec universal-ai-trader ps aux
```
