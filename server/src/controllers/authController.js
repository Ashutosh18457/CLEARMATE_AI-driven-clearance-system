import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { success, created } from '../utils/response.js';
import env from '../config/env.js';

const signToken = (id) => {
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

export const register = async (req, res) => {
  const { name, email, password, role = 'student', enrollmentNo, programId, currentSemester, section, sectionType } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw AppError.badRequest('An account with this email already exists');
  }

  const userData = {
    name,
    email,
    password,
    role,
  };

  if (enrollmentNo) userData.enrollmentNo = enrollmentNo;
  if (programId) userData.programId = programId;
  if (currentSemester) userData.currentSemester = currentSemester;
  if (section) userData.section = section;
  if (sectionType) userData.sectionType = sectionType;

  const user = await User.create(userData);
  const token = signToken(user._id);

  const userObj = user.toObject();
  delete userObj.password;

  return created(res, 'User registered successfully', { token, user: userObj });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw AppError.unauthorized('Your account has been deactivated');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const token = signToken(user._id);

  const userObj = user.toObject();
  delete userObj.password;

  return success(res, 'Login successful', { token, user: userObj });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('programId', 'name code');
  return success(res, 'User profile retrieved', { user });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw AppError.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return success(res, 'Password changed successfully');
};
