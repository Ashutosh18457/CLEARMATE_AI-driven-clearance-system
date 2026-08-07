const AuditLog = require('../models/AuditLog');

const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    // Capture original end function to log after request completes (or we can just log before)
    // The requirement says: "Log: userId, action, resource, IP, timestamp, userAgent"
    // I will log it asynchronously here, without awaiting it so it doesn't block request
    try {
      const log = new AuditLog({
        userId: req.user ? req.user.id : null,
        action,
        resource,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      log.save().catch(console.error);
    } catch (e) {
      console.error('Audit log failed', e);
    }
    next();
  };
};

module.exports = auditLogger;
