const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Protect routes: verify JWT token and attach user to request.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.clearmate_token) {
      token = req.cookies.clearmate_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(AppError.unauthorized('Not authorized to access this route. Please log in.'));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, env.jwtSecret);
      
      // Ensure the user still exists (in case they were deleted after token generation)
      // Note: We only attach minimal data to req.user to avoid unnecessary DB hits 
      // if not required, but verifying existence is best practice.
      const currentUser = await User.findById(decoded.id).select('+isActive');
      
      if (!currentUser) {
        return next(AppError.unauthorized('The user belonging to this token no longer exists.'));
      }
      
      if (!currentUser.isActive) {
        return next(AppError.forbidden('Your account has been deactivated.'));
      }

      // Attach minimal user info to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();
    } catch (err) {
      // Caught by global error handler mapping (JsonWebTokenError, TokenExpiredError)
      return next(err);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict routes to specific roles.
 * Must be used AFTER protect middleware.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = { protect, restrictTo };
