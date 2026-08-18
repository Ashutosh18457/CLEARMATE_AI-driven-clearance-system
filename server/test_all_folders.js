const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('node:http');

// Set env for testing before requiring app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-clearmate-jwt-12345';
process.env.JWT_EXPIRES_IN = '1d';
process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '5001';

const app = require('./src/app');
const User = require('./src/models/User');
const Program = require('./src/models/Program');
const Semester = require('./src/models/Semester');
const Batch = require('./src/models/Batch');
const ClearanceItem = require('./src/models/ClearanceItem');
const ClearanceRequest = require('./src/models/ClearanceRequest');
const ItemClearance = require('./src/models/ItemClearance');
const SectionClearance = require('./src/models/SectionClearance');
const Submission = require('./src/models/Submission');
const SubmissionItem = require('./src/models/SubmissionItem');
const Notification = require('./src/models/Notification');

// Services
const authService = require('./src/services/auth.service');
const adminService = require('./src/services/admin.service');
const clearanceService = require('./src/services/clearance.service');
const submissionService = require('./src/services/submission.service');
const analyticsService = require('./src/services/analytics.service');
const riskService = require('./src/services/risk.service');
const certificateService = require('./src/services/certificate.service');
const notificationService = require('./src/services/notification.service');
const chatbotService = require('./src/services/chatbot.service');

let server;
let mongod;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runAllTests() {
  console.log('==================================================');
  console.log('🚀 CLEARMATE FULL SYSTEM TEST SUITE STARTING');
  console.log('==================================================\n');

  try {
    // 1. SETUP IN-MEMORY DATABASE
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('Connected to In-Memory MongoDB:', uri);

    // Start Express server
    await new Promise((resolve) => {
      server = app.listen(5001, () => {
        console.log('Test Server listening on port 5001\n');
        resolve();
      });
    });

    // Helper for HTTP requests
    const fetchApi = async (path, options = {}) => {
      const url = `http://localhost:5001/api${path}`;
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const data = await res.json();
      return { status: res.status, data };
    };

    // ──────────────────────────────────────────────
    // TEST SECTION 1: HEALTH CHECK
    // ──────────────────────────────────────────────
    console.log('--- TEST SECTION 1: HEALTH & API BASE ---');
    const health = await fetchApi('/health');
    assert(health.status === 200, 'Health endpoint returns 200');
    assert(health.data.data.status === 'healthy', 'Health status is healthy');
    assert(health.data.data.database === 'connected', 'DB state is connected');

    // ──────────────────────────────────────────────
    // TEST SECTION 2: AUTHENTICATION & PASSWORD VALIDATION
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 2: AUTH & USER VALIDATION ---');
    // Test weak password rejection
    try {
      await User.create({
        name: 'Weak User',
        email: 'weak@sbjit.edu.in',
        password: 'weak',
        role: 'student',
      });
      assert(false, 'Should have failed weak password validation');
    } catch (e) {
      assert(e.message.includes('Password'), 'Weak password properly rejected by User model validation');
    }

    // Register an Admin
    const adminReg = await fetchApi('/auth/register', {
      method: 'POST',
      body: {
        name: 'System Admin',
        email: 'admin@sbjit.edu.in',
        password: 'Admin@Secure123',
        role: 'admin',
      },
    });
    assert(adminReg.status === 201, 'Admin user registered successfully');
    assert(!!adminReg.data.data.token, 'Registration returns JWT token');
    const adminToken = adminReg.data.data.token;

    // Login with Admin
    const adminLogin = await fetchApi('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@sbjit.edu.in',
        password: 'Admin@Secure123',
      },
    });
    assert(adminLogin.status === 200, 'Admin login succeeded');
    assert(adminLogin.data.data.user.role === 'admin', 'Returned user has role admin');

    // Test Invalid Login
    const badLogin = await fetchApi('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@sbjit.edu.in',
        password: 'WrongPassword123!',
      },
    });
    assert(badLogin.status === 401, 'Invalid credentials return 401');

    // Test /auth/me
    const meRes = await fetchApi('/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(meRes.status === 200, '/auth/me returns current authenticated user');
    assert(meRes.data.data.user.email === 'admin@sbjit.edu.in', 'Correct user profile returned');

    // ──────────────────────────────────────────────
    // TEST SECTION 3: ADMIN SETUP (Program, Semester, Batch, Teachers, Students)
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 3: ADMIN CREATION & SETUP ---');
    // Create Program
    const progRes = await fetchApi('/admin/programs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'B.Tech Artificial Intelligence & Machine Learning',
        code: 'AIML',
        department: 'Emerging Technologies',
      },
    });
    assert(progRes.status === 201, 'Program created via Admin API');
    const programId = progRes.data.data.program._id;

    // Create Semester
    const semRes = await fetchApi('/admin/semesters', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        programId,
        name: 'Semester 6 AIML',
        semNumber: 6,
        academicYear: '2025-26',
        type: 'EVEN',
        clearanceDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    assert(semRes.status === 201, 'Semester created via Admin API');
    const semesterId = semRes.data.data.semester._id;

    // Create Batch
    const batchRes = await fetchApi('/admin/batches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        semesterId,
        name: 'Batch A1',
      },
    });
    assert(batchRes.status === 201, 'Batch A1 created via Admin API');
    const batchId = batchRes.data.data.batch._id;

    // Create Teacher 1 (Theory)
    const teacher1 = await User.create({
      name: 'Dr. John Theory',
      email: 'teacher.theory@sbjit.edu.in',
      password: 'Teacher@1234',
      role: 'teacher',
    });
    const teacher1Login = await authService.login('teacher.theory@sbjit.edu.in', 'Teacher@1234');
    const teacher1Token = teacher1Login.token;

    // Create Teacher 2 (Lab)
    const teacher2 = await User.create({
      name: 'Prof. Jane Lab',
      email: 'teacher.lab@sbjit.edu.in',
      password: 'Teacher@1234',
      role: 'teacher',
    });

    // Create Teacher 3 (Elective)
    const teacher3 = await User.create({
      name: 'Dr. Elective Guide',
      email: 'teacher.elective@sbjit.edu.in',
      password: 'Teacher@1234',
      role: 'teacher',
    });

    // Create Section Heads (Library, Accounts, Bus, Student Section)
    const libraryHead = await User.create({
      name: 'Library Incharge',
      email: 'library@sbjit.edu.in',
      password: 'Section@1234',
      role: 'section_head',
      sectionType: 'library',
    });
    const libraryLogin = await authService.login('library@sbjit.edu.in', 'Section@1234');
    const libraryToken = libraryLogin.token;

    const accountsHead = await User.create({
      name: 'Accounts Incharge',
      email: 'accounts@sbjit.edu.in',
      password: 'Section@1234',
      role: 'section_head',
      sectionType: 'accounts',
    });
    const accountsLogin = await authService.login('accounts@sbjit.edu.in', 'Section@1234');
    const accountsToken = accountsLogin.token;

    const busHead = await User.create({
      name: 'Bus Incharge',
      email: 'bus@sbjit.edu.in',
      password: 'Section@1234',
      role: 'section_head',
      sectionType: 'bus',
    });
    const busLogin = await authService.login('bus@sbjit.edu.in', 'Section@1234');
    const busToken = busLogin.token;

    const ssHead = await User.create({
      name: 'Student Section Incharge',
      email: 'student_section@sbjit.edu.in',
      password: 'Section@1234',
      role: 'section_head',
      sectionType: 'student_section',
    });
    const ssLogin = await authService.login('student_section@sbjit.edu.in', 'Section@1234');
    const ssToken = ssLogin.token;

    // Create Class Incharge
    const ciUser = await User.create({
      name: 'Class Incharge Prof',
      email: 'ci@sbjit.edu.in',
      password: 'CI@Password123',
      role: 'class_incharge',
    });
    const ciLogin = await authService.login('ci@sbjit.edu.in', 'CI@Password123');
    const ciToken = ciLogin.token;

    // Create HOD
    const hodUser = await User.create({
      name: 'Dr. Department HOD',
      email: 'hod@sbjit.edu.in',
      password: 'HOD@Password123',
      role: 'hod',
    });
    const hodLogin = await authService.login('hod@sbjit.edu.in', 'HOD@Password123');
    const hodToken = hodLogin.token;

    // Create Clearance Items:
    // Item 1: Theory
    const theoryItem = await ClearanceItem.create({
      semesterId,
      srNo: 1,
      title: 'Deep Learning',
      type: 'theory',
      theoryTeacherId: teacher1._id,
    });
    assert(!!theoryItem._id, 'Theory ClearanceItem created');

    // Item 2: Lab
    const labItem = await ClearanceItem.create({
      semesterId,
      srNo: 2,
      title: 'Deep Learning Lab',
      type: 'lab',
      labBatchTeachers: [{ batchId, teacherId: teacher2._id }],
    });
    assert(!!labItem._id, 'Lab ClearanceItem created with batch mapping');

    // Item 3: Elective
    const electiveItem = await ClearanceItem.create({
      semesterId,
      srNo: 3,
      title: 'Professional Elective IV',
      type: 'elective',
      electiveGroup: 'PE-IV',
      electiveOptions: [
        { name: 'Computer Vision', teacherId: teacher3._id },
        { name: 'NLP & LLMs', teacherId: teacher1._id },
      ],
    });
    assert(!!electiveItem._id, 'Elective ClearanceItem created with multiple options');
    const chosenElectiveOptionId = electiveItem.electiveOptions[0]._id;

    // Create Student & assign to Batch + Elective
    const student = await User.create({
      name: 'Ashutosh Student',
      email: 'ashutosh@sbjit.edu.in',
      password: 'Student@1234',
      role: 'student',
      programId,
      enrollmentNo: 'EN2025AIML001',
      currentSemester: 6,
      section: 'A',
      batchId,
      selectedElective: chosenElectiveOptionId,
    });
    assert(!!student._id, 'Student created and configured');

    const studentLogin = await authService.login('ashutosh@sbjit.edu.in', 'Student@1234');
    const studentToken = studentLogin.token;

    // ──────────────────────────────────────────────
    // TEST SECTION 4: CLEARANCE LIFECYCLE & STAGE PROGRESSION
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 4: CLEARANCE INITIATION & STAGE PROGRESSION ---');
    // Student initiates clearance
    const initRes = await fetchApi('/clearances/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { semesterId },
    });
    assert(initRes.status === 201, 'Student initiated clearance successfully');
    assert(initRes.data.data.itemClearancesCreated === 3, 'All 3 items created (Theory, Lab Batch, Elective resolved)');
    assert(initRes.data.data.sectionClearancesCreated === 4, 'All 4 department section clearances created');

    const clearanceRequestId = initRes.data.data.clearanceRequest._id;

    // Check student clearance status
    const statusRes = await fetchApi(`/clearances/my?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(statusRes.status === 200, 'Student retrieved clearance status');
    assert(statusRes.data.data.clearanceRequest.currentStage === 'items', 'Clearance is in items stage');

    // Teacher 1 views pending items
    const teacher1Pending = await fetchApi('/clearances/items/pending', {
      headers: { Authorization: `Bearer ${teacher1Token}` },
    });
    assert(teacher1Pending.status === 200, 'Teacher 1 retrieved pending items');
    assert(teacher1Pending.data.data.length >= 1, 'Teacher 1 sees Deep Learning pending item');

    const theoryClearance = teacher1Pending.data.data.find(i => i.itemTitle === 'Deep Learning');
    assert(!!theoryClearance, 'Found theory item clearance');

    // Teacher 1 approves theory
    const review1 = await fetchApi(`/clearances/items/${theoryClearance._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacher1Token}` },
      body: { status: 'approved', remarks: 'Good work' },
    });
    assert(review1.status === 200, 'Teacher 1 approved theory item');

    // Approve Lab item (Teacher 2)
    const labTeacherLogin = await authService.login('teacher.lab@sbjit.edu.in', 'Teacher@1234');
    const teacher2Token = labTeacherLogin.token;
    const teacher2Pending = await fetchApi('/clearances/items/pending', {
      headers: { Authorization: `Bearer ${teacher2Token}` },
    });
    const labClearance = teacher2Pending.data.data.find(i => i.itemTitle === 'Deep Learning Lab');
    const review2 = await fetchApi(`/clearances/items/${labClearance._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacher2Token}` },
      body: { status: 'approved', remarks: 'Lab journal verified' },
    });
    assert(review2.status === 200, 'Teacher 2 approved lab item');

    // Approve Elective item (Teacher 3)
    const electiveTeacherLogin = await authService.login('teacher.elective@sbjit.edu.in', 'Teacher@1234');
    const teacher3Token = electiveTeacherLogin.token;
    const teacher3Pending = await fetchApi('/clearances/items/pending', {
      headers: { Authorization: `Bearer ${teacher3Token}` },
    });
    const electiveClearance = teacher3Pending.data.data.find(i => i.itemTitle === 'Professional Elective IV');
    const review3 = await fetchApi(`/clearances/items/${electiveClearance._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacher3Token}` },
      body: { status: 'approved', remarks: 'Elective project completed' },
    });
    assert(review3.status === 200, 'Teacher 3 approved elective item');

    // Verify clearance AUTO-ADVANCED to sections stage!
    const crAfterItems = await ClearanceRequest.findById(clearanceRequestId);
    assert(crAfterItems.status === 'sections_review', 'Clearance auto-advanced to sections_review status');
    assert(crAfterItems.currentStage === 'sections', 'Clearance currentStage updated to sections');

    // Section heads approve all 4 departments:
    // 1. Library
    const libPending = await fetchApi('/clearances/sections/pending', {
      headers: { Authorization: `Bearer ${libraryToken}` },
    });
    assert(libPending.data.data.length === 1, 'Library head sees pending review');
    await fetchApi(`/clearances/sections/${libPending.data.data[0]._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${libraryToken}` },
      body: { status: 'approved', remarks: 'No library dues' },
    });

    // 2. Accounts
    const accPending = await fetchApi('/clearances/sections/pending', {
      headers: { Authorization: `Bearer ${accountsToken}` },
    });
    await fetchApi(`/clearances/sections/${accPending.data.data[0]._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accountsToken}` },
      body: { status: 'approved', remarks: 'Fees cleared' },
    });

    // 3. Bus
    const busPending = await fetchApi('/clearances/sections/pending', {
      headers: { Authorization: `Bearer ${busToken}` },
    });
    await fetchApi(`/clearances/sections/${busPending.data.data[0]._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${busToken}` },
      body: { status: 'approved', remarks: 'Bus pass verified' },
    });

    // 4. Student Section
    const ssPending = await fetchApi('/clearances/sections/pending', {
      headers: { Authorization: `Bearer ${ssToken}` },
    });
    await fetchApi(`/clearances/sections/${ssPending.data.data[0]._id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ssToken}` },
      body: { status: 'approved', remarks: 'Original docs verified' },
    });

    // Verify AUTO-ADVANCEMENT to Class Incharge
    const crAfterSections = await ClearanceRequest.findById(clearanceRequestId);
    assert(crAfterSections.status === 'ci_review', 'Clearance auto-advanced to ci_review');
    assert(crAfterSections.currentStage === 'class_incharge', 'Clearance currentStage is class_incharge');

    // Class Incharge approves
    const ciPending = await fetchApi('/clearances/ci/pending', {
      headers: { Authorization: `Bearer ${ciToken}` },
    });
    assert(ciPending.data.data.length === 1, 'Class incharge sees pending review');
    const ciReviewRes = await fetchApi(`/clearances/ci/${clearanceRequestId}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ciToken}` },
      body: { status: 'approved', remarks: 'Attendance > 75%, recommended' },
    });
    assert(ciReviewRes.status === 200, 'Class incharge approved clearance');

    // Verify AUTO-ADVANCEMENT to HOD
    const crAfterCI = await ClearanceRequest.findById(clearanceRequestId);
    assert(crAfterCI.status === 'hod_review', 'Clearance auto-advanced to hod_review');

    // HOD final approval
    const hodPending = await fetchApi('/clearances/hod/pending', {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    assert(hodPending.data.data.length === 1, 'HOD sees pending review');
    const hodReviewRes = await fetchApi(`/clearances/hod/${clearanceRequestId}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hodToken}` },
      body: { status: 'approved', remarks: 'Final clearance granted' },
    });
    assert(hodReviewRes.status === 200, 'HOD gave final approval');

    // Verify COMPLETION!
    const crCompleted = await ClearanceRequest.findById(clearanceRequestId);
    assert(crCompleted.status === 'completed', 'Clearance request is completed!');
    assert(!!crCompleted.completedAt, 'completedAt timestamp set');

    // ──────────────────────────────────────────────
    // TEST SECTION 5: CERTIFICATE GENERATION & VERIFICATION
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 5: CERTIFICATE GENERATION & VERIFICATION ---');
    const certRes = await fetchApi(`/certificate/my?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(certRes.status === 200, 'Student retrieved certificate data');
    assert(!!certRes.data.data.certificateNumber, 'Certificate number generated: ' + certRes.data.data.certificateNumber);
    const certNumber = certRes.data.data.certificateNumber;

    // Public verification without auth
    const verifyRes = await fetchApi(`/certificate/verify/${certNumber}`);
    assert(verifyRes.status === 200, 'Public certificate verification succeeds');
    assert(verifyRes.data.data.valid === true, 'Certificate is valid');
    assert(verifyRes.data.data.student.name === 'Ashutosh Student', 'Correct student verified');

    // Admin marks as sent to Exam Cell
    const examCellRes = await fetchApi(`/certificate/${clearanceRequestId}/exam-cell`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(examCellRes.status === 200, 'Admin marked clearance as sent to exam cell');

    // ──────────────────────────────────────────────
    // TEST SECTION 6: SUBMISSION WORKFLOW
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 6: SUBMISSION ITEM CREATION & VERIFICATION ---');
    // Teacher 1 creates a submission item
    const subItemRes = await fetchApi('/submissions/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacher1Token}` },
      body: {
        clearanceItemId: theoryItem._id,
        title: 'Assignment 1: Neural Networks',
        type: 'assignment',
        description: 'Complete questions 1 to 5',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isRequired: true,
      },
    });
    assert(subItemRes.status === 201, 'Teacher created submission item');
    const submissionItemId = subItemRes.data.data.item._id;

    // Student views submission items
    const mySubs = await fetchApi(`/submissions/my?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(mySubs.status === 200, 'Student viewed submission items');
    assert(mySubs.data.data.length === 1, 'Student sees 1 relevant submission item');

    // Student submits work
    const submitRes = await fetchApi('/submissions/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { submissionItemId },
    });
    assert(submitRes.status === 200, 'Student submitted work');
    const submissionRecordId = submitRes.data.data.submission._id;

    // Teacher views student submissions
    const teacherSubView = await fetchApi(`/submissions/items/${submissionItemId}/students`, {
      headers: { Authorization: `Bearer ${teacher1Token}` },
    });
    assert(teacherSubView.status === 200, 'Teacher viewed students for submission item');
    assert(teacherSubView.data.data.students[0].submission.status === 'submitted', 'Student status is submitted');

    // Teacher verifies submission
    const verifySubRes = await fetchApi(`/submissions/${submissionRecordId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacher1Token}` },
      body: { status: 'verified', remarks: '10/10' },
    });
    assert(verifySubRes.status === 200, 'Teacher verified student submission');

    // ──────────────────────────────────────────────
    // TEST SECTION 7: NOTIFICATIONS
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 7: NOTIFICATION ENGINE ---');
    const notifRes = await fetchApi('/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(notifRes.status === 200, 'Student fetched notifications');
    assert(notifRes.data.data.notifications.length > 0, 'Notifications were generated by clearance & submission events');

    const unreadCountRes = await fetchApi('/notifications/unread-count', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unreadCountRes.status === 200, 'Unread count fetched');

    const markAllRead = await fetchApi('/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(markAllRead.status === 200, 'All notifications marked as read');

    // ──────────────────────────────────────────────
    // TEST SECTION 8: ANALYTICS & RISK ENGINE
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 8: ANALYTICS & AI RISK PREDICTION ---');
    // Analytics overview
    const analyticsOverview = await fetchApi(`/analytics/clearance-overview?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(analyticsOverview.status === 200, 'Analytics overview retrieved');
    assert(analyticsOverview.data.data.overview.completed === 1, 'Analytics reflects 1 completed clearance');
    assert(analyticsOverview.data.data.overview.completionRate === 100, 'Completion rate calculated as 100%');

    // Department stats
    const deptStats = await fetchApi(`/analytics/department-stats?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deptStats.status === 200, 'Department stats retrieved');
    assert(deptStats.data.data.departments.length === 4, '4 departments tracked in analytics');

    // Student progress
    const studentProgress = await fetchApi(`/analytics/student-progress?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(studentProgress.status === 200, 'Student progress matrix retrieved');
    assert(studentProgress.data.data.progress[0].itemProgress.percentage === 100, '100% item progress recorded');

    // Risk prediction
    const riskData = await fetchApi(`/risk/at-risk-students?semesterId=${semesterId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(riskData.status === 200, 'Risk assessment engine completed');
    assert(riskData.data.data.summary.low === 1, 'Completed student categorized with low risk level');

    // ──────────────────────────────────────────────
    // TEST SECTION 9: AI CHATBOT FALLBACK / RULE ENGINE
    // ──────────────────────────────────────────────
    console.log('\n--- TEST SECTION 9: CHATBOT ENGINE ---');
    const chatMsg = await fetchApi('/chatbot/message', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { message: 'What is my clearance status?' },
    });
    assert(chatMsg.status === 200, 'Chatbot returned response');
    assert(chatMsg.data.data.reply.includes('Completed'), 'Chatbot accurately communicated completed status');

    console.log('\n==================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n💥 FATAL TEST ERROR:', err);
  } finally {
    if (server) server.close();
    if (mongoose.connection) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runAllTests();
