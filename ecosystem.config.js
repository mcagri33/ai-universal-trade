module.exports = {
  apps: [{
    name: "universal-ai-trader",
    script: "./src/core/trader.js",
    watch: false,
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
    },
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time: true,
    max_memory_restart: "512M",
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: "10s"
  }]
};
