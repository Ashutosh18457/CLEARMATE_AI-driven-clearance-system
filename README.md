# 🎓 ClearMate: AI-Driven Student Clearance Management System

> Modern, paperless, AI-powered clearance processing for academic institutions.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview

**ClearMate** is an end-to-end digital clearance platform designed to streamline student clearance workflows across college departments (Library, Laboratory, Sports, Accounts, Hostel, Placement, and HOD). It replaces manual signatures and paper forms with real-time approvals, automated clearance tracking, audit logs, and AI-assisted validation.

For the comprehensive architectural breakdown, workflows, and database schema, see the [ClearMate System Guide](CLEARMATE_SYSTEM_GUIDE.md).

---

## 🚀 Key Features

- **Multi-Role Clearance Portals:** Specialized dashboards for Students, Department Reviewers, HODs, and Central Administrators.
- **AI-Driven Clearance Assistance:** Automated validation and smart issue detection.
- **Real-Time Notifications:** Instant status updates via WebSockets and transactional emails.
- **Document Management:** Secure upload and verification for clearance documentation.
- **Audit & Analytics:** Institutional-level tracking, clearance analytics, and exportable reports.

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Real-Time:** Socket.IO Client
- **Charts:** Chart.js

### Backend (`server/`)
- **Runtime:** Node.js & Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT & bcrypt
- **Communication:** Socket.IO, Nodemailer, Brevo API
- **File Uploads:** Multer

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas URI

### Installation & Local Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ashutosh18457/CLEARMATE_AI-driven-clearance-system.git
   cd CLEARMATE_AI-driven-clearance-system
   ```

2. **Run using the startup script (Windows):**
   ```bash
   start_clearmate.bat
   ```

3. **Or run manually:**
   * **Backend:**
     ```bash
     cd server
     npm install
     npm run dev
     ```
   * **Frontend:**
     ```bash
     cd client
     npm install
     npm run dev
     ```
