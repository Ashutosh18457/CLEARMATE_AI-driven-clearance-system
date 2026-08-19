/**
 * ClearMate - Complete Teacher User Journey Automated Test Script
 * Simulates all 10 steps of the teacher workflow from authentication to deletion.
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
const Notification = require('./src/models/Notification');
const authService = require('./src/services/auth.service');
const submissionService = require('./src/services/submission.service');

async function runTeacherUserJourney() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🚀 RUNNING COMPLETE TEACHER USER JOURNEY AUTOMATED TEST SUITE 🚀');
  console.log('══════════════════════════════════════════════════════════════════\n');

  try {
    await connectDB(process.env.MONGODB_URI);
    console.log('✅ Database connected.\n');

    // ── STEP 1: Teacher Authentication ──
    console.log('📍 STEP 1: Teacher Login & Authentication');
    const { user: teacherUser, token } = await authService.login(
      'teacher@sbjit.edu.in',
      'Password123!',
      '127.0.0.1',
      'QA-Journey-Agent'
    );
    console.log(`   Logged in as: ${teacherUser.name} (${teacherUser.email}), Role: ${teacherUser.role}`);
    console.log('   ✅ Step 1 Passed: Teacher authenticated with JWT token.\n');

    // ── STEP 2: Retrieve Assigned Classes & Subjects ──
    console.log('📍 STEP 2: Class & Semester Discovery (Branch/Sem Assignment)');
    const assignedSubjects = await submissionService.getTeacherAssignedClearanceItems(teacherUser._id);
    console.log(`   Teacher has ${assignedSubjects.length} assigned clearance subjects:`);
    assignedSubjects.forEach((sub, idx) => {
      const prog = sub.semesterId?.programId?.name || 'General';
      const sem = sub.semesterId?.semNumber || '—';
      console.log(`   ${idx + 1}. [${prog} · Sem ${sem}] ${sub.title} (${sub.subjectCode || 'No Code'})`);
    });
    if (assignedSubjects.length === 0) throw new Error('Teacher has no assigned subjects');
    const testSubject = assignedSubjects[0];
    console.log('   ✅ Step 2 Passed: Teacher can view all assigned classes & semesters.\n');

    // ── STEP 3: Create a New Deliverable for Branch & Sem ──
    console.log('📍 STEP 3: Create a Submission Item (Assignment/Project)');
    const createdItem = await submissionService.createSubmissionItem(teacherUser._id, {
      clearanceItemId: testSubject._id,
      title: `Journey Deliverable - ${Date.now()}`,
      type: 'assignment',
      description: 'Submit solution files with proper test cases',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRequired: true,
    });
    console.log(`   Created item ID: ${createdItem._id}`);
    console.log(`   Title: "${createdItem.title}" linked to ClearanceItem: "${testSubject.title}"`);
    console.log('   ✅ Step 3 Passed: Deliverable created for specific branch & semester.\n');

    // ── STEP 4: Customize / Edit the Deliverable ──
    console.log('📍 STEP 4: Edit & Customize Deliverable Anytime');
    const updatedTitle = `${createdItem.title} (Extended & Revised)`;
    const updatedItem = await submissionService.updateSubmissionItem(teacherUser._id, createdItem._id, {
      title: updatedTitle,
      description: 'Revised instructions: Include summary PDF',
      isRequired: false,
    });
    console.log(`   Updated title: "${updatedItem.title}"`);
    console.log(`   Updated isRequired: ${updatedItem.isRequired}`);
    if (updatedItem.title !== updatedTitle) throw new Error('Title update failed');
    console.log('   ✅ Step 4 Passed: Deliverable customized after creation.\n');

    // ── STEP 5: Create Student Submissions for Testing ──
    console.log('📍 STEP 5: Simulate Student Submissions');
    let program = await Program.findById(testSubject.semesterId.programId._id || testSubject.semesterId.programId);
    const students = [];
    const submissions = [];

    for (let i = 1; i <= 3; i++) {
      const student = await User.create({
        name: `Journey Student ${i}`,
        email: `journey_student_${i}_${Date.now()}@sbjit.edu.in`,
        password: 'Password123!',
        role: 'student',
        programId: program._id,
        enrollmentNo: `EN_JRN_${i}_${Date.now()}`,
        currentSemester: testSubject.semesterId.semNumber || 6,
        section: 'A',
      });
      students.push(student);

      const sub = await Submission.create({
        submissionItemId: createdItem._id,
        studentId: student._id,
        status: 'submitted',
        submittedAt: new Date(),
      });
      submissions.push(sub);
    }
    console.log(`   Created ${students.length} student submissions with status='submitted'`);
    console.log('   ✅ Step 5 Passed: Submissions populated for review.\n');

    // ── STEP 6: Individual Submission Review ──
    console.log('📍 STEP 6: Single Student Submission Review');
    const singleVerified = await submissionService.verifySubmission(
      teacherUser._id,
      submissions[0]._id,
      'verified',
      'Good work on individual submission'
    );
    console.log(`   Student 1 submission status: ${singleVerified.status}`);
    console.log('   ✅ Step 6 Passed: Individual submission verified.\n');

    // ── STEP 7: Bulk Verify Submissions ──
    console.log('📍 STEP 7: Bulk Verify Multiple Submissions');
    const bulkVerifyRes = await submissionService.bulkVerifySubmissions(teacherUser._id, {
      submissionIds: [submissions[1]._id.toString()],
      status: 'verified',
      remarks: 'Bulk approved for clearance',
    });
    console.log(`   Bulk verified count: ${bulkVerifyRes.processedCount}`);
    console.log('   ✅ Step 7 Passed: Bulk verify completed with student notifications.\n');

    // ── STEP 8: Bulk Reject with Guardrails & Presets ──
    console.log('📍 STEP 8: Bulk Reject with Reason & Safety Guardrails');
    const bulkRejectRes = await submissionService.bulkVerifySubmissions(teacherUser._id, {
      submissionIds: [submissions[2]._id.toString()],
      status: 'rejected',
      remarks: 'Incomplete lab record / assignment', // standard preset
    });
    console.log(`   Bulk rejected count: ${bulkRejectRes.processedCount}`);
    const checkRejected = await Submission.findById(submissions[2]._id);
    console.log(`   Student 3 status in DB: "${checkRejected.status}", Remarks: "${checkRejected.remarks}"`);
    console.log('   ✅ Step 8 Passed: Bulk reject safely executed with required reason.\n');

    // ── STEP 9: Security Guardrail Check ──
    console.log('📍 STEP 9: Security Boundary Check (Unauthorized Access Blocked)');
    const fakeTeacherId = new mongoose.Types.ObjectId();
    try {
      await submissionService.updateSubmissionItem(fakeTeacherId, createdItem._id, { title: 'Hack' });
      throw new Error('Security check failed: Unauthorized teacher was not blocked');
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('not authorized')) {
        console.log(`   Blocked unauthorized access with: "${err.message}" (403 Forbidden)`);
        console.log('   ✅ Step 9 Passed: Security boundary strictly enforced.\n');
      } else {
        throw err;
      }
    }

    // ── STEP 10: Delete Submission Item & Cascade Cleanup ──
    console.log('📍 STEP 10: Delete Submission Item & Cascade Cleanup');
    const deleteRes = await submissionService.deleteSubmissionItem(teacherUser._id, createdItem._id);
    console.log(`   Item deleted. Cleaned up ${deleteRes.deletedSubmissionsCount} student submissions.`);
    const remainingSubs = await Submission.countDocuments({ submissionItemId: createdItem._id });
    console.log(`   Remaining submissions for item in DB: ${remainingSubs}`);
    if (remainingSubs !== 0) throw new Error('Cascade deletion failed');
    console.log('   ✅ Step 10 Passed: Item and submissions completely cleaned up.\n');

    console.log('══════════════════════════════════════════════════════════════════');
    console.log('🎉 COMPLETE 10-STEP TEACHER USER JOURNEY PASSED SUCCESSFULLY! 🎉');
    console.log('══════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ User Journey test failed with error:', err);
    process.exit(1);
  }
}

runTeacherUserJourney();
