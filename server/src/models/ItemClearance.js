const mongoose = require('mongoose');

const itemClearanceSchema = new mongoose.Schema(
  {
    clearanceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceRequest',
      required: [true, 'Clearance Request ID is required'],
      index: true,
    },
    clearanceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceItem',
      required: [true, 'Clearance Item ID is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    teacherId: {
      // The resolved teacher responsible for THIS student's clearance
      // (Resolved based on Theory, Lab Batch, or Elective choice)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher ID is required'],
      index: true,
    },
    itemTitle: {
      type: String, // Denormalized for quick querying without populating
      required: true,
    },
    itemType: {
      type: String, // theory | lab | elective | special
      required: true,
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

// A student can only have one clearance state per item per request
itemClearanceSchema.index({ clearanceRequestId: 1, clearanceItemId: 1 }, { unique: true });

const ItemClearance = mongoose.model('ItemClearance', itemClearanceSchema);

module.exports = ItemClearance;
