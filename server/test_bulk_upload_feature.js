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
  console.log('🚀 CSV BULK STUDENT UPLOAD FEATURE TEST RUNNER');
  console.log('================================================');

  await mongoose.connect(env.mongoUri);

  // Setup Programs
  let cseProg = await Program.findOne({ code: 'CSE' });
  if (!cseProg) {
    cseProg = await Program.create({ name: 'B.Tech Computer Science', code: 'CSE', department: 'Computer Science' });
  }

  // Create accounts
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

  const adminUser = await upsertUser({
    name: 'Admin Bulk Tester',
    email: 'admin_bulk_test@sbjain.edu.in',
    password: 'Password123!',
    role: 'admin',
  });

  const studentUser = await upsertUser({
    name: 'Student Bulk Tester',
    email: 'student_bulk_test@sbjain.edu.in',
    password: 'Password123!',
    role: 'student',
    programId: cseProg._id,
    enrollmentNo: 'EN_EXISTING_001',
    currentSemester: 6,
    section: 'A',
  });

  const adminLogin = await apiRequest('/auth/login', 'POST', { email: adminUser.email, password: 'Password123!' });
  const studentLogin = await apiRequest('/auth/login', 'POST', { email: studentUser.email, password: 'Password123!' });

  const adminToken = adminLogin.data.data.token;
  const studentToken = studentLogin.data.data.token;

  console.log('✅ Logged in Admin and Student.');

  // TEST 1: Download Sample CSV Template
  const sampleRes = await fetch(`${BASE_URL}/admin/students/sample-csv`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const sampleText = await sampleRes.text();
  console.log(`\n1. GET /api/admin/students/sample-csv: Status ${sampleRes.status}`);
  const test1Pass = sampleRes.status === 200 && sampleText.includes('student_id,full_name,email,department,semester,section');
  console.log(`   Template Content Checked: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 2: Valid CSV Bulk Upload (5 Students)
  const validCsv = `student_id,full_name,email,department,semester,section
EN_BULK_101,Aarav Singh,aarav_bulk101@sbjain.edu.in,CSE,6,A
EN_BULK_102,Bhavna Jain,bhavna_bulk102@sbjain.edu.in,CSE,6,A
EN_BULK_103,Chetan Gupta,chetan_bulk103@sbjain.edu.in,CSE,4,B
EN_BULK_104,Divya Rao,divya_bulk104@sbjain.edu.in,CSE,2,A
EN_BULK_105,Esha Verma,esha_bulk105@sbjain.edu.in,CSE,8,B`;

  const validUploadRes = await apiRequest('/admin/students/bulk-upload', 'POST', {
    csvContent: validCsv,
    filename: 'valid_test_students.csv',
  }, adminToken);

  console.log(`\n2. Valid 5-Row CSV Upload: Status ${validUploadRes.status} (Expected: 201)`);
  const test2Pass = validUploadRes.status === 201 && validUploadRes.data.data?.createdCount === 5;
  console.log(`   Created Count: ${validUploadRes.data.data?.createdCount} / 5 -> ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 3: Empty CSV Upload
  const emptyRes = await apiRequest('/admin/students/bulk-upload', 'POST', {
    csvContent: '   ',
  }, adminToken);
  console.log(`\n3. Empty CSV Upload Attempt: Status ${emptyRes.status} (Expected: 400)`);
  const test3Pass = emptyRes.status === 400;
  console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 4: Missing Required Headers
  const badHeadersCsv = `full_name,email\nJohn Doe,john@test.com`;
  const badHeadersRes = await apiRequest('/admin/students/bulk-upload', 'POST', {
    csvContent: badHeadersCsv,
  }, adminToken);
  console.log(`\n4. Missing Headers CSV Upload: Status ${badHeadersRes.status} (Expected: 400)`);
  const test4Pass = badHeadersRes.status === 400;
  console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 5: Partial Insert with Row-by-Row Error Summary
  const mixedCsv = `student_id,full_name,email,department,semester,section
EN_BULK_201,Good Student One,good1_bulk@sbjain.edu.in,CSE,6,A
EN_BULK_202,Bad Email Student,invalid-email-format,CSE,6,A
EN_BULK_203,Bad Semester Student,bad_sem@sbjain.edu.in,CSE,12,A
EN_EXISTING_001,Duplicate Student,student_bulk_test@sbjain.edu.in,CSE,6,A
EN_BULK_204,Good Student Two,good2_bulk@sbjain.edu.in,CSE,4,B`;

  const mixedRes = await apiRequest('/admin/students/bulk-upload', 'POST', {
    csvContent: mixedCsv,
    filename: 'mixed_students.csv',
  }, adminToken);

  console.log(`\n5. Mixed CSV (2 Valid, 3 Invalid): Status ${mixedRes.status} (Expected: 201)`);
  const createdCnt = mixedRes.data.data?.createdCount;
  const failedCnt = mixedRes.data.data?.failedCount;
  const errorsArr = mixedRes.data.data?.errors || [];
  console.log(`   Created: ${createdCnt} (Expected: 2), Failed: ${failedCnt} (Expected: 3)`);
  const test5Pass = mixedRes.status === 201 && createdCnt === 2 && failedCnt === 3;
  console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 6: Role Access Guard (Student User attempting bulk upload)
  const studentUploadRes = await apiRequest('/admin/students/bulk-upload', 'POST', {
    csvContent: validCsv,
  }, studentToken);
  console.log(`\n6. Non-Admin (Student) Upload Attempt: Status ${studentUploadRes.status} (Expected: 403)`);
  const test6Pass = studentUploadRes.status === 403;
  console.log(`   Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);

  // TEST 7: Audit Logging Check
  const auditLogsCount = await AuditLog.countDocuments({ action: 'bulk_student_upload' });
  console.log(`\n7. Audit Logs captured for bulk upload: ${auditLogsCount} entries found.`);
  const test7Pass = auditLogsCount >= 2;
  console.log(`   Result: ${test7Pass ? '✅ PASS' : '❌ FAIL'}`);

  await mongoose.disconnect();

  const allPassed = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass && test7Pass;
  console.log('\n================================================');
  console.log(`FINAL RESULT: ${allPassed ? '🎉 ALL CSV BULK UPLOAD TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);
  console.log('================================================\n');
}

runTests();
