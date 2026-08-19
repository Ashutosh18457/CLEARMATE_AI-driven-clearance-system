const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const Batch = require('../models/Batch');

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Kabir', 'Ananya', 'Diya', 'Aadhya', 'Pari', 'Saanvi',
  'Anushka', 'Navya', 'Avani', 'Myra', 'Ira', 'Riya', 'Kavya', 'Sneha', 'Tanvi', 'Ishita',
  'Rohan', 'Vikram', 'Sameer', 'Pooja', 'Neha', 'Rahul', 'Varun', 'Karan', 'Meera', 'Shruti'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Joshi', 'Mehta', 'Shah', 'Iyer',
  'Nair', 'Reddy', 'Deshmukh', 'Kulkarni', 'Choudhury', 'Bose', 'Chatterjee', 'Mishra', 'Pandey', 'Saxena'
];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedStudentsForAllPrograms() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  const programs = await Program.find({}).sort({ code: 1 });
  console.log(`📋 Found ${programs.length} programs in total.`);

  let totalStudentsCreated = 0;
  let totalBatchesUpdated = 0;
  const programSummary = [];

  for (const program of programs) {
    const cleanCode = program.code.replace(/[^a-zA-Z0-9]/g, '');
    const semesters = await Semester.find({ programId: program._id }).sort({ semNumber: 1 });

    let programStudentCount = 0;

    for (const semester of semesters) {
      let batches = await Batch.find({ semesterId: semester._id });
      if (batches.length === 0) {
        // Create standard batches if none exist
        const b1 = await Batch.create({ semesterId: semester._id, name: 'Batch A1', studentIds: [] });
        const b2 = await Batch.create({ semesterId: semester._id, name: 'Batch A2', studentIds: [] });
        batches = [b1, b2];
      }

      // Generate 3 students per batch (6 students per semester)
      let semStudentIndex = 1;
      for (const batch of batches) {
        const studentsNeeded = 3;
        const currentBatchStudents = await User.countDocuments({ batchId: batch._id });

        const toCreate = Math.max(0, studentsNeeded - currentBatchStudents);

        for (let i = 0; i < toCreate; i++) {
          const fName = getRandomItem(FIRST_NAMES);
          const lName = getRandomItem(LAST_NAMES);
          const fullName = `${fName} ${lName}`;
          const padRoll = String(semStudentIndex).padStart(3, '0');
          const enrollmentNo = `EN26${cleanCode}S${semester.semNumber}${padRoll}`;
          const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${cleanCode.toLowerCase()}.s${semester.semNumber}.${padRoll}@sbjit.edu.in`;

          // Check if user already exists
          const existingUser = await User.findOne({
            $or: [{ email }, { enrollmentNo }]
          });

          if (!existingUser) {
            const student = await User.create({
              name: fullName,
              email,
              password: 'Password123!',
              role: 'student',
              programId: program._id,
              enrollmentNo,
              currentSemester: semester.semNumber,
              section: batch.name.includes('A2') || batch.name.includes('B') ? 'B' : 'A',
              batchId: batch._id,
              isActive: true,
            });

            if (!batch.studentIds.includes(student._id)) {
              batch.studentIds.push(student._id);
            }

            totalStudentsCreated++;
            programStudentCount++;
          }
          semStudentIndex++;
        }

        await batch.save();
        totalBatchesUpdated++;
      }
    }

    const totalStudentsInProg = await User.countDocuments({ role: 'student', programId: program._id });
    programSummary.push({
      program: `[${program.degree || 'Degree'}] ${program.code}`,
      name: program.name,
      semesters: semesters.length,
      newCreated: programStudentCount,
      totalStudents: totalStudentsInProg,
    });
  }

  console.log('\n======================================================');
  console.log('🎉 STUDENT SEEDING COMPLETED FOR ALL PROGRAMS!');
  console.log('======================================================');
  console.table(programSummary);
  console.log(`✨ Total new students added: ${totalStudentsCreated}`);
  console.log(`🔑 Default Password for all seeded students: Password123!`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seedStudentsForAllPrograms().catch((err) => {
  console.error('❌ Error seeding students:', err);
  process.exit(1);
});
