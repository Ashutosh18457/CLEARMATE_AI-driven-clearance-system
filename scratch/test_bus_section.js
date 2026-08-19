const http = require('http');

const makeRequest = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(postData);
    req.end();
  });
};

async function runTests() {
  console.log('=== STARTING BUS SECTION INTEGRATION TESTS ===\n');

  // 1. Bus Section Dedicated Login
  console.log('1. Testing POST /api/bus-section/login...');
  const loginRes = await makeRequest('/api/bus-section/login', 'POST', {
    email: 'bus@sbjit.edu.in',
    password: 'Password123!'
  });
  console.log('   Status:', loginRes.status);
  console.log('   User Role:', loginRes.data?.data?.user?.role);
  if (loginRes.status !== 200 || loginRes.data?.data?.user?.role !== 'bus_section') {
    throw new Error('Bus section login failed!');
  }
  const token = loginRes.data?.data?.token;
  console.log('   ✅ Bus Section Login Passed!\n');

  // 2. GET /api/bus-section/branches
  console.log('2. Testing GET /api/bus-section/branches...');
  const branchRes = await makeRequest('/api/bus-section/branches', 'GET', null, token);
  console.log('   Status:', branchRes.status);
  console.log('   Programs Count:', branchRes.data?.data?.programs?.length);
  if (branchRes.status !== 200) throw new Error('Get branches failed!');
  console.log('   ✅ Get Branches Passed!\n');

  // 3. GET /api/bus-section/students
  console.log('3. Testing GET /api/bus-section/students...');
  const studentsRes = await makeRequest('/api/bus-section/students', 'GET', null, token);
  console.log('   Status:', studentsRes.status);
  console.log('   Students Returned:', studentsRes.data?.data?.length);
  if (studentsRes.status !== 200 || !studentsRes.data?.data?.length) {
    throw new Error('Get students failed!');
  }
  const targetStudent = studentsRes.data.data[0];
  const targetStudentId = targetStudent.student.id || targetStudent.student._id;
  console.log('   Selected Student:', targetStudent.student.name, 'ID:', targetStudentId);
  console.log('   ✅ Get Students Passed!\n');

  // 4. PATCH bus fees -> not_paid (fees_pending)
  console.log('4. Testing PATCH /api/bus-section/students/:id/bus-fees (not_paid, fees_pending)...');
  const patchRes1 = await makeRequest(`/api/bus-section/students/${targetStudentId}/bus-fees`, 'PATCH', {
    status: 'not_paid',
    reason: 'fees_pending'
  }, token);
  console.log('   Status:', patchRes1.status);
  console.log('   Updated Bus Fees Status:', patchRes1.data?.data?.bus_fees_status);
  if (patchRes1.status !== 200 || patchRes1.data?.data?.bus_fees_status !== 'not_paid') {
    throw new Error('Patch fees_pending failed!');
  }
  console.log('   ✅ Fees Pending Update Passed!\n');

  // 5. PATCH bus fees -> not_paid (remark)
  console.log('5. Testing PATCH /api/bus-section/students/:id/bus-fees (not_paid, remark)...');
  const patchRes2 = await makeRequest(`/api/bus-section/students/${targetStudentId}/bus-fees`, 'PATCH', {
    status: 'not_paid',
    reason: 'remark',
    remark_text: 'Bus quarterly pass renewal fee ₹1,500 pending'
  }, token);
  console.log('   Status:', patchRes2.status);
  console.log('   Remark Text:', patchRes2.data?.data?.remark_text);
  if (patchRes2.status !== 200 || patchRes2.data?.data?.reason !== 'remark') {
    throw new Error('Patch remark failed!');
  }
  console.log('   ✅ Remark Update Passed!\n');

  // 6. PATCH bus fees -> paid
  console.log('6. Testing PATCH /api/bus-section/students/:id/bus-fees (paid)...');
  const patchRes3 = await makeRequest(`/api/bus-section/students/${targetStudentId}/bus-fees`, 'PATCH', {
    status: 'paid'
  }, token);
  console.log('   Status:', patchRes3.status);
  console.log('   Final Bus Fees Status:', patchRes3.data?.data?.bus_fees_status);
  console.log('   Audit Trail Entries:', patchRes3.data?.data?.auditTrail?.length);
  if (patchRes3.status !== 200 || patchRes3.data?.data?.bus_fees_status !== 'paid') {
    throw new Error('Patch paid failed!');
  }
  console.log('   ✅ Paid Update Passed!\n');

  // 7. GET /api/bus-section/students/:id
  console.log('7. Testing GET /api/bus-section/students/:id...');
  const detailRes = await makeRequest(`/api/bus-section/students/${targetStudentId}`, 'GET', null, token);
  console.log('   Status:', detailRes.status);
  console.log('   Bus Fees Status:', detailRes.data?.data?.bus_fees_status);
  console.log('   Audit Trail Length:', detailRes.data?.data?.auditTrail?.length);
  if (detailRes.status !== 200 || detailRes.data?.data?.bus_fees_status !== 'paid') {
    throw new Error('Get detail failed!');
  }
  console.log('   ✅ Get Detail Passed!\n');

  console.log('🎉 ALL BUS SECTION INTEGRATION TESTS PASSED 100%! 🎉');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
