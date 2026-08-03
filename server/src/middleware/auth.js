import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';

/**
 * protect — verifies JWT, loads user, attaches req.user.
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw AppError.unauthorized('Please log in to access this resource');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw AppError.unauthorized('User no longer exists');
    }
    if (!user.isActive) {
      throw AppError.unauthorized('Your account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token has expired'));
    }
    next(error);
  }
};

/**
 * restrictTo — checks req.user.role against allowed roles.
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};
