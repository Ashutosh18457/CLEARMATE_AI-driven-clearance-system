require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Program = require('./src/models/Program');
const Semester = require('./src/models/Semester');
const ClearanceItem = require('./src/models/ClearanceItem');
const SubmissionItem = require('./src/models/SubmissionItem');
const Submission = require('./src/models/Submission');
const Notification = require('./src/models/Notification');
const submissionService = require('./src/services/submission.service');
const submissionValidator = require('./src/validators/submission.validator');

async function runTests() {
  console.log('🚀 Starting Bulk-Verify Automated QA Tests...\n');

  try {
    // 1. Connect to Database (falls back to In-Memory DB if Atlas URI is local/placeholder)
    await connectDB(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Setup Test Teacher & Students
    let teacher = await User.findOne({ email: 'teacher@sbjit.edu.in' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Prof. Bulk Test Teacher',
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

    // 3. Setup Clearance Item & Submission Item
    let clearanceItem = await ClearanceItem.findOne({ theoryTeacherId: teacher._id });
    if (!clearanceItem) {
      clearanceItem = await ClearanceItem.create({
        semesterId: semester._id,
        title: 'Bulk Test Subject',
        type: 'theory',
        subjectCode: 'BULK101',
        srNo: 99,
        theoryTeacherId: teacher._id,
      });
    }

    let submissionItem = await SubmissionItem.findOne({ clearanceItemId: clearanceItem._id });
    if (!submissionItem) {
      submissionItem = await SubmissionItem.create({
        clearanceItemId: clearanceItem._id,
        semesterId: clearanceItem.semesterId,
        title: 'Bulk Test Assignment 1',
        type: 'assignment',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRequired: true,
      });
    }

    // 4. Create 4 Test Students and Submissions
    const testStudents = [];
    const testSubmissions = [];

    for (let i = 1; i <= 4; i++) {
      const email = `bulk_student_${i}_${Date.now()}@sbjit.edu.in`;
      const student = await User.create({
        name: `Bulk Student ${i}`,
        email,
        password: 'Password123!',
        role: 'student',
        programId: program._id,
        enrollmentNo: `EN_BULK_${i}_${Date.now()}`,
        currentSemester: 6,
        section: 'A',
      });
      testStudents.push(student);

      const sub = await Submission.create({
        submissionItemId: submissionItem._id,
        studentId: student._id,
        status: 'submitted',
        submittedAt: new Date(),
      });
      testSubmissions.push(sub);
    }

    console.log(`✅ Created ${testStudents.length} test students & submissions with status='submitted'`);

    // ----------------------------------------------------
    // TEST 1: Schema Validation for Bulk Reject Remarks
    // ----------------------------------------------------
    console.log('\n--- Test 1: Validation - Bulk Reject requires remarks ---');
    const rejectNoRemarks = submissionValidator.bulkVerifySubmissionSchema.validate({
      submissionIds: [testSubmissions[0]._id.toString()],
      status: 'rejected',
      remarks: '',
    });
    if (rejectNoRemarks.error) {
      console.log('✅ PASS: Bulk reject without remarks was correctly rejected by validator:', rejectNoRemarks.error.message);
    } else {
      throw new Error('FAIL: Validator allowed bulk reject without remarks');
    }

    // ----------------------------------------------------
    // TEST 2: Schema Validation for Bulk Verify (optional remarks)
    // ----------------------------------------------------
    console.log('\n--- Test 2: Validation - Bulk Verify allows optional remarks ---');
    const verifyNoRemarks = submissionValidator.bulkVerifySubmissionSchema.validate({
      submissionIds: [testSubmissions[0]._id.toString(), testSubmissions[1]._id.toString()],
      status: 'verified',
    });
    if (!verifyNoRemarks.error) {
      console.log('✅ PASS: Bulk verify without remarks passed validator successfully');
    } else {
      throw new Error('FAIL: Validator rejected bulk verify without remarks: ' + verifyNoRemarks.error.message);
    }

    // ----------------------------------------------------
    // TEST 3: Bulk Verify Execution & Notifications
    // ----------------------------------------------------
    console.log('\n--- Test 3: Service - Bulk Verify 2 Submissions ---');
    const subIdsToVerify = [testSubmissions[0]._id.toString(), testSubmissions[1]._id.toString()];
    const verifyResult = await submissionService.bulkVerifySubmissions(teacher._id, {
      submissionIds: subIdsToVerify,
      status: 'verified',
      remarks: 'Good job overall',
    });

    console.log('Verify Result:', verifyResult);
    if (verifyResult.processedCount !== 2 || verifyResult.failedCount !== 0) {
      throw new Error(`FAIL: Expected 2 processed, 0 failed; got ${verifyResult.processedCount} processed, ${verifyResult.failedCount} failed`);
    }

    // Check DB status
    const verifiedSubs = await Submission.find({ _id: { $in: subIdsToVerify } });
    for (const sub of verifiedSubs) {
      if (sub.status !== 'verified' || sub.remarks !== 'Good job overall') {
        throw new Error(`FAIL: Submission ${sub._id} DB status is not verified or remarks mismatch`);
      }
    }
    console.log('✅ PASS: Submissions in DB updated to status "verified" with remarks');

    // Check notifications
    const notifs = await Notification.find({ userId: { $in: [testStudents[0]._id, testStudents[1]._id] } });
    if (notifs.length < 2) {
      throw new Error(`FAIL: Expected at least 2 notifications, found ${notifs.length}`);
    }
    console.log(`✅ PASS: Created ${notifs.length} student notification(s) with title "${notifs[0].title}"`);

    // ----------------------------------------------------
    // TEST 4: Partial Success Handling (Stale / Already Verified IDs)
    // ----------------------------------------------------
    console.log('\n--- Test 4: Service - Partial Success (1 valid submitted + 2 already verified) ---');
    const mixedIds = [
      testSubmissions[0]._id.toString(), // already verified
      testSubmissions[1]._id.toString(), // already verified
      testSubmissions[2]._id.toString(), // currently 'submitted'
    ];

    const partialResult = await submissionService.bulkVerifySubmissions(teacher._id, {
      submissionIds: mixedIds,
      status: 'verified',
      remarks: 'Batch 2',
    });

    console.log('Partial Result:', partialResult);
    if (partialResult.processedCount !== 1 || partialResult.failedCount !== 2) {
      throw new Error(`FAIL: Expected 1 processed and 2 failed, got ${partialResult.processedCount} processed and ${partialResult.failedCount} failed`);
    }
    console.log('✅ PASS: Partial success correctly processed the 1 valid item and reported 2 skipped items with reasons');

    // ----------------------------------------------------
    // TEST 5: Bulk Reject Execution with Guardrail Remarks
    // ----------------------------------------------------
    console.log('\n--- Test 5: Service - Bulk Reject 1 Submission with Remarks ---');
    const rejectResult = await submissionService.bulkVerifySubmissions(teacher._id, {
      submissionIds: [testSubmissions[3]._id.toString()],
      status: 'rejected',
      remarks: 'Incomplete lab record / assignment',
    });

    console.log('Reject Result:', rejectResult);
    const rejectedSub = await Submission.findById(testSubmissions[3]._id);
    if (rejectedSub.status !== 'rejected' || rejectedSub.remarks !== 'Incomplete lab record / assignment') {
      throw new Error('FAIL: Submission was not marked as rejected in DB');
    }
    console.log('✅ PASS: Bulk reject successfully updated submission to "rejected" and recorded remarks');

    // ----------------------------------------------------
    // TEST 6: Strict Authorization Fence (Unauthorized Teacher)
    // ----------------------------------------------------
    console.log('\n--- Test 6: Security - Unauthorized Teacher Attempt ---');
    try {
      await submissionService.bulkVerifySubmissions(otherTeacher._id, {
        submissionIds: [testSubmissions[2]._id.toString()],
        status: 'verified',
      });
      throw new Error('FAIL: Unauthorized teacher was allowed to bulk verify');
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('not authorized')) {
        console.log('✅ PASS: Unauthorized teacher request correctly rejected with 403 Forbidden:', err.message);
      } else {
        throw err;
      }
    }

    console.log('\n========================================');
    console.log('🎉 ALL 6 BULK-VERIFY QA TESTS PASSED! 🎉');
    console.log('========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ QA Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
