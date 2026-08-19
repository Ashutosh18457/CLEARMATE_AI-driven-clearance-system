const mongoose = require('mongoose');

const sectionClearanceSchema = new mongoose.Schema(
  {
    clearanceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceRequest',
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    reviewerId: {
      // The section head who reviewed it
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    department: {
      type: String, // library | accounts | bus | student_section
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },

    // ─── Fee Clearance Fields (Account Section) ───
    fees_status: {
      type: String,
      enum: ['paid', 'not_paid'],
      default: 'not_paid',
    },
    reason: {
      type: String,
      enum: ['fees_pending', 'remark'],
    },
    remark_text: {
      type: String,
      trim: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updated_at: {
      type: Date,
    },
    auditTrail: [
      {
        status: { type: String, enum: ['paid', 'not_paid'] },
        reason: { type: String, enum: ['fees_pending', 'remark'] },
        remark_text: { type: String, trim: true },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changed_by_name: { type: String },
        changed_at: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A student can only have one section clearance per department
sectionClearanceSchema.index({ studentId: 1, department: 1 }, { unique: true });

const SectionClearance = mongoose.model('SectionClearance', sectionClearanceSchema);

module.exports = SectionClearance;
