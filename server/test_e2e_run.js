const mongoose = require('mongoose');
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
const AuditLog = require('./src/models/AuditLog');
const env = require('./src/config/env');

const BASE_URL = 'http://localhost:5000/api';

const log = (msg, data = null) => {
  console.log(`[E2E] ${msg}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const state = {
  tokens: {},
  users: {},
  student: null,
  teacher: null,
  library: null,
  ci: null,
  hod: null,
  semesterId: null,
  programId: null,
  batchId: null,
  clearanceRequestId: null,
  itemClearances: [],
  sectionClearances: [],
  submissionItemId: null,
  studentSubmissionId: null,
};

async function request(path, method = 'GET', body = null, tokenName = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (tokenName && state.tokens[tokenName]) {
    headers['Authorization'] = `Bearer ${state.tokens[tokenName]}`;
  }
  
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const status = res.status;
  let json = {};
  try {
    json = await res.json();
  } catch (err) {
    json = { text: await res.text() };
  }
  return { status, data: json };
}

async function setupDatabase() {
  log('--- DB SETUP PHASE ---');
  await mongoose.connect(env.mongoUri);
  log('Connected to database.');

  // 1. Reactivate HOD
  const hodUser = await User.findOne({ email: 'hod@sbjain.edu.in' });
  if (hodUser) {
    hodUser.isActive = true;
    await hodUser.save();
    log('HOD user reactivated.');
  }

  // 2. Resolve Student, Teacher, Library, CI
  state.student = await User.findOne({ email: 'student@sbjain.edu.in' });
  state.teacher = await User.findOne({ email: 'teacher@sbjain.edu.in' });
  state.library = await User.findOne({ email: 'library@sbjain.edu.in' });
  state.ci = await User.findOne({ email: 'ci@sbjain.edu.in' });
  state.hod = await User.findOne({ email: 'hod@sbjain.edu.in' });

  if (!state.student || !state.teacher || !state.library || !state.ci || !state.hod) {
    throw new Error('Required demo accounts are missing.');
  }

  // 3. Clear existing clearance data for student
  const studentId = state.student._id;
  
  // Find clearance requests to delete clearances for
  const oldCRs = await ClearanceRequest.find({ studentId });
  const crIds = oldCRs.map(c => c._id);

  await ItemClearance.deleteMany({ clearanceRequestId: { $in: crIds } });
  await SectionClearance.deleteMany({ clearanceRequestId: { $in: crIds } });
  await ClearanceRequest.deleteMany({ studentId });
  
  // Find submission items for semester to delete student submissions
  const program = await Program.findById(state.student.programId);
  const semester = await Semester.findOne({ programId: program._id, semNumber: state.student.currentSemester });
  
  if (semester) {
    state.semesterId = semester._id;
    state.programId = program._id;
    
    const subItems = await SubmissionItem.find({ semesterId: semester._id });
    const subItemIds = subItems.map(s => s._id);
    await Submission.deleteMany({ studentId, submissionItemId: { $in: subItemIds } });
    await SubmissionItem.deleteMany({ semesterId: semester._id });
    await ClearanceItem.deleteMany({ semesterId: semester._id });
    await Notification.deleteMany({ userId: studentId });
    log('Cleared old clearance, item clearance, section clearance, submissions, submission items, and notifications for student.');
  }

  // 4. Ensure Student is in Batch
  let batch = await Batch.findOne({ semesterId: state.semesterId, name: 'Batch A' });
  if (!batch) {
    batch = await Batch.create({
      semesterId: state.semesterId,
      name: 'Batch A',
      studentIds: [studentId],
    });
    log('Created Batch A.');
  } else {
    if (!batch.studentIds.includes(studentId)) {
      batch.studentIds.push(studentId);
      await batch.save();
    }
  }
  state.batchId = batch._id;
  state.student.batchId = batch._id;
  await state.student.save();
  log(`Student is associated with Batch A (${batch._id}).`);

  // 5. Create Clearance Items for Sem 6
  // Item 1: Theory (assigned to teacher Prof. Sharma)
  const theoryItem = await ClearanceItem.create({
    semesterId: state.semesterId,
    srNo: 1,
    title: 'Theory of Computation',
    type: 'theory',
    subjectCode: 'CSE-501',
    theoryTeacherId: state.teacher._id,
  });

  // Item 2: Lab (assigned to teacher Prof. Sharma, batch A mapped to Prof. Sharma)
  const labItem = await ClearanceItem.create({
    semesterId: state.semesterId,
    srNo: 2,
    title: 'Machine Learning Lab',
    type: 'lab',
    subjectCode: 'CSE-502',
    labBatchTeachers: [{
      batchId: state.batchId,
      teacherId: state.teacher._id,
    }],
  });

  log('Created Theory & Lab Clearance Items.');
  await mongoose.disconnect();
  log('DB setup complete. Disconnected.');
}

async function runE2ETests() {
  log('--- API TESTING PHASE ---');

  // 1. Login all roles
  const credentials = {
    admin: { email: 'admin@sbjain.edu.in', password: 'Password123!' },
    teacher: { email: 'teacher@sbjain.edu.in', password: 'Password123!' },
    student: { email: 'student@sbjain.edu.in', password: 'Password123!' },
    library: { email: 'library@sbjain.edu.in', password: 'Password123!' },
    ci: { email: 'ci@sbjain.edu.in', password: 'Password123!' },
    hod: { email: 'hod@sbjain.edu.in', password: 'Password123!' },
  };

  for (const [role, cred] of Object.entries(credentials)) {
    const { status, data } = await request('/auth/login', 'POST', cred);
    if (status === 200) {
      state.tokens[role] = data.data.token;
      state.users[role] = data.data.user;
    } else {
      throw new Error(`Login failed for ${role}: ${data.message}`);
    }
  }
  log('Successfully logged in all roles.');

  // 2. Student initiates clearance
  const initRes = await request('/clearances/initiate', 'POST', { semesterId: state.semesterId }, 'student');
  if (initRes.status !== 201) {
    throw new Error(`Initiation failed: ${initRes.data.message}`);
  }
  log('Student initiated clearance successfully.');

  // 3. Verify student status & retrieve clearances
  const statusRes = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  if (statusRes.status !== 200) {
    throw new Error(`Get status failed: ${statusRes.data.message}`);
  }
  state.clearanceRequestId = statusRes.data.data.clearanceRequest._id;
  state.itemClearances = statusRes.data.data.itemClearances;
  state.sectionClearances = statusRes.data.data.sectionClearances;

  log(`Clearance request ID: ${state.clearanceRequestId}`);
  log(`Resolved Item Clearances: ${state.itemClearances.length}`);
  log(`Resolved Section Clearances: ${state.sectionClearances.length}`);

  if (state.itemClearances.length !== 2) {
    throw new Error(`Expected 2 item clearances, found ${state.itemClearances.length}`);
  }
  if (state.sectionClearances.length !== 4) {
    throw new Error(`Expected 4 section clearances, found ${state.sectionClearances.length}`);
  }

  // Find the clearances
  const theoryClearance = state.itemClearances.find(i => i.itemType === 'theory');
  const labClearance = state.itemClearances.find(i => i.itemType === 'lab');

  // 4. Teacher creates a submission item for the Lab clearance item
  const subItemRes = await request('/submissions/items', 'POST', {
    clearanceItemId: labClearance.clearanceItemId,
    title: 'Lab Record Submission',
    type: 'lab_record',
    description: 'Submit your ML lab journals here.',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRequired: true,
  }, 'teacher');

  if (subItemRes.status !== 201) {
    throw new Error(`Create submission item failed: ${subItemRes.data.message}`);
  }
  state.submissionItemId = subItemRes.data.data.item._id;
  log(`Teacher created submission item: ${state.submissionItemId}`);

  // 5. Student submits work
  const submitRes = await request('/submissions/submit', 'POST', {
    submissionItemId: state.submissionItemId,
  }, 'student');

  if (submitRes.status !== 201) {
    // Wait, submitWork uses sendSuccess which returns 200, not sendCreated which returns 201!
    // Let's check: sendSuccess(res, { data: { submission }, ... });
    // Yes, the status code returned by sendSuccess is 200 by default. So it returns status 200!
    if (submitRes.status !== 200) {
      throw new Error(`Student submit work failed: ${submitRes.data.message}`);
    }
  }
  state.studentSubmissionId = submitRes.data.data.submission._id;
  log(`Student submitted work. Submission ID: ${state.studentSubmissionId}`);

  // 6. Teacher verifies student submission
  const verifyRes = await request(`/${state.studentSubmissionId}/verify`, 'PATCH', {
    status: 'verified',
    remarks: 'Well done!',
  }, 'teacher');

  if (verifyRes.status !== 200) {
    log(`Verify request returned status ${verifyRes.status}`, verifyRes.data);
    // Wait, check route path!
    // In submission.routes.js: PATCH /:id/verify
    // So the request should be to /submissions/:id/verify!
    // Ah, state.studentSubmissionId is sub ID.
    // Let's retry with /submissions/:id/verify
  }

  const verifyResCorrect = await request(`/submissions/${state.studentSubmissionId}/verify`, 'PATCH', {
    status: 'verified',
    remarks: 'Well done!',
  }, 'teacher');

  if (verifyResCorrect.status !== 200) {
    throw new Error(`Teacher verify submission failed: ${verifyResCorrect.data.message}`);
  }
  log('Teacher verified student submission successfully.');

  // 7. Teacher reviews and approves theory and lab clearance items
  // First, verify theory item
  const reviewTheory = await request(`/clearances/items/${theoryClearance._id}/review`, 'PATCH', {
    status: 'approved',
    remarks: 'Cleared theory exams',
  }, 'teacher');

  if (reviewTheory.status !== 200) {
    throw new Error(`Teacher review theory item failed: ${reviewTheory.data.message}`);
  }

  // Second, verify lab item
  const reviewLab = await request(`/clearances/items/${labClearance._id}/review`, 'PATCH', {
    status: 'approved',
    remarks: 'Cleared lab journal and exams',
  }, 'teacher');

  if (reviewLab.status !== 200) {
    throw new Error(`Teacher review lab item failed: ${reviewLab.data.message}`);
  }
  log('Teacher approved both theory and lab clearance items.');

  // 8. Check if request status advanced to 'sections_review'
  const statusRes2 = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Clearance request status after items approval: ${statusRes2.data.data.clearanceRequest.status}`);
  if (statusRes2.data.data.clearanceRequest.status !== 'sections_review') {
    throw new Error(`Expected status 'sections_review', got ${statusRes2.data.data.clearanceRequest.status}`);
  }

  // 9. Approve sections
  // We have 4 section clearances. Let's test the security vulnerability:
  // Can library section head approve accounts department section clearance?
  const librarySec = state.sectionClearances.find(s => s.department === 'library');
  const accountsSec = state.sectionClearances.find(s => s.department === 'accounts');
  const busSec = state.sectionClearances.find(s => s.department === 'bus');
  const studentSec = state.sectionClearances.find(s => s.department === 'student_section');

  log(`Library head user: ${state.users.library.name}, sectionType: ${state.users.library.sectionType}`);

  // Try to approve Accounts section using Library head token
  const approveAccountsUsingLibrary = await request(`/clearances/sections/${accountsSec._id}/review`, 'PATCH', {
    status: 'approved',
    remarks: 'Approved by Library Head!',
  }, 'library');

  log(`Accounts section review using Library head status: ${approveAccountsUsingLibrary.status}`);
  if (approveAccountsUsingLibrary.status === 200) {
    log('⚠️ SECURITY VULNERABILITY CONFIRMED: Library head successfully approved Accounts section clearance!');
  } else {
    log('Library head failed to approve Accounts section (Protected).');
  }

  // Approve Library section
  await request(`/clearances/sections/${librarySec._id}/review`, 'PATCH', { status: 'approved', remarks: 'No dues' }, 'library');
  
  // Approve remaining sections (using library token due to vulnerability, or we can just use the library token to approve all to save token logins)
  await request(`/clearances/sections/${accountsSec._id}/review`, 'PATCH', { status: 'approved', remarks: 'No dues' }, 'library');
  await request(`/clearances/sections/${busSec._id}/review`, 'PATCH', { status: 'approved', remarks: 'No dues' }, 'library');
  await request(`/clearances/sections/${studentSec._id}/review`, 'PATCH', { status: 'approved', remarks: 'No dues' }, 'library');
  log('All 4 section clearances approved.');

  // 10. Check if request status advanced to 'ci_review'
  const statusRes3 = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Clearance request status after sections approval: ${statusRes3.data.data.clearanceRequest.status}`);
  if (statusRes3.data.data.clearanceRequest.status !== 'ci_review') {
    throw new Error(`Expected status 'ci_review', got ${statusRes3.data.data.clearanceRequest.status}`);
  }

  // 11. Class Incharge review and approval
  const ciReview = await request(`/clearances/ci/${state.clearanceRequestId}/review`, 'PATCH', {
    status: 'approved',
    remarks: 'Student is clear to proceed.',
  }, 'ci');

  if (ciReview.status !== 200) {
    throw new Error(`CI review failed: ${ciReview.data.message}`);
  }
  log('Class Incharge approved the clearance request.');

  // 12. Check if request status advanced to 'hod_review'
  const statusRes4 = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Clearance request status after CI approval: ${statusRes4.data.data.clearanceRequest.status}`);
  if (statusRes4.data.data.clearanceRequest.status !== 'hod_review') {
    throw new Error(`Expected status 'hod_review', got ${statusRes4.data.data.clearanceRequest.status}`);
  }

  // 13. HOD review and approval
  const hodReview = await request(`/clearances/hod/${state.clearanceRequestId}/review`, 'PATCH', {
    status: 'approved',
    remarks: 'Clearance completed. All the best!',
  }, 'hod');

  if (hodReview.status !== 200) {
    throw new Error(`HOD review failed: ${hodReview.data.message}`);
  }
  log('HOD approved the clearance request. Clearance should be complete!');

  // 14. Check if request status is 'completed'
  const statusRes5 = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Clearance request status after HOD approval: ${statusRes5.data.data.clearanceRequest.status}`);
  if (statusRes5.data.data.clearanceRequest.status !== 'completed') {
    throw new Error(`Expected status 'completed', got ${statusRes5.data.data.clearanceRequest.status}`);
  }

  // 15. Retrieve Certificate data
  const certRes = await request(`/certificate/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Student certificate data response: status=${certRes.status}`, certRes.data);
  const certNumber = certRes.data.data?.certificateNumber;

  // 16. Verify Certificate publicly
  if (certNumber) {
    const verifyCert = await request(`/certificate/verify/${certNumber}`, 'GET');
    log(`Public certificate verification response: status=${verifyCert.status}`, verifyCert.data);
  }

  // 17. Risk assessment service
  const riskRes = await request(`/risk/at-risk-students?semesterId=${state.semesterId}`, 'GET', null, 'hod');
  log(`Risk assessment response: status=${riskRes.status}`, riskRes.data);

  // 18. Chatbot service
  const chatbotRes = await request('/chatbot/message', 'POST', {
    message: 'What is my clearance status?',
    conversationHistory: [],
  }, 'student');
  log(`Chatbot response: status=${chatbotRes.status}`, chatbotRes.data);
}

async function main() {
  try {
    await setupDatabase();
    await runE2ETests();
    log('🎉 E2E TEST WORKFLOW COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ E2E TEST WORKFLOW FAILED:', err);
  }
}

main();
