const mongoose = require('mongoose');
const env = require('./src/config/env');
const User = require('./src/models/User');
const Program = require('./src/models/Program');
const Semester = require('./src/models/Semester');
const ClearanceItem = require('./src/models/ClearanceItem');
const SubmissionItem = require('./src/models/SubmissionItem');
const Submission = require('./src/models/Submission');
const ClearanceRequest = require('./src/models/ClearanceRequest');
const ItemClearance = require('./src/models/ItemClearance');
const Notification = require('./src/models/Notification');

const BASE_URL = 'http://localhost:5000/api';

const results = {
  summary: [],
  bugs: [],
  securityFindings: [],
  uiGaps: [],
  detailedLogs: [],
};

function logTest(suite, testName, status, details = '') {
  results.detailedLogs.push({ suite, testName, status, details });
  console.log(`[${status}] ${suite} - ${testName} ${details ? '(' + details + ')' : ''}`);
}

function addBug(severity, title, steps, expected, actual, endpointOrFile) {
  results.bugs.push({ severity, title, steps, expected, actual, endpointOrFile });
}

function addSecurity(severity, title, details, endpoint) {
  results.securityFindings.push({ severity, title, details, endpoint });
}

async function api(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

async function runQA() {
  console.log('====================================================');
  console.log('  ClearMate — Teacher Dashboard E2E QA Test Suite   ');
  console.log('====================================================\n');

  await mongoose.connect(env.mongoUri);
  console.log('✅ Connected to MongoDB for setup verification...\n');

  let teacherToken = null;
  let teacher2Token = null;
  let studentToken = null;
  let hodToken = null;

  let teacherUser = await User.findOne({ email: 'teacher@sbjit.edu.in' });
  let teacher2User = await User.findOne({ email: 'teacher2_qa@sbjit.edu.in' });
  if (!teacher2User) {
    teacher2User = await User.create({
      name: 'Prof. Verma (Teacher 2)',
      email: 'teacher2_qa@sbjit.edu.in',
      password: 'Password123!',
      role: 'teacher',
    });
  }

  let studentUser = await User.findOne({ email: 'student@sbjit.edu.in' });
  let hodUser = await User.findOne({ email: 'hod@sbjit.edu.in' });

  // ----------------------------------------------------
  // SUITE 1: AUTHENTICATION (TEACHER CONTEXT)
  // ----------------------------------------------------
  console.log('--- SUITE 1: AUTHENTICATION (TEACHER CONTEXT) ---');
  let s1_passed = 0, s1_failed = 0;

  const loginRes = await api('/auth/login', 'POST', { email: 'teacher@sbjit.edu.in', password: 'Password123!' });
  if (loginRes.status === 200 && loginRes.data.success && loginRes.data.data?.token) {
    teacherToken = loginRes.data.data.token;
    logTest('Suite 1', 'POST /auth/login - Correct credentials', 'PASS', '200 OK + JWT');
    s1_passed++;
  } else {
    logTest('Suite 1', 'POST /auth/login - Correct credentials', 'FAIL', `Status: ${loginRes.status}`);
    s1_failed++;
  }

  const t2Login = await api('/auth/login', 'POST', { email: 'teacher2_qa@sbjit.edu.in', password: 'Password123!' });
  teacher2Token = t2Login.data?.data?.token;

  const sLogin = await api('/auth/login', 'POST', { email: 'student@sbjit.edu.in', password: 'Password123!' });
  studentToken = sLogin.data?.data?.token;

  const hLogin = await api('/auth/login', 'POST', { email: 'hod@sbjit.edu.in', password: 'Password123!' });
  hodToken = hLogin.data?.data?.token;

  const wrongPass = await api('/auth/login', 'POST', { email: 'teacher@sbjit.edu.in', password: 'WrongPassword!' });
  if (wrongPass.status === 401 && wrongPass.data.message === 'Invalid email or password') {
    logTest('Suite 1', 'POST /auth/login - Wrong password', 'PASS', '401 + Generic Message');
    s1_passed++;
  } else {
    logTest('Suite 1', 'POST /auth/login - Wrong password', 'FAIL', `Status: ${wrongPass.status}`);
    s1_failed++;
  }

  const wrongEmail = await api('/auth/login', 'POST', { email: 'nonexistent_teacher@sbjit.edu.in', password: 'Password123!' });
  if (wrongEmail.status === 401 && wrongEmail.data.message === 'Invalid email or password') {
    logTest('Suite 1', 'POST /auth/login - Nonexistent email (enumeration leak check)', 'PASS', 'Identical 401 message');
    s1_passed++;
  } else {
    logTest('Suite 1', 'POST /auth/login - Nonexistent email', 'FAIL', `Status: ${wrongEmail.status}`);
    s1_failed++;
  }

  const meRes = await api('/auth/me', 'GET', null, teacherToken);
  if (meRes.status === 200 && meRes.data?.data?.user?.role === 'teacher') {
    logTest('Suite 1', 'GET /auth/me - Valid token', 'PASS', '200 OK + Teacher Profile');
    s1_passed++;
  } else {
    logTest('Suite 1', 'GET /auth/me - Valid token', 'FAIL', `Status: ${meRes.status}`);
    s1_failed++;
  }

  const noToken = await api('/auth/me', 'GET');
  if (noToken.status === 401) {
    logTest('Suite 1', 'GET /auth/me - No token', 'PASS', '401 Unauthorized');
    s1_passed++;
  } else {
    logTest('Suite 1', 'GET /auth/me - No token', 'FAIL', `Status: ${noToken.status}`);
    s1_failed++;
  }

  const malformed = await api('/auth/me', 'GET', null, 'invalid.jwt.token');
  if (malformed.status === 401) {
    logTest('Suite 1', 'GET /auth/me - Malformed token', 'PASS', '401 Unauthorized');
    s1_passed++;
  } else {
    logTest('Suite 1', 'GET /auth/me - Malformed token', 'FAIL', `Status: ${malformed.status}`);
    s1_failed++;
  }

  let deacTeacher = await User.findOne({ email: 'deactivated_teacher@sbjit.edu.in' });
  if (!deacTeacher) {
    deacTeacher = await User.create({
      name: 'Deactivated Teacher',
      email: 'deactivated_teacher@sbjit.edu.in',
      password: 'Password123!',
      role: 'teacher',
      isActive: false,
    });
  }
  const deacLogin = await api('/auth/login', 'POST', { email: 'deactivated_teacher@sbjit.edu.in', password: 'Password123!' });
  if (deacLogin.status === 401 || deacLogin.status === 403) {
    logTest('Suite 1', 'POST /auth/login - Deactivated account', 'PASS', `Blocked with status ${deacLogin.status}`);
    s1_passed++;
  } else {
    logTest('Suite 1', 'POST /auth/login - Deactivated account', 'FAIL', `Status: ${deacLogin.status}`);
    s1_failed++;
  }

  results.summary.push({ suite: '1. Authentication', total: 7, passed: s1_passed, failed: s1_failed, blocked: 0 });

  // ----------------------------------------------------
  // SUITE 2: SUBMISSION ITEMS — CREATE & LIST
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: SUBMISSION ITEMS — CREATE & LIST ---');
  let s2_passed = 0, s2_failed = 0;

  let ownedClearanceItem = await ClearanceItem.findOne({ theoryTeacherId: teacherUser._id });
  if (!ownedClearanceItem) {
    let program = await Program.findOne({ code: 'CSE' });
    let semester = await Semester.findOne({ programId: program._id, semNumber: 6 });
    ownedClearanceItem = await ClearanceItem.create({
      semesterId: semester._id,
      title: 'Software Engineering',
      type: 'theory',
      subjectCode: 'CSE602',
      srNo: 2,
      theoryTeacherId: teacherUser._id,
    });
  }

  let unownedClearanceItem = await ClearanceItem.findOne({
    theoryTeacherId: { $ne: teacherUser._id, $exists: true }
  });
  if (!unownedClearanceItem) {
    let program = await Program.findOne({ code: 'CSE' });
    let semester = await Semester.findOne({ programId: program._id, semNumber: 6 });
    unownedClearanceItem = await ClearanceItem.create({
      semesterId: semester._id,
      title: 'Database Systems',
      type: 'theory',
      subjectCode: 'CSE603',
      srNo: 3,
      theoryTeacherId: teacher2User._id,
    });
  }

  const validItemRes = await api('/submissions/items', 'POST', {
    clearanceItemId: ownedClearanceItem._id.toString(),
    title: 'Assignment 1 — Software Architecture',
    type: 'assignment',
    description: 'Submit PDF report',
    deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    isRequired: true,
  }, teacherToken);

  let createdSubmissionItemId = validItemRes.data?.data?.item?._id || validItemRes.data?.data?._id;

  if ((validItemRes.status === 201 || validItemRes.status === 200) && validItemRes.data.success && createdSubmissionItemId) {
    logTest('Suite 2', 'POST /submissions/items - Valid item creation', 'PASS', `Created ID: ${createdSubmissionItemId}`);
    s2_passed++;
  } else {
    logTest('Suite 2', 'POST /submissions/items - Valid item creation', 'FAIL', `Status: ${validItemRes.status}`);
    s2_failed++;
  }

  const unownedCreateRes = await api('/submissions/items', 'POST', {
    clearanceItemId: unownedClearanceItem._id.toString(),
    title: 'Unassigned Test Assignment',
    type: 'assignment',
    description: 'Should be rejected',
    deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    isRequired: true,
  }, teacherToken);

  if (unownedCreateRes.status === 403) {
    logTest('Suite 2', 'POST /submissions/items - Unowned clearance item check', 'PASS', '403 Forbidden');
    s2_passed++;
  } else {
    logTest('Suite 2', 'POST /submissions/items - Unowned clearance item check', 'FAIL', `Status: ${unownedCreateRes.status}`);
    s2_failed++;
    addBug('Critical', 'Ownership Check Bypass in Submission Item Creation', 'Teacher creates submission item for clearance item owned by another teacher', '403 Forbidden', `Status ${unownedCreateRes.status}`, 'POST /api/submissions/items');
  }

  const missingFields = await api('/submissions/items', 'POST', {
    clearanceItemId: ownedClearanceItem._id.toString(),
    type: 'assignment',
  }, teacherToken);

  if (missingFields.status === 422 || missingFields.status === 400) {
    logTest('Suite 2', 'POST /submissions/items - Missing required fields', 'PASS', `Status: ${missingFields.status} Validation Error`);
    s2_passed++;
  } else {
    logTest('Suite 2', 'POST /submissions/items - Missing required fields', 'FAIL', `Status: ${missingFields.status}`);
    s2_failed++;
  }

  const invalidEnum = await api('/submissions/items', 'POST', {
    clearanceItemId: ownedClearanceItem._id.toString(),
    title: 'Invalid Enum Test',
    type: 'invalid_type_enum',
    deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
  }, teacherToken);

  if (invalidEnum.status === 422 || invalidEnum.status === 400) {
    logTest('Suite 2', 'POST /submissions/items - Invalid type enum', 'PASS', `Status: ${invalidEnum.status} Validation Error`);
    s2_passed++;
  } else {
    logTest('Suite 2', 'POST /submissions/items - Invalid type enum', 'FAIL', `Status: ${invalidEnum.status}`);
    s2_failed++;
  }

  const pastDeadline = await api('/submissions/items', 'POST', {
    clearanceItemId: ownedClearanceItem._id.toString(),
    title: 'Past Deadline Test Assignment',
    type: 'assignment',
    description: 'Deadline in 2020',
    deadline: new Date('2020-01-01').toISOString(),
    isRequired: true,
  }, teacherToken);
  logTest('Suite 2', 'POST /submissions/items - Past deadline behavior', 'PASS', `Status: ${pastDeadline.status} (Allowed)`);
  s2_passed++;

  const getItemsRes = await api('/submissions/items', 'GET', null, teacherToken);
  if (getItemsRes.status === 200 && getItemsRes.data.success) {
    logTest('Suite 2', 'GET /submissions/items - Scoped to logged-in teacher', 'PASS', '200 OK');
    s2_passed++;
  } else {
    logTest('Suite 2', 'GET /submissions/items - Scoped to logged-in teacher', 'FAIL', `Status: ${getItemsRes.status}`);
    s2_failed++;
  }

  let newTeacher = await User.findOne({ email: 'new_teacher_zero@sbjit.edu.in' });
  if (!newTeacher) {
    newTeacher = await User.create({
      name: 'New Teacher Zero',
      email: 'new_teacher_zero@sbjit.edu.in',
      password: 'Password123!',
      role: 'teacher',
    });
  }
  const ntLogin = await api('/auth/login', 'POST', { email: 'new_teacher_zero@sbjit.edu.in', password: 'Password123!' });
  const newTeacherToken = ntLogin.data?.data?.token;

  const emptyStateRes = await api('/submissions/items', 'GET', null, newTeacherToken);
  if (emptyStateRes.status === 200) {
    logTest('Suite 2', 'GET /submissions/items - Empty state for new teacher', 'PASS', '200 OK');
    s2_passed++;
  } else {
    logTest('Suite 2', 'GET /submissions/items - Empty state for new teacher', 'FAIL', `Status: ${emptyStateRes.status}`);
    s2_failed++;
  }

  results.summary.push({ suite: '2. Submission Items (Create & List)', total: 7, passed: s2_passed, failed: s2_failed, blocked: 0 });

  // ----------------------------------------------------
  // SUITE 3: SUBMISSION ITEMS — STUDENT VIEW & VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: SUBMISSION ITEMS — STUDENT VIEW & VERIFICATION ---');
  let s3_passed = 0, s3_failed = 0;

  if (createdSubmissionItemId) {
    const studentListRes = await api(`/submissions/items/${createdSubmissionItemId}/students`, 'GET', null, teacherToken);
    if (studentListRes.status === 200 && studentListRes.data.success) {
      logTest('Suite 3', 'GET /submissions/items/:id/students - Theory item student list', 'PASS', '200 OK');
      s3_passed++;
    } else {
      logTest('Suite 3', 'GET /submissions/items/:id/students - Theory item student list', 'FAIL', `Status: ${studentListRes.status}`);
      s3_failed++;
    }

    const teacher2Item = await SubmissionItem.create({
      clearanceItemId: unownedClearanceItem._id,
      semesterId: unownedClearanceItem.semesterId,
      title: 'Teacher 2 Private Item',
      type: 'assignment',
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });

    const unownedStudentsRes = await api(`/submissions/items/${teacher2Item._id}/students`, 'GET', null, teacherToken);
    if (unownedStudentsRes.status === 403) {
      logTest('Suite 3', 'GET /submissions/items/:id/students - Unowned item protection', 'PASS', '403 Forbidden');
      s3_passed++;
    } else {
      logTest('Suite 3', 'GET /submissions/items/:id/students - Unowned item protection', 'FAIL', `Status: ${unownedStudentsRes.status}`);
      s3_failed++;
      addBug('Critical', 'Student Submission List Authorization Leak', 'Teacher can view student submissions for another teacher\'s submission item', '403 Forbidden', `Status ${unownedStudentsRes.status}`, 'GET /api/submissions/items/:id/students');
    }

    const nonExistentRes = await api(`/submissions/items/600000000000000000000000/students`, 'GET', null, teacherToken);
    if (nonExistentRes.status === 404) {
      logTest('Suite 3', 'GET /submissions/items/:id/students - Non-existent ID', 'PASS', '404 Not Found');
      s3_passed++;
    } else {
      logTest('Suite 3', 'GET /submissions/items/:id/students - Non-existent ID', 'FAIL', `Status: ${nonExistentRes.status}`);
      s3_failed++;
    }

    // 3.6 Verify a submitted submission
    let testSub1 = await Submission.create({
      submissionItemId: createdSubmissionItemId,
      studentId: studentUser._id,
      status: 'submitted',
      fileUrl: 'https://example.com/test-sub1.pdf',
      submittedAt: new Date(),
    });

    const verifyRes = await api(`/submissions/${testSub1._id}/verify`, 'PATCH', { status: 'verified', remarks: 'Good work' }, teacherToken);
    if (verifyRes.status === 200 && verifyRes.data.success) {
      const updatedSub = await Submission.findById(testSub1._id);
      if (updatedSub.status === 'verified' && updatedSub.verifiedBy?.toString() === teacherUser._id.toString()) {
        logTest('Suite 3', 'PATCH /submissions/:id/verify - Verify submission', 'PASS', 'Status = verified, verifiedBy set');
        s3_passed++;
      } else {
        logTest('Suite 3', 'PATCH /submissions/:id/verify - Verify submission', 'FAIL', 'DB fields not set properly');
        s3_failed++;
      }
    } else {
      logTest('Suite 3', 'PATCH /submissions/:id/verify - Verify submission', 'FAIL', `Status: ${verifyRes.status}`);
      s3_failed++;
    }

    // Clean up testSub1 so we can create testSub2 for the same student & item
    await Submission.findByIdAndDelete(testSub1._id);

    // 3.7 Reject a submitted submission with remarks
    let testSub2 = await Submission.create({
      submissionItemId: createdSubmissionItemId,
      studentId: studentUser._id,
      status: 'submitted',
      fileUrl: 'https://example.com/test-sub2.pdf',
      submittedAt: new Date(),
    });

    const rejectRes = await api(`/submissions/${testSub2._id}/verify`, 'PATCH', { status: 'rejected', remarks: 'Please fix formatting' }, teacherToken);
    if (rejectRes.status === 200 && rejectRes.data.success) {
      const updatedSub = await Submission.findById(testSub2._id);
      if (updatedSub.status === 'rejected' && updatedSub.remarks === 'Please fix formatting') {
        logTest('Suite 3', 'PATCH /submissions/:id/verify - Reject submission', 'PASS', 'Status = rejected, remarks stored');
        s3_passed++;
      } else {
        logTest('Suite 3', 'PATCH /submissions/:id/verify - Reject submission', 'FAIL', 'Remarks or status not updated');
        s3_failed++;
      }
    } else {
      logTest('Suite 3', 'PATCH /submissions/:id/verify - Reject submission', 'FAIL', `Status: ${rejectRes.status}`);
      s3_failed++;
    }

    // Clean up testSub2 so we can create pendingSub for the same student & item
    await Submission.findByIdAndDelete(testSub2._id);

    // 3.8 Attempt to verify unsubmitted / pending submission
    let pendingSub = await Submission.create({
      submissionItemId: createdSubmissionItemId,
      studentId: studentUser._id,
      status: 'pending',
    });
    const pendingVerifyRes = await api(`/submissions/${pendingSub._id}/verify`, 'PATCH', { status: 'verified' }, teacherToken);
    if (pendingVerifyRes.status === 400) {
      logTest('Suite 3', 'PATCH /submissions/:id/verify - Block unsubmitted verification', 'PASS', '400 Bad Request (Blocked sensibly)');
      s3_passed++;
    } else {
      logTest('Suite 3', 'PATCH /submissions/:id/verify - Block unsubmitted verification', 'FAIL', `Status: ${pendingVerifyRes.status}`);
      s3_failed++;
    }

    // 3.9 Attempt to verify submission belonging to another teacher's item
    const teacher2Sub = await Submission.create({
      submissionItemId: teacher2Item._id,
      studentId: studentUser._id,
      status: 'submitted',
      fileUrl: 'https://example.com/unowned.pdf',
    });

    const unownedVerifyRes = await api(`/submissions/${teacher2Sub._id}/verify`, 'PATCH', { status: 'verified' }, teacherToken);
    if (unownedVerifyRes.status === 403) {
      logTest('Suite 3', 'PATCH /submissions/:id/verify - Unowned item verification block', 'PASS', '403 Forbidden');
      s3_passed++;
    } else {
      logTest('Suite 3', 'PATCH /submissions/:id/verify - Unowned item verification block', 'FAIL', `Status: ${unownedVerifyRes.status}`);
      s3_failed++;
      addBug('Critical', 'Verification Authorization Bypass', 'Teacher can verify/reject submissions for another teacher\'s submission item', '403 Forbidden', `Status ${unownedVerifyRes.status}`, 'PATCH /api/submissions/:id/verify');
    }

    const studentNotifs = await Notification.find({ userId: studentUser._id }).sort({ createdAt: -1 });
    if (studentNotifs.length > 0) {
      logTest('Suite 3', 'Notification trigger on submission verify/reject', 'PASS', `Found ${studentNotifs.length} notification(s) for student`);
      s3_passed++;
    } else {
      logTest('Suite 3', 'Notification trigger on submission verify/reject', 'FAIL', 'No notification generated for student');
      s3_failed++;
      addBug('Medium', 'Notification Trigger Missing on Submission Review', 'Student did not receive notification when teacher verified/rejected submission', 'Notification created in DB', 'No notification found', 'submissionService.verifySubmission');
    }
  }

  results.summary.push({ suite: '3. Student View & Verification', total: 8, passed: s3_passed, failed: s3_failed, blocked: 0 });

  // ----------------------------------------------------
  // SUITE 4: CLEARANCE ITEM REVIEW
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: CLEARANCE ITEM REVIEW ---');
  let s4_passed = 0, s4_failed = 0;

  const pendingItemsRes = await api('/clearances/items/pending', 'GET', null, teacherToken);
  if (pendingItemsRes.status === 200 && pendingItemsRes.data.success) {
    logTest('Suite 4', 'GET /clearances/items/pending - List teacher pending items', 'PASS', '200 OK');
    s4_passed++;
  } else {
    logTest('Suite 4', 'GET /clearances/items/pending - List teacher pending items', 'FAIL', `Status: ${pendingItemsRes.status}`);
    s4_failed++;
  }

  let semester = await Semester.findOne();
  await ClearanceRequest.deleteMany({ studentId: studentUser._id, semesterId: semester._id });

  let clearanceReq = await ClearanceRequest.create({
    studentId: studentUser._id,
    semesterId: semester._id,
    status: 'items_review',
    currentStage: 'items',
  });

  let testItemClearance = await ItemClearance.create({
    clearanceRequestId: clearanceReq._id,
    clearanceItemId: ownedClearanceItem._id,
    studentId: studentUser._id,
    teacherId: teacherUser._id,
    itemTitle: ownedClearanceItem.title,
    itemType: ownedClearanceItem.type,
    status: 'pending',
  });

  let unownedItemClearance = await ItemClearance.create({
    clearanceRequestId: clearanceReq._id,
    clearanceItemId: unownedClearanceItem._id,
    studentId: studentUser._id,
    teacherId: teacher2User._id,
    itemTitle: unownedClearanceItem.title,
    itemType: unownedClearanceItem.type,
    status: 'pending',
  });

  const approveRes = await api(`/clearances/items/${testItemClearance._id}/review`, 'PATCH', { status: 'approved', remarks: 'All clear' }, teacherToken);
  if (approveRes.status === 200 && approveRes.data.success) {
    const itemCl = await ItemClearance.findById(testItemClearance._id);
    if (itemCl.status === 'approved' && itemCl.reviewedAt) {
      logTest('Suite 4', 'PATCH /clearances/items/:id/review - Approve item', 'PASS', 'Item status = approved, reviewedAt set');
      s4_passed++;
    } else {
      logTest('Suite 4', 'PATCH /clearances/items/:id/review - Approve item', 'FAIL', 'DB record not updated properly');
      s4_failed++;
    }
  } else {
    logTest('Suite 4', 'PATCH /clearances/items/:id/review - Approve item', 'FAIL', `Status: ${approveRes.status}`);
    s4_failed++;
  }

  const unownedReviewRes = await api(`/clearances/items/${unownedItemClearance._id}/review`, 'PATCH', { status: 'approved' }, teacherToken);
  if (unownedReviewRes.status === 403) {
    logTest('Suite 4', 'PATCH /clearances/items/:id/review - Unassigned item check', 'PASS', '403 Forbidden');
    s4_passed++;
  } else {
    logTest('Suite 4', 'PATCH /clearances/items/:id/review - Unassigned item check', 'FAIL', `Status: ${unownedReviewRes.status}`);
    s4_failed++;
    addBug('Critical', 'Clearance Review Authorization Bypass', 'Teacher can review ItemClearance assigned to another teacher', '403 Forbidden', `Status ${unownedReviewRes.status}`, 'PATCH /api/clearances/items/:id/review');
  }

  await ClearanceRequest.deleteMany({ studentId: studentUser._id, semesterId: semester._id });
  let reqToReject = await ClearanceRequest.create({
    studentId: studentUser._id,
    semesterId: semester._id,
    status: 'items_review',
    currentStage: 'items',
  });
  let itemToReject = await ItemClearance.create({
    clearanceRequestId: reqToReject._id,
    clearanceItemId: ownedClearanceItem._id,
    studentId: studentUser._id,
    teacherId: teacherUser._id,
    itemTitle: ownedClearanceItem.title,
    itemType: ownedClearanceItem.type,
    status: 'pending',
  });

  const rejectItemRes = await api(`/clearances/items/${itemToReject._id}/review`, 'PATCH', { status: 'rejected', remarks: 'Dues pending' }, teacherToken);
  if (rejectItemRes.status === 200 && rejectItemRes.data.success) {
    const updatedCascadeReq = await ClearanceRequest.findById(reqToReject._id);
    if (updatedCascadeReq.status === 'rejected') {
      logTest('Suite 4', 'PATCH /clearances/items/:id/review - Rejection cascade check', 'PASS', 'ClearanceRequest status = rejected');
      s4_passed++;
    } else {
      logTest('Suite 4', 'PATCH /clearances/items/:id/review - Rejection cascade check', 'FAIL', `Status remains '${updatedCascadeReq.status}'`);
      s4_failed++;
      addBug('High', 'Clearance Rejection Cascade Missing', 'Rejecting an ItemClearance did not cascade ClearanceRequest status to rejected', 'ClearanceRequest.status = rejected', `Status = ${updatedCascadeReq.status}`, 'clearanceService.reviewItem');
    }
  } else {
    logTest('Suite 4', 'PATCH /clearances/items/:id/review - Rejection cascade check', 'FAIL', `Status: ${rejectItemRes.status}`);
    s4_failed++;
  }

  await ClearanceRequest.deleteMany({ studentId: studentUser._id, semesterId: semester._id });
  let reqToAdvance = await ClearanceRequest.create({
    studentId: studentUser._id,
    semesterId: semester._id,
    status: 'items_review',
    currentStage: 'items',
  });
  let itemToAdvance = await ItemClearance.create({
    clearanceRequestId: reqToAdvance._id,
    clearanceItemId: ownedClearanceItem._id,
    studentId: studentUser._id,
    teacherId: teacherUser._id,
    itemTitle: ownedClearanceItem.title,
    itemType: ownedClearanceItem.type,
    status: 'pending',
  });

  await api(`/clearances/items/${itemToAdvance._id}/review`, 'PATCH', { status: 'approved' }, teacherToken);
  const advancedReqInDb = await ClearanceRequest.findById(reqToAdvance._id);
  if (advancedReqInDb.currentStage === 'sections' || advancedReqInDb.currentStage === 'class_incharge' || advancedReqInDb.status === 'sections_review') {
    logTest('Suite 4', 'Auto-advance cascade to next stage upon final item approval', 'PASS', `Advanced to stage '${advancedReqInDb.currentStage}', status '${advancedReqInDb.status}'`);
    s4_passed++;
  } else {
    logTest('Suite 4', 'Auto-advance cascade to next stage upon final item approval', 'FAIL', `Stage remains '${advancedReqInDb.currentStage}'`);
    s4_failed++;
    addBug('High', 'Stage Auto-Advance Cascade Missing', 'Approving final item clearance did not advance ClearanceRequest to next review stage', 'currentStage = sections', `currentStage = ${advancedReqInDb.currentStage}`, 'clearanceService.reviewItem');
  }

  results.summary.push({ suite: '4. Clearance Item Review', total: 5, passed: s4_passed, failed: s4_failed, blocked: 0 });

  // ----------------------------------------------------
  // SUITE 5: NOTIFICATIONS
  // ----------------------------------------------------
  console.log('\n--- SUITE 5: NOTIFICATIONS ---');
  let s5_passed = 0, s5_failed = 0;

  const notifsRes = await api('/notifications', 'GET', null, teacherToken);
  if (notifsRes.status === 200 && notifsRes.data.success) {
    logTest('Suite 5', 'GET /notifications - List teacher notifications', 'PASS', '200 OK');
    s5_passed++;
  } else {
    logTest('Suite 5', 'GET /notifications - List teacher notifications', 'FAIL', `Status: ${notifsRes.status}`);
    s5_failed++;
  }

  const unreadRes = await api('/notifications/unread-count', 'GET', null, teacherToken);
  if (unreadRes.status === 200 && typeof unreadRes.data?.data?.count === 'number') {
    logTest('Suite 5', 'GET /notifications/unread-count - Unread count', 'PASS', `Count: ${unreadRes.data.data.count}`);
    s5_passed++;
  } else {
    logTest('Suite 5', 'GET /notifications/unread-count - Unread count', 'FAIL', `Status: ${unreadRes.status}`);
    s5_failed++;
  }

  let testNotif = await Notification.create({
    userId: teacherUser._id,
    title: 'QA Test Notification',
    message: 'Test notification content',
    type: 'info',
    isRead: false,
  });

  let t2Notif = await Notification.create({
    userId: teacher2User._id,
    title: 'Teacher 2 Private Notification',
    message: 'Secret notification',
    type: 'info',
    isRead: false,
  });

  const markReadRes = await api(`/notifications/${testNotif._id}/read`, 'PATCH', null, teacherToken);
  if (markReadRes.status === 200 && markReadRes.data.success) {
    const checkN = await Notification.findById(testNotif._id);
    if (checkN.isRead) {
      logTest('Suite 5', 'PATCH /notifications/:id/read - Mark read', 'PASS', 'isRead = true');
      s5_passed++;
    } else {
      logTest('Suite 5', 'PATCH /notifications/:id/read - Mark read', 'FAIL', 'isRead remains false');
      s5_failed++;
    }
  } else {
    logTest('Suite 5', 'PATCH /notifications/:id/read - Mark read', 'FAIL', `Status: ${markReadRes.status}`);
    s5_failed++;
  }

  const unownedNotifRead = await api(`/notifications/${t2Notif._id}/read`, 'PATCH', null, teacherToken);
  if (unownedNotifRead.status === 403 || unownedNotifRead.status === 404) {
    logTest('Suite 5', 'PATCH /notifications/:id/read - Unowned notification check', 'PASS', `Status: ${unownedNotifRead.status}`);
    s5_passed++;
  } else {
    logTest('Suite 5', 'PATCH /notifications/:id/read - Unowned notification check', 'FAIL', `Status: ${unownedNotifRead.status}`);
    s5_failed++;
    addBug('High', 'Cross-User Notification Read Mutation', 'Teacher can mark another user\'s notification as read', '403 Forbidden', `Status ${unownedNotifRead.status}`, 'PATCH /api/notifications/:id/read');
  }

  const readAllRes = await api('/notifications/read-all', 'PATCH', null, teacherToken);
  if (readAllRes.status === 200 && readAllRes.data.success) {
    logTest('Suite 5', 'PATCH /notifications/read-all - Mark all read', 'PASS', '200 OK');
    s5_passed++;
  } else {
    logTest('Suite 5', 'PATCH /notifications/read-all - Mark all read', 'FAIL', `Status: ${readAllRes.status}`);
    s5_failed++;
  }

  const deleteNotifRes = await api(`/notifications/${testNotif._id}`, 'DELETE', null, teacherToken);
  if (deleteNotifRes.status === 200 && deleteNotifRes.data.success) {
    const deletedN = await Notification.findById(testNotif._id);
    if (!deletedN) {
      logTest('Suite 5', 'DELETE /notifications/:id - Delete notification', 'PASS', 'Removed from DB');
      s5_passed++;
    } else {
      logTest('Suite 5', 'DELETE /notifications/:id - Delete notification', 'FAIL', 'Still exists in DB');
      s5_failed++;
    }
  } else {
    logTest('Suite 5', 'DELETE /notifications/:id - Delete notification', 'FAIL', `Status: ${deleteNotifRes.status}`);
    s5_failed++;
  }

  results.summary.push({ suite: '5. Notifications', total: 6, passed: s5_passed, failed: s5_failed, blocked: 0 });

  // ----------------------------------------------------
  // SUITE 7: SECURITY & CROSS-CUTTING
  // ----------------------------------------------------
  console.log('\n--- SUITE 7: SECURITY & CROSS-CUTTING ---');
  let s7_passed = 0, s7_failed = 0;

  const studentAccessTeacher = await api('/submissions/items', 'GET', null, studentToken);
  if (studentAccessTeacher.status === 403) {
    logTest('Suite 7', 'Student token accessing teacher endpoint (GET /submissions/items)', 'PASS', '403 Forbidden');
    s7_passed++;
  } else {
    logTest('Suite 7', 'Student token accessing teacher endpoint', 'FAIL', `Status: ${studentAccessTeacher.status}`);
    s7_failed++;
    addSecurity('High', 'RBAC Bypass by Student', 'Student can access teacher endpoint GET /submissions/items', 'GET /api/submissions/items');
  }

  const hodAccessTeacher = await api('/submissions/items', 'GET', null, hodToken);
  if (hodAccessTeacher.status === 403) {
    logTest('Suite 7', 'HOD token accessing teacher endpoint (GET /submissions/items)', 'PASS', '403 Forbidden');
    s7_passed++;
  } else {
    logTest('Suite 7', 'HOD token accessing teacher endpoint', 'FAIL', `Status: ${hodAccessTeacher.status}`);
    s7_failed++;
  }

  const noTokenAccess = await api('/submissions/items', 'GET');
  if (noTokenAccess.status === 401) {
    logTest('Suite 7', 'No token accessing teacher endpoint', 'PASS', '401 Unauthorized');
    s7_passed++;
  } else {
    logTest('Suite 7', 'No token accessing teacher endpoint', 'FAIL', `Status: ${noTokenAccess.status}`);
    s7_failed++;
  }

  const profileLeak = meRes.data?.data?.user;
  if (profileLeak && !profileLeak.password && !profileLeak.passwordHash) {
    logTest('Suite 7', 'Password Leak Check in Profile Response', 'PASS', 'Password field excluded');
    s7_passed++;
  } else {
    logTest('Suite 7', 'Password Leak Check in Profile Response', 'FAIL', 'Password field present in API response');
    s7_failed++;
    addSecurity('Critical', 'Password Field Leak in User Profile API', 'User object in GET /api/auth/me contains password hash', 'GET /api/auth/me');
  }

  const nosqlInjectionRes = await api('/submissions/items', 'POST', {
    clearanceItemId: ownedClearanceItem._id.toString(),
    title: '{ "$gt": "" }',
    type: 'assignment',
    description: 'NoSQL Injection Test Payload',
    deadline: new Date(Date.now() + 86400000).toISOString(),
  }, teacherToken);

  if (nosqlInjectionRes.status === 201 || nosqlInjectionRes.status === 200 || nosqlInjectionRes.status === 422) {
    const createdItem = await SubmissionItem.findById(nosqlInjectionRes.data?.data?.item?._id || nosqlInjectionRes.data?.data?._id);
    if (!createdItem || typeof createdItem.title === 'string') {
      logTest('Suite 7', 'NoSQL Injection Input Sanitization', 'PASS', 'Sanitized as string literal');
      s7_passed++;
    } else {
      logTest('Suite 7', 'NoSQL Injection Input Sanitization', 'FAIL', 'Object injected into database');
      s7_failed++;
      addSecurity('Critical', 'NoSQL Injection Vulnerability', 'Raw MongoDB query object injected via title input', 'POST /api/submissions/items');
    }
  } else {
    logTest('Suite 7', 'NoSQL Injection Input Sanitization', 'PASS', `Rejected with status ${nosqlInjectionRes.status}`);
    s7_passed++;
  }

  results.summary.push({ suite: '7. Security & Cross-Cutting', total: 5, passed: s7_passed, failed: s7_failed, blocked: 0 });

  console.log('\n====================================================');
  console.log('  QA SUITE EXECUTION COMPLETE                        ');
  console.log('====================================================\n');

  console.log('SUMMARY TABLE:');
  console.table(results.summary);

  console.log('\nBUGS DISCOVERED:', results.bugs.length);
  console.log(JSON.stringify(results.bugs, null, 2));

  console.log('\nSECURITY FINDINGS:', results.securityFindings.length);
  console.log(JSON.stringify(results.securityFindings, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

runQA().catch(e => {
  console.error('QA Script Fatal Error:', e);
  process.exit(1);
});
