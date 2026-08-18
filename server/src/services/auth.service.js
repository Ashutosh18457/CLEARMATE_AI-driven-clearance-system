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
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    // 1. Find user by email and explicitly select the password field
    const user = await User.findOne({ email: cleanEmail }).select('+password +loginAttempts +lockUntil');
    
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
   * Request password reset token via email.
   * Generates a secure random 32-byte token, hashes with SHA-256, sets 15m expiration, and sends email.
   */
  async forgotPassword(email, reqOrigin) {
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (!cleanEmail.endsWith('@sbjit.edu.in')) {
      throw AppError.badRequest('Only official college domain (@sbjit.edu.in) is allowed');
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Ambiguous message to prevent user enumeration
      return { message: 'If an account exists with this email, password reset instructions have been sent.' };
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated. Please contact administration.');
    }

    // 1. Generate unhashed token & save hashed token + 15m expiry in DB
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // 2. Build Reset URL
    const clientBaseUrl = process.env.CLIENT_URL || reqOrigin || 'http://localhost:5173';
    const resetUrl = `${clientBaseUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    // 3. Send Email
    try {
      const { sendPasswordResetEmail } = require('./email.service');
      await sendPasswordResetEmail({
        email: user.email,
        resetUrl,
        name: user.name,
      });

      const AuditLog = require('../models/AuditLog');
      new AuditLog({ userId: user._id, action: 'password_reset_requested', resource: 'Auth' }).save().catch(() => {});

      return {
        message: 'Password reset link has been dispatched to your email address.',
        resetToken, // Returned for dev testing ease
        resetUrl,
      };
    } catch (err) {
      // If email fails to send, clear reset token from DB
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      throw AppError.internal('Unable to send password reset email. Please try again later.');
    }
  },

  /**
   * Resets user password using secure token.
   * Verifies SHA-256 hashed token & 15-minute expiration timestamp.
   */
  async resetPassword(token, newPassword) {
    const crypto = require('crypto');

    // 1. Hash the incoming plain token using SHA-256
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Find user by hashed token and ensure token is not expired ($gt: Date.now())
    let user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    // Fallback: check if legacy JWT token was passed
    if (!user) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        if (decoded.type === 'password_reset') {
          user = await User.findById(decoded.id);
        }
      } catch (e) {
        // Not a valid JWT either
      }
    }

    if (!user || !user.isActive) {
      throw AppError.badRequest('Password reset token is invalid or has expired (15 minute limit)');
    }

    // 3. Set new password (bcrypt pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const AuditLog = require('../models/AuditLog');
    new AuditLog({ userId: user._id, action: 'password_reset_completed', resource: 'Auth' }).save().catch(() => {});

    return { message: 'Password has been successfully reset. You can now log in with your new password.' };
  },

  /**
   * Fetches the current user's profile data.
   */
  /**
   * Registers a new user.
   */
  async register(data, ip, userAgent) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw AppError.conflict(`User with email "${data.email}" already exists`);
    }

    const payload = { ...data };

    if (payload.role === 'student') {
      if (!payload.programId) {
        const Program = require('../models/Program');
        const prog = await Program.findOne();
        if (prog) payload.programId = prog._id;
      }
      if (!payload.enrollmentNo) {
        payload.enrollmentNo = 'EN' + Date.now().toString().slice(-6);
      }
      if (!payload.currentSemester) {
        payload.currentSemester = 6;
      }
      if (!payload.section) {
        payload.section = 'A';
      }
    }

    if (payload.role === 'section_head' && !payload.sectionType) {
      payload.sectionType = 'library';
    }

    const user = await User.create(payload);
    const AuditLog = require('../models/AuditLog');
    new AuditLog({ userId: user._id, action: 'register_success', resource: 'Auth', ip, userAgent }).save().catch(()=>{});

    const token = generateToken(user._id, user.role);
    user.password = undefined;

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
