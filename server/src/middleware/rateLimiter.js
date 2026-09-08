/**
 * Modular Multi-Tier Rate Limiting Middleware
 *
 * Tiers:
 * 1. Auth Rate Limiter: Strict per-IP + per-Account + Exponential backoff on failed attempts
 * 2. Public Rate Limiter: Moderate rate limiting for public endpoints
 * 3. Authenticated Rate Limiter: Relaxed rate limiting for logged-in users
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/rateLimitConfig');
const { backoffManager } = require('../utils/backoffManager');

/**
 * Standard factory for rate limit response handler matching system API error envelope.
 */
const createLimitHandler = (defaultMessage) => {
  return (req, res, _next, options) => {
    const retryAfterSec = Math.ceil((options.windowMs || 60000) / 1000);
    res.setHeader('Retry-After', retryAfterSec);

    return res.status(429).json({
      success: false,
      message: options.message || defaultMessage,
      error: { code: 'RATE_LIMIT' },
    });
  };
};

/**
 * Safely extracts account identifier (email/username/regNo) from request body.
 */
const getAccountIdentifier = (req) => {
  if (!req.body || typeof req.body !== 'object') return null;
  const rawId = req.body.email || req.body.username || req.body.regNo || req.body.identifier;
  if (typeof rawId === 'string' && rawId.trim().length > 0) {
    return rawId.trim().toLowerCase();
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: AUTH RATE LIMITERS (STRICT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1A. Per-IP rate limiter for authentication routes
 */
const authIpLimiter = rateLimit({
  windowMs: config.auth.windowMs,
  max: config.auth.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts from this IP, please try again later',
  handler: createLimitHandler('Too many authentication attempts from this IP, please try again later'),
});

/**
 * 1B. Per-Account rate limiter for authentication routes
 */
const authAccountLimiter = rateLimit({
  windowMs: config.auth.windowMs,
  max: config.auth.accountMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const account = getAccountIdentifier(req);
    // Key by account identifier if present, otherwise fallback to IP
    return account ? `account:${account}` : `ip:${req.ip}`;
  },
  skip: (req) => !getAccountIdentifier(req), // Only apply if account is specified
  message: 'Too many attempts for this account, please try again later',
  handler: createLimitHandler('Too many attempts for this account, please try again later'),
});

/**
 * 1C. Exponential backoff middleware on failed attempts
 */
const authBackoffLimiter = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const account = getAccountIdentifier(req);
  const keys = [`ip:${ip}`];
  if (account) keys.push(`account:${account}`);

  // Check if any key (IP or Account) is currently in exponential backoff delay
  for (const key of keys) {
    const status = backoffManager.check(key);
    if (status.blocked) {
      const retryAfterSec = Math.max(1, Math.ceil(status.retryAfterMs / 1000));
      res.setHeader('Retry-After', retryAfterSec);

      return res.status(429).json({
        success: false,
        message: `Too many consecutive failed attempts. Please retry after ${retryAfterSec} seconds.`,
        error: { code: 'RATE_LIMIT' },
      });
    }
  }

  // Hook response finish to inspect outcome
  res.on('finish', () => {
    // 2xx/3xx -> Success: Reset failed attempt count
    if (res.statusCode >= 200 && res.statusCode < 400) {
      keys.forEach((key) => backoffManager.reset(key));
    }
    // 4xx -> Client Error / Failed Auth (e.g. 400, 401, 403, 422): Record failure and increment backoff
    else if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429) {
      keys.forEach((key) => backoffManager.recordFailure(key));
    }
  });

  next();
};

/**
 * Combined Auth Rate Limiter (IP Limit + Account Limit + Exponential Backoff)
 */
const authRateLimiter = [authIpLimiter, authAccountLimiter, authBackoffLimiter];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: PUBLIC ROUTES RATE LIMITER (MODERATE)
// ─────────────────────────────────────────────────────────────────────────────

const publicRateLimiter = rateLimit({
  windowMs: config.public.windowMs,
  max: config.public.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests to public endpoint, please try again later',
  handler: createLimitHandler('Too many requests, please try again later'),
});

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: AUTHENTICATED ROUTES RATE LIMITER (RELAXED)
// ─────────────────────────────────────────────────────────────────────────────

const authenticatedRateLimiter = rateLimit({
  windowMs: config.authenticated.windowMs,
  max: config.authenticated.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    // Key by authenticated user ID if available, otherwise IP
    return req.user?._id?.toString() || req.user?.id || req.ip;
  },
  message: 'Too many requests, please slow down',
  handler: createLimitHandler('Too many requests, please slow down'),
});

module.exports = {
  authRateLimiter,
  authIpLimiter,
  authAccountLimiter,
  authBackoffLimiter,
  publicRateLimiter,
  authenticatedRateLimiter,
};
