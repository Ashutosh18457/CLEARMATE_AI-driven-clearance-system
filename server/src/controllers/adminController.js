import Program from '../models/Program.js';
import Semester from '../models/Semester.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import ClearanceItem from '../models/ClearanceItem.js';
import AppError from '../utils/AppError.js';
import { success, created } from '../utils/response.js';

// ═══════════════ PROGRAMS ═══════════════
export const getPrograms = async (req, res) => {
  const programs = await Program.find().sort('name');
  return success(res, 'Programs retrieved', programs);
};

export const createProgram = async (req, res) => {
  const program = await Program.create(req.body);
  return created(res, 'Program created', program);
};

export const updateProgram = async (req, res) => {
  const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!program) throw AppError.notFound('Program not found');
  return success(res, 'Program updated', program);
};

// ═══════════════ SEMESTERS ═══════════════
export const getSemesters = async (req, res) => {
  const filter = {};
  if (req.query.programId) filter.programId = req.query.programId;
  const semesters = await Semester.find(filter).populate('programId', 'name code').sort('-academicYear semNumber');
  return success(res, 'Semesters retrieved', semesters);
};

export const createSemester = async (req, res) => {
  const semester = await Semester.create(req.body);
  return created(res, 'Semester created', semester);
};

export const updateSemester = async (req, res) => {
  const semester = await Semester.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!semester) throw AppError.notFound('Semester not found');
  return success(res, 'Semester updated', semester);
};

// ═══════════════ BATCHES ═══════════════
export const getBatches = async (req, res) => {
  const filter = {};
  if (req.query.semesterId) filter.semesterId = req.query.semesterId;
  const batches = await Batch.find(filter).populate('studentIds', 'name enrollmentNo email').sort('name');
  return success(res, 'Batches retrieved', batches);
};

export const createBatch = async (req, res) => {
  const batch = await Batch.create(req.body);
  return created(res, 'Batch created', batch);
};

export const assignStudents = async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(
    req.params.id,
    { studentIds: req.body.studentIds },
    { new: true, runValidators: true }
  ).populate('studentIds', 'name enrollmentNo email');
  if (!batch) throw AppError.notFound('Batch not found');
  return success(res, 'Students assigned to batch', batch);
};

// ═══════════════ USERS ═══════════════
export const getUsers = async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [users, total] = await Promise.all([
    User.find(filter).populate('programId', 'name code').skip(skip).limit(parseInt(limit, 10)).sort('-createdAt'),
    User.countDocuments(filter),
  ]);

  return success(res, 'Users retrieved', {
    users,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parseInt(limit, 10)),
  });
};

export const createUser = async (req, res) => {
  const user = await User.create(req.body);
  const userObj = user.toObject();
  delete userObj.password;
  return created(res, 'User created', userObj);
};

export const bulkCreateUsers = async (req, res) => {
  const { users } = req.body;
  const results = { created: 0, errors: [] };

  for (let i = 0; i < users.length; i++) {
    try {
      await User.create(users[i]);
      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 1, message: err.message });
    }
  }

  return success(res, `Bulk upload: ${results.created} created, ${results.errors.length} errors`, results);
};

export const updateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw AppError.notFound('User not found');
  return success(res, 'User updated', user);
};

export const deactivateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw AppError.notFound('User not found');
  return success(res, 'User deactivated', user);
};

// ═══════════════ CLEARANCE ITEMS ═══════════════
export const getClearanceItems = async (req, res) => {
  const filter = {};
  if (req.query.semesterId) filter.semesterId = req.query.semesterId;

  if (req.user.role === 'teacher') {
    console.log(`[DEBUG] Teacher ID: ${req.user._id}`);
    filter.$or = [
      { theoryTeacherId: req.user._id },
      { 'labBatchTeachers.teacherId': req.user._id },
      { 'electiveOptions.teacherId': req.user._id },
    ];
  }

  console.log(`[DEBUG] Database query:`, JSON.stringify(filter));

  const items = await ClearanceItem.find(filter)
    .populate('theoryTeacherId', 'name email')
    .populate('labBatchTeachers.batchId', 'name')
    .populate('labBatchTeachers.teacherId', 'name email')
    .populate('electiveOptions.teacherId', 'name email')
    .sort('srNo');

  console.log(`[DEBUG] Database results count: ${items.length}`);
  console.log(`[DEBUG] Database results:`, JSON.stringify(items, null, 2));

  console.log(`[DEBUG] API response sent`);
  return success(res, 'Clearance items retrieved', items);
};

export const createClearanceItem = async (req, res) => {
  const item = await ClearanceItem.create(req.body);
  return created(res, 'Clearance item created', item);
};

export const updateClearanceItem = async (req, res) => {
  const item = await ClearanceItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw AppError.notFound('Clearance item not found');
  return success(res, 'Clearance item updated', item);
};

export const deleteClearanceItem = async (req, res) => {
  const item = await ClearanceItem.findByIdAndDelete(req.params.id);
  if (!item) throw AppError.notFound('Clearance item not found');
  return success(res, 'Clearance item deleted');
};
