import mongoose from 'mongoose';

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
      maxlength: [100, 'Program name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Program = mongoose.model('Program', programSchema);

export default Program;
