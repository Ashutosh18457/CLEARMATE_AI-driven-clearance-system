const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ROLES = ['student', 'teacher', 'section_head', 'class_incharge', 'hod', 'admin'];
const SECTION_TYPES = ['library', 'accounts', 'bus', 'student_section'];

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
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ROLES,
      required: [true, 'Role is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    
    // ----------------------------------------------------
    // STUDENT-SPECIFIC FIELDS
    // ----------------------------------------------------
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: function () { return this.role === 'student'; },
    },
    enrollmentNo: {
      type: String,
      required: function () { return this.role === 'student'; },
      sparse: true, // Only enforce uniqueness where it exists
      unique: true,
    },
    currentSemester: {
      type: Number,
      required: function () { return this.role === 'student'; },
    },
    section: {
      type: String,
      required: function () { return this.role === 'student'; },
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      // Optional initially, assigned by admin later
    },
    selectedElective: {
      type: mongoose.Schema.Types.ObjectId, // Will link to the sub-document ID in ClearanceItem
      // Optional, selected by student during semester
    },

    // ----------------------------------------------------
    // SECTION HEAD-SPECIFIC FIELDS
    // ----------------------------------------------------
    sectionType: {
      type: String,
      enum: SECTION_TYPES,
      required: function () { return this.role === 'section_head'; },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.statics.validatePasswordStrength = function (password) {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
};

userSchema.pre('validate', function() {
  if (this.isModified('password')) {
    if (!this.constructor.validatePasswordStrength(this.password)) {
      this.invalidate('password', 'Password must have min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character');
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password validity
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // 1. Generate 32-byte secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 2. Hash token using SHA-256 and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Set token expiration (15 minutes from now)
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  // 4. Return the unhashed token for email dispatch
  return resetToken;
};

// Compound index for querying students by program and semester
userSchema.index({ role: 1, programId: 1, currentSemester: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
