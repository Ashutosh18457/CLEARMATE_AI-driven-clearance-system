const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || mongoUri.includes('placeholder')) {
      console.log('❌ Please set a valid MONGODB_URI in server/.env before seeding data.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing users
    await User.deleteMany({});
    console.log('🧹 Cleaned existing users...');

    // 1. Create Program & Semester
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

    // 2. Create Demo Accounts for all Roles
    const users = [
      {
        name: 'Super Admin',
        email: 'admin@sbjit.edu.in',
        password: 'Password123!',
        role: 'super_admin',
      },
      {
        name: 'Dept Admin (CSE)',
        email: 'deptadmin@sbjit.edu.in',
        password: 'Password123!',
        role: 'admin',
      },
      {
        name: 'Prof. Sharma (Teacher)',
        email: 'teacher@sbjit.edu.in',
        password: 'Password123!',
        role: 'teacher',
      },
      {
        name: 'Rahul Verma (Student)',
        email: 'student@sbjit.edu.in',
        password: 'Password123!',
        role: 'student',
        programId: program._id,
        enrollmentNo: 'EN2021CSE042',
        currentSemester: 6,
        section: 'A',
      },
      {
        name: 'Library Head',
        email: 'library@sbjit.edu.in',
        password: 'Password123!',
        role: 'section_head',
        sectionType: 'library',
      },
      {
        name: 'Class Incharge (Sec A)',
        email: 'ci@sbjit.edu.in',
        password: 'Password123!',
        role: 'class_incharge',
      },
      {
        name: 'Dr. Kulkarni (HOD)',
        email: 'hod@sbjit.edu.in',
        password: 'Password123!',
        role: 'hod',
      },
    ];

    for (const u of users) {
      await User.create(u);
      console.log(`👤 Created ${u.role.toUpperCase()} account: ${u.email}`);
    }

    console.log('\n🎉 Database Seeding Complete!');
    console.log('-------------------------------------------');
    console.log('Demo Login Credentials (Password for all: Password123!):');
    console.log('-------------------------------------------');
    console.log('👑 Super Admin:     admin@sbjit.edu.in');
    console.log('⚙️ Dept Admin:      deptadmin@sbjit.edu.in');
    console.log('🎓 Student:         student@sbjit.edu.in');
    console.log('👩‍🏫 Teacher:         teacher@sbjit.edu.in');
    console.log('📚 Section Head:    library@sbjit.edu.in');
    console.log('👔 Class Incharge:  ci@sbjit.edu.in');
    console.log('👨‍💼 HOD:             hod@sbjit.edu.in');
    console.log('-------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedDatabase();
