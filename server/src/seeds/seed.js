/**
 * Seed script — creates the initial admin user and sample data.
 * Run with: npm run seed
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import Program from '../models/Program.js';
import Semester from '../models/Semester.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clearmate';

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // ── Admin User ──
    const existingAdmin = await User.findOne({ email: 'admin@clearmate.dev' });
    if (!existingAdmin) {
      await User.create({
        name: 'System Admin',
        email: 'admin@clearmate.dev',
        password: 'Admin@123',
        role: 'admin',
      });
      console.log('✓ Admin user created (admin@clearmate.dev / Admin@123)');
    } else {
      console.log('→ Admin user already exists');
    }

    // ── Sample Program ──
    let program = await Program.findOne({ code: 'AIML' });
    if (!program) {
      program = await Program.create({
        name: 'B.Tech AI & ML',
        code: 'AIML',
        department: 'Emerging Technologies',
      });
      console.log('✓ Sample program created (AIML)');
    } else {
      console.log('→ Program AIML already exists');
    }

    // ── Sample Semester ──
    const existingSem = await Semester.findOne({ programId: program._id, semNumber: 5 });
    if (!existingSem) {
      await Semester.create({
        programId: program._id,
        name: 'Semester 5',
        semNumber: 5,
        academicYear: '2025-26',
        type: 'ODD',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-12-15'),
        clearanceDeadline: new Date('2025-12-01'),
        isActive: true,
      });
      console.log('✓ Sample semester created (Semester 5, 2025-26)');
    } else {
      console.log('→ Semester already exists');
    }

    // ── Sample Teacher ──
    const existingTeacher = await User.findOne({ email: 'teacher@clearmate.dev' });
    if (!existingTeacher) {
      await User.create({
        name: 'Dr. Sample Teacher',
        email: 'teacher@clearmate.dev',
        password: 'Teacher@123',
        role: 'teacher',
      });
      console.log('✓ Sample teacher created (teacher@clearmate.dev / Teacher@123)');
    } else {
      console.log('→ Teacher user already exists');
    }

    // ── Sample Student ──
    const existingStudent = await User.findOne({ email: 'student@clearmate.dev' });
    if (!existingStudent) {
      await User.create({
        name: 'John Student',
        email: 'student@clearmate.dev',
        password: 'Student@123',
        role: 'student',
        enrollmentNo: 'EN2024001',
        programId: program._id,
        currentSemester: 5,
        section: 'A',
      });
      console.log('✓ Sample student created (student@clearmate.dev / Student@123)');
    } else {
      console.log('→ Student user already exists');
    }

    // ── Section Heads ──
    const sectionTypes = ['library', 'accounts', 'bus'];
    for (const type of sectionTypes) {
      const email = `${type}@clearmate.dev`;
      const existing = await User.findOne({ email });
      if (!existing) {
        await User.create({
          name: `${type.replace('_', ' ')} Head`.replace(/\b\w/g, (c) => c.toUpperCase()),
          email,
          password: 'Section@123',
          role: 'section_head',
          sectionType: type,
        });
        console.log(`✓ Section head created (${email} / Section@123)`);
      }
    }

    // ── Class Incharge ──
    const existingCI = await User.findOne({ email: 'ci@clearmate.dev' });
    if (!existingCI) {
      await User.create({
        name: 'Prof. Class Incharge',
        email: 'ci@clearmate.dev',
        password: 'CI@12345',
        role: 'class_incharge',
      });
      console.log('✓ Class incharge created (ci@clearmate.dev / CI@12345)');
    }

    // ── HOD ──
    const existingHOD = await User.findOne({ email: 'hod@clearmate.dev' });
    if (!existingHOD) {
      await User.create({
        name: 'Dr. Head of Department',
        email: 'hod@clearmate.dev',
        password: 'HOD@1234',
        role: 'hod',
      });
      console.log('✓ HOD created (hod@clearmate.dev / HOD@1234)');
    }

    console.log('\n✅ Seed complete!');
    console.log('\nTest credentials:');
    console.log('  Admin:      admin@clearmate.dev / Admin@123');
    console.log('  Teacher:    teacher@clearmate.dev / Teacher@123');
    console.log('  Student:    student@clearmate.dev / Student@123');
    console.log('  CI:         ci@clearmate.dev / CI@12345');
    console.log('  HOD:        hod@clearmate.dev / HOD@1234');
    console.log('  Library:    library@clearmate.dev / Section@123');
    console.log('  Accounts:   accounts@clearmate.dev / Section@123');
    console.log('  Bus:        bus@clearmate.dev / Section@123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
