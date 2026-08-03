import mongoose from 'mongoose';

const sectionClearanceSchema = new mongoose.Schema(
  {
    clearanceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceRequest',
      required: [true, 'Clearance request is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    department: {
      type: String,
      enum: {
        values: ['library', 'accounts', 'bus', 'student_section'],
        message: '{VALUE} is not a valid department',
      },
      required: [true, 'Department is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid section clearance status',
      },
      default: 'pending',
    },
    remarks: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

sectionClearanceSchema.index(
  { clearanceRequestId: 1, department: 1 },
  { unique: true }
);

const SectionClearance = mongoose.model(
  'SectionClearance',
  sectionClearanceSchema
);

export default SectionClearance;
