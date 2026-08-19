const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('./logger');

// Set reliable public DNS servers to resolve MongoDB Atlas SRV records (_mongodb._tcp...)
// when local router/ISP DNS blocks or refuses SRV queries (ECONNREFUSED querySrv).
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Fallback gracefully if setServers is not supported in environment
}

const autoSeed = async () => {
  try {
    const User = require('../models/User');
    const Program = require('../models/Program');
    const Semester = require('../models/Semester');

    let program = await Program.findOne({ code: 'CSE' });
    if (!program) {
      program = await Program.create({
        name: 'B.Tech Computer Science & Engineering',
        code: 'CSE',
        department: 'Emerging Technologies',
      });
    }

    let semester = await Semester.findOne({ programId: program._id, semNumber: 6 });
    if (!semester) {
      semester = await Semester.create({
        programId: program._id,
        name: 'Sem 6 CSE (AI&ML)',
        semNumber: 6,
        academicYear: '2024-25',
        type: 'EVEN',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-05-31'),
        clearanceDeadline: new Date('2025-05-20'),
      });
    }

    const demoUsers = [
      { name: 'Admin User', email: 'admin@sbjit.edu.in', password: 'Password123!', role: 'admin' },
      { name: 'Prof. Sharma', email: 'teacher@sbjit.edu.in', password: 'Password123!', role: 'teacher' },
      {
        name: 'Rahul Verma',
        email: 'student@sbjit.edu.in',
        password: 'Password123!',
        role: 'student',
        programId: program._id,
        enrollmentNo: 'EN2021CSE042',
        currentSemester: 6,
        section: 'A',
      },
      { name: 'Library Head', email: 'library@sbjit.edu.in', password: 'Password123!', role: 'section_head', sectionType: 'library' },
      { name: 'Account Section Admin', email: 'accounts@sbjit.edu.in', password: 'Password123!', role: 'account_section' },
      { name: 'Bus Section Admin', email: 'bus@sbjit.edu.in', password: 'Password123!', role: 'bus_section' },
      { name: 'Class Incharge (Sec A)', email: 'ci@sbjit.edu.in', password: 'Password123!', role: 'class_incharge' },
      { name: 'Dr. Kulkarni (HOD)', email: 'hod@sbjit.edu.in', password: 'Password123!', role: 'hod' },
      // Also seed @sbjain.edu.in accounts for backwards compatibility
      { name: 'Admin User (Legacy)', email: 'admin@sbjain.edu.in', password: 'Password123!', role: 'admin' },
      { name: 'Prof. Sharma (Legacy)', email: 'teacher@sbjain.edu.in', password: 'Password123!', role: 'teacher' },
      {
        name: 'Rahul Verma (Legacy)',
        email: 'student@sbjain.edu.in',
        password: 'Password123!',
        role: 'student',
        programId: program._id,
        enrollmentNo: 'EN2021CSE043',
        currentSemester: 6,
        section: 'A',
      },
      { name: 'Library Head (Legacy)', email: 'library@sbjain.edu.in', password: 'Password123!', role: 'section_head', sectionType: 'library' },
      { name: 'Account Section Admin (Legacy)', email: 'accounts@sbjain.edu.in', password: 'Password123!', role: 'account_section' },
      { name: 'Bus Section Admin (Legacy)', email: 'bus@sbjain.edu.in', password: 'Password123!', role: 'bus_section' },
      { name: 'Class Incharge (Legacy)', email: 'ci@sbjain.edu.in', password: 'Password123!', role: 'class_incharge' },
      { name: 'Dr. Kulkarni (Legacy HOD)', email: 'hod@sbjain.edu.in', password: 'Password123!', role: 'hod' },
    ];

    let seededCount = 0;
    for (const u of demoUsers) {
      const query = u.enrollmentNo ? { $or: [{ email: u.email }, { enrollmentNo: u.enrollmentNo }] } : { email: u.email };
      const existing = await User.findOne(query);
      if (!existing) {
        await User.create(u);
        seededCount++;
      } else if (existing.role !== u.role) {
        existing.role = u.role;
        await existing.save();
      }
    }

    // Ensure ClearanceItems are assigned to Prof. Sharma (teacher@sbjit.edu.in)
    const ClearanceItem = require('../models/ClearanceItem');
    const teacherUser = await User.findOne({ email: 'teacher@sbjit.edu.in' });
    const legacyTeacher = await User.findOne({ email: 'teacher@sbjain.edu.in' });

    if (teacherUser) {
      // 1. Reassign legacy or unassigned clearance items to teacherUser
      const queryOr = [{ theoryTeacherId: null }];
      if (legacyTeacher) queryOr.push({ theoryTeacherId: legacyTeacher._id });

      await ClearanceItem.updateMany(
        { type: 'theory', $or: queryOr },
        { $set: { theoryTeacherId: teacherUser._id } }
      );

      // 2. Ensure DSA item exists and is assigned to Prof. Sharma
      let dsaItem = await ClearanceItem.findOne({ title: 'DSA' });
      if (!dsaItem) {
        await ClearanceItem.create({
          semesterId: semester._id,
          title: 'DSA',
          type: 'theory',
          subjectCode: 'CSE601',
          srNo: 1,
          theoryTeacherId: teacherUser._id,
        });
        logger.info('🎉 Auto-seeded clearance item "DSA" assigned to Prof. Sharma (teacher@sbjit.edu.in)');
      } else if (!dsaItem.theoryTeacherId || dsaItem.theoryTeacherId.toString() !== teacherUser._id.toString()) {
        dsaItem.theoryTeacherId = teacherUser._id;
        await dsaItem.save();
        logger.info('🎉 Updated clearance item "DSA" assignment to Prof. Sharma (teacher@sbjit.edu.in)');
      }
    }

    if (seededCount > 0) {
      logger.info(`🎉 Auto-seeded ${seededCount} missing demo account(s). Password for all demo accounts: Password123!`);
    }
  } catch (err) {
    logger.error('Auto-seed error:', { error: err.message });
  }
};

const startMemoryServer = async () => {
  logger.info('🚀 Launching Zero-Setup In-Memory Local MongoDB...');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const memoryUri = mongod.getUri();
  await mongoose.connect(memoryUri);
  logger.info(`✅ In-Memory MongoDB connected: ${memoryUri}`);
  await autoSeed();
};

const connectDB = async (uri) => {
  if (process.env.USE_MEMORY_DB === 'true' || uri === 'inmemory') {
    await startMemoryServer();
    return;
  }

  const isInvalidScheme = !uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'));
  if (isInvalidScheme || uri.includes('placeholder') || uri.includes('your_mongodb_connection_string')) {
    logger.warn('⚠️ MONGODB_URI in server/.env is missing or invalid. Falling back to zero-setup In-Memory Local MongoDB...');
    await startMemoryServer();
    return;
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    await autoSeed();
  } catch (error) {
    logger.warn(`⚠️ MongoDB Atlas connection failed: ${error.message}. Automatically falling back to zero-setup In-Memory Local MongoDB...`);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    await startMemoryServer();
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

module.exports = connectDB;
