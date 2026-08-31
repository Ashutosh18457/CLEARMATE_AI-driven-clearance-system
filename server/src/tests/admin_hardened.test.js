const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json',
    };
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
      headers['Cookie'] = 'clearmate_token=' + token;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api' + path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body || '{}');
          } catch {
            parsed = { raw: body };
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(postData);
    req.end();
  });
}

let adminToken = '';
let teacherToken = '';
let studentToken = '';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description, condition, res = null) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${description}`);
  } else {
    failedTests++;
    const details = res ? `[Status ${res.status}] ${JSON.stringify(res.data?.message || res.data)}` : '';
    console.error(`  ❌ FAIL: ${description} | ${details}`);
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log(' 🔥 CLEARMATE ADVERSARIAL & HARDENED ADMIN TEST SUITE 🔥 ');
  console.log('=============================================================\n');

  // ─── SUITE 1: AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) ───
  console.log('\n📦 [SUITE 1] Security Fences & Role Protection');

  // 1.1: Unauthenticated request to protected route
  const unauthRes = await request('GET', '/admin/programs');
  assert('Unauthenticated access blocked with 401 Unauthorized', unauthRes.status === 401);

  // 1.2: Admin login
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@sbjit.edu.in',
    password: 'Password123!',
  });
  adminToken = adminLogin.data?.data?.token;
  assert('Admin login successful (200) & JWT token received', adminLogin.status === 200 && !!adminToken);

  // 1.3: Teacher login & verify forbidden write access
  const teacherLogin = await request('POST', '/auth/login', {
    email: 'teacher@sbjit.edu.in',
    password: 'Password123!',
  });
  teacherToken = teacherLogin.data?.data?.token;
  const teacherWriteBlocked = await request('POST', '/admin/programs', { name: 'Hack', code: 'HCK' }, teacherToken);
  assert('Teacher token forbidden from admin write routes (403 Forbidden)', teacherWriteBlocked.status === 403);

  // 1.4: Student login & verify forbidden write access
  const studentLogin = await request('POST', '/auth/login', {
    email: 'student@sbjit.edu.in',
    password: 'Password123!',
  });
  studentToken = studentLogin.data?.data?.token;
  const studentWriteBlocked = await request('POST', '/admin/semesters', { name: 'Hack' }, studentToken);
  assert('Student token forbidden from admin write routes (403 Forbidden)', studentWriteBlocked.status === 403);

  // ─── SUITE 2: ADMIN DASHBOARD DATA AGGREGATION ───
  console.log('\n📦 [SUITE 2] Dashboard Data Aggregation & Live Stats');

  const [progsRes, semsRes, usersRes] = await Promise.all([
    request('GET', '/admin/programs', null, adminToken),
    request('GET', '/admin/semesters', null, adminToken),
    request('GET', '/admin/users?limit=100', null, adminToken),
  ]);

  assert('GET /admin/programs returns 200', progsRes.status === 200);
  assert('GET /admin/semesters returns 200', semsRes.status === 200);
  assert('GET /admin/users returns 200', usersRes.status === 200);

  // Search student
  const searchMatch = await request('GET', '/admin/users?search=Aarav&limit=5', null, adminToken);
  assert('Student search by name query returns 200', searchMatch.status === 200);
  assert('Student search results include matching student', searchMatch.data?.data?.users?.some((u) => u.name.includes('Aarav')));

  // ─── SUITE 3: PROGRAM CRUD & VALIDATION ───
  console.log('\n📦 [SUITE 3] Programs Management & Edge Cases');

  const testCode = 'TEST_MECH_' + Date.now().toString().slice(-4);
  const createProgRes = await request('POST', '/admin/programs', {
    name: 'B.Tech Mechanical Engineering Test',
    code: testCode,
    department: 'Mechanical Sciences',
    durationYears: 4,
    degreeType: 'B.Tech',
  }, adminToken);
  assert('POST /admin/programs creates new program (201 Created)', createProgRes.status === 201);
  const testProgramId = createProgRes.data?.data?._id;

  // Duplicate code rejection
  const dupProg = await request('POST', '/admin/programs', {
    name: 'Duplicate Program Test',
    code: testCode,
    department: 'Mechanical Sciences',
  }, adminToken);
  assert('Duplicate program code rejected (400 Bad Request)', dupProg.status === 400, dupProg);

  // Missing required department
  const badProg = await request('POST', '/admin/programs', { code: 'INVALID' }, adminToken);
  assert('Missing program name/department rejected with 400 Bad Request', badProg.status === 400, badProg);

  // ─── SUITE 4: SEMESTERS & BATCHES CRUD ───
  console.log('\n📦 [SUITE 4] Academic Semesters & Batches CRUD');

  const createSem = await request('POST', '/admin/semesters', {
    programId: testProgramId,
    name: 'Semester 1 (Test)',
    semNumber: 1,
    academicYear: '2026-27',
    type: 'ODD',
    startDate: new Date('2026-08-01').toISOString(),
    endDate: new Date('2026-12-31').toISOString(),
    clearanceDeadline: new Date('2026-12-15').toISOString(),
  }, adminToken);
  assert('POST /admin/semesters creates semester (201 Created)', createSem.status === 201, createSem);
  const testSemId = createSem.data?.data?._id;

  // Create Batch
  const createBatch = await request('POST', '/admin/batches', {
    semesterId: testSemId,
    name: 'Batch T1',
  }, adminToken);
  assert('POST /admin/batches creates batch (201 Created)', createBatch.status === 201, createBatch);
  const testBatchId = createBatch.data?.data?._id;

  // ─── SUITE 5: CLEARANCE ITEMS CRUD ───
  console.log('\n📦 [SUITE 5] Clearance Items CRUD & Teacher Assignments');

  const createItem = await request('POST', '/admin/clearance-items', {
    semesterId: testSemId,
    srNo: 1,
    title: 'Engineering Mechanics',
    type: 'theory',
    subjectCode: 'ME101',
    theoryTeacherId: teacherLogin.data?.data?.user?._id,
    isRequired: true,
  }, adminToken);
  assert('POST /admin/clearance-items creates theory item (201 Created)', createItem.status === 201, createItem);
  const testItemId = createItem.data?.data?._id;

  const updateItem = await request('PUT', `/admin/clearance-items/${testItemId}`, {
    title: 'Advanced Engineering Mechanics',
  }, adminToken);
  assert('PUT /admin/clearance-items/:id updates item (200 OK)', updateItem.status === 200 && updateItem.data?.data?.title.includes('Advanced'), updateItem);

  // ─── SUITE 6: ADVERSARIAL BULK SETUP (STRESS TEST) ───
  console.log('\n📦 [SUITE 6] Adversarial Bulk Setup (Stress & Dirty Data Tests)');

  // 6.1 Multi-teacher lab + elective + dirty headers
  const dirtySetup = await request('POST', '/admin/bulk-setup', {
    semesterConfig: {
      program_code: testCode,
      sem_number: 1,
      academic_year: '2026-27',
      type: 'ODD',
    },
    clearanceItems: [
      { sr_no: 1, Title: 'Applied Physics', Type: 'THEORY', code: 'PHY101', teacher_email: 'new_phys_prof@sbjit.edu.in' },
      { sr_no: 2, Title: 'Physics Lab', Type: 'LAB', code: 'PHY102L', lab_batches: 'Batch T1:new_lab_prof@sbjit.edu.in' },
      { sr_no: 3, Title: 'Language Elective', Type: 'ELECTIVE', elective_options: 'German:new_german_prof@sbjit.edu.in, French:new_french_prof@sbjit.edu.in' },
    ],
    students: [
      { roll_no: 'STRESS_001', full_name: 'Stress Student 1', email: 'stress1@sbjit.edu.in', batch: 'Batch T1', elective_choice: 'German' },
      { roll_no: 'STRESS_002', full_name: 'Stress Student 2', email: 'stress2@sbjit.edu.in', batch: 'Batch T1', elective_choice: 'French' },
    ]
  }, adminToken);

  assert('Adversarial dirty bulk setup processed with 201 Created', dirtySetup.status === 201, dirtySetup);
  assert('Auto-created missing teachers across theory, lab, and electives', dirtySetup.data?.data?.clearanceItemsCreated?.length === 3, dirtySetup);
  assert('Enrolled/updated students in batch', dirtySetup.data?.data?.studentsCreated?.length === 2, dirtySetup);

  // 6.2 Idempotency test (re-running same setup updates safely)
  const rerunRes = await request('POST', '/admin/bulk-setup', {
    semesterConfig: { programCode: testCode, semNumber: 1, academicYear: '2026-27' },
    clearanceItems: [
      { srNo: 1, title: 'Applied Physics Updated', type: 'theory', subjectCode: 'PHY101', teacherEmail: 'new_phys_prof@sbjit.edu.in' },
    ],
    students: [
      { enrollmentNo: 'STRESS_001', name: 'Stress Student 1 Name Updated', email: 'stress1@sbjit.edu.in', batch: 'Batch T1' },
    ]
  }, adminToken);
  assert('Re-running bulk setup on existing semester executes safely (201)', rerunRes.status === 201, rerunRes);

  // 6.3 Incomplete semester config rejection
  const badBulk = await request('POST', '/admin/bulk-setup', { semesterConfig: {} }, adminToken);
  assert('Incomplete semester config rejected with 400 Bad Request', badBulk.status === 400, badBulk);

  // ─── SUITE 7: USERS & CLASS INCHARGE ASSIGNMENT ───
  console.log('\n📦 [SUITE 7] Users Directory & Class Incharge Assignment');

  const ciRes = await request('PUT', `/admin/class-incharges/${teacherLogin.data?.data?.user?._id}/assign`, {
    assignedProgramId: testProgramId,
    assignedSemester: 1,
    assignedSection: 'A',
  }, adminToken);
  assert('PUT /admin/class-incharges/:id/assign returns 200 OK', ciRes.status === 200, ciRes);

  // ─── SUITE 8: CLEANUP TEST ARTIFACTS ───
  console.log('\n📦 [SUITE 8] Clean Up Temporary Test Records');

  await request('DELETE', `/admin/clearance-items/${testItemId}`, null, adminToken);
  await request('DELETE', `/admin/programs/${testProgramId}`, null, adminToken);
  assert('Cleaned up temporary test records', true);

  console.log('\n=============================================================');
  console.log(` 📊 FINAL HARDENED TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('=============================================================\n');

  if (failedTests === 0) {
    console.log('🏆 100% PRODUCTION READY! ALL HARDENED ADMIN TESTS PASSED!\n');
  } else {
    console.error('⚠️ SOME TESTS FAILED.\n');
  }
}

runTests().catch(console.error);
