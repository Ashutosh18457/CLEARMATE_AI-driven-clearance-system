const mongoose = require('mongoose');
const env = require('./src/config/env');
const User = require('./src/models/User');
const Program = require('./src/models/Program');
const AuditLog = require('./src/models/AuditLog');

const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(path, method = 'GET', body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

async function runTests() {
  console.log('🚀 ROLE-BASED ACCOUNT MANAGEMENT HIERARCHY TEST RUNNER');
  console.log('======================================================');

  await mongoose.connect(env.mongoUri);

  // Setup Programs
  let cseProg = await Program.findOne({ code: 'CSE' });
  if (!cseProg) {
    cseProg = await Program.create({ name: 'B.Tech Computer Science', code: 'CSE', department: 'Computer Science' });
  }

  let eceProg = await Program.findOne({ code: 'ECE' });
  if (!eceProg) {
    eceProg = await Program.create({ name: 'B.Tech Electronics & Comm', code: 'ECE', department: 'Electronics' });
  }

  async function upsertUser(data) {
    let user = await User.findOne({ email: data.email });
    if (user) {
      Object.assign(user, data);
      await user.save();
    } else {
      user = await User.create(data);
    }
    return user;
  }

  const adminUser = await upsertUser({ name: 'Admin Hierarchy', email: 'admin_test_hierarchy@sbjain.edu.in', password: 'Password123!', role: 'admin' });
  const cseHod = await upsertUser({ name: 'CSE HOD', email: 'cse_hod_test@sbjain.edu.in', password: 'Password123!', role: 'hod', programId: cseProg._id });
  const eceHod = await upsertUser({ name: 'ECE HOD', email: 'ece_hod_test@sbjain.edu.in', password: 'Password123!', role: 'hod', programId: eceProg._id });
  const cseStudent = await upsertUser({ name: 'CSE Student', email: 'cse_student_test@sbjain.edu.in', password: 'Password123!', role: 'student', programId: cseProg._id, enrollmentNo: 'EN_CSE_TEST_01', currentSemester: 6, section: 'A' });
  const eceStudent = await upsertUser({ name: 'ECE Student', email: 'ece_student_test@sbjain.edu.in', password: 'Password123!', role: 'student', programId: eceProg._id, enrollmentNo: 'EN_ECE_TEST_01', currentSemester: 6, section: 'A' });

  // Login tokens
  const adminLogin = await apiRequest('/auth/login', 'POST', { email: adminUser.email, password: 'Password123!' });
  const cseHodLogin = await apiRequest('/auth/login', 'POST', { email: cseHod.email, password: 'Password123!' });
  const cseStudentLogin = await apiRequest('/auth/login', 'POST', { email: cseStudent.email, password: 'Password123!' });

  const adminToken = adminLogin.data.data.token;
  const cseHodToken = cseHodLogin.data.data.token;
  const studentToken = cseStudentLogin.data.data.token;

  console.log('✅ Logged in Admin, CSE HOD, and CSE Student.');

  // TEST 1: Public Signup Removal
  const publicRegisterRes = await apiRequest('/auth/register', 'POST', { name: 'Public User', email: 'public@test.com', password: 'Password123!' });
  console.log(`\n1. Public Signup Endpoint POST /api/auth/register: Status ${publicRegisterRes.status} (Expected: 404)`);
  const test1Pass = publicRegisterRes.status === 404;
  console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 2: Admin Account Creation
  const newAccountEmail = `test_create_${Date.now()}@sbjain.edu.in`;
  const adminCreateRes = await apiRequest('/admin/users', 'POST', {
    name: 'New Created Student',
    email: newAccountEmail,
    password: 'Password123!',
    role: 'student',
    programId: cseProg._id,
    enrollmentNo: `EN_${Date.now().toString().slice(-5)}`,
    currentSemester: 1,
    section: 'A',
  }, adminToken);
  console.log(`\n2. Admin Account Creation POST /api/admin/users: Status ${adminCreateRes.status} (Expected: 201)`);
  const test2Pass = adminCreateRes.status === 201;
  console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 3: Non-Admin Account Creation Attempt (HOD and Student)
  const hodCreateRes = await apiRequest('/admin/users', 'POST', {
    name: 'Illegal HOD Student',
    email: `illegal_${Date.now()}@sbjain.edu.in`,
    password: 'Password123!',
    role: 'student',
  }, cseHodToken);
  console.log(`\n3a. HOD Account Creation Attempt: Status ${hodCreateRes.status} (Expected: 403)`);
  const test3aPass = hodCreateRes.status === 403;
  console.log(`   Result: ${test3aPass ? '✅ PASS' : '❌ FAIL'}`);

  const studentCreateRes = await apiRequest('/admin/users', 'POST', {
    name: 'Illegal Student',
    email: `illegal_stud_${Date.now()}@sbjain.edu.in`,
    password: 'Password123!',
    role: 'student',
  }, studentToken);
  console.log(`3b. Student Account Creation Attempt: Status ${studentCreateRes.status} (Expected: 403)`);
  const test3bPass = studentCreateRes.status === 403;
  console.log(`   Result: ${test3bPass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 4: HOD Modify Account in Own Department vs Cross Department
  const hodModifyOwnRes = await apiRequest(`/admin/users/${cseStudent._id}`, 'PUT', {
    name: 'CSE Student Updated By HOD',
    section: 'B',
  }, cseHodToken);
  console.log(`\n4a. HOD Modify Student in Own Department: Status ${hodModifyOwnRes.status} (Expected: 200)`);
  const test4aPass = hodModifyOwnRes.status === 200 && hodModifyOwnRes.data.data?.user?.name === 'CSE Student Updated By HOD';
  console.log(`   Result: ${test4aPass ? '✅ PASS' : '❌ FAIL'}`);

  const hodModifyCrossRes = await apiRequest(`/admin/users/${eceStudent._id}`, 'PUT', {
    name: 'ECE Student Hacked By CSE HOD',
  }, cseHodToken);
  console.log(`4b. HOD Modify Student in Other Department (ECE): Status ${hodModifyCrossRes.status} (Expected: 403)`);
  const test4bPass = hodModifyCrossRes.status === 403;
  console.log(`   Result: ${test4bPass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 5: HOD Attempting to Modify Admin or another HOD
  const hodModifyAdminRes = await apiRequest(`/admin/users/${adminUser._id}`, 'PUT', {
    name: 'Hacked Admin',
  }, cseHodToken);
  console.log(`\n5. HOD Modify Admin Account Attempt: Status ${hodModifyAdminRes.status} (Expected: 403)`);
  const test5Pass = hodModifyAdminRes.status === 403;
  console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 6: Account Deactivation (Admin vs HOD)
  const hodDeactivateRes = await apiRequest(`/admin/users/${cseStudent._id}/deactivate`, 'PATCH', {}, cseHodToken);
  console.log(`\n6a. HOD Deactivate Account Attempt: Status ${hodDeactivateRes.status} (Expected: 403)`);
  const test6aPass = hodDeactivateRes.status === 403;
  console.log(`   Result: ${test6aPass ? '✅ PASS' : '❌ FAIL'}`);

  const createdUserId = adminCreateRes.data.data?.user?._id;
  if (createdUserId) {
    const adminDeactivateRes = await apiRequest(`/admin/users/${createdUserId}/deactivate`, 'PATCH', {}, adminToken);
    console.log(`6b. Admin Deactivate Account: Status ${adminDeactivateRes.status} (Expected: 200)`);
    const test6bPass = adminDeactivateRes.status === 200;
    console.log(`   Result: ${test6bPass ? '✅ PASS' : '❌ FAIL'}`);
  }

  // TEST 7: Forgot Password & Password Reset Flow
  const forgotRes = await apiRequest('/auth/forgot-password', 'POST', { email: cseStudent.email });
  console.log(`\n7a. POST /api/auth/forgot-password: Status ${forgotRes.status} (Expected: 200)`);
  const resetToken = forgotRes.data.data?.resetToken;
  const test7aPass = forgotRes.status === 200 && !!resetToken;
  console.log(`   Result: ${test7aPass ? '✅ PASS' : '❌ FAIL'}`);

  if (resetToken) {
    const resetRes = await apiRequest('/auth/reset-password', 'POST', { token: resetToken, password: 'NewPassword123!' });
    console.log(`7b. POST /api/auth/reset-password: Status ${resetRes.status} (Expected: 200)`);
    const test7bPass = resetRes.status === 200;
    console.log(`   Result: ${test7bPass ? '✅ PASS' : '❌ FAIL'}`);
  }

  // TEST 8: Audit Logging Check
  const auditLogsCount = await AuditLog.countDocuments({
    action: { $in: ['account_created', 'account_updated', 'account_deactivated', 'password_reset_requested', 'password_reset_completed'] }
  });
  console.log(`\n8. Audit Logs captured for account operations: ${auditLogsCount} entries found.`);
  const test8Pass = auditLogsCount > 0;
  console.log(`   Result: ${test8Pass ? '✅ PASS' : '❌ FAIL'}`);

  await mongoose.disconnect();

  const allPassed = test1Pass && test2Pass && test3aPass && test3bPass && test4aPass && test4bPass && test5Pass && test6aPass && test7aPass && test8Pass;
  console.log('\n======================================================');
  console.log(`FINAL RESULT: ${allPassed ? '🎉 ALL ROLE HIERARCHY TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);
  console.log('======================================================\n');
}

runTests();
