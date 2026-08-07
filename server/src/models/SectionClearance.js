const mongoose = require('mongoose');

const sectionClearanceSchema = new mongoose.Schema(
  {
    clearanceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceRequest',
      required: [true, 'Clearance Request ID is required'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A student can only have one section clearance per department per request
sectionClearanceSchema.index({ clearanceRequestId: 1, department: 1 }, { unique: true });

const SectionClearance = mongoose.model('SectionClearance', sectionClearanceSchema);

module.exports = SectionClearance;
