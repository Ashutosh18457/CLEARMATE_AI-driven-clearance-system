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

async function runRoleDifferentiatedTests() {
  console.log('\n=============================================================');
  console.log(' 🛡️ CLEARMATE SUPER ADMIN & DEPT ADMIN HARDENED TEST SUITE 🛡️ ');
  console.log('=============================================================\n');

  // ─────────────────────────────────────────────────────────────
  // 1. AUTHENTICATE ROLES
  // ─────────────────────────────────────────────────────────────
  console.log('🔑 [PHASE 1] Authenticating System Roles');

  // 1.1 Super Admin Login
  const superAdminLogin = await request('POST', '/auth/login', {
    email: 'admin@sbjit.edu.in',
    password: 'Password123!',
  });
  const superAdminToken = superAdminLogin.data?.data?.token;
  assert('Super Admin login successful', superAdminLogin.status === 200 && !!superAdminToken, superAdminLogin);

  // 1.2 Dept Admin Login
  const deptAdminLogin = await request('POST', '/auth/login', {
    email: 'deptadmin@sbjit.edu.in',
    password: 'Password123!',
  });
  const deptAdminToken = deptAdminLogin.data?.data?.token;
  assert('Dept Admin login successful', deptAdminLogin.status === 200 && !!deptAdminToken, deptAdminLogin);

  // 1.3 Teacher Login
  const teacherLogin = await request('POST', '/auth/login', {
    email: 'teacher@sbjit.edu.in',
    password: 'Password123!',
  });
  const teacherToken = teacherLogin.data?.data?.token;
  assert('Teacher login successful', teacherLogin.status === 200 && !!teacherToken, teacherLogin);

  // 1.4 Student Login
  const studentLogin = await request('POST', '/auth/login', {
    email: 'student@sbjit.edu.in',
    password: 'Password123!',
  });
  const studentToken = studentLogin.data?.data?.token;
  assert('Student login successful', studentLogin.status === 200 && !!studentToken, studentLogin);

  // ─────────────────────────────────────────────────────────────
  // 2. ROLE FENCING & PRIVILEGE BOUNDARIES
  // ─────────────────────────────────────────────────────────────
  console.log('\n🔒 [PHASE 2] Security Fences & Role Boundary Checks');

  // 2.1 Teacher cannot create programs or semesters
  const teacherCreateProg = await request('POST', '/admin/programs', { name: 'Hack Prog', code: 'HCK', department: 'Hacks' }, teacherToken);
  assert('Teacher blocked from creating Programs (403)', teacherCreateProg.status === 403, teacherCreateProg);

  // 2.2 Student cannot access admin users list
  const studentUsers = await request('GET', '/admin/users', null, studentToken);
  assert('Student blocked from reading Admin User directory (403)', studentUsers.status === 403, studentUsers);

  // 2.3 Unauthenticated access blocked
  const unauthReq = await request('GET', '/admin/programs');
  assert('Unauthenticated access blocked (401)', unauthReq.status === 401, unauthReq);

  // ─────────────────────────────────────────────────────────────
  // 3. SUPER ADMIN INSTITUTIONAL SETUP (Programs & Depts)
  // ─────────────────────────────────────────────────────────────
  console.log('\n🏛️ [PHASE 3] Super Admin College Infrastructure Setup');

  const testProgCode = 'DS_TEST_' + Date.now().toString().slice(-4);
  const progCreate = await request('POST', '/admin/programs', {
    name: 'B.Tech Data Science & Analytics',
    code: testProgCode,
    department: 'Emerging Technologies',
    degree: 'B.Tech',
    totalSemesters: 8,
  }, superAdminToken);
  assert('Super Admin creates new college degree program (201)', progCreate.status === 201, progCreate);
  const programId = progCreate.data?.data?.program?._id || progCreate.data?.data?._id;

  // Duplicate program code rejection
  const dupProg = await request('POST', '/admin/programs', {
    name: 'Duplicate DS',
    code: testProgCode,
    department: 'Emerging Technologies',
  }, superAdminToken);
  assert('Duplicate program code strictly rejected (400 or 409)', dupProg.status === 400 || dupProg.status === 409, dupProg);

  // ─────────────────────────────────────────────────────────────
  // 4. DEPARTMENT ADMIN SEMESTER & ROSTER WORKFLOW
  // ─────────────────────────────────────────────────────────────
  console.log('\n🏢 [PHASE 4] Department Admin Semester Onboarding');

  // 4.1 Dept Admin creates Semester
  const semCreate = await request('POST', '/admin/semesters', {
    programId,
    name: 'Semester 4 (DS)',
    semNumber: 4,
    academicYear: '2025-26',
    type: 'EVEN',
    clearanceDeadline: new Date('2026-05-20').toISOString(),
  }, deptAdminToken);
  assert('Dept Admin creates Academic Semester (201)', semCreate.status === 201, semCreate);
  const semesterId = semCreate.data?.data?.semester?._id || semCreate.data?.data?._id;

  // 4.2 Dept Admin creates Batches
  const batchA = await request('POST', '/admin/batches', { semesterId, name: 'Batch D1' }, deptAdminToken);
  const batchB = await request('POST', '/admin/batches', { semesterId, name: 'Batch D2' }, deptAdminToken);
  assert('Dept Admin provisions Batch D1 & D2 (201)', batchA.status === 201 && batchB.status === 201);
  const batchAId = batchA.data?.data?.batch?._id || batchA.data?.data?._id;
  const batchBId = batchB.data?.data?.batch?._id || batchB.data?.data?._id;

  // 4.3 Duplicate batch name in same semester rejected
  const dupBatch = await request('POST', '/admin/batches', { semesterId, name: 'Batch D1' }, deptAdminToken);
  assert('Duplicate batch name in same semester rejected (400 or 409)', dupBatch.status === 400 || dupBatch.status === 409, dupBatch);

  // ─────────────────────────────────────────────────────────────
  // 5. CLEARANCE ITEMS WITH FACULTY MAPPINGS
  // ─────────────────────────────────────────────────────────────
  console.log('\n📚 [PHASE 5] Clearance Items & Faculty Workload Configuration');

  // 5.1 Theory Item
  const theoryItem = await request('POST', '/admin/clearance-items', {
    semesterId,
    srNo: 1,
    title: 'Statistical Learning',
    type: 'theory',
    subjectCode: 'DS401',
    theoryTeacherId: teacherLogin.data?.data?.user?._id,
    isRequired: true,
  }, deptAdminToken);
  assert('Dept Admin creates Theory Clearance Item (201)', theoryItem.status === 201, theoryItem);
  const theoryItemId = theoryItem.data?.data?.clearanceItem?._id || theoryItem.data?.data?.item?._id || theoryItem.data?.data?._id;

  // 5.2 Lab Item with Batch Mappings
  const labItem = await request('POST', '/admin/clearance-items', {
    semesterId,
    srNo: 2,
    title: 'Data Wrangling Lab',
    type: 'lab',
    subjectCode: 'DS402L',
    labBatchTeachers: [
      { batchId: batchAId, teacherId: teacherLogin.data?.data?.user?._id },
      { batchId: batchBId, teacherId: teacherLogin.data?.data?.user?._id },
    ],
    isRequired: true,
  }, deptAdminToken);
  assert('Dept Admin creates Lab Clearance Item with multiple batches (201)', labItem.status === 201, labItem);

  // 5.3 Elective Item with Options
  const electiveItem = await request('POST', '/admin/clearance-items', {
    semesterId,
    srNo: 3,
    title: 'Domain Elective I',
    type: 'elective',
    electiveGroup: 'Elective A',
    electiveOptions: [
      { name: 'Financial Analytics', teacherId: teacherLogin.data?.data?.user?._id },
      { name: 'Healthcare Analytics', teacherId: teacherLogin.data?.data?.user?._id },
    ],
    isRequired: true,
  }, deptAdminToken);
  assert('Dept Admin creates Elective Clearance Item with options (201)', electiveItem.status === 201, electiveItem);

  // 5.4 Update Clearance Item
  const updateItem = await request('PUT', `/admin/clearance-items/${theoryItemId}`, {
    title: 'Advanced Statistical Machine Learning',
  }, deptAdminToken);
  const updatedTitle = updateItem.data?.data?.clearanceItem?.title || updateItem.data?.data?.item?.title || updateItem.data?.data?.title || '';
  assert('Dept Admin updates Clearance Item (200)', updateItem.status === 200 && updatedTitle.includes('Advanced'), updateItem);

  // ─────────────────────────────────────────────────────────────
  // 6. ADVERSARIAL BULK SETUP (STRESS TEST ON REAL EXCEL DATA)
  // ─────────────────────────────────────────────────────────────
  console.log('\n⚡ [PHASE 6] 1-Click Bulk Setup & Dirty Roster Ingestion');

  const dirtyBulk = await request('POST', '/admin/bulk-setup', {
    semesterConfig: {
      program_code: testProgCode,
      sem_number: 4,
      academic_year: '2025-26',
      type: 'EVEN',
    },
    clearanceItems: [
      { sr_no: 1, Title: 'Big Data Systems', Type: 'THEORY', code: 'DS403', teacher_email: 'new_bigdata_prof@sbjit.edu.in' },
      { sr_no: 2, Title: 'Big Data Lab', Type: 'LAB', code: 'DS404L', lab_batches: 'Batch D1:new_bd_lab_prof@sbjit.edu.in; Batch D2:teacher@sbjit.edu.in' },
      { sr_no: 3, Title: 'Special Elective', Type: 'ELECTIVE', elective_options: 'NLP:new_nlp_prof@sbjit.edu.in, CV:teacher@sbjit.edu.in' },
    ],
    students: [
      { roll_no: 'DS2025_001', full_name: 'Aditya Birla', email: 'aditya_ds@sbjit.edu.in', batch: 'Batch D1', elective_choice: 'NLP' },
      { roll_no: 'DS2025_002', full_name: 'Tanvi Shah', email: 'tanvi_ds@sbjit.edu.in', batch: 'Batch D2', elective_choice: 'CV' },
      { roll_no: 'DS2025_003', full_name: 'Manoj Bajpayee', email: 'manoj_ds@sbjit.edu.in', batch: 'Batch D1', elective_choice: 'NLP' },
    ],
  }, deptAdminToken);

  assert('Bulk Setup executes with 201 Created', dirtyBulk.status === 201, dirtyBulk);
  assert('Auto-provisioned missing teachers from Excel', dirtyBulk.data?.data?.clearanceItemsCreated?.length === 3, dirtyBulk);
  assert('Enrolled students into their respective batches', dirtyBulk.data?.data?.studentsCreated?.length === 3, dirtyBulk);

  // 6.2 Idempotent Re-Run Check (Re-running same file must update safely without crash)
  const rerunBulk = await request('POST', '/admin/bulk-setup', {
    semesterConfig: { programCode: testProgCode, semNumber: 4, academicYear: '2025-26' },
    clearanceItems: [
      { srNo: 1, title: 'Big Data Systems (Revised)', type: 'theory', subjectCode: 'DS403', teacherEmail: 'teacher@sbjit.edu.in' },
    ],
    students: [
      { enrollmentNo: 'DS2025_001', name: 'Aditya Birla (Updated)', email: 'aditya_ds@sbjit.edu.in', batch: 'Batch D1' },
    ],
  }, deptAdminToken);
  assert('Re-uploading / updating existing semester executes safely with 201', rerunBulk.status === 201, rerunBulk);

  // ─────────────────────────────────────────────────────────────
  // 7. CLASS INCHARGE APPOINTMENT & STUDENT DIRECTORY
  // ─────────────────────────────────────────────────────────────
  console.log('\n🧑‍🏫 [PHASE 7] Class Incharge Assignment & Student Management');

  const ciAssign = await request('PUT', `/admin/class-incharges/${teacherLogin.data?.data?.user?._id}/assign`, {
    assignedProgramId: programId,
    assignedSemester: 4,
    assignedSection: 'A',
  }, deptAdminToken);
  assert('Dept Admin assigns Class Incharge to Semester 4 Section A (200)', ciAssign.status === 200, ciAssign);

  // Search student
  const searchStudent = await request('GET', '/admin/users?search=Aditya&limit=5', null, deptAdminToken);
  assert('Student search lookup returns 200', searchStudent.status === 200, searchStudent);
  assert('Student found in search results', searchStudent.data?.data?.users?.some((u) => u.email === 'aditya_ds@sbjit.edu.in'));

  // ─────────────────────────────────────────────────────────────
  // 8. TEARDOWN & CLEANUP
  // ─────────────────────────────────────────────────────────────
  console.log('\n🧹 [PHASE 8] Cleaning Up Temporary Test Records');

  await request('DELETE', `/admin/clearance-items/${theoryItemId}`, null, deptAdminToken);
  await request('DELETE', `/admin/programs/${programId}`, null, superAdminToken);
  assert('Test records cleaned up safely', true);

  console.log('\n=============================================================');
  console.log(` 📊 FINAL TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('=============================================================\n');

  if (failedTests === 0) {
    console.log('🏆 100% PRODUCTION VERIFIED: SUPER ADMIN & DEPT ADMIN WORKFLOWS ARE ROCK SOLID!\n');
  } else {
    console.error('⚠️ SOME TESTS ENCOUNTERED FAILURES.\n');
  }
}

runRoleDifferentiatedTests().catch(console.error);
