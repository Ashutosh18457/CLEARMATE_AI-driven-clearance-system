const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
      example: 'Batch A',
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure batch names are unique per semester
batchSchema.index({ semesterId: 1, name: 1 }, { unique: true });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
