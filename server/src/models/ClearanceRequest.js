const mongoose = require('mongoose');

const clearanceRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'items_review', 'sections_review', 'ci_review', 'hod_review', 'completed', 'rejected'],
      default: 'initiated',
      index: true,
    },
    currentStage: {
      type: String,
      enum: ['items', 'sections', 'class_incharge', 'hod', 'completed'],
      default: 'items',
    },
    certificateUrl: {
      type: String, // URL to the generated PDF stored in cloud storage
    },
    sentToExamCell: {
      type: Boolean,
      default: false,
    },
    sentToExamCellAt: {
      type: Date,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A student can only have one active clearance request per semester
clearanceRequestSchema.index({ studentId: 1, semesterId: 1 }, { unique: true });

const ClearanceRequest = mongoose.model('ClearanceRequest', clearanceRequestSchema);

module.exports = ClearanceRequest;
