// Using native fetch

const API_URL = 'http://localhost:3000/api';
let cookie = '';

async function runTests() {
    console.log('--- Starting API Tests ---');

    console.log('1. Testing Employer Registration...');
    const employerEmail = `employer_${Date.now()}@test.com`;
    const regRes1 = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Employer', email: employerEmail, password: 'password', role: 'employer' })
    });
    console.log('Employer Reg:', await regRes1.json());

    console.log('2. Testing Employer Login...');
    const loginRes1 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: employerEmail, password: 'password' })
    });
    cookie = loginRes1.headers.get('set-cookie');
    console.log('Employer Login:', await loginRes1.json());

    console.log('3. Testing Post a Job...');
    const postJobRes = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ title: 'Software Engineer', description: 'Test', requirements: 'Node.js', location: 'Remote', salary: '$100k', type: 'Full Time', deadline: '2025-01-01' })
    });
    const jobData = await postJobRes.json();
    console.log('Post Job:', jobData);
    const jobId = jobData.jobId;

    console.log('4. Testing Seeker Registration...');
    const seekerEmail = `seeker_${Date.now()}@test.com`;
    const regRes2 = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Seeker', email: seekerEmail, password: 'password', role: 'seeker' })
    });
    console.log('Seeker Reg:', await regRes2.json());

    console.log('5. Testing Seeker Login...');
    const loginRes2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: seekerEmail, password: 'password' })
    });
    cookie = loginRes2.headers.get('set-cookie'); // Update session cookie to seeker
    console.log('Seeker Login:', await loginRes2.json());

    console.log('6. Testing Apply to Job...');
    const applyRes = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ jobId })
    });
    console.log('Apply Job:', await applyRes.json());
    
    console.log('7. Testing Get Jobs list...');
    const jobsRes = await fetch(`${API_URL}/jobs`);
    const jobs = await jobsRes.json();
    console.log(`Get Jobs: Found ${jobs.length} jobs`);

    console.log('--- API Tests Finished ---');
    process.exit(0);
}

runTests().catch(console.error);
