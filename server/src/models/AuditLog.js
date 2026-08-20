const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    resource: { type: String },
    ip: { type: String },
    userAgent: { type: String },

    // Enhanced fields for richer audit trail
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    targetModel: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete audit logs after 1 year (365 days)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Compound index for querying by user + action
auditLogSchema.index({ userId: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
