const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Program = require('../models/Program');
const Semester = require('../models/Semester');
const Batch = require('../models/Batch');

async function seedAllProgramsSemestersBatches() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Define Programs specification
  const programsDef = [
    // B.Tech (8 Semesters)
    { name: 'B.Tech Computer Science & Engineering', code: 'BTECH-CSE', degree: 'B.Tech', branch: 'Computer Science & Engineering', department: 'Computer Science', totalSemesters: 8 },
    { name: 'B.Tech Artificial Intelligence & Machine Learning', code: 'BTECH-AIML', degree: 'B.Tech', branch: 'Artificial Intelligence & Machine Learning', department: 'Emerging Technologies', totalSemesters: 8 },
    { name: 'B.Tech Data Science', code: 'BTECH-DS', degree: 'B.Tech', branch: 'Data Science', department: 'Emerging Technologies', totalSemesters: 8 },
    { name: 'B.Tech Electronics & Communication Engineering', code: 'BTECH-ECE', degree: 'B.Tech', branch: 'Electronics & Communication', department: 'Electronics', totalSemesters: 8 },
    { name: 'B.Tech Mechanical Engineering', code: 'BTECH-ME', degree: 'B.Tech', branch: 'Mechanical Engineering', department: 'Mechanical', totalSemesters: 8 },
    { name: 'B.Tech Civil Engineering', code: 'BTECH-CE', degree: 'B.Tech', branch: 'Civil Engineering', department: 'Civil', totalSemesters: 8 },

    // BCA (6 Semesters)
    { name: 'Bachelor of Computer Applications (BCA)', code: 'BCA', degree: 'BCA', branch: 'Computer Applications', department: 'Computer Applications', totalSemesters: 6 },

    // MCA (4 Semesters)
    { name: 'Master of Computer Applications (MCA)', code: 'MCA', degree: 'MCA', branch: 'Computer Applications', department: 'Computer Applications', totalSemesters: 4 },

    // M.Tech (4 Semesters)
    { name: 'M.Tech Computer Science & Engineering', code: 'MTECH-CSE', degree: 'M.Tech', branch: 'Computer Science & Engineering', department: 'Computer Science', totalSemesters: 4 },
    { name: 'M.Tech VLSI & Embedded Systems', code: 'MTECH-VLSI', degree: 'M.Tech', branch: 'VLSI & Embedded Systems', department: 'Electronics', totalSemesters: 4 },

    // MBA (4 Semesters)
    { name: 'MBA Finance Management', code: 'MBA-FIN', degree: 'MBA', branch: 'Finance', department: 'Management Studies', totalSemesters: 4 },
    { name: 'MBA Marketing & Human Resources', code: 'MBA-MKT', degree: 'MBA', branch: 'Marketing & HR', department: 'Management Studies', totalSemesters: 4 },
    { name: 'MBA Business Analytics', code: 'MBA-BA', degree: 'MBA', branch: 'Business Analytics', department: 'Management Studies', totalSemesters: 4 },
  ];

  const academicSession = '2026-27';
  let totalSemestersCreated = 0;
  let totalBatchesCreated = 0;

  for (const pDef of programsDef) {
    let program = await Program.findOne({ code: pDef.code });
    if (!program) {
      program = await Program.create(pDef);
      console.log(`✨ Created Program: [${pDef.degree}] ${pDef.name} (${pDef.code})`);
    } else {
      program.degree = pDef.degree;
      program.branch = pDef.branch;
      program.totalSemesters = pDef.totalSemesters;
      program.department = pDef.department;
      await program.save();
    }

    const numSemesters = pDef.totalSemesters;

    for (let sem = 1; sem <= numSemesters; sem++) {
      const isOdd = sem % 2 !== 0;
      const semType = isOdd ? 'ODD' : 'EVEN';

      // Date ranges: ODD = Jul to Dec 2026, EVEN = Jan to May 2027
      const startDate = isOdd ? new Date('2026-07-01') : new Date('2027-01-05');
      const endDate = isOdd ? new Date('2026-12-15') : new Date('2027-05-30');
      const clearanceDeadline = isOdd ? new Date('2026-12-10') : new Date('2027-05-20');

      const semName = `Sem ${sem} ${pDef.code} (${academicSession})`;

      let semester = await Semester.findOne({
        programId: program._id,
        semNumber: sem,
        academicYear: academicSession,
      });

      if (!semester) {
        semester = await Semester.create({
          programId: program._id,
          name: semName,
          semNumber: sem,
          academicYear: academicSession,
          type: semType,
          startDate,
          endDate,
          clearanceDeadline,
          isActive: true,
        });
        totalSemestersCreated++;
      }

      // Create Standard Batches (Batch A1, Batch A2) for each Semester
      const batchNames = ['Batch A1', 'Batch A2'];
      for (const bName of batchNames) {
        let batch = await Batch.findOne({
          semesterId: semester._id,
          name: bName,
        });

        if (!batch) {
          await Batch.create({
            semesterId: semester._id,
            name: bName,
            studentIds: [],
          });
          totalBatchesCreated++;
        }
      }
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 GENERATION COMPLETED FOR SESSION: ${academicSession}`);
  console.log(`📚 Programs: ${programsDef.length}`);
  console.log(`📅 Semesters Created: ${totalSemestersCreated}`);
  console.log(`👥 Batches Created: ${totalBatchesCreated}`);
  console.log('======================================================\n');

  // Summary Table
  const allSemesters = await Semester.find({ academicYear: academicSession }).populate('programId', 'degree code');
  console.log(`Total Semesters in DB for ${academicSession}: ${allSemesters.length}`);

  await mongoose.disconnect();
}

seedAllProgramsSemestersBatches().catch((err) => {
  console.error('❌ Error seeding programs, semesters, and batches:', err);
  process.exit(1);
});
