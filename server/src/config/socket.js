const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./env');
const logger = require('./logger');
const User = require('../models/User');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all local dev origins or null origin
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
    pingTimeout: 60000,
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        logger.debug('Socket connection attempted without token');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.id).select('_id name email role');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.debug('Socket auth error', { error: err.message });
      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const role = socket.user.role;

    // Join personal user room and role room
    socket.join(`user_${userId}`);
    socket.join(`role_${role}`);

    logger.info(`Socket client connected`, {
      socketId: socket.id,
      userId,
      role,
      name: socket.user.name,
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket client disconnected`, {
        socketId: socket.id,
        userId,
        reason,
      });
    });
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  if (!io) return;
  const uid = userId.toString();
  io.to(`user_${uid}`).emit(event, data);
  logger.debug(`Emitted socket event "${event}" to user_${uid}`, { event, userId: uid });
};

const emitToUsers = (userIds, event, data) => {
  if (!io || !Array.isArray(userIds)) return;
  userIds.forEach((uid) => {
    emitToUser(uid, event, data);
  });
};

const emitToRole = (role, event, data) => {
  if (!io) return;
  io.to(`role_${role}`).emit(event, data);
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToUsers,
  emitToRole,
};
