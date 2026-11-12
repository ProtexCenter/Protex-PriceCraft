'use strict';

const http = require('http');
const app = require('./app');
const env = require('./src/config/env');

const server = http.createServer(app);

// Configure strict HTTP server timeouts to mitigate Slowloris attacks
server.headersTimeout = 30000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 5000;

if (require.main === module) {
  server.listen(env.port, env.host, () => {
    process.stdout.write(
      `[PriceCraf Backend] Running securely on http://${env.host}:${env.port} (env=${env.nodeEnv}, adapter=${env.dbAdapter})\n`
    );
  });
}

function gracefulShutdown(signal) {
  process.stdout.write(`[PriceCraf Backend] Received ${signal}. Closing server gracefully...\n`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;

