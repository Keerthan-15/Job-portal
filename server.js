const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const db = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.use(session({
    secret: 'jobportal_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// --- Authentication Middleware ---
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ message: 'Unauthorized. Please login.' });
}

function isEmployer(req, res, next) {
    if (req.session.role === 'employer') return next();
    res.status(403).json({ message: 'Forbidden. Employers only.' });
}

// --- API Routes ---

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
        [name, email, hashedPassword, role], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                return res.status(500).json({ message: 'Database error.' });
            }
            res.status(201).json({ message: 'Registration successful!', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error.' });
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.name = user.name;
        
        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, role: user.role } });
    });
});

// 3. Auth: Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully.' });
});

// 4. Auth: Current User Status
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ isLoggedIn: true, user: { id: req.session.userId, name: req.session.name, role: req.session.role } });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// 5. Jobs: Get all jobs
app.get('/api/jobs', (req, res) => {
    const { search, type } = req.query;
    let query = `
        SELECT jobs.*, users.name as employer_name 
        FROM jobs 
        JOIN users ON jobs.employer_id = users.id 
        WHERE status = 'open'
    `;
    let params = [];

    if (search) {
        query += ` AND (title LIKE ? OR description LIKE ? OR location LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (type) {
        query += ` AND type = ?`;
        params.push(type);
    }
    
    query += ` ORDER BY created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error fetching jobs' });
        res.json(rows);
    });
});

// 6. Jobs: Post a new job (Employers only)
app.post('/api/jobs', isAuthenticated, isEmployer, (req, res) => {
    const { title, description, requirements, location, salary, type, deadline } = req.body;
    
    db.run(
        `INSERT INTO jobs (employer_id, title, description, requirements, location, salary, type, deadline) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.session.userId, title, description, requirements, location, salary, type, deadline],
        function(err) {
            if (err) return res.status(500).json({ message: 'Failed to post job.' });
            res.status(201).json({ message: 'Job posted successfully.', jobId: this.lastID });
        }
    );
});

// 7. Applications: Apply for a job (Seekers only)
app.post('/api/applications', isAuthenticated, (req, res) => {
    if (req.session.role !== 'seeker') return res.status(403).json({ message: 'Only job seekers can apply.' });
    
    const { jobId } = req.body;
    
    db.run(`INSERT INTO applications (job_id, seeker_id) VALUES (?, ?)`, [jobId, req.session.userId], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'You have already applied for this job.' });
            }
            return res.status(500).json({ message: 'Failed to apply.' });
        }
        res.status(201).json({ message: 'Applied successfully.' });
    });
});

// 8. Employer Dashboard: My Jobs & Applications
app.get('/api/dashboard/employer', isAuthenticated, isEmployer, (req, res) => {
    const employerId = req.session.userId;
    
    // Get jobs posted by this employer
    db.all(`SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC`, [employerId], (err, jobs) => {
        if (err) return res.status(500).json({ message: 'Error fetching jobs.' });
        
        // Get applications for these jobs
        db.all(
            `SELECT a.*, jobs.title, users.name as seeker_name, users.email as seeker_email
             FROM applications a 
             JOIN jobs ON a.job_id = jobs.id 
             JOIN users ON a.seeker_id = users.id 
             WHERE jobs.employer_id = ?`, 
            [employerId], (err, applications) => {
                if (err) return res.status(500).json({ message: 'Error fetching applications.' });
                res.json({ jobs, applications });
            }
        );
    });
});

// 9. Seeker Dashboard: My Applications
app.get('/api/dashboard/seeker', isAuthenticated, (req, res) => {
    if (req.session.role !== 'seeker') return res.status(403).json({ message: 'Seekers only.' });

    const seekerId = req.session.userId;

    db.all(
        `SELECT a.*, jobs.title, jobs.location, jobs.salary, users.name as employer_name 
         FROM applications a 
         JOIN jobs ON a.job_id = jobs.id 
         JOIN users ON jobs.employer_id = users.id 
         WHERE a.seeker_id = ? ORDER BY a.application_date DESC`,
        [seekerId], (err, applications) => {
            if (err) return res.status(500).json({ message: 'Error fetching applications.' });
            res.json({ applications });
        }
    );
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
