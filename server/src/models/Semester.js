import mongoose from 'mongoose';

const semesterSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
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
    },
    type: {
      type: String,
      enum: {
        values: ['ODD', 'EVEN'],
        message: '{VALUE} is not a valid semester type',
      },
      required: [true, 'Semester type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    clearanceDeadline: {
      type: Date,
      required: [true, 'Clearance deadline is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

semesterSchema.index(
  { programId: 1, semNumber: 1, academicYear: 1 },
  { unique: true }
);

const Semester = mongoose.model('Semester', semesterSchema);

export default Semester;
