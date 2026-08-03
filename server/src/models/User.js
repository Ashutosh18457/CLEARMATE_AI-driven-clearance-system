import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: [
          'student',
          'teacher',
          'section_head',
          'class_incharge',
          'hod',
          'admin',
        ],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Student-only fields ──
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },
    enrollmentNo: {
      type: String,
      trim: true,
    },
    currentSemester: {
      type: Number,
    },
    section: {
      type: String,
      trim: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    selectedElective: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // ── Section head field ──
    sectionType: {
      type: String,
      enum: {
        values: ['library', 'accounts', 'bus', 'student_section'],
        message: '{VALUE} is not a valid section type',
      },
      required: function () {
        return this.role === 'section_head';
      },
    },
  },
  { timestamps: true }
);

// ── Indexes ──
userSchema.index({ enrollmentNo: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, programId: 1, currentSemester: 1 });

// ── Pre-save: hash password ──
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: compare password ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
