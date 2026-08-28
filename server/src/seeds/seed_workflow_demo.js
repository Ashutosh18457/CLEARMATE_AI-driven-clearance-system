const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const Batch = require('../models/Batch');
const ClearanceItem = require('../models/ClearanceItem');
const SubmissionItem = require('../models/SubmissionItem');
const Submission = require('../models/Submission');
const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Task = require('../models/Task');

async function seedWorkflowDemo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for complete workflow seeding...');

    // 1. Clear existing transactional records
    await ClearanceRequest.deleteMany({});
    await ItemClearance.deleteMany({});
    await SectionClearance.deleteMany({});
    await Submission.deleteMany({});
    await SubmissionItem.deleteMany({});
    await ClearanceItem.deleteMany({});
    await Batch.deleteMany({});
    await Semester.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await Task.deleteMany({});
    await User.deleteMany({});
    await Program.deleteMany({});

    console.log('Cleaned up old records.');

    // 2. Create Program
    let program = await Program.findOne({ code: 'AIML' });
    if (!program) {
      program = await Program.create({
        name: 'B.Tech Emerging Technologies (AI & ML)',
        code: 'AIML',
        department: 'Emerging Technologies',
        degree: 'B.Tech',
        branch: 'AI & ML',
        totalSemesters: 8,
        isActive: true,
      });
    }
    console.log('Program ready:', program.name, '(' + program.code + ')');

    // 3. Create Semester
    const today = new Date();
    const futureEnd = new Date(today);
    futureEnd.setMonth(futureEnd.getMonth() + 4);
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 30);

    const semester = await Semester.create({
      programId: program._id,
      name: 'Semester 5 (2025-26 ODD)',
      semNumber: 5,
      academicYear: '2025-26',
      type: 'ODD',
      startDate: today,
      endDate: futureEnd,
      clearanceDeadline: deadline,
      isActive: true,
    });
    console.log('Semester created:', semester.name);

    // 4. Create Standard Users
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@sbjit.edu.in',
      password: 'Password123!',
      role: 'super_admin',
    });

    const deptAdmin = await User.create({
      name: 'Dept Admin (CSE/AI&ML)',
      email: 'deptadmin@sbjit.edu.in',
      password: 'Password123!',
      role: 'admin',
      assignedProgramId: program._id,
    });

    const teacher1 = await User.create({
      name: 'Prof. Sharma',
      email: 'teacher@sbjit.edu.in',
      password: 'Password123!',
      role: 'teacher',
    });

    const teacher2 = await User.create({
      name: 'Prof. Gupta',
      email: 'teacher2@sbjit.edu.in',
      password: 'Password123!',
      role: 'teacher',
    });

    const classIncharge = await User.create({
      name: 'Prof. Class Incharge',
      email: 'ci@sbjit.edu.in',
      password: 'Password123!',
      role: 'class_incharge',
      assignedProgramId: program._id,
      assignedSemester: 5,
      assignedSection: 'A',
    });

    const hod = await User.create({
      name: 'Dr. Kulkarni (HOD)',
      email: 'hod@sbjit.edu.in',
      password: 'Password123!',
      role: 'hod',
    });

    const accounts = await User.create({
      name: 'Account Section Admin',
      email: 'accounts@sbjit.edu.in',
      password: 'Password123!',
      role: 'account_section',
      sectionType: 'accounts',
    });

    const bus = await User.create({
      name: 'Bus Section Admin',
      email: 'bus@sbjit.edu.in',
      password: 'Password123!',
      role: 'bus_section',
      sectionType: 'bus',
    });

    const library = await User.create({
      name: 'Library Head',
      email: 'library@sbjit.edu.in',
      password: 'Password123!',
      role: 'library_section',
      sectionType: 'library',
    });

    // 5. Create Batch A
    const batchA = await Batch.create({
      semesterId: semester._id,
      name: 'Batch A',
      studentIds: [],
    });
    console.log('Batch created: Batch A');

    // 6. Create Student with Batch & Program assignment
    const student = await User.create({
      name: 'Rahul Verma',
      email: 'student@sbjit.edu.in',
      password: 'Password123!',
      role: 'student',
      enrollmentNo: 'EN823680',
      programId: program._id,
      currentSemester: 5,
      section: 'A',
      batchId: batchA._id,
    });
    console.log('Student created: Rahul Verma (EN823680)');

    // Add student to Batch A
    batchA.studentIds.push(student._id);
    await batchA.save();

    // 7. Create Clearance Items (Subjects)
    const tocItem = await ClearanceItem.create({
      semesterId: semester._id,
      srNo: 1,
      title: 'Theory of Computation',
      type: 'theory',
      subjectCode: 'CS501',
      theoryTeacherId: teacher1._id,
      isRequired: true,
    });

    const aiLabItem = await ClearanceItem.create({
      semesterId: semester._id,
      srNo: 2,
      title: 'Data Analytics & AI Lab',
      type: 'lab',
      subjectCode: 'CS502L',
      labBatchTeachers: [
        {
          batchId: batchA._id,
          teacherId: teacher2._id,
        },
      ],
      isRequired: true,
    });
    console.log('Clearance subjects configured: TOC (Prof. Sharma) & AI Lab (Prof. Gupta)');

    // 8. Create Submission Items (Coursework Tasks)
    const task1Deadline = new Date(today);
    task1Deadline.setDate(task1Deadline.getDate() + 7);

    const task2Deadline = new Date(today);
    task2Deadline.setDate(task2Deadline.getDate() + 10);

    const task1 = await SubmissionItem.create({
      semesterId: semester._id,
      clearanceItemId: tocItem._id,
      title: 'TOC Assignment 1 - Regular Expressions & Automata',
      type: 'assignment',
      description: 'Solve state transitions and draw DFA diagrams for given problem set 1.',
      deadline: task1Deadline,
      isRequired: true,
    });

    const task2 = await SubmissionItem.create({
      semesterId: semester._id,
      clearanceItemId: aiLabItem._id,
      title: 'AI Lab Practical Record 1 - Search Algorithms & Models',
      type: 'lab_record',
      description: 'Implement A* search and evaluate heuristic performance in Python notebook.',
      deadline: task2Deadline,
      isRequired: true,
    });
    console.log('Coursework tasks assigned: Task 1 (Assignment) & Task 2 (Lab Record)');

    console.log('\n======================================================');
    console.log('WORKFLOW DEMO DATA SEEDED & READY FOR END-TO-END TESTING!');
    console.log('======================================================');
    process.exit(0);
  } catch (error) {
    console.error('Seed workflow demo error:', error);
    process.exit(1);
  }
}

seedWorkflowDemo();
