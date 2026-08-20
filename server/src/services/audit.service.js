const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

/**
 * Central audit logging service.
 * Captures who did what, on which resource, with before/after values.
 *
 * @param {string} userId - The user who performed the action
 * @param {string} action - Action identifier (e.g., 'clearance.initiate', 'item.approve', 'item.reject')
 * @param {Object} options
 * @param {string} [options.resource] - Resource type description
 * @param {string} [options.targetId] - The ID of the affected document
 * @param {string} [options.targetModel] - The model name of the affected document
 * @param {Object} [options.details] - Additional context/metadata
 * @param {*} [options.oldValue] - Previous state (for tracking changes)
 * @param {*} [options.newValue] - New state (for tracking changes)
 * @param {Object} [options.req] - Express request object (for IP + userAgent)
 */
const logAction = async (userId, action, options = {}) => {
  try {
    const logEntry = {
      userId,
      action,
      resource: options.resource || '',
      targetId: options.targetId || null,
      targetModel: options.targetModel || '',
      details: options.details || null,
      oldValue: options.oldValue || null,
      newValue: options.newValue || null,
      ip: options.req?.ip || options.req?.socket?.remoteAddress || '',
      userAgent: options.req?.headers?.['user-agent'] || '',
    };

    // Fire-and-forget: don't await to avoid blocking the response
    AuditLog.create(logEntry).catch((err) =>
      logger.error('Audit log write failed', { action, userId, error: err.message })
    );
  } catch (err) {
    // Never let audit logging crash the main flow
    logger.error('Audit log service error', { action, userId, error: err.message });
  }
};

module.exports = { logAction };
