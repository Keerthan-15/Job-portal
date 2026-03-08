const API_URL = 'http://localhost:3000/api';

// --- Utility Functions ---
function showToast(message) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
}

// --- Authentication ---
async function register(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Registration successful! Please login.');
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            showToast(data.message || 'Registration failed');
        }
    } catch (err) {
        showToast('Server error');
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Login successful!');
            localStorage.setItem('user', JSON.stringify(data.user));
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } else {
            showToast(data.message || 'Login failed');
        }
    } catch (err) {
        showToast('Server error');
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    } catch(err) {
        console.error(err);
    }
}

async function checkAuthStatus() {
    try {
        const res = await fetch(`${API_URL}/auth/status`);
        const data = await res.json();
        const user = data.user;
        const navMenu = document.getElementById('nav-menu');
        
        if (navMenu) {
            if (data.isLoggedIn) {
                let html = `<a href="jobs.html">Find Jobs</a>`;
                if (user.role === 'employer') {
                    html += `<a href="post-jobs.html">Post a Job</a>`;
                }
                html += `<a href="dashboard.html">Dashboard</a>`;
                html += `<a href="#" onclick="logout()">Logout</a>`;
                navMenu.innerHTML = html;
            } else {
                navMenu.innerHTML = `
                    <a href="jobs.html">Find Jobs</a>
                    <a href="login.html">Login</a>
                    <a href="register.html" class="btn-secondary" style="padding: 0.5rem 1rem; border-radius: 8px;">Register</a>
                `;
            }
        }
        return data; // Return auth status
    } catch (err) {
        console.error('Failed to check auth status', err);
        return { isLoggedIn: false };
    }
}

// --- Jobs Management ---
async function displayJobs() {
    await checkAuthStatus();
    fetchJobs();
}

async function fetchJobs(search = '', type = '') {
    try {
        let url = `${API_URL}/jobs`;
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (type) params.append('type', type);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url);
        const jobs = await res.json();
        
        const jobList = document.getElementById('jobList');
        if (!jobList) return;

        jobList.innerHTML = '';
        
        if (jobs.length === 0) {
            jobList.innerHTML = '<p>No jobs found.</p>';
            return;
        }

        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        jobs.forEach(job => {
            const card = document.createElement('div');
            card.className = 'job-card';
            
            let actionBtn = '';
            if (user && user.role === 'seeker') {
                actionBtn = `<button onclick="applyJob(${job.id})">Apply Now</button>`;
            }

            card.innerHTML = `
                <div class="job-title">${job.title}</div>
                <div class="job-meta">
                    💼 ${job.employer_name} &nbsp; | &nbsp; 
                    📍 ${job.location || 'Remote'} &nbsp; | &nbsp; 
                    ⏱️ ${job.type || 'Full Time'}
                </div>
                <div class="job-desc">${job.description.substring(0, 150)}...</div>
                <div>${actionBtn}</div>
            `;
            jobList.appendChild(card);
        });
    } catch (err) {
        showToast('Failed to load jobs');
    }
}

function searchJobs() {    
    const search = document.getElementById('search').value;
    const typeFilter = document.getElementById('typeFilter');
    const type = typeFilter ? typeFilter.value : '';
    fetchJobs(search, type);
}

async function postJob(event) {
    if(event) event.preventDefault();
    const title = document.getElementById('title').value;
    const location = document.getElementById('location').value;
    const salary = document.getElementById('salary').value;
    const type = document.getElementById('type').value;
    const description = document.getElementById('description').value;
    const requirements = document.getElementById('requirements').value;
    const deadline = document.getElementById('deadline').value;

    try {
        const res = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, requirements, location, salary, type, deadline })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Job posted successfully!');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        } else {
            showToast(data.message || 'Failed to post job');
        }
    } catch (err) {
        showToast('Server error');
    }
}

async function applyJob(jobId) {
    try {
        const res = await fetch(`${API_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId })
        });
        const data = await res.json();
        showToast(data.message);
    } catch (err) {
        showToast('Error applying to job');
    }
}

// --- Dashboard ---
async function loadDashboard() {
    const auth = await checkAuthStatus();
    if (!auth.isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (auth.user.role === 'employer') {
        document.getElementById('dashboard-title').innerText = 'Employer Dashboard';
        try {
            const res = await fetch(`${API_URL}/dashboard/employer`);
            const data = await res.json();
            
            let html = `<h3>My Posted Jobs</h3><div class="jobs-grid">`;
            if (!data.jobs || data.jobs.length === 0) {
                html += `<p>You haven't posted any jobs yet.</p>`;
            } else {
                data.jobs.forEach(job => {
                    html += `
                        <div class="job-card">
                            <div class="job-title">${job.title}</div>
                            <div class="job-meta">📍 ${job.location} | 📅 Status: ${job.status}</div>
                            <div class="job-desc">Applicants: ${data.applications.filter(a => a.job_id === job.id).length}</div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = '<p>Error loading dashboard data.</p>';
        }
    } else {
        // Seeker dashboard
        document.getElementById('dashboard-title').innerText = 'My Applications';
        try {
            const res = await fetch(`${API_URL}/dashboard/seeker`);
            const data = await res.json();
            
            let html = `<div class="jobs-grid">`;
            if (!data.applications || data.applications.length === 0) {
                html += `<p>You haven't applied to any jobs yet.</p>`;
            } else {
                data.applications.forEach(app => {
                    html += `
                        <div class="job-card">
                            <div class="job-title">${app.title}</div>
                            <div class="job-meta">💼 ${app.employer_name} | 📍 ${app.location}</div>
                            <div class="job-desc">
                                Status: <strong>${app.status.toUpperCase()}</strong><br>
                                Applied on: ${new Date(app.application_date).toLocaleDateString()}
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = '<p>Error loading applications.</p>';
        }
    }
}