const app = require('../src/app');
const connectDB = require('../src/config/db');
const env = require('../src/config/env');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB(env.mongoUri);
    isConnected = true;
  }
  return app(req, res);
};
