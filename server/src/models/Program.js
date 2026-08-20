const mongoose = require('mongoose');

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
      trim: true,
      uppercase: true,
      maxlength: [20, 'Program code cannot exceed 20 characters'],
      index: true,
    },
    degree: {
      type: String,
      default: 'B.Tech',
      trim: true,
      index: true,
    },
    branch: {
      type: String,
      default: '',
      trim: true,
    },
    totalSemesters: {
      type: Number,
      default: 8,
      min: 1,
      max: 12,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    departmentAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    hodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
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

const Program = mongoose.model('Program', programSchema);

module.exports = Program;
