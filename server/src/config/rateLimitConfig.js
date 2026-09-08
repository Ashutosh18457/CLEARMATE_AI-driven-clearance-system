/**
 * Rate Limiting Configuration
 * Centralized, environment-driven configuration with robust fallback defaults.
 * Prevents application crashes if environment variables are missing or malformed.
 */

const parsePositiveInt = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parsePositiveFloat = (value, defaultValue) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const isDev = process.env.NODE_ENV !== 'production';

const rateLimitConfig = {
  // ─── TIER 1: AUTH ROUTES (Strict) ──────────────────────────────────
  auth: {
    // Window in milliseconds (Default: 15 minutes)
    windowMs: parsePositiveInt(process.env.AUTH_WINDOW_MS, 15 * 60 * 1000),
    // Maximum requests per IP in the window (Default: 10 in prod, 100 in dev)
    maxRequests: parsePositiveInt(
      process.env.AUTH_MAX_REQUESTS,
      isDev ? 100 : 10
    ),
    // Maximum requests per account (email/username) (Default: 5 in prod, 50 in dev)
    accountMaxRequests: parsePositiveInt(
      process.env.AUTH_ACCOUNT_MAX_REQUESTS,
      isDev ? 50 : 5
    ),
    // Exponential backoff configuration for failed attempts
    backoff: {
      baseDelayMs: parsePositiveInt(process.env.BACKOFF_BASE_DELAY_MS, 1000), // 1 second
      multiplier: parsePositiveFloat(process.env.BACKOFF_MULTIPLIER, 2),      // 2x per failed attempt
      maxBackoffTimeMs: parsePositiveInt(process.env.MAX_BACKOFF_TIME_MS, 60 * 1000), // 60 seconds
      windowMs: parsePositiveInt(process.env.BACKOFF_WINDOW_MS, 15 * 60 * 1000), // 15 minutes failure retention
    },
  },

  // ─── TIER 2: PUBLIC ROUTES (Moderate) ──────────────────────────────
  public: {
    // Window in milliseconds (Default: 15 minutes)
    windowMs: parsePositiveInt(process.env.PUBLIC_WINDOW_MS, 15 * 60 * 1000),
    // Maximum requests per IP in the window (Default: 100 in prod, 10000 in dev)
    maxRequests: parsePositiveInt(
      process.env.PUBLIC_MAX_REQUESTS,
      isDev ? 10000 : 100
    ),
  },

  // ─── TIER 3: AUTHENTICATED ROUTES (Relaxed) ────────────────────────
  authenticated: {
    // Window in milliseconds (Default: 15 minutes)
    windowMs: parsePositiveInt(process.env.AUTHENTICATED_WINDOW_MS, 15 * 60 * 1000),
    // Maximum requests per user in the window (Default: 1000 in prod, 50000 in dev)
    maxRequests: parsePositiveInt(
      process.env.AUTHENTICATED_MAX_REQUESTS,
      isDev ? 50000 : 1000
    ),
  },
};

module.exports = Object.freeze(rateLimitConfig);
