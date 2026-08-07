const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const authController = {
  /**
   * @route POST /api/auth/login
   * @desc Authenticate user & get token
   * @access Public
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password, req.ip || req.connection.remoteAddress, req.headers['user-agent']);

      res.cookie('clearmate_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
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
   * @route POST /api/auth/logout
   * @desc Logout user & clear token
   * @access Public
   */
  async logout(req, res, next) {
    try {
      res.clearCookie('clearmate_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
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
  },
};

module.exports = authController;
