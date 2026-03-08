const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('Project_Report.pdf'));

// Fonts and styling
doc.font('Helvetica-Bold').fontSize(24).text('Open Source Job Portal', { align: 'center' });
doc.font('Helvetica').fontSize(14).fillColor('gray').text('Project Report', { align: 'center' });
doc.moveDown(2);

doc.font('Helvetica-Bold').fontSize(16).fillColor('black').text('1. Introduction');
doc.font('Helvetica').fontSize(12).text('The Open Source Job Portal is a comprehensive web application designed to connect job seekers with potential employers. This project serves as a dynamic platform where employers can post job openings, manage applications, and seekers can browse and apply for available roles tailored to their expertise.', { align: 'justify' });
doc.moveDown(1);

doc.font('Helvetica-Bold').fontSize(16).text('2. Technologies Used');
const tech = [
    'Frontend: HTML5, CSS3 (Custom Variables, Flexbox/Grid), Vanilla JS (Fetch API).',
    'Backend: Node.js, Express.js (RESTful API architecture).',
    'Database: SQLite database for robust, local data persistence.',
    'Security & Auth: express-session for stateful session management, bcryptjs for secure password hashing.'
];
tech.forEach(t => doc.font('Helvetica').fontSize(12).text(`•  ${t}`));
doc.moveDown(1);

doc.font('Helvetica-Bold').fontSize(16).text('3. Core Features');
const features = [
    'Authentication System: Secure registration and login workflows with distinct roles (Job Seeker / Employer).',
    'Job Management: Employers can effortlessly create, view, and manage their job postings from a centralized dashboard.',
    'Application Workflow: Seekers can browse jobs, apply directly through the portal, and track application statuses.',
    'Search & Filtering: Robust client-side filtering capabilities to locate specific jobs by keyword or type.',
    'Responsive UI: A modern, intuitive interface that seamlessly adapts to different screen sizes and devices.'
];
features.forEach(f => doc.font('Helvetica').fontSize(12).text(`•  ${f}`));
doc.moveDown(2);

doc.font('Helvetica-Bold').fontSize(16).text('4. Conclusion');
doc.font('Helvetica').fontSize(12).text('This project successfully demonstrates the integration of a responsive frontend design with a robust backend API and SQLite database system. By fulfilling all the core functional requirements from user authentication to job listing management, the Open Source Job Portal stands as a complete, fully functional dynamic web application.', { align: 'justify' });

// Finalize PDF file
doc.end();

console.log("PDF Report successfully generated at Project_Report.pdf");
