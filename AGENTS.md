# AGENTS.md — Workspace Guidelines for ClearMate

This document governs the coding standards, rules, and workflows for all AI agents working in this workspace. **Read this before writing any code.**

---

## 1. Coding Standards & Conventions
* **Folder Structure:** Strictly adhere to the **MVC + Services** pattern.
  * Backend: `server/src/controllers/`, `server/src/models/`, `server/src/routes/`, `server/src/services/`, `server/src/validators/`.
  * Frontend: `client/src/components/`, `client/src/pages/`, `client/src/api/`.
* **Naming Conventions:**
  * Routes, Controllers, Services, Validators: Use snake_case with descriptive suffixes (e.g., `admin.routes.js`, `auth.controller.js`, `auth.service.js`).
  * Mongoose Models: Use PascalCase (e.g., `User.js`, `ClearanceRequest.js`).
  * React Components: Use PascalCase (e.g., `StudentDashboard.jsx`, `Button.jsx`).
  * Variables / Functions: Use camelCase (e.g., `verifyPassword`, `studentIds`).
* **Formatting:** Clean JavaScript/ES6 conventions. Keep files concise and modular.

---

## 2. 🚫 "Never Do" List
* **Do NOT** modify `server/.env` or database schemas (`server/src/models/*`) without explicit confirmation from the user.
* **Do NOT** install new dependencies or npm packages without proposing them to the user first.
* **Do NOT** change the tech stack or swap standard libraries (e.g., swapping Tailwind for Bootstrap, or Express for NestJS).
* **Do NOT** log raw credentials, secrets, or API keys in error handlers or Winston log outputs.

---

## 3. Preferred Libraries
* **State Management:** React Context API (no Redux or Zustand).
* **HTTP Client:** Axios (configured with intercepts in `client/src/api/axios.js`).
* **Database Driver:** Mongoose (connected to MongoDB Atlas/In-Memory MongoDB).
* **Styling:** TailwindCSS (utility classes matching the tokens in `tailwind.config.js`).

---

## 4. Testing Requirements
* Every new endpoint or controller method must have passing verification code.
* Before marking a feature complete, test the API route to ensure it returns standard success/error JSON envelopes.

---

## 5. Commit Message Conventions
We strictly follow **Conventional Commits**:
* `feat:` for new features (e.g., `feat: add batch cloning`)
* `fix:` for bug fixes (e.g., `fix: resolve login lockout expiration`)
* `docs:` for documentation updates
* `style:` for styling/format changes
* `test:` for adding or updating tests
* `chore:` for package maintenance or build updates

---

## 6. Official System Workflow (4 Phases)

### Phase 1 — Admin Setup
1. **Program Setup**: Create Program (e.g. AI&DS, CSE).
2. **Semester Setup**: Create Semester (e.g. Sem 5, 2024-25 ODD).
3. **Clearance Rules**: Define Clearance Items (Theory, Labs, Elective, Special).
4. **Batches**: Create Batches (Batch A, B, C) and assign Lab Teachers per batch.
5. **Student Roster**: Upload Students via CSV with batch + elective assignment.
6. **Submissions Setup**: Define Submission Items (Assignments, Labs, Deadlines).

### Phase 2 — Throughout Semester
1. **Student Dashboard**: Students track pending submissions & deadlines.
2. **Reminders & Submissions**: System sends deadline reminders; students upload work.
3. **Teacher Verification**: Assigned teachers verify and mark submissions.
4. **Electives**: Students pick electives (if not pre-assigned).

### Phase 3 — End of Semester Clearance
1. **Initiation**: Student clicks "Start Clearance".
2. **Prerequisite Check**: System verifies all required submissions are completed & verified. If incomplete, shows pending items.
3. **Auto-Generation**: System auto-creates Item Clearances (Theory + Lab + Elective + Special) and Section Clearances (Library, Accounts, Bus).
4. **Multi-Stage Approval Pipeline**:
   - **Stage 1 (Items Review)**: Teachers review assigned theory/lab/elective items.
   - **Stage 2 (Sections Review)**: Section Heads review department clearances (Library, Accounts, Bus).
   - **Stage 3 (Class Incharge Review)**: Class Incharge reviews overall class clearance.
   - **Stage 4 (HOD Review)**: HOD performs final department approval.

### Phase 4 — Output & Certificate Generation
1. **Completion**: Once HOD approves, clearance status is marked `FULL CLEARED`.
2. **Certificate Generation**: System generates verifiable Clearance Certificate PDF.
3. **Exam Cell Dispatch**: Auto-emails PDF certificate to Examination Cell.
4. **Student Download**: Student can view and download certificate from portal.

