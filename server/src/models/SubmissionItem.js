import mongoose from 'mongoose';

const submissionItemSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Semester is required'],
      index: true,
    },
    clearanceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceItem',
      required: [true, 'Clearance item is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['assignment', 'lab_record', 'project', 'presentation', 'other'],
        message: '{VALUE} is not a valid submission type',
      },
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
  { timestamps: true }
);

const SubmissionItem = mongoose.model('SubmissionItem', submissionItemSchema);

export default SubmissionItem;
