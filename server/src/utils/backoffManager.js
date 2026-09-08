/**
 * Exponential Backoff Manager
 * Tracks consecutive failed authentication attempts and applies exponential delays.
 * Features automatic garbage collection to prevent memory leaks in production.
 */

const config = require('../config/rateLimitConfig');

class BackoffManager {
  constructor(options = {}) {
    this.baseDelayMs = options.baseDelayMs || config.auth.backoff.baseDelayMs;
    this.multiplier = options.multiplier || config.auth.backoff.multiplier;
    this.maxBackoffTimeMs = options.maxBackoffTimeMs || config.auth.backoff.maxBackoffTimeMs;
    this.windowMs = options.windowMs || config.auth.backoff.windowMs;

    // In-memory record storage: key -> { failures, blockedUntil, lastAttempt }
    this.records = new Map();

    // Periodic cleanup every 5 minutes to remove stale records
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Prevent interval from keeping the Node.js process open in tests/shutdown
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Check if an identifier is currently blocked by exponential backoff.
   * @param {string} key
   * @returns {{ blocked: boolean, retryAfterMs: number, failures: number }}
   */
  check(key) {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record) {
      return { blocked: false, retryAfterMs: 0, failures: 0 };
    }

    // If the window has expired since last failure, reset
    if (now - record.lastAttempt > this.windowMs) {
      this.records.delete(key);
      return { blocked: false, retryAfterMs: 0, failures: 0 };
    }

    // Check if still within blocked window
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfterMs = record.blockedUntil - now;
      return {
        blocked: true,
        retryAfterMs,
        failures: record.failures,
      };
    }

    return {
      blocked: false,
      retryAfterMs: 0,
      failures: record.failures,
    };
  }

  /**
   * Record a failed attempt and compute the next backoff delay.
   * @param {string} key
   * @returns {number} Delay in milliseconds
   */
  recordFailure(key) {
    const now = Date.now();
    const record = this.records.get(key) || { failures: 0, blockedUntil: 0, lastAttempt: now };

    // Reset failure counter if outside retention window
    if (now - record.lastAttempt > this.windowMs) {
      record.failures = 0;
    }

    record.failures += 1;
    record.lastAttempt = now;

    // Calculate exponential delay: baseDelay * (multiplier ^ (failures - 1))
    const delay = Math.min(
      this.baseDelayMs * Math.pow(this.multiplier, Math.max(0, record.failures - 1)),
      this.maxBackoffTimeMs
    );

    record.blockedUntil = now + delay;
    this.records.set(key, record);

    return delay;
  }

  /**
   * Reset failed attempts upon a successful operation.
   * @param {string} key
   */
  reset(key) {
    this.records.delete(key);
  }

  /**
   * Garbage-collect records that have exceeded the retention window.
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now - record.lastAttempt > this.windowMs) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Destroy the manager and clear the interval (useful for clean teardown/tests).
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.records.clear();
  }
}

// Singleton instance using standard configuration
const defaultBackoffManager = new BackoffManager();

module.exports = {
  BackoffManager,
  backoffManager: defaultBackoffManager,
};
