import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    submissionItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubmissionItem',
      required: [true, 'Submission item is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'submitted', 'verified', 'rejected'],
        message: '{VALUE} is not a valid submission status',
      },
      default: 'pending',
    },
    remarks: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

submissionSchema.index(
  { submissionItemId: 1, studentId: 1 },
  { unique: true }
);

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
