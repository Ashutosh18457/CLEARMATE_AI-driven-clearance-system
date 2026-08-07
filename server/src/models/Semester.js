const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
      example: 'Semester 5',
    },
    semNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: [1, 'Semester number must be at least 1'],
      max: [10, 'Semester number cannot exceed 10'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      example: '2024-25',
    },
    type: {
      type: String,
      enum: ['ODD', 'EVEN'],
      required: [true, 'Semester type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    clearanceDeadline: {
      type: Date,
      required: [true, 'Clearance deadline is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure uniqueness of semester number per program per academic year
semesterSchema.index({ programId: 1, semNumber: 1, academicYear: 1 }, { unique: true });

const Semester = mongoose.model('Semester', semesterSchema);

module.exports = Semester;
