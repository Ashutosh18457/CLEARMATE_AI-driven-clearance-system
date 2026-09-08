const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('./logger');

// Set reliable public DNS servers to resolve MongoDB Atlas SRV records (_mongodb._tcp...)
// when local router/ISP DNS blocks or refuses SRV queries (ECONNREFUSED querySrv).
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Fallback gracefully if setServers is not supported in environment
}

const connectDB = async (uri) => {
  if (process.env.USE_MEMORY_DB === 'true' || uri === 'inmemory') {
    await startMemoryServer();
    return;
  }

  const isInvalidScheme = !uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'));
  if (isInvalidScheme || uri.includes('placeholder') || uri.includes('your_mongodb_connection_string')) {
    logger.warn('⚠️ MONGODB_URI in server/.env is missing or invalid. Falling back to zero-setup In-Memory Local MongoDB...');
    await startMemoryServer();
    return;
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`⚠️ MongoDB Atlas connection failed: ${error.message}. Automatically falling back to zero-setup In-Memory Local MongoDB...`);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    await startMemoryServer();
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

module.exports = connectDB;
