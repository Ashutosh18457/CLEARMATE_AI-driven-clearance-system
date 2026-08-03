import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

batchSchema.index({ semesterId: 1, name: 1 }, { unique: true });

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
