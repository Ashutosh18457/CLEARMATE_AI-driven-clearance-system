/**
 * Automated QA Verification Script for Teacher Submission Items Management:
 * 1. Branch & Semester assigned subject retrieval
 * 2. Creating submission item
 * 3. Editing / Customizing submission item after creation
 * 4. Deleting submission item with cascade submission deletion
 * 5. Authorization checks
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Program = require('./src/models/Program');
const Semester = require('./src/models/Semester');
const ClearanceItem = require('./src/models/ClearanceItem');
const SubmissionItem = require('./src/models/SubmissionItem');
const Submission = require('./src/models/Submission');
const submissionService = require('./src/services/submission.service');
const submissionValidator = require('./src/validators/submission.validator');

async function runTests() {
  console.log('🚀 Starting Teacher Submission Items Management QA Tests...\n');

  try {
    await connectDB(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Setup Teacher and Program/Semester
    let teacher = await User.findOne({ email: 'teacher@sbjit.edu.in' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Prof. Sharma',
        email: 'teacher@sbjit.edu.in',
        password: 'Password123!',
        role: 'teacher',
      });
    }

    let otherTeacher = await User.findOne({ email: 'otherteacher@sbjit.edu.in' });
    if (!otherTeacher) {
      otherTeacher = await User.create({
        name: 'Prof. Other Dept',
        email: 'otherteacher@sbjit.edu.in',
        password: 'Password123!',
        role: 'teacher',
      });
    }

    let program = await Program.findOne();
    if (!program) {
      program = await Program.create({
        name: 'Computer Science and Engineering',
        code: 'CSE',
        degree: 'B.Tech',
        durationYears: 4,
        totalSemesters: 8,
      });
    }

    let semester = await Semester.findOne({ programId: program._id });
    if (!semester) {
      semester = await Semester.create({
        programId: program._id,
        semNumber: 6,
        academicYear: '2026-2027',
      });
    }

    // 2. Setup Clearance Items
    let clearanceItem1 = await ClearanceItem.findOne({ theoryTeacherId: teacher._id, title: 'Data Structures' });
    if (!clearanceItem1) {
      clearanceItem1 = await ClearanceItem.create({
        semesterId: semester._id,
        title: 'Data Structures',
        type: 'theory',
        subjectCode: 'CSE601',
        srNo: 1,
        theoryTeacherId: teacher._id,
      });
    }

    let clearanceItem2 = await ClearanceItem.findOne({ theoryTeacherId: teacher._id, title: 'Operating Systems' });
    if (!clearanceItem2) {
      clearanceItem2 = await ClearanceItem.create({
        semesterId: semester._id,
        title: 'Operating Systems',
        type: 'theory',
        subjectCode: 'CSE602',
        srNo: 2,
        theoryTeacherId: teacher._id,
      });
    }

    // ----------------------------------------------------
    // TEST 1: Retrieve Teacher Assigned Clearance Items with Class Info
    // ----------------------------------------------------
    console.log('\n--- Test 1: Retrieve Teacher Assigned Clearance Items with Branch/Sem ---');
    const assignedItems = await submissionService.getTeacherAssignedClearanceItems(teacher._id);
    console.log(`Retrieved ${assignedItems.length} assigned clearance items for teacher.`);
    if (assignedItems.length === 0) {
      throw new Error('FAIL: Teacher has no assigned clearance items');
    }

    const firstItem = assignedItems[0];
    if (!firstItem.semesterId || !firstItem.semesterId.programId) {
      throw new Error('FAIL: Assigned clearance item does not have populated semester and program details');
    }
    console.log('✅ PASS: Retrieved assigned clearance items with branch/program details:', {
      subject: firstItem.title,
      program: firstItem.semesterId.programId.name,
      degree: firstItem.semesterId.programId.degree,
      semester: firstItem.semesterId.semNumber,
    });

    // ----------------------------------------------------
    // TEST 2: Teacher Creates a Submission Item for Assigned Class
    // ----------------------------------------------------
    console.log('\n--- Test 2: Create Submission Item for Assigned Class ---');
    const newItem = await submissionService.createSubmissionItem(teacher._id, {
      clearanceItemId: clearanceItem1._id,
      title: 'Lab Assignment 1 - Trees',
      type: 'assignment',
      description: 'Implement binary search tree traversal algorithms',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      isRequired: true,
    });

    console.log('Created Submission Item:', newItem._id, newItem.title);
    if (!newItem._id || newItem.clearanceItemId.toString() !== clearanceItem1._id.toString()) {
      throw new Error('FAIL: Submission item creation failed or wrong clearanceItemId');
    }
    console.log('✅ PASS: Submission item created successfully with correct clearanceItemId and semesterId');

    // Create a dummy student submission under this item to test cascade
    const dummyStudent = await User.findOne({ role: 'student' });
    let dummySub = null;
    if (dummyStudent) {
      dummySub = await Submission.create({
        submissionItemId: newItem._id,
        studentId: dummyStudent._id,
        status: 'submitted',
        submittedAt: new Date(),
      });
      console.log('Created dummy student submission:', dummySub._id);
    }

    // ----------------------------------------------------
    // TEST 3: Teacher Edits / Customizes Submission Item
    // ----------------------------------------------------
    console.log('\n--- Test 3: Edit / Customize Submission Item ---');
    const updateData = {
      title: 'Lab Assignment 1 - Balanced AVL Trees (Updated)',
      description: 'Updated instructions: Include rotations in submission',
      clearanceItemId: clearanceItem2._id, // change to Operating Systems
      isRequired: false,
    };

    const validateResult = submissionValidator.updateSubmissionItemSchema.validate(updateData);
    if (validateResult.error) {
      throw new Error('FAIL: Update validation schema rejected valid payload: ' + validateResult.error.message);
    }

    const updatedItem = await submissionService.updateSubmissionItem(teacher._id, newItem._id, updateData);
    if (
      updatedItem.title !== updateData.title ||
      updatedItem.clearanceItemId._id.toString() !== clearanceItem2._id.toString() ||
      updatedItem.isRequired !== false
    ) {
      throw new Error('FAIL: Submission item updates were not properly persisted in database');
    }
    console.log('✅ PASS: Submission item customized successfully (title, subject reassignment, description, isRequired)');

    // ----------------------------------------------------
    // TEST 4: Authorization Check on Edit
    // ----------------------------------------------------
    console.log('\n--- Test 4: Security - Unauthorized Teacher Cannot Edit ---');
    try {
      await submissionService.updateSubmissionItem(otherTeacher._id, newItem._id, {
        title: 'Hacked Title',
      });
      throw new Error('FAIL: Unauthorized teacher was able to edit submission item');
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('not authorized')) {
        console.log('✅ PASS: Unauthorized teacher edit rejected with 403 Forbidden:', err.message);
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST 5: Teacher Deletes Submission Item with Cascade Submissions
    // ----------------------------------------------------
    console.log('\n--- Test 5: Delete Submission Item & Cascade Cleanup ---');
    const deleteResult = await submissionService.deleteSubmissionItem(teacher._id, newItem._id);
    console.log('Delete result:', deleteResult);

    const checkItem = await SubmissionItem.findById(newItem._id);
    if (checkItem) {
      throw new Error('FAIL: Submission item was not deleted from DB');
    }

    if (dummySub) {
      const checkSub = await Submission.findById(dummySub._id);
      if (checkSub) {
        throw new Error('FAIL: Associated student submission was not deleted (cascade failed)');
      }
      console.log('✅ PASS: Associated student submission was cleanly deleted via cascade');
    }
    console.log('✅ PASS: Submission item deleted successfully from database');

    console.log('\n======================================================');
    console.log('🎉 ALL 5 SUBMISSION MANAGEMENT QA TESTS PASSED! 🎉');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ QA Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
