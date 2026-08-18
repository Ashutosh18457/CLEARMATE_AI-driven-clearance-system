const BASE_URL = 'http://localhost:5000/api';

// Helper to clean up console logging
const log = (msg, data = null) => {
  console.log(`[E2E] ${msg}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const errorLog = (msg, error) => {
  console.error(`[E2E-ERROR] ${msg}`, error);
};

// State holder
const state = {
  tokens: {},
  users: {},
  semesterId: null,
  programId: null,
  clearanceRequestId: null,
  submissionItemId: null,
  itemClearanceId: null,
  sectionClearanceId: null,
};

// Helper for making requests with correct headers/tokens
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
    // If not json
    json = { text: await res.text() };
  }

  return { status, data: json };
}

async function loginAll() {
  log('--- LOGGING IN USERS ---');
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
      log(`Login successful for ${role} (${cred.email})`);
    } else {
      errorLog(`Login failed for ${role} (${cred.email})`, data);
    }
  }
}

async function testClearanceInitiation() {
  log('--- TESTING INITIAL STATE & INITIATION ---');
  
  // 1. Get student profile
  const meRes = await request('/auth/me', 'GET', null, 'student');
  log(`Student profile retrieved: status=${meRes.status}`, meRes.data);
  const currentSemester = meRes.data.data?.user?.currentSemester;
  const programId = meRes.data.data?.user?.programId;
  state.programId = programId;

  // 2. Query semesters to get the correct semesterId
  const semRes = await request('/admin/semesters', 'GET', null, 'admin');
  log(`Semesters retrieved: status=${semRes.status}`);
  const semester = semRes.data.data?.find(s => s.semNumber === currentSemester && s.programId._id === programId);
  if (!semester) {
    log('Semester matching student currentSemester & programId not found, listing all:');
    log('Semesters:', semRes.data.data);
    throw new Error('Semester not found');
  }
  state.semesterId = semester._id;
  log(`Resolved Semester ID: ${state.semesterId} (${semester.name})`);

  // 3. Get my clearance status before initiation
  const myStatusBefore = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Get my clearance status before initiation (should be null): status=${myStatusBefore.status}`, myStatusBefore.data);

  // 4. Initiate clearance
  const initRes = await request('/clearances/initiate', 'POST', { semesterId: state.semesterId }, 'student');
  log(`Initiate clearance status: status=${initRes.status}`, initRes.data);
  
  if (initRes.status !== 201) {
    log('Failed to initiate clearance. Checking if already exists...');
    // Maybe clearance is already initiated. Let's fetch it.
  }

  // 5. Get my clearance status after initiation
  const myStatusAfter = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  log(`Get my clearance status after initiation: status=${myStatusAfter.status}`);
  
  state.clearanceRequestId = myStatusAfter.data.data?.clearanceRequest?._id;
  log(`Resolved Clearance Request ID: ${state.clearanceRequestId}`);
  log(`Clearance Status: ${myStatusAfter.data.data?.clearanceRequest?.status}`);
  log(`Clearance Stage: ${myStatusAfter.data.data?.clearanceRequest?.currentStage}`);
  log(`Item Clearances (${myStatusAfter.data.data?.itemClearances?.length || 0}):`, myStatusAfter.data.data?.itemClearances);
  log(`Section Clearances (${myStatusAfter.data.data?.sectionClearances?.length || 0}):`, myStatusAfter.data.data?.sectionClearances);

  // Find library section clearance
  const librarySec = myStatusAfter.data.data?.sectionClearances?.find(s => s.department === 'library');
  if (librarySec) {
    state.sectionClearanceId = librarySec._id;
  }
}

async function testTeacherSubmissionsAndClearance() {
  log('--- TESTING SUBMISSIONS & ITEM CLEARANCE ---');
  
  // Since we need to test if there are any clearance items resolved for the student, let's look at itemClearances.
  const myStatus = await request(`/clearances/my?semesterId=${state.semesterId}`, 'GET', null, 'student');
  const items = myStatus.data.data?.itemClearances || [];
  
  if (items.length === 0) {
    log('WARNING: 0 clearance items resolved for student. Checking why...');
    // Check if there are clearance items configured for this semester
    const ciRes = await request(`/admin/clearance-items?semesterId=${state.semesterId}`, 'GET', null, 'admin');
    log(`Clearance items configured for semester: count=${ciRes.data.data?.length || 0}`, ciRes.data.data);
    
    // If no clearance items configured, let's create a theory item assigned to Prof. Sharma
    if (!ciRes.data.data || ciRes.data.data.length === 0) {
      log('Creating a demo Theory Clearance Item...');
      const newCiRes = await request('/admin/clearance-items', 'POST', {
        semesterId: state.semesterId,
        srNo: 1,
        title: 'Theory of Computation',
        type: 'theory',
        subjectCode: 'CSE-501',
        theoryTeacherId: state.users.teacher._id,
      }, 'admin');
      log(`Create Clearance Item status: status=${newCiRes.status}`, newCiRes.data);
      
      log('Re-initiating clearance for student to resolve the new item...');
      // Initiate again (which deletes old rejected or progress ones if rejected, but wait, if it's in progress it will reject. Let's see)
      // Since it's in progress, initiateClearance throws "A clearance request is already in progress"
      // Wait, we can test this by checking if we get the in progress error.
      const initAgain = await request('/clearances/initiate', 'POST', { semesterId: state.semesterId }, 'student');
      log(`Re-initiate clearance (should error if in progress): status=${initAgain.status}`, initAgain.data);
      
      // Let's manually delete the ClearanceRequest so we can re-initiate.
      // Wait, QA test scripts shouldn't modify DB directly unless needed. Let's write a cleanup function.
    }
  } else {
    state.itemClearanceId = items[0]._id;
    log(`Using Item Clearance ID: ${state.itemClearanceId} (${items[0].itemTitle})`);
  }
}

async function run() {
  try {
    await loginAll();
    await testClearanceInitiation();
    await testTeacherSubmissionsAndClearance();
  } catch (err) {
    errorLog('Run error', err);
  }
}

run();
