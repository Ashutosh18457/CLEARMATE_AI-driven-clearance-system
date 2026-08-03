import app from './src/app.js';
import connectDB from './src/config/db.js';
import env from './src/config/env.js';
import logger from './src/config/logger.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    shutdown('UNHANDLED_REJECTION');
  });
};

startServer();
