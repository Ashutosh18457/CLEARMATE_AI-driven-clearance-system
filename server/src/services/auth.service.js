const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

const authService = {
  /**
   * Authenticates a user and generates a JWT.
   */
  async login(email, password, ip, userAgent) {
    // 1. Find user by email and explicitly select the password field
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
    
    // Using generic error messages for both cases to prevent user enumeration
    if (!user) {
      const AuditLog = require('../models/AuditLog');
      new AuditLog({ action: 'login_failed', resource: 'Auth', ip, userAgent }).save().catch(()=>{});
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated. Please contact administration.');
    }

    if (user.isLocked && user.isLocked()) {
      const AuditLog = require('../models/AuditLog');
      new AuditLog({ userId: user._id, action: 'login_locked', resource: 'Auth', ip, userAgent }).save().catch(()=>{});
      throw AppError.forbidden(`Account locked. Try again after ${Math.ceil((user.lockUntil - Date.now())/60000)} minutes`);
    }

    // 2. Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (user.loginAttempts !== undefined) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = Date.now() + 30 * 60 * 1000;
        }
        await user.save({ validateBeforeSave: false });
      }
      const AuditLog = require('../models/AuditLog');
      new AuditLog({ userId: user._id, action: 'login_failed', resource: 'Auth', ip, userAgent }).save().catch(()=>{});
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.loginAttempts !== undefined) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    const AuditLog = require('../models/AuditLog');
    new AuditLog({ userId: user._id, action: 'login_success', resource: 'Auth', ip, userAgent }).save().catch(()=>{});

    // 3. Generate Token
    const token = generateToken(user._id, user.role);

    // 4. Remove password from the returned object
    user.password = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;

    return { user, token };
  },

  /**
   * Fetches the current user's profile data.
   */
  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    
    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated');
    }

    return user;
  },
};

module.exports = authService;
