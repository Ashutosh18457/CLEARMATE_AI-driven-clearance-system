const mongoose = require('mongoose');
const logger = require('./logger');

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
      { name: 'Admin User', email: 'admin@sbjain.edu.in', password: 'Password123!', role: 'admin' },
      { name: 'Prof. Sharma', email: 'teacher@sbjain.edu.in', password: 'Password123!', role: 'teacher' },
      {
        name: 'Rahul Verma',
        email: 'student@sbjain.edu.in',
        password: 'Password123!',
        role: 'student',
        programId: program._id,
        enrollmentNo: 'EN2021CSE042',
        currentSemester: 6,
        section: 'A',
      },
      { name: 'Library Head', email: 'library@sbjain.edu.in', password: 'Password123!', role: 'section_head', sectionType: 'library' },
      { name: 'Class Incharge (Sec A)', email: 'ci@sbjain.edu.in', password: 'Password123!', role: 'class_incharge' },
      { name: 'Dr. Kulkarni (HOD)', email: 'hod@sbjain.edu.in', password: 'Password123!', role: 'hod' },
    ];

    let seededCount = 0;
    for (const u of demoUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create(u);
        seededCount++;
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
    logger.error('❌ MONGODB_URI in server/.env is missing or invalid. Expected a connection string starting with "mongodb://" or "mongodb+srv://".');
    throw new Error('Invalid or missing MONGODB_URI in server/.env');
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    await autoSeed();
  } catch (error) {
    logger.error(`❌ MongoDB Atlas connection failed: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    throw new Error(`MongoDB Atlas connection failed: ${error.message}`);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

module.exports = connectDB;
