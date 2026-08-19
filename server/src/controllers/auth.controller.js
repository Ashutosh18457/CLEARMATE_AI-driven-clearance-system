const authService = require('../services/auth.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const authController = {
  /**
   * @route POST /api/auth/login
   * @desc Authenticate user & get token
   * @access Public
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';
      const { user, token } = await authService.login(email, password, ip, userAgent);

      res.cookie('clearmate_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, {
        data: { user, token },
        message: 'Login successful',
      });
    } catch (error) {
      next(error); // Pass to centralized error handler
    }
  },

  /**
   * @route POST /api/auth/register
   * @desc Register a new user & get token
   * @access Public
   */
  async register(req, res, next) {
    try {
      const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';
      const { user, token } = await authService.register(req.body, ip, userAgent);

      res.cookie('clearmate_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendCreated(res, {
        data: { user, token },
        message: 'Registration successful',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/auth/forgot-password
   * @desc Request password reset token via email
   * @access Public
   */
  async forgotPassword(req, res, next) {
    try {
      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const result = await authService.forgotPassword(req.body.email, origin);
      sendSuccess(res, {
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/auth/reset-password
   * @route POST /api/auth/reset-password/:token
   * @desc Reset user password with token
   * @access Public
   */
  async resetPassword(req, res, next) {
    try {
      const token = req.params.token || req.body.token;
      const { password } = req.body;
      const result = await authService.resetPassword(token, password);
      sendSuccess(res, {
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/auth/logout
   * @desc Logout user & clear token
   * @access Public
   */
  async logout(req, res, next) {
    try {
      res.clearCookie('clearmate_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      sendSuccess(res, {
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/auth/me
   * @desc Get current logged in user
   * @access Private
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);

      sendSuccess(res, {
        data: { user },
        message: 'User profile retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  /**
   * @route PATCH /api/auth/change-password
   * @route PATCH /api/auth/me/password
   * @desc Change authenticated user's password
   * @access Private
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

      sendSuccess(res, {
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
