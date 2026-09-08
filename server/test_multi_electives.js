const mongoose = require('mongoose');
const env = require('./src/config/env');
const User = require('./src/models/User');
const Semester = require('./src/models/Semester');
const Program = require('./src/models/Program');
const ClearanceItem = require('./src/models/ClearanceItem');
const clearanceService = require('./src/services/clearance.service');

async function runTest() {
  console.log('🧪 Testing Multi-Program Elective Resolution System...');
  await mongoose.connect(env.mongoUri);

  // 1. Create test program & semester
  const program = await Program.findOneAndUpdate(
    { code: 'PE_TEST_PROG' },
    { name: 'Multi Elective Test Program', code: 'PE_TEST_PROG', degree: 'B.Tech', durationYears: 4, totalSemesters: 8 },
    { upsert: true, returnDocument: 'after' }
  );

  const semester = await Semester.findOneAndUpdate(
    { programId: program._id, semNumber: 6 },
    { programId: program._id, semNumber: 6, academicYear: '2025-2026', isActive: true },
    { upsert: true, returnDocument: 'after' }
  );

  // 2. Create teachers
  const teacherPE1A = await User.findOneAndUpdate(
    { email: 'teacher_pe1a@test.com' },
    { name: 'Prof. Cloud (PE-1A)', email: 'teacher_pe1a@test.com', password: 'Password123!', role: 'teacher' },
    { upsert: true, returnDocument: 'after' }
  );

  const teacherPE1B = await User.findOneAndUpdate(
    { email: 'teacher_pe1b@test.com' },
    { name: 'Prof. ML (PE-1B)', email: 'teacher_pe1b@test.com', password: 'Password123!', role: 'teacher' },
    { upsert: true, returnDocument: 'after' }
  );

  const teacherPE2A = await User.findOneAndUpdate(
    { email: 'teacher_pe2a@test.com' },
    { name: 'Prof. Cyber (PE-2A)', email: 'teacher_pe2a@test.com', password: 'Password123!', role: 'teacher' },
    { upsert: true, returnDocument: 'after' }
  );

  const teacherPE2B = await User.findOneAndUpdate(
    { email: 'teacher_pe2b@test.com' },
    { name: 'Prof. Analytics (PE-2B)', email: 'teacher_pe2b@test.com', password: 'Password123!', role: 'teacher' },
    { upsert: true, returnDocument: 'after' }
  );

  // 3. Create ClearanceItem 1: Program Elective 1 (PE-1)
  const pe1Item = await ClearanceItem.findOneAndUpdate(
    { semesterId: semester._id, title: 'Program Elective 1' },
    {
      semesterId: semester._id,
      srNo: 1,
      title: 'Program Elective 1',
      type: 'elective',
      electiveGroup: 'PE-1',
      subjectCode: 'CS601-PE1',
      electiveOptions: [
        { name: 'Cloud Computing (Sub 1)', teacherId: teacherPE1A._id },
        { name: 'Machine Learning (Sub 2)', teacherId: teacherPE1B._id },
      ],
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 4. Create ClearanceItem 2: Program Elective 2 (PE-2)
  const pe2Item = await ClearanceItem.findOneAndUpdate(
    { semesterId: semester._id, title: 'Program Elective 2' },
    {
      semesterId: semester._id,
      srNo: 2,
      title: 'Program Elective 2',
      type: 'elective',
      electiveGroup: 'PE-2',
      subjectCode: 'CS602-PE2',
      electiveOptions: [
        { name: 'Cyber Security (Sub 1)', teacherId: teacherPE2A._id },
        { name: 'Big Data Analytics (Sub 2)', teacherId: teacherPE2B._id },
      ],
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 5. Create Student who selects:
  //    - PE-1 -> Cloud Computing (teacherPE1A)
  //    - PE-2 -> Big Data Analytics (teacherPE2B)
  const pe1OptionId = pe1Item.electiveOptions[0]._id; // Cloud Computing
  const pe2OptionId = pe2Item.electiveOptions[1]._id; // Big Data Analytics

  const student = await User.findOneAndUpdate(
    { email: 'multielective_student@test.com' },
    {
      name: 'Multi-Elective Student',
      email: 'multielective_student@test.com',
      password: 'Password123!',
      role: 'student',
      programId: program._id,
      currentSemester: 6,
      section: 'A',
      selectedElectives: [pe1OptionId, pe2OptionId],
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 6. Resolve teachers
  const resolvedTeacher1 = clearanceService._resolveTeacher(pe1Item, student);
  const resolvedTeacher2 = clearanceService._resolveTeacher(pe2Item, student);

  console.log('Results:');
  console.log(`PE-1 Resolved Teacher ID: ${resolvedTeacher1} (Expected: ${teacherPE1A._id})`);
  console.log(`PE-2 Resolved Teacher ID: ${resolvedTeacher2} (Expected: ${teacherPE2B._id})`);

  const pass1 = resolvedTeacher1.toString() === teacherPE1A._id.toString();
  const pass2 = resolvedTeacher2.toString() === teacherPE2B._id.toString();

  if (pass1 && pass2) {
    console.log('✅ MULTI-ELECTIVE RESOLUTION TEST PASSED PERFECTLY!');
  } else {
    console.error('❌ MULTI-ELECTIVE RESOLUTION TEST FAILED!');
  }

  await mongoose.disconnect();
}

runTest();
