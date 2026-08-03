import mongoose from 'mongoose';

const clearanceRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: [
          'initiated',
          'items_review',
          'sections_review',
          'ci_review',
          'hod_review',
          'completed',
          'rejected',
        ],
        message: '{VALUE} is not a valid clearance request status',
      },
      default: 'initiated',
    },
    currentStage: {
      type: String,
      enum: {
        values: ['items', 'sections', 'class_incharge', 'hod', 'completed'],
        message: '{VALUE} is not a valid stage',
      },
      default: 'items',
    },
    certificateUrl: {
      type: String,
      trim: true,
    },
    sentToExamCell: {
      type: Boolean,
      default: false,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

clearanceRequestSchema.index(
  { studentId: 1, semesterId: 1 },
  { unique: true }
);

const ClearanceRequest = mongoose.model(
  'ClearanceRequest',
  clearanceRequestSchema
);

export default ClearanceRequest;
