/**
 * Rate Limiter Middleware (Disabled / Passthrough)
 */

const passThrough = (req, res, next) => next();

const authIpLimiter = passThrough;
const authAccountLimiter = passThrough;
const authBackoffLimiter = passThrough;
const authRateLimiter = passThrough;
const publicRateLimiter = passThrough;
const authenticatedRateLimiter = passThrough;

module.exports = {
  authRateLimiter,
  authIpLimiter,
  authAccountLimiter,
  authBackoffLimiter,
  publicRateLimiter,
  authenticatedRateLimiter,
};
