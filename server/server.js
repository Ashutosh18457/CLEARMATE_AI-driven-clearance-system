const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/config/logger');

const startServer = async () => {
  await connectDB(env.mongoUri);

  app.listen(env.port, () => {
    logger.info(`ClearMate API server started`, {
      port: env.port,
      environment: env.nodeEnv,
      apiUrl: `http://localhost:${env.port}/api`,
      healthCheck: `http://localhost:${env.port}/api/health`,
    });
  });
};

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

startServer();
