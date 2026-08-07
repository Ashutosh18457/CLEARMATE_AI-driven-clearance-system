const mongoose = require('mongoose');

const submissionItemSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester ID is required'],
      index: true,
    },
    clearanceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceItem',
      required: [true, 'Clearance Item ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Submission title is required'],
      trim: true,
      example: 'Assignment 1',
    },
    type: {
      type: String,
      enum: ['assignment', 'lab_record', 'project', 'presentation', 'other'],
      required: [true, 'Submission type is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      index: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const SubmissionItem = mongoose.model('SubmissionItem', submissionItemSchema);

module.exports = SubmissionItem;
