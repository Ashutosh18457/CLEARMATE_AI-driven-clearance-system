const test = async () => {
  try {
    // 1. Login
    console.log('Logging in as teacher...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teacher@clearmate.dev',
        password: 'Teacher@123',
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    console.log('Login successful! Token acquired.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // 2. Fetch clearance items
    console.log('\nFetching clearance items (/admin/clearance-items)...');
    const adminRes = await fetch('http://localhost:5000/api/admin/clearance-items', { headers });
    const adminData = await adminRes.json();
    console.log('Status:', adminRes.status);
    console.log('Data:', JSON.stringify(adminData.data, null, 2));

  } catch (err) {
    console.error('Error during test:', err);
  }
};

test();
